const express = require('express');
const router = express.Router();
const { verifyToken, asyncHandler } = require('../middleware/middlewares');
const { sql, hasContentTypeColumns } = require('../db/dbConnect');

// Tipos de conteúdo aceitos (ver migração 2026_content_types.sql).
const ALLOWED_ENTRY_TYPES = ['analysis', 'academic', 'dataset'];

// Escapa metacaracteres do LIKE/ILIKE (%, _, \) para que sejam tratados como
// literais. Sem isto, buscar "50%" ou "a_b" vira coringa e retorna lixo.
// Postgres usa \ como escape por padrão (standard_conforming_strings on).
const escapeLike = (s) => String(s).replace(/[\\%_]/g, (c) => '\\' + c);
const safeEntryType = (v) => (ALLOWED_ENTRY_TYPES.includes(v) ? v : 'analysis');
const safeMeta = (v) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  return Object.keys(v).length ? JSON.stringify(v) : null;
};
const {
  generatePresignedUrls,
  deleteFileFromS3
} = require('../services/storage');
const { cacheGet, cacheSet, cacheInvalidate } = require('../cache/serverCache');

// Invalida todos os caches afetados por uma mutação de análise — tanto os do
// admin quanto os públicos (públicos e admin compartilham o mesmo Redis).
async function invalidateAnalysisCaches(id) {
  await Promise.all([
    cacheInvalidate('analyses:list'),
    cacheInvalidate('categories:count'),
    cacheInvalidate('filter:meta'),
    cacheInvalidate('autocomplete:all'),
    cacheInvalidate('public:list'),
    cacheInvalidate('public:highlight'),
    cacheInvalidate('public:categories'),
    ...(id ? [cacheInvalidate(`analysis:${id}`), cacheInvalidate(`public:analysis:${id}`)] : []),
  ]);
}

const { validateAnalysisPayload } = require('../validators/analysisValidator');

