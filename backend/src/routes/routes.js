// --- Imports ---
require('dotenv').config();
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { testConnection, sql } = require('../db/dbConnect');
const { asyncHandler, verifyToken } = require('../middleware/middlewares.js');
const apiConnect = require('../api/apiConnect'); 
const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");

// --- Configuração do Cliente S3 para Backblaze B2 ---
const s3Client = new S3Client({
  endpoint: `https://${process.env.B2_ENDPOINT}`,
  region: 'us-east-005',
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
});

// --- Funções Auxiliares de Conexão e Gerenciamento de Arquivos ---
async function testConnectionData() {
  try {
    await s3Client.send(new ListObjectsV2Command({ Bucket: process.env.B2_BUCKET_NAME, MaxKeys: 1 }));
    console.log("[B2] Conexão bem-sucedida.");
    return true;
  } catch (error) {
    console.error("[B2] Falha na conexão:", error.message);
    return false;
  }
}

// ================= ROTAS PÚBLICAS =================

// Status da API
router.get('/', async (req, res) => {
    await testConnection();
    await testConnectionData();
    res.json({ success: true, message: 'Bem-vindo ao Pulso Urbano API!' },);
});

// Contexto: população IBGE
router.get('/api/contexto/populacao', asyncHandler(async (req, res) => {
    const dados = await apiConnect.getIBGEPopulationData();
    res.json({ success: true, data: dados });
}));

// Contexto: vitimização
router.get('/api/contexto/vitimizacao', asyncHandler(async (req, res) => {
    const { uf, crime, ano, municipio, mes } = req.query;
    const dados = await apiConnect.getVictimizationData({ uf, crime, ano, municipio, mes });
    res.json({ success: true, data: dados });
}));

// Contexto: gastos em segurança pública
router.get('/api/contexto/gastos-seguranca', asyncHandler(async (req, res) => {
    const dados = await apiConnect.getPublicSecuritySpending(req.query.ano);
    res.json({ success: true, data: dados });
}));

// Contexto: legislação de segurança
router.get('/api/contexto/legislacao-seguranca', asyncHandler(async (req, res) => {
    const dados = await apiConnect.getSecurityLegislation(req.query.ano);
    res.json({ success: true, data: dados });
}));
// Painéis: homicídios
router.get('/api/paineis/homicidios', async (req, res) => {
  try {
    const dadosHomicidios = await apiConnect.getHomicideData();
    res.json(dadosHomicidios);
  } catch (error) {
    console.error("Erro na rota /api/paineis/homicidios:", error);
    res.status(500).json({ message: 'Erro ao buscar dados de homicídios.' });
  }
});
// Painéis: vitimização
router.get('/api/paineis/vitimizacao', async (req, res) => {
  try {
    // req.query conterá os filtros enviados pelo frontend.
    // Ex: se a URL for /api/paineis/vitimizacao?ano=2023&uf=SP,
    // req.query será { ano: '2023', uf: 'SP' }
    console.log('Filtros recebidos:', req.query);

    const dados = await apiConnect.getVictimizationData(req.query);
    
    res.status(200).json(dados);

  } catch (error) {
    console.error("Erro na rota /api/paineis/vitimizacao:", error);
    res.status(500).json({ message: 'Erro no servidor ao buscar dados de vitimização.' });
  }
});
// ================= AUTENTICAÇÃO ADMIN =================

// Login do admin
router.post('/admin-auth', asyncHandler(async (req, res) => {
    testConnection(); // testa conexão ao iniciar
    const { email, password } = req.body;

    const isAdminEmail = email === process.env.ADMIN_EMAIL;
    const isPasswordCorrect = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);

    if (!isAdminEmail || !isPasswordCorrect) {
        return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
    }

    const payload = { email: process.env.ADMIN_EMAIL };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ success: true, message: 'Login bem-sucedido!', token });
}));

// ================= ROTAS PRIVADAS =================

