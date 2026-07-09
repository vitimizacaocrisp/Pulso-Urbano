// publicRoutes.js
require('dotenv').config();
const express = require('express');
const router  = express.Router();
const { asyncHandler } = require('../middleware/middlewares');
const { loginRateLimiter } = require('../middleware/rateLimiter');
const { testConnection, hasContentTypeColumns, hasCrispColumn } = require('../db/dbConnect');
const { testConnectionData } = require('../services/storage');
const { sql } = require('../db/dbConnect');
const { validateLogin, parseListQuery } = require('../validators/schemas');

const ALLOWED_ENTRY_TYPES = ['analysis', 'academic', 'dataset', 'podcast'];

// Escapa metacaracteres do LIKE/ILIKE (%, _, \) para tratá-los como literais.
const escapeLike = (s) => String(s).replace(/[\\%_]/g, (c) => '\\' + c);

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');


const safeJson = (val) => JSON.stringify(val || []);

// Cache server-side compartilhado (Upstash Redis com fallback em memória)
const { cacheGet, cacheSet } = require('../cache/serverCache');

const TTL_SHORT = 30_000;       // 30 s — highlight, lista paginada
const TTL_LONG  = 5 * 60_000;  // 5 min — análise individual

// ─────────────────────────────────────────────────────────────────────
// Status da API
// ─────────────────────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  // Resposta leve por padrão. As sondagens de DB/R2 (caras) só rodam sob
  // demanda com ?check=1 — antes rodavam em TODA visita à raiz.
  if (req.query.check === '1') {
    const [db, storage] = await Promise.all([testConnection(), testConnectionData()]);
    return res.json({ success: true, message: 'Pulso Urbano API', db, storage });
  }
  res.json({ success: true, message: 'Bem-vindo ao Pulso Urbano API!' });
}));

