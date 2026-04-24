const express = require('express');
const router = express.Router();
const { verifyToken, asyncHandler } = require('../middleware/middlewares');
const { sql } = require('../db/dbConnect');
const { 
  generatePresignedUrls, 
  deleteFileFromS3 
} = require('../middleware/s3Connection');

// ─────────────────────────────────────────────────────────────────────
// Cache em memória simples para o servidor (Node.js)
// Evita bater no banco para leituras frequentes de dados estáveis.
// ─────────────────────────────────────────────────────────────────────
const serverCache = new Map(); // { key → { data, expiresAt } }

function sGet(key) {
  const entry = serverCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { serverCache.delete(key); return null; }
  return entry.data;
}
function sSet(key, data, ttlMs) {
  serverCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}
function sInvalidate(prefix) {
  for (const key of serverCache.keys()) {
    if (key.startsWith(prefix)) serverCache.delete(key);
  }
}

const TTL_META      = 10 * 60 * 1000; // 10 min — categorias, fontes, tags
const TTL_LIST_PAGE = 30 * 1000;      // 30 s  — listas paginadas

// ─────────────────────────────────────────────────────────────────────
// Validação de Token
// ─────────────────────────────────────────────────────────────────────
router.get('/verify-token', verifyToken, (req, res) => {
  res.status(200).json({ success: true, message: 'Token é válido.', userId: req.user.id });
});

// ─────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────
router.get('/dashboard-data', verifyToken, asyncHandler(async (req, res) => {
  const [statsResult, recentAnalysesResult, chartDataResult] = await Promise.all([
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
      }
    }
  });
}));

// ─────────────────────────────────────────────────────────────────────
// NOVA ROTA: Metadados de filtros (categorias, fontes, tags únicas)
// Substituição da segunda chamada limit=all feita pelo PesquisaView
// ─────────────────────────────────────────────────────────────────────
router.get('/filter-meta', verifyToken, asyncHandler(async (req, res) => {
  const cacheKey = 'filter:meta';
  const cached = sGet(cacheKey);
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

  sSet(cacheKey, payload, TTL_META);
  res.json(payload);
}));

// ─────────────────────────────────────────────────────────────────────
// NOVA ROTA: Dados leves para autocomplete (id, title, author, tag, category)
// Substituição da chamada limit=all do BaseSearch
// ─────────────────────────────────────────────────────────────────────
router.get('/autocomplete', verifyToken, asyncHandler(async (req, res) => {
  const cacheKey = 'autocomplete:all';
  const cached = sGet(cacheKey);
  if (cached) return res.json(cached);

  const analyses = await sql`
    SELECT id, title, author, tag, category
    FROM analyses
    ORDER BY created_at DESC
  `;

  const payload = { success: true, data: { analyses } };
  sSet(cacheKey, payload, TTL_META);
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
    sort = 'date_desc'  // date_desc | date_asc | title_asc
  } = req.query;

  // ── Cache key (apenas para buscas paginadas, não limit=all) ──
  if (limit !== 'all') {
    const cacheKey = `analyses:list:${JSON.stringify(req.query)}`;
    const cached = sGet(cacheKey);
    if (cached) return res.json(cached);
  }

  // ── Construir WHERE clauses ──
  const whereClauses = [];

if (search) {
  whereClauses.push(sql`(
    title           ILIKE ${'%' + search + '%'} OR
    author          ILIKE ${'%' + search + '%'} OR
    description     ILIKE ${'%' + search + '%'} OR
    tag::text       ILIKE ${'%' + search + '%'} OR  -- Cast para text aqui
    category::text  ILIKE ${'%' + search + '%'} OR  -- Cast para text aqui
    source::text    ILIKE ${'%' + search + '%'} OR  -- Cast para text aqui
    CAST(id AS TEXT) = ${search}
  )`);
}

  // Categoria pode ser múltipla (csv: "Crimes,Drogas")
  if (category) {
  const cats = category.split(',').map(c => c.trim()).filter(Boolean);
  if (cats.length === 1) {
    // Adicionado ::text para permitir o ILIKE no jsonb
    whereClauses.push(sql`category::text ILIKE ${'%' + cats[0] + '%'}`);
  } else {
    // Adicionado ::text para comparar com o array de strings
    whereClauses.push(sql`category::text = ANY(${cats})`);
  }
}

  // Fonte pode ser múltipla
  if (source) {
  const srcs = source.split(',').map(s => s.trim()).filter(Boolean);
  if (srcs.length === 1) {
    // Adicionado ::text para permitir o ILIKE no jsonb
    whereClauses.push(sql`source::text ILIKE ${'%' + srcs[0] + '%'}`);
  } else {
    // Adicionado ::text para comparar com o array de strings
    whereClauses.push(sql`source::text = ANY(${srcs})`);
  }
}

  // Tags: filtra linhas cujo campo tag contém o termo (ILIKE)
  if (tag) {
    const tags = tag.split(',').map(t => t.trim()).filter(Boolean);
    // Adicione ::text após a coluna tag
    const tagConditions = tags.map(t => sql`tag::text ILIKE ${'%' + t + '%'}`); 
    whereClauses.push(
      tagConditions.reduce((acc, cur) => sql`${acc} OR ${cur}`)
    );
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
  const orderClause = sort === 'date_asc'  ? sql`ORDER BY created_at ASC`
                    : sort === 'title_asc' ? sql`ORDER BY title ASC`
                    : sql`ORDER BY created_at DESC`;

  // ── SELECT ──
  const selectedFields = sql`
    id, title, author, source, tag, category, study_period,
    description, cover_image_path, nationality, states, cities, created_at
  `;

  let analyses;

  if (limit === 'all') {
    analyses = await sql`
      SELECT ${selectedFields} FROM analyses ${whereCondition} ${orderClause}
    `;
  } else {
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    analyses = await sql`
      SELECT ${selectedFields}
      FROM analyses ${whereCondition} ${orderClause}
      LIMIT ${parseInt(limit, 10)} OFFSET ${offset}
    `;
  }

  const totalResult = await sql`SELECT COUNT(*) FROM analyses ${whereCondition}`;
  const payload = {
    success: true,
    data: { analyses, total: parseInt(totalResult[0].count, 10) }
  };

  // Cacheia apenas buscas paginadas
  if (limit !== 'all') {
    const cacheKey = `analyses:list:${JSON.stringify(req.query)}`;
    sSet(cacheKey, payload, TTL_LIST_PAGE);
  }

  res.json(payload);
}));

