const express = require('express');
const router = express.Router();
const { verifyToken, asyncHandler } = require('../middleware/middlewares');
const { sql } = require('../db/dbConnect');
const { 
  generatePresignedUrls, 
  deleteFileFromS3 
} = require('../middleware/s3Connection');

// --- Validação de Token ---
router.get('/verify-token', verifyToken, (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Token é válido.',
    userId: req.user.id 
  });
});

// --- Rota Dashboard ---
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

// --- Listar Análises ---
router.get('/analyses-list', verifyToken, asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 10, category } = req.query;

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

  let analyses;
  
  // Se limit for 'all', ignora a paginação e traz tudo
  if (limit === 'all') {
    analyses = await sql`
      SELECT id, title, author, tag, category, description, cover_image_path, created_at 
      FROM analyses
      ${whereCondition}
      ORDER BY created_at DESC
    `;
  } else {
    const offset = (page - 1) * limit;
    analyses = await sql`
      SELECT id, title, author, tag, category, description, cover_image_path, created_at 
      FROM analyses
      ${whereCondition}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }
  
  const totalResult = await sql`SELECT COUNT(*) FROM analyses ${whereCondition}`;

  res.json({ success: true, data: { analyses, total: parseInt(totalResult[0].count, 10) } });
}));

// --- Ler Análise Individual ---
router.get('/analyses/:id', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const results = await sql`SELECT * FROM analyses WHERE id = ${id}`;
  if (results.length === 0) return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
  res.json({ success: true, data: results[0] });
}));

// --- Listar Categorias com Contagem ---
router.get('/categories-count', verifyToken, asyncHandler(async (req, res) => {
  // Puxa o nome da categoria e conta a quantidade de posts
  const results = await sql`
    SELECT category as name, COUNT(id) as count 
    FROM analyses 
    WHERE category IS NOT NULL AND category != '' 
    GROUP BY category 
    ORDER BY count DESC
  `;
  
  // Função para criar o slug da URL (ex: "Crimes Contra a Pessoa" -> "crimes-contra-pessoa")
  const slugify = (str) => str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '');

  const data = results.map(item => ({
    name: item.name,
    count: parseInt(item.count, 10),
    path: `/categoria/${slugify(item.name)}`
  }));

  res.json({ success: true, data });
}));

// ==========================================
// ROTAS DE UPLOAD DIRETO E GESTÃO
// ==========================================

// 1. Gerar URLs assinadas (chama o s3Connection atualizado)
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

// 2. CRIAR Análise
router.post('/analyses', verifyToken, express.json(), asyncHandler(async (req, res) => {
  const {
    title, subtitle, lastUpdate, studyPeriod, source, category,
    tag, author, description, content, referenceLinks,
    coverImagePath
  } = req.body;

  if (!title || !content || !coverImagePath) {
    return res.status(400).json({ success: false, message: 'Campos obrigatórios faltando (Título, Conteúdo ou Capa).' });
  }

  const safeJson = (val) => JSON.stringify(val || []);

  const result = await sql`
    INSERT INTO analyses
      (title, subtitle, last_update, study_period, source, category,
      tag, author, description, content, reference_links,
      cover_image_path)
    VALUES
      (${title}, ${subtitle}, ${lastUpdate}, ${studyPeriod}, ${source}, ${category},
      ${tag}, ${author}, ${description}, ${content}, ${referenceLinks},
      ${coverImagePath})
    RETURNING id;
  `;

  res.status(201).json({
    success: true,
    message: `Análise publicada com sucesso!`,
    analysisId: result[0]?.id,
  });
}));

// --- ATUALIZAR Análise (CORRIGIDO PARA LIMPEZA DE ARQUIVOS) ---
router.put('/analyses/:id', verifyToken, express.json(), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title, subtitle, lastUpdate, studyPeriod, source, category,
    tag, author, description, content, referenceLinks,
    coverImagePath, // Esta é a NOVA capa (URL pública do R2)
    filesToDelete   // Array de URLs para deletar
  } = req.body;

  // 1. Buscar análise atual para comparar o que mudou
  const currentAnalysis = await sql`SELECT cover_image_path, content FROM analyses WHERE id = ${id}`;
  if (currentAnalysis.length === 0) {
    return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
  }
  
  const oldCover = currentAnalysis[0].cover_image_path;
  const oldContent = currentAnalysis[0].content || '';
  
  // 2. Identificar arquivos órfãos no conteúdo (que existiam antes mas sumiram)
  const r2UrlRegex = /https?:\/\/[^\s"']+\.r2\.dev[^\s"']*/g;
  const oldUrls = oldContent.match(r2UrlRegex) || [];
  const newUrls = (content || '').match(r2UrlRegex) || [];
  
  // URLs que existiam no conteúdo antigo mas não existem mais no novo
  const orphanedContentUrls = oldUrls.filter(url => !newUrls.includes(url));
  
  // 3. Se a capa mudou, adicionar a antiga para deleção
  const filesToDeleteFromServer = [...(filesToDelete || [])];
  
  if (oldCover && oldCover !== coverImagePath && oldCover.includes('r2.dev')) {
    filesToDeleteFromServer.push(oldCover);
  }
  
  // 4. Adicionar URLs órfãs do conteúdo
  orphanedContentUrls.forEach(url => {
    if (!filesToDeleteFromServer.includes(url)) {
      filesToDeleteFromServer.push(url);
    }
  });

  // 5. Executar deleções em background (não bloqueia a resposta)
  if (filesToDeleteFromServer.length > 0) {
    console.log(`[CLEANUP] Removendo ${filesToDeleteFromServer.length} arquivo(s) órfão(s)...`);
    Promise.all(filesToDeleteFromServer.map(url => deleteFileFromS3(url)))
      .then(results => {
        const deleted = results.filter(r => r).length;
        console.log(`[CLEANUP] ${deleted}/${filesToDeleteFromServer.length} arquivos removidos com sucesso.`);
      })
      .catch(e => console.error("[CLEANUP] Erro na limpeza de arquivos:", e));
  }

  // 6. Atualizar banco de dados
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
      cover_image_path = ${coverImagePath}
    WHERE id = ${id}
  `;

  res.json({ success: true, message: 'Análise atualizada com sucesso!' });
}));