// Rota para BUSCAR uma análise específica por ID
router.get('/api/admin/analyses/:id', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await sql`SELECT * FROM analyses WHERE id = ${id}`;
  
  if (result.length === 0) {
    return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
  }
  
  res.json({ success: true, data: result[0] });
}));
// Rota para buscar a lista de análises com suporte a pesquisa e paginação
router.get('/api/admin/analyses-list', verifyToken, asyncHandler(async (req, res) => {
  // Obtém os parâmetros do URL ou usa valores padrão
  testConnection(); // testa conexão ao iniciar
  const searchTerm = req.query.search || '';
  const limit = parseInt(req.query.limit, 10) || 20;
  const page = parseInt(req.query.page, 10) || 1;
  const offset = (page - 1) * limit;

  // Usa Promise.all para executar a busca dos dados e a contagem total em paralelo
  const [analysesResult, totalResult] = await Promise.all([
    // Query para buscar as análises da página atual, filtrando pelo termo de pesquisa
    sql`
      SELECT id, title, tag, author, TO_CHAR(created_at, 'DD/MM/YYYY') as created_date, description
      FROM analyses 
      WHERE 
        title ILIKE ${'%' + searchTerm + '%'} OR
        tag ILIKE ${'%' + searchTerm + '%'} OR
        author ILIKE ${'%' + searchTerm + '%'}
      ORDER BY created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `,
    // Query para contar o número total de resultados que correspondem à pesquisa
    sql`
      SELECT COUNT(*) 
      FROM analyses
      WHERE 
        title ILIKE ${'%' + searchTerm + '%'} OR
        tag ILIKE ${'%' + searchTerm + '%'} OR
        author ILIKE ${'%' + searchTerm + '%'}
    `
  ]);
  
  const total = parseInt(totalResult[0].count, 10);
  
  // Retorna os dados da página e o total de resultados
  res.json({ 
    success: true, 
    data: {
      analyses: analysesResult,
      total: total
    } 
  });
}));

// --- Rota para CRIAR Análises (SIMPLIFICADA) ---
// Removido 'upload.any()' - não recebemos mais arquivos, apenas JSON.
router.post('/api/admin/analyses', verifyToken, asyncHandler(async (req, res) => {
  try {
    // Os dados agora vêm do req.body como JSON.
    const { 
      title, tag, author, researchDate, description, content, referenceLinks,
      coverImagePath,     // URL da imagem de capa (string)
      documentFilePath, // Arquivos de documento (string JSON)
      dataFilePath      // Arquivos de dados (string JSON)
    } = req.body;

    // Validação dos campos obrigatórios.
    if (!title || !content || !author || !researchDate || !tag || !description) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios em falta.' });
    }

    // A lógica de upload de arquivos foi removida.
    // Inserimos as URLs e os dados de texto diretamente no banco.
    const result = await sql`
      INSERT INTO analyses (
        title, tag, author, research_date, description, content, 
        reference_links, cover_image_path, document_file_path, data_file_path
      )
      VALUES (
        ${title}, ${tag}, ${author}, ${researchDate}, ${description}, ${content}, 
        ${referenceLinks}, 
        ${coverImagePath || null},
        ${documentFilePath},
        ${dataFilePath}
      )
      RETURNING id;`;
    
    const newId = result[0]?.id;
    res.status(201).json({ success: true, message: `Análise "${title}" publicada com sucesso!`, analysisId: newId });

  } catch (err) {
    console.error('[DEBUG] Erro inesperado ao CRIAR análise:', err);
    res.status(500).json({ success: false, message: 'Erro inesperado ao publicar análise.', error: err.message });
  }
}));