// ─────────────────────────────────────────────────────────────────────
// Ler Análise Individual
// ─────────────────────────────────────────────────────────────────────
router.get('/analyses/:id', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const cacheKey = `analysis:${id}`;
  const cached = sGet(cacheKey);
  if (cached) return res.json(cached);

  const results = await sql`SELECT * FROM analyses WHERE id = ${id}`;
  if (results.length === 0) {
    return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
  }

  const payload = { success: true, data: results[0] };
  sSet(cacheKey, payload, TTL_META); // Análise individual: cache 10 min
  res.json(payload);
}));

// ─────────────────────────────────────────────────────────────────────
// Listar Categorias com Contagem
// ─────────────────────────────────────────────────────────────────────
router.get('/categories-count', verifyToken, asyncHandler(async (req, res) => {
  const cacheKey = 'categories:count';
  const cached = sGet(cacheKey);
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
  sSet(cacheKey, payload, TTL_META);
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
    const status = error.message.includes('Tipo de arquivo') ? 400 : 500;
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
  } = req.body;

  if (!title || !content || !coverImagePath) {
    return res.status(400).json({ success: false, message: 'Campos obrigatórios faltando (Título, Conteúdo ou Capa).' });
  }

  const safeJson = (val) => JSON.stringify(val || []);

  const result = await sql`
    INSERT INTO analyses
      (title, subtitle, last_update, study_period, source, category,
       tag, author, description, content, reference_links,
       cover_image_path, nationality, states, cities, with_header, with_footer)
    VALUES
      (${title}, ${subtitle}, ${lastUpdate}, ${studyPeriod}, ${source}, ${category},
       ${tag}, ${author}, ${description}, ${content}, ${referenceLinks},
       ${coverImagePath}, ${nationality}, ${states ? JSON.stringify(states) : null}, ${cities ? JSON.stringify(cities) : null}, ${with_header}, ${with_footer})
    RETURNING id
  `;

  // Invalidar caches relevantes
  sInvalidate('analyses:list');
  sInvalidate('categories:count');
  sInvalidate('filter:meta');
  sInvalidate('autocomplete:all');

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
    nationality, states, cities, with_header, with_footer
  } = req.body;

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

  const safeJson = (val) => JSON.stringify(val || []);

  await sql`
    UPDATE analyses SET
      title = ${title}, subtitle = ${subtitle}, last_update = ${lastUpdate},
      study_period = ${studyPeriod}, source = ${source}, category = ${category ? JSON.stringify(category) : null},
      tag = ${tag}, author = ${author}, description = ${description},
      content = ${content}, reference_links = ${referenceLinks},
      cover_image_path = ${coverImagePath},
      nationality = ${nationality}, states = ${states ? JSON.stringify(states) : null},
      cities = ${cities ? JSON.stringify(cities) : null}, with_header = ${with_header}, with_footer = ${with_footer}
    WHERE id = ${id}
  `;

  // Invalidar caches
  sInvalidate('analyses:list');
  sInvalidate(`analysis:${id}`);
  sInvalidate('categories:count');
  sInvalidate('filter:meta');
  sInvalidate('autocomplete:all');

  res.json({ success: true, message: 'Análise atualizada com sucesso!' });
}));

// ─────────────────────────────────────────────────────────────────────
// DELETAR Análise
// ─────────────────────────────────────────────────────────────────────
router.delete('/analyses/:id', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const analysisResult = await sql`SELECT * FROM analyses WHERE id = ${id}`;
  if (analysisResult.length === 0) {
    return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
  }
  const analysis = analysisResult[0];
  const filesToDelete = [];
  if (analysis.cover_image_path?.includes('r2.dev')) filesToDelete.push(analysis.cover_image_path);
  const r2UrlRegex = /https?:\/\/[^\s"']+\.r2\.dev[^\s"']*/gi;
  (analysis.content.match(r2UrlRegex) || []).forEach(url => {
    if (!filesToDelete.includes(url)) filesToDelete.push(url);
  });
  if (filesToDelete.length > 0) {
    try { await Promise.all(filesToDelete.map(deleteFileFromS3)); }
    catch (err) { console.error('[DELETE] Erro ao remover arquivos do R2:', err); }
  }

  await sql`DELETE FROM analyses WHERE id = ${id}`;

  // Invalidar caches
  sInvalidate('analyses:list');
  sInvalidate(`analysis:${id}`);
  sInvalidate('categories:count');
  sInvalidate('filter:meta');
  sInvalidate('autocomplete:all');

  res.json({ success: true, message: 'Análise deletada com sucesso.' });
}));

module.exports = router;
