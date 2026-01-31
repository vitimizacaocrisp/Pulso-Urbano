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

router.get('/verify-token', verifyToken, (req, res) => {
  // Se o código chegou até aqui, o middleware 'verifyToken' confirmou
  // que o token é válido (assinatura e expiração corretas).
  // Apenas retornamos uma resposta de sucesso.
  res.status(200).json({ 
    success: true, 
    message: 'Token é válido.',
    // Enviamos o ID do usuário de volta, o que pode ser útil no frontend
    userId: req.user.id 
  });
});

// Rota para fornecer todos os dados agregados para o dashboard
router.get('/dashboard-data', verifyToken, asyncHandler(async (req, res) => {
  console.log('[DEBUG] A buscar dados para o dashboard...');

  // Executa todas as consultas em paralelo para máxima eficiência
  const [
    statsResult,
    recentAnalysesResult,
    chartDataResult
  ] = await Promise.all([
    // Consulta para os KPIs (cards de resumo)
    sql`
      SELECT
        (SELECT COUNT(*) FROM analyses) AS "totalAnalyses",
        (SELECT COUNT(*) FROM analyses WHERE created_at >= date_trunc('month', CURRENT_DATE)) AS "newThisMonth",
        (SELECT COUNT(DISTINCT tag) FROM analyses WHERE tag IS NOT NULL AND tag != '') AS "uniqueTags"
    `,
    // Consulta para a tabela de análises recentes
    sql`
      SELECT id, title, tag, TO_CHAR(created_at, 'DD/MM/YYYY') as created_date 
      FROM analyses 
      ORDER BY created_at DESC 
      LIMIT 5
    `,
    // Consulta para o gráfico de publicações mensais (últimos 6 meses)
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

  // Formata os dados do gráfico para o Chart.js
  const chartData = {
    labels: chartDataResult.map(row => row.month_name),
    data: chartDataResult.map(row => row.publication_count)
  };

  const responseData = {
    stats: statsResult[0],
    recentAnalyses: recentAnalysesResult,
    chartData: chartData
  };

  console.log('[DEBUG] Dados do dashboard enviados com sucesso.');
  res.json({ success: true, data: responseData });
}));

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


// Rota para CRIAR Análises (COM LÓGICA DE TRANSAÇÃO)
router.post('/analyses', verifyToken, upload.any(), asyncHandler(async (req, res) => {
  const isConnected = await testConnectionData();
  if (!isConnected) {
    return res.status(500).json({ success: false, message: 'Não foi possível conectar ao servidor de arquivos.' });
  }

  const {
    title, subtitle, lastUpdate, studyPeriod, source, category,
    tag, author, description, content, referenceLinks
  } = req.body;

  if (!title || !content || !author || !tag || !description || !category) {
    return res.status(400).json({ success: false, message: 'Campos obrigatórios estão faltando.' });
  }
  
  const hasCoverImage = req.files && req.files.some(file => file.fieldname === 'coverImage');
  if (!hasCoverImage) {
    return res.status(400).json({ success: false, message: 'A imagem de capa é obrigatória.' });
  }

  // Array para rastrear os arquivos que foram enviados com sucesso para o S3
  let successfullyUploadedFiles = [];

  try {
    // 1. FAZ O UPLOAD DOS ARQUIVOS PARA O S3
    const uploadPromises = req.files.map(async file => {
      // [CORREÇÃO] Passa o objeto file inteiro para usar a lógica de mimetype do s3Connection
      const folder = getFolderForFile(file);
      const uniqueFilename = generateUniqueFilename(file.originalname);
      const keyWithFolder = `${folder}/${uniqueFilename}`;
      const uploadedFile = await uploadFileToS3(file, keyWithFolder);
      return { ...uploadedFile, fieldname: file.fieldname };
    });
    
    successfullyUploadedFiles = await Promise.all(uploadPromises);

    // 2. ORGANIZA OS DADOS DOS ARQUIVOS PARA O BANCO DE DADOS
    let coverImagePath = null;
    const documentFilesData = [];
    const dataFilesData = [];
    const audioFilesData = [];
    const videoFilesData = [];
    const contentMediaMap = {};

    successfullyUploadedFiles.forEach(uploaded => {
      const { path, fieldname } = uploaded;
      if (fieldname === 'coverImage') {
        coverImagePath = path;
      } else if (fieldname === 'documentFiles') {
        documentFilesData.push(uploaded);
      } else if (fieldname === 'dataFiles') {
        dataFilesData.push(uploaded);
      } else if (
          // [CORREÇÃO] Adicionada verificação para os prefixos gerados pelo novo Frontend
          fieldname.startsWith('image_') || 
          fieldname.startsWith('video_') || 
          fieldname.startsWith('audio_') || 
          fieldname.startsWith('notebook_') || 
          fieldname.startsWith('script_') ||
          fieldname.startsWith('document_') || 
          fieldname.startsWith('data_') ||
          // Mantém compatibilidade com legado
          fieldname.startsWith('placeholder_') || 
          fieldname.startsWith('audio_placeholder_') || 
          fieldname.startsWith('video_placeholder_')
      ) {
        contentMediaMap[fieldname] = path;
        
        // Popula arrays auxiliares (opcional, dependendo de como você usa no front)
        if (fieldname.startsWith('audio_') || fieldname.startsWith('audio_placeholder_')) {
            audioFilesData.push(uploaded);
        } else if (fieldname.startsWith('video_') || fieldname.startsWith('video_placeholder_')) {
            videoFilesData.push(uploaded);
        }
      }
    });

    let finalContent = content;
    for (const placeholder in contentMediaMap) {
      const escaped = placeholder.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      finalContent = finalContent.replace(new RegExp(escaped, 'g'), contentMediaMap[placeholder]);
    }

    // 3. TENTA INSERIR OS DADOS NO BANCO DE DADOS
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

    // 4. SE TUDO DEU CERTO, ENVIA A RESPOSTA DE SUCESSO
    res.status(201).json({
      success: true,
      message: `Análise "${title}" publicada com sucesso!`,
      analysisId: result[0]?.id,
    });

  } catch (error) {
    // EM CASO DE ERRO (no upload ou no DB): Limpa os arquivos que acabaram de ser enviados
    console.error("Erro ao criar análise. Iniciando rollback de arquivos...", error);
    if (successfullyUploadedFiles.length > 0) {
      console.log(`Deletando ${successfullyUploadedFiles.length} arquivos do S3...`);
      await Promise.all(successfullyUploadedFiles.map(file => deleteFileFromS3(file.path).catch(e => console.error(e))));
    }
    res.status(500).json({ success: false, message: 'Ocorreu um erro interno ao salvar a análise. Nenhuma alteração foi feita.' });
  }
}));

// Rota para ATUALIZAR Análises (COM LÓGICA DE TRANSAÇÃO E SEM RE-UPLOADS)
router.put('/analyses/:id', verifyToken, upload.any(), asyncHandler(async (req, res) => {
  // 1. Verificação de Conexão
  const isConnected = await testConnectionData();
  if (!isConnected) return res.status(500).json({ success: false, message: 'Erro de conexão com servidor de arquivos.' });

  const { id } = req.params;
  const {
    title, subtitle, lastUpdate, studyPeriod, source, category,
    tag, author, description, content, referenceLinks, filesToDelete
  } = req.body;

  // Arrays de controle
  let newlyUploadedFiles = [];
  let filesToDeleteFromS3 = [];

  try {
    // Parse seguro do filesToDelete
    if (filesToDelete) {
      try {
        filesToDeleteFromS3 = JSON.parse(filesToDelete);
      } catch (e) {
        console.error("Erro ao fazer parse de filesToDelete", e);
      }
    }

    // 2. BUSCA ESTADO ATUAL
    const oldAnalysisResult = await sql`SELECT * FROM analyses WHERE id = ${id}`;
    if (oldAnalysisResult.length === 0) return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
    const oldAnalysis = oldAnalysisResult[0];

    // 3. UPLOAD DE NOVOS ARQUIVOS
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(async file => {
        // Define pasta baseada no tipo ou nome do campo
        const folder = getFolderForFile(file); 
        const uniqueFilename = generateUniqueFilename(file.originalname);
        const keyWithFolder = `${folder}/${uniqueFilename}`;
        
        const uploadedFile = await uploadFileToS3(file, keyWithFolder);
        return { ...uploadedFile, fieldname: file.fieldname };
      });
      newlyUploadedFiles = await Promise.all(uploadPromises);
    }

    // 4. MARCAR ARQUIVOS SUBSTITUÍDOS PARA DELEÇÃO
    // Se enviou nova capa, a antiga deve ir para o lixo
    const newCoverImage = newlyUploadedFiles.find(f => f.fieldname === 'coverImage');
    if (newCoverImage && oldAnalysis.cover_image_path) {
        // Só deleta se a antiga não estiver sendo usada em outro lugar (opcional, mas seguro adicionar à lista)
        if (!filesToDeleteFromS3.includes(oldAnalysis.cover_image_path)) {
            filesToDeleteFromS3.push(oldAnalysis.cover_image_path);
        }
    }

    // 5. EXECUTAR DELEÇÃO NO S3
    if (filesToDeleteFromS3.length > 0) {
      // Filtra duplicatas e valores nulos/vazios
      const uniquePathsToDelete = [...new Set(filesToDeleteFromS3)].filter(Boolean);
      console.log(`[S3 DELETE] Removendo ${uniquePathsToDelete.length} arquivos antigos...`);
      // Não damos await no delete para não travar a resposta, ou damos await se a consistência for crítica.
      // Aqui uso await para garantir limpeza.
      await Promise.all(uniquePathsToDelete.map(path => deleteFileFromS3(path).catch(err => console.error("Erro ao deletar arquivo antigo S3:", err))));
    }

    // 6. MONTAR ESTADO FINAL DOS DADOS
    const contentMediaMap = {};
    let finalContent = content || '';

    // Recupera dados antigos ou inicia arrays vazios
    let finalCoverImagePath = oldAnalysis.cover_image_path;
    let finalDocumentFiles = oldAnalysis.document_file_path || [];
    let finalDataFiles = oldAnalysis.data_file_path || [];

    // Remove arquivos que foram deletados das listas de arrays (documentos/dados)
    finalDocumentFiles = finalDocumentFiles.filter(f => !filesToDeleteFromS3.includes(f.path));
    finalDataFiles = finalDataFiles.filter(f => !filesToDeleteFromS3.includes(f.path));

    // Se a capa antiga foi deletada, reseta a variável
    if (filesToDeleteFromS3.includes(finalCoverImagePath)) {
        finalCoverImagePath = null;
    }

    // Processa os NOVOS arquivos
    newlyUploadedFiles.forEach(uploaded => {
      const { path, fieldname } = uploaded;

      if (fieldname === 'coverImage') {
        finalCoverImagePath = path;
      } 
      else if (fieldname === 'documentFiles') {
        finalDocumentFiles.push(uploaded);
      } 
      else if (fieldname === 'dataFiles') {
        finalDataFiles.push(uploaded);
      } 
      // --- CORREÇÃO AQUI: Detecta as chaves geradas pelo analysisUtils.js ---
      else if (
          fieldname.startsWith('image_') || 
          fieldname.startsWith('video_') || 
          fieldname.startsWith('audio_') || 
          fieldname.startsWith('notebook_') || 
          fieldname.startsWith('script_') ||
          fieldname.startsWith('document_') || // caso venha do botão de download inline
          fieldname.startsWith('data_')     // caso venha do botão de download inline
      ) {
        contentMediaMap[fieldname] = path;
      }
    });

    // 7. REPLACE NO CONTEÚDO (Substitui placeholder_123 pela URL do S3)
    for (const placeholder in contentMediaMap) {
        // Escapa caracteres especiais para o Regex não quebrar
        const escaped = placeholder.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        // Substitui globalmente
        finalContent = finalContent.replace(new RegExp(escaped, 'g'), contentMediaMap[placeholder]);
    }

    // 8. UPDATE NO BANCO
    // 8. UPDATE NO BANCO
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
        content = ${finalContent}, 
        reference_links = ${referenceLinks},
        cover_image_path = ${finalCoverImagePath},
        document_file_path = ${JSON.stringify(finalDocumentFiles)}, 
        data_file_path = ${JSON.stringify(finalDataFiles)}
      WHERE id = ${id}
    `;

    res.json({ success: true, message: 'Análise atualizada com sucesso!' });

  } catch (error) {
    console.error("ERRO CRÍTICO NA ATUALIZAÇÃO:", error);

    // ROLLBACK: Deleta os arquivos novos que acabaram de subir, já que o banco falhou
    if (newlyUploadedFiles.length > 0) {
      console.log(`[ROLLBACK] Deletando ${newlyUploadedFiles.length} arquivos órfãos do S3...`);
      await Promise.all(newlyUploadedFiles.map(file => deleteFileFromS3(file.path).catch(e => console.error(e))));
    }

    res.status(500).json({ success: false, message: 'Erro ao salvar alterações no banco de dados.' });
  }
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