// Health check leve (sem tocar DB/R2) — ideal para keep-alive/monitoramento.
// Mantém o backend "quente" e reduz o cold start sem custo de round-trips.
router.get('/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// ─────────────────────────────────────────────────────────────────────
// NOVA ROTA: Destaque do dia (análise mais recente com imagem)
// Substitui a chamada de /api/analyses-list feita pelo HomeView
// apenas para pegar analyses[0].
// ─────────────────────────────────────────────────────────────────────
router.get('/api/highlight', asyncHandler(async (req, res) => {
  const cacheKey = 'public:highlight';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  const results = await sql`
    SELECT id, title, author, description, category, cover_image_path, created_at
    FROM analyses
    WHERE cover_image_path IS NOT NULL AND cover_image_path != ''
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (results.length === 0) {
    return res.status(404).json({ success: false, message: 'Nenhuma análise encontrada.' });
  }

  const payload = { success: true, data: results[0] };
  await cacheSet(cacheKey, payload, TTL_SHORT);
  res.json(payload);
}));

// ─────────────────────────────────────────────────────────────────────
// NOVA ROTA: Categorias com contagem (widget sidebar do HomeView)
// Anteriormente o HomeView calculava isso no cliente a partir de
// TODOS os registros. Agora o banco faz o GROUP BY.
// ─────────────────────────────────────────────────────────────────────
// No arquivo publicRoutes.js
router.get('/api/categories', asyncHandler(async (req, res) => {
  const cacheKey = 'public:categories';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  const results = await sql`
    SELECT 
      category::text AS name, 
      COUNT(id) AS count
    FROM analyses
    WHERE 
      category IS NOT NULL 
      AND category::text NOT IN ('', '""', 'null', '[]')
    GROUP BY category::text
    ORDER BY count DESC
  `;
  const payload = {
    success: true,
    data: results.map(r => ({ 
      // O cast ::text pode retornar a string com aspas extras (ex: "Crime" vira '"Crime"')
      // Esse replace limpa as aspas para o frontend
      name: r.name.replace(/^"|"$/g, ''), 
      count: parseInt(r.count, 10) 
    }))
  };
  
  await cacheSet(cacheKey, payload, TTL_LONG);
  res.json(payload);
}));

// ─────────────────────────────────────────────────────────────────────
// Ler análise individual (pública)
// ─────────────────────────────────────────────────────────────────────
router.get('/api/analyses/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const cacheKey = `public:analysis:${id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  const crispField = (await hasCrispColumn()) ? sql`, is_crisp` : sql``;
  const results = (await hasContentTypeColumns())
    ? await sql`
        SELECT id, title, subtitle, last_update, study_period, source, category,
               tag, author, description, content, reference_links,
               cover_image_path, nationality, states, cities, with_header, with_footer,
               created_at, entry_type, meta${crispField}
        FROM analyses
        WHERE id = ${id}
      `
    : await sql`
        SELECT id, title, subtitle, last_update, study_period, source, category,
               tag, author, description, content, reference_links,
               cover_image_path, nationality, states, cities, with_header, with_footer,
               created_at${crispField}
        FROM analyses
        WHERE id = ${id}
      `;

  if (results.length === 0) {
    return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
  }

  const payload = { success: true, data: results[0] };
  await cacheSet(cacheKey, payload, TTL_LONG);
  res.json(payload);
}));

// ─────────────────────────────────────────────────────────────────────
// Lista pública de análises — com paginação e cache
// (usada pelo RecentPosts e CardAnalisesCatalogo)
// ─────────────────────────────────────────────────────────────────────
router.get('/api/analyses-list', asyncHandler(async (req, res) => {
  // Zod coage/sanitiza (page, limit, sort, entry_type, crisp) com defaults — nunca lança.
  const { page, limit, category, entry_type, sort, crisp } = parseListQuery(req.query);
  const cacheKey = `public:list:${JSON.stringify({ page, limit, category, entry_type, sort, crisp })}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  const ctColumns = await hasContentTypeColumns();
  const crispCol  = await hasCrispColumn();

  const whereClauses = [];
  if (category) {
    // category é jsonb: precisa de ::text (o jsonb fica com aspas, ex. "Crime"),
    // por isso o ILIKE usa %termo%. Sem o ::text, "jsonb ILIKE text" dá erro.
    whereClauses.push(sql`category::text ILIKE ${'%' + escapeLike(category) + '%'}`);
  }
  if (entry_type && ctColumns && ALLOWED_ENTRY_TYPES.includes(entry_type)) {
    whereClauses.push(sql`entry_type = ${entry_type}`);
  }
  if (crisp && crispCol) {
    whereClauses.push(sql`is_crisp = TRUE`);
  }
  const whereCondition = whereClauses.length > 0
    ? sql`WHERE ${whereClauses.reduce((acc, cur) => sql`${acc} AND ${cur}`)}`
    : sql``;

  const orderClause = sort === 'date_asc'  ? sql`ORDER BY created_at ASC`
                    : sort === 'title_asc' ? sql`ORDER BY title ASC`
                    : sql`ORDER BY created_at DESC`;

  const parsedLimit  = Math.min(parseInt(limit,  10) || 10, 100); // máx 100 por chamada
  const parsedPage   = parseInt(page, 10) || 1;
  const offset       = (parsedPage - 1) * parsedLimit;

  const crispField = crispCol ? sql`, is_crisp` : sql``;
  const listFields = ctColumns
    ? sql`id, title, author, tag, description, cover_image_path,
          created_at, category, source, study_period, entry_type, meta${crispField}`
    : sql`id, title, author, tag, description, cover_image_path,
          created_at, category, source, study_period${crispField}`;

  const [analyses, totalResult] = await Promise.all([
    sql`
      SELECT ${listFields}
      FROM analyses
      ${whereCondition}
      ${orderClause}
      LIMIT ${parsedLimit} OFFSET ${offset}
    `,
    sql`SELECT COUNT(*) FROM analyses ${whereCondition}`
  ]);

  const payload = {
    success: true,
    data: { analyses, total: parseInt(totalResult[0].count, 10) }
  };
  await cacheSet(cacheKey, payload, TTL_SHORT);
  res.json(payload);
}));

// ─────────────────────────────────────────────────────────────────────
// Autenticação Admin — credenciais validadas contra a tabela `admins`
// ─────────────────────────────────────────────────────────────────────
router.post('/admin-auth', loginRateLimiter, asyncHandler(async (req, res) => {
  const parsed = validateLogin(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ success: false, message: parsed.message });
  }
  const { email, password, rememberMe } = parsed.data;
  const remember = rememberMe !== false; // default true se omitido

  const rows = await sql`
    SELECT id, email, password_hash
    FROM admins
    WHERE email = ${email} AND is_active = TRUE
    LIMIT 1
  `;

  if (rows.length === 0) {
    return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
  }

  const admin = rows[0];
  const isPasswordCorrect = await bcrypt.compare(password, admin.password_hash);

  if (!isPasswordCorrect) {
    return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
  }

  const maxAgeMs = remember ? 168 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
  const token = jwt.sign(
    { id: admin.id, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: remember ? '168h' : '12h' }
  );

  // Auth primária: cookie httpOnly (imune a XSS — JS não lê). Cross-site após o
  // split de projetos (frontend × backend em domínios distintos) → None+Secure
  // em prod; Lax em dev local (same-origin via proxy do Vite, HTTP).
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: maxAgeMs,
    path: '/',
  });

  // Token também no corpo: compat com clientes não-browser. O frontend NÃO o
  // guarda mais em localStorage — usa o cookie automaticamente.
  res.json({ success: true, message: 'Login bem-sucedido!', token });
}));

module.exports = router;