// --- Rota para ATUALIZAR uma Análise (REFEITA) ---
// Removido 'upload.any()'. A rota agora limpa arquivos órfãos.
router.put('/api/admin/analyses/:id', verifyToken, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Busca os dados antigos da análise para comparar os arquivos.
    const oldResult = await sql`SELECT * FROM analyses WHERE id = ${id}`;
    if (!oldResult.length) {
      return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
    }
    const oldAnalysis = oldResult[0];

    // 2. Obtém os novos dados do corpo da requisição.
    const { 
      title, tag, author, research_date, description, content, reference_links,
      coverImagePath: newCoverImagePath,
      documentFilePath: newDocumentFilePath,
      dataFilePath: newDataFilePath
    } = req.body;

    // 3. Lógica para deletar arquivos órfãos do B2.
    // Monta um Set com todas as URLs de arquivos que devem permanecer.
    const newDocumentFiles = JSON.parse(newDocumentFilePath || '[]');
    const newDataFiles = JSON.parse(newDataFilePath || '[]');
    const newContentImageUrls = (content.match(/https?:\/\/[^\s"'<>()]+/g) || []).filter(url => url.includes(process.env.B2_ENDPOINT));
    
    const finalFileUrls = new Set([
        newCoverImagePath,
        ...newDocumentFiles.map(f => f.path),
        ...newDataFiles.map(f => f.path),
        ...newContentImageUrls
    ].filter(Boolean)); // .filter(Boolean) remove valores nulos ou vazios

    // Monta uma lista com todas as URLs de arquivos antigos.
    const oldDocumentFiles = oldAnalysis.document_file_path || [];
    const oldDataFiles = oldAnalysis.data_file_path || [];
    const oldContentImageUrls = (oldAnalysis.content.match(/https?:\/\/[^\s"'<>()]+/g) || []).filter(url => url.includes(process.env.B2_ENDPOINT));

    const oldFileUrls = [
        oldAnalysis.cover_image_path,
        ...oldDocumentFiles.map(f => f.path),
        ...oldDataFiles.map(f => f.path),
        ...oldContentImageUrls
    ].filter(Boolean);

    // Compara as listas e marca para exclusão os arquivos que não estão na nova lista.
    const filesToDelete = oldFileUrls.filter(oldUrl => !finalFileUrls.has(oldUrl));

    if (filesToDelete.length > 0) {
      console.log(`[B2 DEBUG] Deletando ${filesToDelete.length} arquivos órfãos para a análise ID: ${id}`);
      await Promise.all(filesToDelete.map(deleteFileFromS3));
    }

    // 4. Atualiza o banco de dados com as novas informações.
    await sql`
      UPDATE analyses 
      SET 
        title = ${title}, 
        tag = ${tag}, 
        author = ${author}, 
        research_date = ${research_date}, 
        description = ${description}, 
        content = ${content}, 
        reference_links = ${reference_links},
        cover_image_path = ${newCoverImagePath || null}, 
        document_file_path = ${newDocumentFilePath}, 
        data_file_path = ${newDataFilePath}
      WHERE id = ${id}`;

    res.json({ success: true, message: 'Análise atualizada com sucesso!' });

  } catch (err) {
    console.error('[DEBUG] Erro inesperado ao ATUALIZAR análise:', err);
    res.status(500).json({ success: false, message: 'Erro inesperado ao atualizar análise.', error: err.message });
  }
}));

// --- Rota para EXCLUIR uma Análise (LÓGICA MANTIDA E CORRIGIDA) ---
// A lógica original está correta: ao deletar um post, o backend deve limpar todos os arquivos.
router.delete('/api/admin/analyses/:id', verifyToken, asyncHandler(async (req, res) => {
  try {
    const isConnected = await testConnectionData(); // Verifica a conexão com o B2.
    if (!isConnected) {
      return res.status(500).json({ success: false, message: 'Não foi possível conectar ao servidor de arquivos.' });
    }

    const { id } = req.params;
    console.log(`[DEBUG] Recebida requisição para DELETAR análise ID: ${id}`);

    const analysisResult = await sql`SELECT * FROM analyses WHERE id = ${id}`;
    
    if (analysisResult.length === 0) {
      return res.status(404).json({ success: false, message: 'Análise não encontrada para exclusão.' });
    }
    const analysis = analysisResult[0];

    // Monta a lista de TODOS os arquivos associados à análise.
    const filesToDelete = [];
    if (analysis.cover_image_path) filesToDelete.push(analysis.cover_image_path);
    (analysis.document_file_path || []).forEach(file => filesToDelete.push(file.path));
    (analysis.data_file_path || []).forEach(file => filesToDelete.push(file.path));
    const contentImageUrls = (analysis.content.match(/https?:\/\/[^\s"'<>()]+/g) || []);
    filesToDelete.push(...contentImageUrls.filter(url => url.includes(process.env.B2_ENDPOINT)));
    
    console.log(`[DEBUG] ${filesToDelete.length} arquivos marcados para exclusão no B2.`);

    // Deleta os arquivos do B2.
    if (filesToDelete.length > 0) {
      await Promise.all(filesToDelete.map(deleteFileFromS3));
      console.log(`[DEBUG] Arquivos no B2 foram deletados para a análise ID: ${id}`);
    }

    // Deleta a análise do banco de dados.
    const result = await sql`DELETE FROM analyses WHERE id = ${id} RETURNING title`;
    
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Análise não encontrada durante a exclusão final.' });
    }
    
    const deletedTitle = result[0].title;
    console.log(`[DEBUG] Análise "${deletedTitle}" (ID: ${id}) deletada com sucesso do banco de dados.`);
    res.json({ success: true, message: `Análise "${deletedTitle}" foi excluída com sucesso.` });

  } catch (err) {
    console.error(`[DEBUG] Erro inesperado ao DELETAR análise:`, err);
    res.status(500).json({ success: false, message: 'Erro inesperado ao excluir análise.', error: err.message });
  }
}));

// Rota para fornecer todos os dados agregados para o dashboard
router.get('/api/admin/dashboard-data', verifyToken, asyncHandler(async (req, res) => {
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

router.get('/api/admin/data', verifyToken, (req, res) => {
    res.json({
        success: true,
        message: `Dados secretos para o usuário ${req.user.email}`,
        data: [
            { id: 1, pesquisa: 'Impacto da Urbanização na Criminalidade', ano: 2023 },
            { id: 2, pesquisa: 'Análise de Vitimização em Capitais', ano: 2024 },
            { id: 3, pesquisa: 'Eficiência do Policiamento Comunitário', ano: 2022 }
        ]
    });
});

// ================= HANDLER GLOBAL DE ERROS =================
router.use((err, req, res, next) => {
    console.error("❌ Erro interno:", err.message);
    res.status(500).json({
        success: false,
        message: 'Erro interno no servidor. Tente novamente mais tarde.'
    });
});

module.exports = router;