// Detecta (uma vez, com cache) se o full-text search está disponível.
// Se a migração 2026_full_text_search.sql não foi aplicada (coluna
// search_vector ausente), a busca cai para ILIKE — funciona sem a migração.
let ftsAvailable = null;
async function isFtsAvailable() {
  if (ftsAvailable !== null) return ftsAvailable;
  try {
    const rows = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'analyses' AND column_name = 'search_vector'
      LIMIT 1
    `;
    ftsAvailable = rows.length > 0;
    if (!ftsAvailable) {
      console.warn('⚠️  Full-text search indisponível (coluna search_vector ausente) — usando ILIKE. Rode database/migrations/2026_full_text_search.sql para ativar.');
    }
  } catch {
    ftsAvailable = false;
  }
  return ftsAvailable;
}

const TTL_META      = 10 * 60 * 1000; // 10 min — categorias, fontes, tags
const TTL_LIST_PAGE = 30 * 1000;      // 30 s  — listas paginadas

// ─────────────────────────────────────────────────────────────────────
// Validação de Token
// ─────────────────────────────────────────────────────────────────────
router.get('/verify-token', verifyToken, (req, res) => {
  res.status(200).json({ success: true, message: 'Token é válido.', userId: req.user.id });
});

// Logout — limpa o cookie httpOnly. Sem verifyToken: funciona mesmo com sessão
// expirada. clearCookie precisa dos mesmos atributos usados ao setar.
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  res.json({ success: true, message: 'Logout realizado.' });
});

// ─────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────
router.get('/dashboard-data', verifyToken, asyncHandler(async (req, res) => {
  const [statsResult, recentAnalysesResult, chartDataResult, categoriesResult] = await Promise.all([
    sql`
      SELECT
        (SELECT COUNT(*) FROM analyses) AS "totalAnalyses",
        (SELECT COUNT(*) FROM analyses WHERE created_at >= date_trunc('month', CURRENT_DATE)) AS "newThisMonth",
        (SELECT COUNT(DISTINCT tag) FROM analyses WHERE tag IS NOT NULL AND tag != '') AS "uniqueTags"
    `,
    sql`
      SELECT id, title, tag, TO_CHAR(created_at, 'DD/MM/YYYY') as created_date 
      FROM analyses ORDER BY created_at DESC LIMIT 5
    `,
    sql`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE) - interval '5 months',
          date_trunc('month', CURRENT_DATE),
          '1 month'::interval
        ) AS month
      )
      SELECT
        TO_CHAR(months.month, 'Mon') AS month_name,
        COUNT(analyses.id) AS publication_count
      FROM months
      LEFT JOIN analyses ON date_trunc('month', analyses.created_at) = months.month
      GROUP BY months.month ORDER BY months.month
    `,
    sql`
      SELECT category::text AS name, COUNT(*) AS count
      FROM analyses
      WHERE category IS NOT NULL AND category::text NOT IN ('', '""', 'null', '[]')
      GROUP BY category::text
      ORDER BY count DESC
      LIMIT 6
    `
  ]);

  res.json({
    success: true,
    data: {
      stats: statsResult[0],
      recentAnalyses: recentAnalysesResult,
      chartData: {
        labels: chartDataResult.map(r => r.month_name),
        data:   chartDataResult.map(r => r.publication_count)
      },
      categories: categoriesResult.map(r => ({
        name: (r.name || '').replace(/^"|"$/g, ''),
        count: parseInt(r.count, 10)
      }))
    }
  });
}));

// ─────────────────────────────────────────────────────────────────────
// NOVA ROTA: Metadados de filtros (categorias, fontes, tags únicas)
// Substituição da segunda chamada limit=all feita pelo PesquisaView
// ─────────────────────────────────────────────────────────────────────
router.get('/filter-meta', verifyToken, asyncHandler(async (req, res) => {
  const cacheKey = 'filter:meta';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

 const [categories, sources] = await Promise.all([
  sql`SELECT DISTINCT category FROM analyses WHERE category IS NOT NULL AND CAST(category AS TEXT) NOT IN ('', '""', '[]') ORDER BY category`,
  sql`SELECT DISTINCT source   FROM analyses WHERE source   IS NOT NULL AND CAST(source AS TEXT) NOT IN ('', '""', '[]') ORDER BY source`
]);

  // Tags: extraídas server-side das top-200 análises mais recentes para performance
  const tagsRaw = await sql`
  SELECT tag FROM analyses WHERE tag IS NOT NULL AND CAST(tag AS TEXT) NOT IN ('', '""', '[]') LIMIT 200
  `;
  const tagSet = new Set();
  tagsRaw.forEach(row => {
    if (!row.tag) return;
    row.tag.replace(/['"\-:;()\d]/g, '')
      .split(/[\s,]+/)
      .filter(t => t.length > 2)
      .forEach(t => tagSet.add(t));
  });

  const payload = {
    success: true,
    data: {
      categories: categories.map(r => r.category),
      sources:    sources.map(r => r.source),
      tags:       [...tagSet].sort().slice(0, 50),
    }
  };

  await cacheSet(cacheKey, payload, TTL_META);
  res.json(payload);
}));

// ─────────────────────────────────────────────────────────────────────
// NOVA ROTA: Dados leves para autocomplete (id, title, author, tag, category)
// Substituição da chamada limit=all do BaseSearch
// ─────────────────────────────────────────────────────────────────────
router.get('/autocomplete', verifyToken, asyncHandler(async (req, res) => {
  const cacheKey = 'autocomplete:all';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  // Teto: autocomplete não precisa da tabela inteira; 2000 cobre de sobra.
  const analyses = await sql`
    SELECT id, title, author, tag, category
    FROM analyses
    ORDER BY created_at DESC
    LIMIT 2000
  `;

  const payload = { success: true, data: { analyses } };
  await cacheSet(cacheKey, payload, TTL_META);
  res.json(payload);
}));

// ─────────────────────────────────────────────────────────────────────
// Listar Análises — com todos os filtros suportados
// ─────────────────────────────────────────────────────────────────────
router.get('/analyses-list', verifyToken, asyncHandler(async (req, res) => {
  const {
    search,
    page    = 1,
    limit   = 10,
    category,
    source,
    tag,
    year_from,
    year_to,
    entry_type,
    sort = 'date_desc'  // date_desc | date_asc | title_asc
  } = req.query;

  const ctColumns = await hasContentTypeColumns();

  // ── Cache key (apenas para buscas paginadas, não limit=all) ──
  if (limit !== 'all') {
    const cacheKey = `analyses:list:${JSON.stringify(req.query)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);
  }

  // ── Construir WHERE clauses ──
  const whereClauses = [];

  // Busca híbrida: ILIKE (substring — funciona ao digitar parcial) sempre;
  // se o FTS estiver disponível, soma o match por relevância (stemming + acentos).
  const fts = search ? await isFtsAvailable() : false;
  if (search) {
    const like = '%' + escapeLike(search) + '%';
    const ilike = sql`(
      title          ILIKE ${like} OR
      author         ILIKE ${like} OR
      description    ILIKE ${like} OR
      tag::text      ILIKE ${like} OR
      category::text ILIKE ${like} OR
      source::text   ILIKE ${like} OR
      CAST(id AS TEXT) = ${search}
    )`;
    if (fts) {
      whereClauses.push(sql`(
        search_vector @@ websearch_to_tsquery('portuguese', public.f_unaccent(${search}))
        OR ${ilike}
      )`);
    } else {
      whereClauses.push(ilike);
    }
  }

  // Categoria pode ser múltipla (csv: "Crimes,Drogas").
  // category é jsonb: o ::text vem com aspas ("Crime"), então `= ANY(array)`
  // nunca casava. Usamos ILIKE por termo e juntamos com OR — funciona para 1 ou N.
  if (category) {
    const cats = category.split(',').map(c => c.trim()).filter(Boolean);
    if (cats.length) {
      const conds = cats.map(c => sql`category::text ILIKE ${'%' + escapeLike(c) + '%'}`);
      // Parênteses obrigatórios: sem eles, "AND a OR b" vira "(AND a) OR b" por
      // precedência e contamina o resto do WHERE.
      whereClauses.push(sql`(${conds.reduce((acc, cur) => sql`${acc} OR ${cur}`)})`);
    }
  }

  // Fonte pode ser múltipla — mesma lógica da categoria.
  if (source) {
    const srcs = source.split(',').map(s => s.trim()).filter(Boolean);
    if (srcs.length) {
      const conds = srcs.map(s => sql`source::text ILIKE ${'%' + escapeLike(s) + '%'}`);
      whereClauses.push(sql`(${conds.reduce((acc, cur) => sql`${acc} OR ${cur}`)})`);
    }
  }

  // Tags: filtra linhas cujo campo tag contém o termo (ILIKE).
  if (tag) {
    const tags = tag.split(',').map(t => t.trim()).filter(Boolean);
    if (tags.length) {
      const conds = tags.map(t => sql`tag::text ILIKE ${'%' + escapeLike(t) + '%'}`);
      // Parênteses: ver nota no filtro de categoria.
      whereClauses.push(sql`(${conds.reduce((acc, cur) => sql`${acc} OR ${cur}`)})`);
    }
  }

  // Tipo de conteúdo (analysis | academic | dataset) — usado por /producoes e /dados
  if (entry_type && ctColumns && ALLOWED_ENTRY_TYPES.includes(entry_type)) {
    whereClauses.push(sql`entry_type = ${entry_type}`);
  }

  // Período de estudo (year_from / year_to) — filtra pelo campo study_period (texto)
  if (year_from) {
    whereClauses.push(sql`study_period IS NOT NULL AND CAST(SUBSTRING(study_period FROM '\\d{4}') AS INT) >= ${parseInt(year_from, 10)}`);
  }
  if (year_to) {
    whereClauses.push(sql`study_period IS NOT NULL AND CAST(SUBSTRING(study_period FROM '\\d{4}') AS INT) <= ${parseInt(year_to, 10)}`);
  }

  const whereCondition = whereClauses.length > 0
    ? sql`WHERE ${whereClauses.reduce((acc, cur) => sql`${acc} AND ${cur}`)}`
    : sql``;

  // ── ORDER BY ──
  // 'relevance' usa ts_rank (só faz sentido quando há busca).
  let orderClause;
  if (sort === 'date_asc') {
    orderClause = sql`ORDER BY created_at ASC`;
  } else if (sort === 'title_asc') {
    orderClause = sql`ORDER BY title ASC`;
  } else if (sort === 'relevance' && search && fts) {
    orderClause = sql`ORDER BY ts_rank(search_vector, websearch_to_tsquery('portuguese', public.f_unaccent(${search}))) DESC, created_at DESC`;
  } else {
    orderClause = sql`ORDER BY created_at DESC`;
  }

  // ── SELECT ──
  const selectedFields = ctColumns
    ? sql`
        id, title, author, source, tag, category, study_period,
        description, cover_image_path, nationality, states, cities, created_at,
        entry_type, meta
      `
    : sql`
        id, title, author, source, tag, category, study_period,
        description, cover_image_path, nationality, states, cities, created_at
      `;

  // Teto de segurança para limit=all: evita varrer a tabela inteira sem limite
  // conforme ela cresce. Acima disso, o cliente precisa paginar.
  const MAX_ALL = 2000;

  const listQuery = (limit === 'all')
    ? sql`SELECT ${selectedFields} FROM analyses ${whereCondition} ${orderClause} LIMIT ${MAX_ALL}`
    : (() => {
        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
        const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * safeLimit;
        return sql`
          SELECT ${selectedFields}
          FROM analyses ${whereCondition} ${orderClause}
          LIMIT ${safeLimit} OFFSET ${offset}
        `;
      })();

  // Lista + COUNT em paralelo (antes rodavam em série, dobrando o round-trip).
  const [analyses, totalResult] = await Promise.all([
    listQuery,
    sql`SELECT COUNT(*) FROM analyses ${whereCondition}`,
  ]);

  const payload = {
    success: true,
    data: { analyses, total: parseInt(totalResult[0].count, 10) }
  };

  // Cacheia apenas buscas paginadas
  if (limit !== 'all') {
    const cacheKey = `analyses:list:${JSON.stringify(req.query)}`;
    await cacheSet(cacheKey, payload, TTL_LIST_PAGE);
  }

  res.json(payload);
}));