// --- Deletar Análise (CORRIGIDO PARA LIMPEZA COMPLETA) ---
router.delete('/analyses/:id', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const analysisResult = await sql`SELECT * FROM analyses WHERE id = ${id}`;
  if (analysisResult.length === 0) {
    return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
  }
  const analysis = analysisResult[0];

  const filesToDelete = [];
  
  // 1. Adicionar imagem de capa
  if (analysis.cover_image_path && analysis.cover_image_path.includes('r2.dev')) {
    filesToDelete.push(analysis.cover_image_path);
  }
  
  // 2. Extrair TODAS as URLs do conteúdo (imagens, vídeos, documentos, etc.)
  // Regex melhorado para pegar todas as URLs do domínio r2.dev
  const r2UrlRegex = /https?:\/\/[^\s"']+\.r2\.dev[^\s"']*/gi;
  const contentUrls = analysis.content.match(r2UrlRegex) || [];
  
  contentUrls.forEach(url => {
    if (!filesToDelete.includes(url)) {
      filesToDelete.push(url);
    }
  });

  // 3. Deletar arquivos do S3/R2 antes de remover do banco
  if (filesToDelete.length > 0) {
    console.log(`[DELETE] Removendo ${filesToDelete.length} arquivo(s) do R2...`);
    try {
      await Promise.all(filesToDelete.map(deleteFileFromS3));
      console.log(`[DELETE] Arquivos removidos com sucesso.`);
    } catch (err) {
      console.error("[DELETE] Erro ao remover arquivos do R2:", err);
      // Continua mesmo se falhar a deleção dos arquivos (evita orphan records)
    }
  }

  // 4. Deletar do banco
  await sql`DELETE FROM analyses WHERE id = ${id}`;

  res.json({ success: true, message: 'Análise deletada com sucesso.' });
}));

module.exports = router;