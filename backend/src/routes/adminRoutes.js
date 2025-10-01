const express = require('express');
const router = express.Router();
const { verifyToken, asyncHandler } = require('../middleware/middlewares');
const upload = require('../middleware/multerConfig');
const { sql } = require('../db/dbConnect');
const { 
  generateUniqueFilename, 
  uploadFileToS3, 
  deleteFileFromS3, 
  getFolderForFile, 
  testConnectionData 
} = require('../middleware/s3Connection');

// Listar análises para a pesquisa no frontend
router.get('/analyses-list', verifyToken, asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 10, category } = req.query;
  const offset = (page - 1) * limit;

  const whereClauses = [];
  if (search) {
    whereClauses.push(sql`(
      title ILIKE ${'%' + search + '%'} OR 
      tag ILIKE ${'%' + search + '%'} OR 
      author ILIKE ${'%' + search + '%'}
    )`);
  }
  if (category) {
    whereClauses.push(sql`category ILIKE ${category}`);
  }

  // CORREÇÃO: Usando .reduce() em vez do inexistente .join()
  const whereCondition = whereClauses.length > 0
    ? sql`WHERE ${whereClauses.reduce((acc, cur) => sql`${acc} AND ${cur}`)}`
    : sql``;

  // Monta a query de busca de análises usando a condição corrigida
  const analyses = await sql`
    SELECT id, title, author, tag, description, cover_image_path, created_at 
    FROM analyses
    ${whereCondition}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  
  // Monta a query para contagem total de resultados usando a condição corrigida
  const totalResult = await sql`
    SELECT COUNT(*) FROM analyses
    ${whereCondition}
  `;

  res.json({ 
    success: true, 
    data: { 
      analyses,
      total: parseInt(totalResult[0].count, 10)
    } 
  });
}));


// Rota para LER uma Análise Específica (sem alterações)
router.get('/analyses/:id', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const results = await sql`SELECT * FROM analyses WHERE id = ${id}`;
  if (results.length === 0) {
    return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
  }
  res.json({ success: true, data: results[0] });
}));


// Rota para CRIAR Análises (sem alterações)
router.post('/analyses', verifyToken, upload.any(), asyncHandler(async (req, res) => {
  const isConnected = await testConnectionData();
  if (!isConnected) return res.status(500).json({ success: false, message: 'Não foi possível conectar ao servidor de arquivos.' });

  const {
    title, subtitle, lastUpdate, studyPeriod, source, category,
    tag, author, description, content, referenceLinks
  } = req.body;

  if (!title || !content || !author || !tag || !description || !category) {
    return res.status(400).json({ success: false, message: 'Campos obrigatórios em falta.' });
  }
  
  const hasCoverImage = req.files && req.files.some(file => file.fieldname === 'coverImage');
  if (!hasCoverImage) {
    return res.status(400).json({ success: false, message: 'A imagem de capa é obrigatória.' });
  }

  const uploadPromises = req.files.map(async file => {
    const folder = getFolderForFile(file.fieldname);
    const uniqueFilename = generateUniqueFilename(file.originalname);
    const keyWithFolder = `${folder}/${uniqueFilename}`;
    return uploadFileToS3(file, keyWithFolder);
  });
  const uploadedFiles = await Promise.all(uploadPromises);

  let coverImagePath = null;
  const documentFilesData = [];
  const dataFilesData = [];
  const audioFilesData = [];
  const videoFilesData = [];
  const contentMediaMap = {};

  req.files.forEach((file, idx) => {
    const uploaded = uploadedFiles[idx];
    const fieldname = file.fieldname;

    if (fieldname === 'coverImage') {
        coverImagePath = uploaded.path;
    } else if (fieldname === 'documentFiles') {
        documentFilesData.push(uploaded);
    } else if (fieldname === 'dataFiles') {
        dataFilesData.push(uploaded);
    } else if (fieldname.startsWith('placeholder_') || fieldname.startsWith('audio_placeholder_') || fieldname.startsWith('video_placeholder_')) {
        contentMediaMap[fieldname] = uploaded.path;
        if (fieldname.startsWith('audio_placeholder_')) audioFilesData.push(uploaded);
        else if (fieldname.startsWith('video_placeholder_')) videoFilesData.push(uploaded);
    }
  });

  let finalContent = content;
  for (const placeholder in contentMediaMap) {
    const escaped = placeholder.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    finalContent = finalContent.replace(new RegExp(escaped, 'g'), contentMediaMap[placeholder]);
  }

  const result = await sql`
    INSERT INTO analyses
      (title, subtitle, last_update, study_period, source, category,
      tag, author, description, content, reference_links,
      cover_image_path, document_file_path, data_file_path, audio_file_path, video_file_path)
    VALUES
      (${title}, ${subtitle}, ${lastUpdate}, ${studyPeriod}, ${source}, ${category},
      ${tag}, ${author}, ${description}, ${finalContent}, ${referenceLinks},
      ${coverImagePath}, ${JSON.stringify(documentFilesData)}, ${JSON.stringify(dataFilesData)},
      ${JSON.stringify(audioFilesData)}, ${JSON.stringify(videoFilesData)})
    RETURNING id;
  `;

  res.status(201).json({
    success: true,
    message: `Análise "${title}" publicada com sucesso!`,
    analysisId: result[0]?.id,
  });
}));

// Rota para ATUALIZAR Análises (TOTALMENTE ATUALIZADA)
router.put('/analyses/:id', verifyToken, upload.any(), asyncHandler(async (req, res) => {
  const isConnected = await testConnectionData();
  if (!isConnected) return res.status(500).json({ success: false, message: 'Não foi possível conectar ao servidor de arquivos.' });

  const { id } = req.params;
  const {
    title, subtitle, lastUpdate, studyPeriod, source, category,
    tag, author, description, content, referenceLinks, filesToDelete
  } = req.body;

  // 1. Deletar arquivos marcados para exclusão
  const filesToDeleteParsed = JSON.parse(filesToDelete || '[]');
  if (filesToDeleteParsed.length > 0) {
    console.log(`[B2 DELETE] Deletando ${filesToDeleteParsed.length} arquivos solicitados...`);
    await Promise.all(filesToDeleteParsed.map(deleteFileFromS3));
  }

  // 2. Fazer upload de todos os arquivos enviados (representam o estado final)
  const uploadPromises = req.files.map(async file => {
    const folder = getFolderForFile(file.fieldname);
    const uniqueFilename = generateUniqueFilename(file.originalname);
    const keyWithFolder = `${folder}/${uniqueFilename}`;
    return { ...await uploadFileToS3(file, keyWithFolder), fieldname: file.fieldname };
  });
  const uploadedFiles = await Promise.all(uploadPromises);

  // 3. Montar o estado final dos arquivos para o banco de dados
  const oldAnalysis = (await sql`SELECT * FROM analyses WHERE id = ${id}`)[0];
  if (!oldAnalysis) return res.status(404).json({ success: false, message: 'Análise não encontrada.' });

  let finalCoverImagePath = oldAnalysis.cover_image_path;
  let finalDocumentFiles = oldAnalysis.document_file_path || [];
  let finalDataFiles = oldAnalysis.data_file_path || [];
  const contentMediaMap = {};

  // Remove os arquivos deletados das listas existentes
  finalDocumentFiles = finalDocumentFiles.filter(f => !filesToDeleteParsed.includes(f.path));
  finalDataFiles = finalDataFiles.filter(f => !filesToDeleteParsed.includes(f.path));
  if (filesToDeleteParsed.includes(finalCoverImagePath)) {
    finalCoverImagePath = null;
  }
  
  // Adiciona os novos arquivos
  uploadedFiles.forEach(uploaded => {
    if (uploaded.fieldname === 'coverImage') {
      finalCoverImagePath = uploaded.path;
    } else if (uploaded.fieldname === 'documentFiles') {
      finalDocumentFiles.push({ path: uploaded.path, originalName: uploaded.originalName });
    } else if (uploaded.fieldname === 'dataFiles') {
      finalDataFiles.push({ path: uploaded.path, originalName: uploaded.originalName });
    } else if (uploaded.fieldname.startsWith('placeholder_') || uploaded.fieldname.startsWith('audio_placeholder_') || uploaded.fieldname.startsWith('video_placeholder_')) {
      contentMediaMap[uploaded.fieldname] = uploaded.path;
    }
  });

  // 4. Atualizar o conteúdo com os novos URLs
  let finalContent = content;
  for (const placeholder in contentMediaMap) {
    const escaped = placeholder.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    finalContent = finalContent.replace(new RegExp(escaped, 'g'), contentMediaMap[placeholder]);
  }

  // 5. Atualizar o banco de dados
  await sql`
    UPDATE analyses SET
      title = ${title}, subtitle = ${subtitle}, last_update = ${lastUpdate}, 
      study_period = ${studyPeriod}, source = ${source}, category = ${category},
      tag = ${tag}, author = ${author}, description = ${description}, 
      content = ${finalContent}, reference_links = ${referenceLinks},
      cover_image_path = ${finalCoverImagePath},
      document_file_path = ${JSON.stringify(finalDocumentFiles)},
      data_file_path = ${JSON.stringify(finalDataFiles)}
      -- audio_file_path e video_file_path podem ser adicionados aqui se necessário
    WHERE id = ${id}
  `;

  res.json({
    success: true,
    message: 'Análise atualizada com sucesso!',
  });
}));

// Rota para DELETAR Análises (sem alterações necessárias)
router.delete('/analyses/:id', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const analysisResult = await sql`SELECT * FROM analyses WHERE id = ${id}`;
  if (analysisResult.length === 0) {
    return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
  }
  const analysis = analysisResult[0];

  const filesToDelete = [];
  if (analysis.cover_image_path) filesToDelete.push(analysis.cover_image_path);
  (analysis.document_file_path || []).forEach(f => f.path && filesToDelete.push(f.path));
  (analysis.data_file_path || []).forEach(f => f.path && filesToDelete.push(f.path));
  (analysis.audio_file_path || []).forEach(f => f.path && filesToDelete.push(f.path));
  (analysis.video_file_path || []).forEach(f => f.path && filesToDelete.push(f.path));

  const mediaUrls = (analysis.content.match(/https?:\/\/[^\s"'<>()]+/g) || []).filter(url => url.includes(process.env.B2_ENDPOINT));
  filesToDelete.push(...mediaUrls);

  if (filesToDelete.length) {
    await Promise.all(filesToDelete.map(deleteFileFromS3));
  }

  await sql`DELETE FROM analyses WHERE id = ${id}`;

  res.json({ success: true, message: 'Análise deletada com sucesso.' });
}));

module.exports = router;