// ─────────────────────────────────────────────────────────────────────
// Ler Análise Individual
// ─────────────────────────────────────────────────────────────────────
router.get('/analyses/:id', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const cacheKey = `analysis:${id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  // Colunas explícitas: SELECT * vazava search_vector (binário) e qualquer
  // coluna futura indesejada no JSON.
  const results = (await hasContentTypeColumns())
    ? await sql`
        SELECT id, title, subtitle, last_update, study_period, source, category,
               tag, author, description, content, reference_links,
               cover_image_path, nationality, states, cities, with_header, with_footer,
               created_at, entry_type, meta
        FROM analyses WHERE id = ${id}
      `
    : await sql`
        SELECT id, title, subtitle, last_update, study_period, source, category,
               tag, author, description, content, reference_links,
               cover_image_path, nationality, states, cities, with_header, with_footer,
               created_at
        FROM analyses WHERE id = ${id}
      `;
  if (results.length === 0) {
    return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
  }

  const payload = { success: true, data: results[0] };
  await cacheSet(cacheKey, payload, TTL_META); // Análise individual: cache 10 min
  res.json(payload);
}));

// ─────────────────────────────────────────────────────────────────────
// Listar Categorias com Contagem
// ─────────────────────────────────────────────────────────────────────
router.get('/categories-count', verifyToken, asyncHandler(async (req, res) => {
  const cacheKey = 'categories:count';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  const results = await sql`
    SELECT category as name, COUNT(id) as count 
    FROM analyses 
    WHERE category IS NOT NULL AND category != '' 
    GROUP BY category 
    ORDER BY count DESC
  `;

  const slugify = (str) => str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '');

  const data = results.map(item => ({
    name:  item.name,
    count: parseInt(item.count, 10),
    path:  `/categoria/${slugify(item.name)}`
  }));

  const payload = { success: true, data };
  await cacheSet(cacheKey, payload, TTL_META);
  res.json(payload);
}));

// ─────────────────────────────────────────────────────────────────────
// Upload — Gerar URLs assinadas
// ─────────────────────────────────────────────────────────────────────
router.post('/generate-upload-urls', verifyToken, express.json(), asyncHandler(async (req, res) => {
  const { files } = req.body;
  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ success: false, message: 'Nenhum arquivo solicitado.' });
  }
  for (const f of files) {
    if (!f.fileName || !f.fileType || !f.category) {
      return res.status(400).json({ success: false, message: 'Dados incompletos. Necessário: fileName, fileType e category.' });
    }
  }
  try {
    const signedUrls = await generatePresignedUrls(files);
    res.json({ success: true, data: signedUrls });
  } catch (error) {
    const isValidation = /Tipo de arquivo|excede o limite|Tamanho de arquivo inválido/.test(error.message);
    const status = isValidation ? 400 : 500;
    res.status(status).json({ success: false, message: error.message || 'Erro ao preparar upload.' });
  }
}));

// ─────────────────────────────────────────────────────────────────────
// CRIAR Análise
// ─────────────────────────────────────────────────────────────────────
router.post('/analyses', verifyToken, express.json(), asyncHandler(async (req, res) => {
  const {
    title, subtitle, lastUpdate, studyPeriod, source, category,
    tag, author, description, content, referenceLinks, coverImagePath,
    nationality, states, cities, with_header, with_footer,
    entry_type, meta,
  } = req.body;

  const validationError = validateAnalysisPayload(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }
  // A imagem de capa é opcional: quando ausente, o frontend gera uma capa
  // automática (SVG temático / foto) a partir da categoria, tag e título.

  const cat    = category ? JSON.stringify(category) : null;
  const sts    = states   ? JSON.stringify(states)   : null;
  const cts    = cities   ? JSON.stringify(cities)   : null;

  let result;
  if (await hasContentTypeColumns()) {
    result = await sql`
      INSERT INTO analyses
        (title, subtitle, last_update, study_period, source, category,
         tag, author, description, content, reference_links,
         cover_image_path, nationality, states, cities, with_header, with_footer,
         entry_type, meta)
      VALUES
        (${title}, ${subtitle}, ${lastUpdate}, ${studyPeriod}, ${source}, ${cat},
         ${tag}, ${author}, ${description}, ${content}, ${referenceLinks},
         ${coverImagePath}, ${nationality}, ${sts}, ${cts}, ${with_header}, ${with_footer},
         ${safeEntryType(entry_type)}, ${safeMeta(meta)})
      RETURNING id
    `;
  } else {
    result = await sql`
      INSERT INTO analyses
        (title, subtitle, last_update, study_period, source, category,
         tag, author, description, content, reference_links,
         cover_image_path, nationality, states, cities, with_header, with_footer)
      VALUES
        (${title}, ${subtitle}, ${lastUpdate}, ${studyPeriod}, ${source}, ${cat},
         ${tag}, ${author}, ${description}, ${content}, ${referenceLinks},
         ${coverImagePath}, ${nationality}, ${sts}, ${cts}, ${with_header}, ${with_footer})
      RETURNING id
    `;
  }

  await invalidateAnalysisCaches();

  res.status(201).json({ success: true, message: 'Análise publicada com sucesso!', analysisId: result[0]?.id });
}));

// ─────────────────────────────────────────────────────────────────────
// ATUALIZAR Análise
// ─────────────────────────────────────────────────────────────────────
router.put('/analyses/:id', verifyToken, express.json(), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title, subtitle, lastUpdate, studyPeriod, source, category,
    tag, author, description, content, referenceLinks,
    coverImagePath, filesToDelete,
    nationality, states, cities, with_header, with_footer,
    entry_type, meta
  } = req.body;

  const validationError = validateAnalysisPayload(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const currentAnalysis = await sql`SELECT cover_image_path, content FROM analyses WHERE id = ${id}`;
  if (currentAnalysis.length === 0) {
    return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
  }

  const oldCover   = currentAnalysis[0].cover_image_path;
  const oldContent = currentAnalysis[0].content || '';
  const r2UrlRegex = /https?:\/\/[^\s"']+\.r2\.dev[^\s"']*/g;
  const oldUrls    = oldContent.match(r2UrlRegex) || [];
  const newUrls    = (content || '').match(r2UrlRegex) || [];
  const orphanedContentUrls = oldUrls.filter(url => !newUrls.includes(url));
  const filesToDeleteFromServer = [...(filesToDelete || [])];

  if (oldCover && oldCover !== coverImagePath && oldCover.includes('r2.dev')) {
    filesToDeleteFromServer.push(oldCover);
  }
  orphanedContentUrls.forEach(url => {
    if (!filesToDeleteFromServer.includes(url)) filesToDeleteFromServer.push(url);
  });
  if (filesToDeleteFromServer.length > 0) {
    Promise.all(filesToDeleteFromServer.map(url => deleteFileFromS3(url))).catch(console.error);
  }

  const cat = category ? JSON.stringify(category) : null;
  const sts = states   ? JSON.stringify(states)   : null;
  const cts = cities   ? JSON.stringify(cities)   : null;

  if (await hasContentTypeColumns()) {
    await sql`
      UPDATE analyses SET
        title = ${title}, subtitle = ${subtitle}, last_update = ${lastUpdate},
        study_period = ${studyPeriod}, source = ${source}, category = ${cat},
        tag = ${tag}, author = ${author}, description = ${description},
        content = ${content}, reference_links = ${referenceLinks},
        cover_image_path = ${coverImagePath},
        nationality = ${nationality}, states = ${sts},
        cities = ${cts}, with_header = ${with_header}, with_footer = ${with_footer},
        entry_type = ${safeEntryType(entry_type)}, meta = ${safeMeta(meta)}
      WHERE id = ${id}
    `;
  } else {
    await sql`
      UPDATE analyses SET
        title = ${title}, subtitle = ${subtitle}, last_update = ${lastUpdate},
        study_period = ${studyPeriod}, source = ${source}, category = ${cat},
        tag = ${tag}, author = ${author}, description = ${description},
        content = ${content}, reference_links = ${referenceLinks},
        cover_image_path = ${coverImagePath},
        nationality = ${nationality}, states = ${sts},
        cities = ${cts}, with_header = ${with_header}, with_footer = ${with_footer}
      WHERE id = ${id}
    `;
  }

  await invalidateAnalysisCaches(id);

  res.json({ success: true, message: 'Análise atualizada com sucesso!' });
}));

// ─────────────────────────────────────────────────────────────────────
// DELETAR Análise
// ─────────────────────────────────────────────────────────────────────
router.delete('/analyses/:id', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Só precisamos da capa e do conteúdo para localizar os arquivos no R2.
  const analysisResult = await sql`SELECT cover_image_path, content FROM analyses WHERE id = ${id}`;
  if (analysisResult.length === 0) {
    return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
  }
  const analysis = analysisResult[0];
  const filesToDelete = [];
  if (analysis.cover_image_path?.includes('r2.dev')) filesToDelete.push(analysis.cover_image_path);
  const r2UrlRegex = /https?:\/\/[^\s"']+\.r2\.dev[^\s"']*/gi;
  ((analysis.content || '').match(r2UrlRegex) || []).forEach(url => {
    if (!filesToDelete.includes(url)) filesToDelete.push(url);
  });
  if (filesToDelete.length > 0) {
    try { await Promise.all(filesToDelete.map(deleteFileFromS3)); }
    catch (err) { console.error('[DELETE] Erro ao remover arquivos do R2:', err); }
  }

  await sql`DELETE FROM analyses WHERE id = ${id}`;

  await invalidateAnalysisCaches(id);

  res.json({ success: true, message: 'Análise deletada com sucesso.' });
}));

module.exports = router;
