// publicRoutes.js
require('dotenv').config();
const express = require('express');
const router  = express.Router();
const { asyncHandler } = require('../middleware/middlewares');
const { loginRateLimiter } = require('../middleware/rateLimiter');
const { testConnection }     = require('../db/dbConnect');
const { testConnectionData } = require('../services/storage');
const { sql } = require('../db/dbConnect');
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
router.get('/', async (req, res) => {
  await testConnection();
  await testConnectionData();
  res.json({ success: true, message: 'Bem-vindo ao Pulso Urbano API!' });
});

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

  const results = await sql`
    SELECT id, title, subtitle, last_update, study_period, source, category,
           tag, author, description, content, reference_links,
           cover_image_path, nationality, states, cities, with_header, with_footer,
           created_at
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
  const { page = 1, limit = 10, category, sort = 'date_desc' } = req.query;
  const cacheKey = `public:list:${JSON.stringify(req.query)}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  const whereClauses = [];
  if (category) {
    whereClauses.push(sql`category ILIKE ${category}`);
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

  const [analyses, totalResult] = await Promise.all([
    sql`
      SELECT id, title, author, tag, description, cover_image_path,
             created_at, category, source, study_period
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
  const { email, password, rememberMe } = req.body;
  const remember = rememberMe !== false; // default true se omitido

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios.' });
  }

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

  const token = jwt.sign(
    { id: admin.id, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: remember ? '168h' : '12h' }
  );

  // Token devolvido no corpo. O frontend guarda no localStorage e o envia no
  // header Authorization — funciona cross-domain (Netlify <-> Vercel), sem
  // depender de cookie/proxy. A validade do JWT já respeita o "lembrar-me".
  res.json({ success: true, message: 'Login bem-sucedido!', token });
}));

module.exports = router;
