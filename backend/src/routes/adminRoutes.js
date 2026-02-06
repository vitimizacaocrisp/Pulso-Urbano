const express = require('express');
const router = express.Router();
const { verifyToken, asyncHandler } = require('../middleware/middlewares');
const { sql } = require('../db/dbConnect');
const { 
  generatePresignedUrls, 
  deleteFileFromS3 
} = require('../middleware/s3Connection');

// --- Validação de Token (Mantido) ---
router.get('/verify-token', verifyToken, (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Token é válido.',
    userId: req.user.id 
  });
});

// --- Rota Dashboard (Mantido) ---
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
      FROM analyses 
      ORDER BY created_at DESC 
      LIMIT 5
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
      GROUP BY months.month
      ORDER BY months.month;
    `
  ]);

  const chartData = {
    labels: chartDataResult.map(row => row.month_name),
    data: chartDataResult.map(row => row.publication_count)
  };

  res.json({ success: true, data: { stats: statsResult[0], recentAnalyses: recentAnalysesResult, chartData } });
}));

// --- Listar Análises (Mantido) ---
router.get('/analyses-list', verifyToken, asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 10, category } = req.query;
  const offset = (page - 1) * limit;

  const whereClauses = [];
  if (search) {
    whereClauses.push(sql`(title ILIKE ${'%' + search + '%'} OR tag ILIKE ${'%' + search + '%'} OR author ILIKE ${'%' + search + '%'})`);
  }
  if (category) {
    whereClauses.push(sql`category ILIKE ${category}`);
  }

  const whereCondition = whereClauses.length > 0
    ? sql`WHERE ${whereClauses.reduce((acc, cur) => sql`${acc} AND ${cur}`)}`
    : sql``;

  const analyses = await sql`
    SELECT id, title, author, tag, description, cover_image_path, created_at 
    FROM analyses
    ${whereCondition}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  
  const totalResult = await sql`SELECT COUNT(*) FROM analyses ${whereCondition}`;

  res.json({ success: true, data: { analyses, total: parseInt(totalResult[0].count, 10) } });
}));

// --- Ler Análise Individual (Mantido) ---
router.get('/analyses/:id', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const results = await sql`SELECT * FROM analyses WHERE id = ${id}`;
  if (results.length === 0) return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
  res.json({ success: true, data: results[0] });
}));


// ==========================================
// ROTAS DE UPLOAD DIRETO E GESTÃO
// ==========================================

// 1. Gerar URLs assinadas (Mantido - chama o s3Connection atualizado)
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
    console.error("Erro ao gerar URLs:", error);
    const status = error.message.includes('Tipo de arquivo') ? 400 : 500;
    res.status(status).json({ success: false, message: error.message || 'Erro ao preparar upload.' });
  }
}));

// 2. CRIAR Análise (Mantido)
router.post('/analyses', verifyToken, express.json(), asyncHandler(async (req, res) => {
  const {
    title, subtitle, lastUpdate, studyPeriod, source, category,
    tag, author, description, content, referenceLinks,
    coverImagePath, 
    documentFiles,
    dataFiles,
    audioFiles,
    videoFiles
  } = req.body;

  if (!title || !content || !coverImagePath) {
    return res.status(400).json({ success: false, message: 'Campos obrigatórios faltando (Título, Conteúdo ou Capa).' });
  }

  const safeJson = (val) => JSON.stringify(val || []);

  const result = await sql`
    INSERT INTO analyses
      (title, subtitle, last_update, study_period, source, category,
      tag, author, description, content, reference_links,
      cover_image_path, document_file_path, data_file_path, audio_file_path, video_file_path)
    VALUES
      (${title}, ${subtitle}, ${lastUpdate}, ${studyPeriod}, ${source}, ${category},
      ${tag}, ${author}, ${description}, ${content}, ${referenceLinks},
      ${coverImagePath}, 
      ${safeJson(documentFiles)}, 
      ${safeJson(dataFiles)},
      ${safeJson(audioFiles)}, 
      ${safeJson(videoFiles)})
    RETURNING id;
  `;

  res.status(201).json({
    success: true,
    message: `Análise publicada com sucesso!`,
    analysisId: result[0]?.id,
  });
}));

// 3. ATUALIZAR Análise (Mantido)
router.put('/analyses/:id', verifyToken, express.json(), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title, subtitle, lastUpdate, studyPeriod, source, category,
    tag, author, description, content, referenceLinks,
    coverImagePath,
    documentFiles,
    dataFiles,
    filesToDelete
  } = req.body;

  if (filesToDelete && Array.isArray(filesToDelete) && filesToDelete.length > 0) {
      console.log(`[CLEANUP] Removendo ${filesToDelete.length} arquivos antigos...`);
      Promise.all(filesToDelete.map(url => deleteFileFromS3(url)))
        .catch(e => console.error("Erro na limpeza de arquivos:", e));
  }

  const safeJson = (val) => JSON.stringify(val || []);

  await sql`
    UPDATE analyses SET
      title = ${title}, 
      subtitle = ${subtitle}, 
      last_update = ${lastUpdate}, 
      study_period = ${studyPeriod}, 
      source = ${source}, 
      category = ${category},
      tag = ${tag}, 
      author = ${author}, 
      description = ${description}, 
      content = ${content}, 
      reference_links = ${referenceLinks},
      cover_image_path = ${coverImagePath},
      document_file_path = ${safeJson(documentFiles)}, 
      data_file_path = ${safeJson(dataFiles)}
    WHERE id = ${id}
  `;

  res.json({ success: true, message: 'Análise atualizada com sucesso!' });
}));

// --- Deletar Análise (ATUALIZADO REGEX) ---
router.delete('/analyses/:id', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const analysisResult = await sql`SELECT * FROM analyses WHERE id = ${id}`;
  if (analysisResult.length === 0) {
    return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
  }
  const analysis = analysisResult[0];

  const filesToDelete = [];
  
  if (analysis.cover_image_path) filesToDelete.push(analysis.cover_image_path);
  
  const extractPaths = (jsonArr) => {
      if (!jsonArr || !Array.isArray(jsonArr)) return;
      jsonArr.forEach(item => { 
        if(item.path) filesToDelete.push(item.path); 
      });
  };
  
  extractPaths(analysis.document_file_path);
  extractPaths(analysis.data_file_path);
  extractPaths(analysis.audio_file_path);
  extractPaths(analysis.video_file_path);

  // --- ATUALIZAÇÃO DO REGEX PARA R2 ---
  // Busca por links que contenham o domínio público do R2 ou o padrão .r2.dev
  // Regex procura por strings que começam com http, contêm "r2.dev" (padrão Cloudflare) e terminam antes de espaços/aspas
  const regex = /https?:\/\/[^\s"']+\.r2\.dev[^\s"']*/g;
  
  const contentMediaUrls = analysis.content.match(regex) || [];
  filesToDelete.push(...contentMediaUrls);

  if (filesToDelete.length) {
    Promise.all(filesToDelete.map(deleteFileFromS3))
      .catch(err => console.error("Erro ao limpar S3 na exclusão:", err));
  }

  await sql`DELETE FROM analyses WHERE id = ${id}`;

  res.json({ success: true, message: 'Análise deletada com sucesso.' });
}));

module.exports = router;