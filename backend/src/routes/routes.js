const {asyncHandler, verifyToken, upload} = require('../middleware/middlewares.js');

require('dotenv').config();
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const {
    getIBGEPopulationData,
    getVictimizationData,
    getPublicSecuritySpending,
    getSecurityLegislation,
    getHomicideData
} = require('../api/apiConnect');

const { testConnection, sql } = require('../db/dbConnect');




// ================= ROTAS PÚBLICAS =================

// Status da API
router.get('/', async (req, res) => {
    await testConnection();
    res.json({ success: true, message: 'Bem-vindo ao Pulso Urbano API!' });
});

// Contexto: população IBGE
router.get('/api/contexto/populacao', asyncHandler(async (req, res) => {
    const dados = await getIBGEPopulationData();
    res.json({ success: true, data: dados });
}));

// Contexto: vitimização
router.get('/api/contexto/vitimizacao', asyncHandler(async (req, res) => {
    const { uf, crime, ano, municipio, mes } = req.query;
    const dados = await getVictimizationData({ uf, crime, ano, municipio, mes });
    res.json({ success: true, data: dados });
}));

// Contexto: gastos em segurança pública
router.get('/api/contexto/gastos-seguranca', asyncHandler(async (req, res) => {
    const dados = await getPublicSecuritySpending(req.query.ano);
    res.json({ success: true, data: dados });
}));

// Contexto: legislação de segurança
router.get('/api/contexto/legislacao-seguranca', asyncHandler(async (req, res) => {
    const dados = await getSecurityLegislation(req.query.ano);
    res.json({ success: true, data: dados });
}));
// Painéis: homicídios
router.get('/api/paineis/homicidios', async (req, res) => {
  try {
    const dadosHomicidios = await getHomicideData();
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

    const dados = await getVictimizationData(req.query);
    
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

// --- Rota para Criar Análises ---
router.post(
  '/api/admin/analyses',
  verifyToken,
  upload.any(),
  asyncHandler(async (req, res) => {
    // --- [DEBUG] Início do Processo ---
    console.log('----------------------------------------------------');
    console.log(`[DEBUG] Nova análise recebida do utilizador: ${req.user.email}`);
    console.debug('[DEBUG] Corpo da requisição (texto):', req.body);
    console.debug('[DEBUG] Ficheiros recebidos:', req.files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname })));

    // Extrai os campos de texto do req.body
    let { title, tag, author, researchDate, description, content, referenceLinks } = req.body;
    
    // --- [NOVO] Validação de Campos Obrigatórios ---
    if (!title || !content || !author || !researchDate || !tag || !description) {
      // Retorna um erro 400 (Bad Request) se faltar um campo essencial
      return res.status(400).json({ success: false, message: 'Erro de validação: Todos os campos marcados com * são obrigatórios.' });
    }

    // Separa os ficheiros de anexo dos ficheiros de conteúdo
    const coverImageFile = req.files.find(f => f.fieldname === 'coverImage');
    const documentFileFile = req.files.find(f => f.fieldname === 'documentFile');
    const dataFileFile = req.files.find(f => f.fieldname === 'dataFile');

    // Normaliza os caminhos dos ficheiros para serem usados como URL
    const coverImagePath = coverImageFile ? coverImageFile.path.replace(/\\/g, '/') : null;
    const documentFilePath = documentFileFile ? documentFileFile.path.replace(/\\/g, '/') : null;
    const dataFilePath = dataFileFile ? dataFileFile.path.replace(/\\/g, '/') : null;

    // --- [DEBUG] Processamento das Imagens do Conteúdo ---
    const contentImageFiles = req.files.filter(f => f.fieldname.startsWith('contentImage_'));
    if (contentImageFiles.length > 0) {
      console.log(`[DEBUG] Encontradas ${contentImageFiles.length} imagens de conteúdo para processar.`);
      for (const file of contentImageFiles) {
        const placeholder = file.fieldname;
        const publicUrl = `/${file.path.replace(/\\/g, '/')}`;
        
        // Substitui o placeholder no texto pelo URL final da imagem
        content = content.replace(placeholder, publicUrl);
        console.debug(`[DEBUG] Placeholder "${placeholder}" substituído por "${publicUrl}"`);
      }
    } else {
        console.log('[DEBUG] Nenhuma imagem de conteúdo para processar.');
    }

    // --- [DEBUG] Query Final para a Base de Dados ---
    console.log('[DEBUG] A executar a query de INSERT na base de dados...');
    console.debug('[DEBUG] Conteúdo final a ser guardado:', content.substring(0, 100) + '...'); // Mostra um excerto do conteúdo

    const result = await sql`
      INSERT INTO analyses (
        title, tag, author, research_date, description, content, reference_links, 
        cover_image_path, document_file_path, data_file_path
      ) VALUES (
        ${title}, ${tag}, ${author}, ${researchDate}, ${description}, ${content}, ${referenceLinks}, 
        ${coverImagePath}, ${documentFilePath}, ${dataFilePath}
      )
      RETURNING id; 
    `;

    const newId = result[0]?.id;

    // --- [DEBUG] Conclusão do Processo ---
    console.log(`[DEBUG] ✅ Conclusão: Análise "${title}" guardada com sucesso! Novo ID: ${newId}`);
    console.log('----------------------------------------------------\n');
    
    res.status(201).json({ 
      success: true, 
      message: `Análise "${title}" publicada com sucesso!`,
      analysisId: newId 
    });
  })
);

// Rota para buscar a lista de análises com suporte a pesquisa e paginação
router.get('/api/admin/analyses-list', verifyToken, asyncHandler(async (req, res) => {
  // Obtém os parâmetros do URL ou usa valores padrão
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

// Rota para BUSCAR uma análise específica por ID
router.get('/api/admin/analyses/:id', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await sql`SELECT * FROM analyses WHERE id = ${id}`;
  
  if (result.length === 0) {
    return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
  }
  
  res.json({ success: true, data: result[0] });
}));


// Rota para ATUALIZAR uma análise
router.put(
  '/api/admin/analyses/:id', 
  verifyToken, 
  upload.any(), // Usamos .any() para lidar com os placeholders dinâmicos das imagens
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    let { title, tag, author, research_date, description, content, reference_links } = req.body;
    
    // NOTA: Uma implementação completa aqui também apagaria os ficheiros antigos do servidor se eles forem substituídos.
    // Esta versão foca-se em guardar os novos dados.

    // Separa os ficheiros de anexo dos ficheiros de conteúdo
    const newCoverImageFile = req.files.find(f => f.fieldname === 'newCoverImage');
    // ... encontre outros ficheiros de anexo da mesma forma ...

    // Se um novo ficheiro de capa foi enviado, atualiza o caminho, senão mantém o antigo (que vem no body)
    const coverImagePath = newCoverImageFile 
      ? newCoverImageFile.path.replace(/\\/g, '/') 
      : req.body.cover_image_path; // Mantém o valor existente se não for substituído

    // Processa as *novas* imagens inseridas no conteúdo
    const contentImageFiles = req.files.filter(f => f.fieldname.startsWith('contentImage_'));
    if (contentImageFiles.length > 0) {
      for (const file of contentImageFiles) {
        const placeholder = file.fieldname;
        const publicUrl = `/${file.path.replace(/\\/g, '/')}`;
        content = content.replace(placeholder, publicUrl);
      }
    }
    
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
        cover_image_path = ${coverImagePath}
        -- adicione outras colunas de ficheiros aqui
      WHERE id = ${id}
    `;
    
    res.json({ success: true, message: 'Análise atualizada com sucesso!' });
}));


// Rota para EXCLUIR uma análise
router.delete('/api/admin/analyses/:id', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Opcional, mas recomendado: antes de excluir do DB, apague os ficheiros associados do servidor.
  // const analysis = await sql`SELECT * FROM analyses WHERE id = ${id}`;
  // if (analysis[0].cover_image_path) { fs.unlinkSync(analysis[0].cover_image_path); }
  
  const result = await sql`DELETE FROM analyses WHERE id = ${id} RETURNING title`;
  
  if (result.length === 0) {
    return res.status(404).json({ success: false, message: 'Análise não encontrada para exclusão.' });
  }
  
  res.json({ success: true, message: `Análise "${result[0].title}" foi excluída com sucesso.` });
}));

// --- Rota para executar queries SQL arbitrárias (CUIDADO!) ---

router.post('/api/sql-query', verifyToken, asyncHandler(async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ success: false, error: 'A query não pode estar vazia.' });
    }

    if (query.trim().split(';').filter(s => s.length > 0).length > 1) {
        return res.status(400).json({ success: false, error: 'Múltiplos comandos SQL não são permitidos.' });
    }

    console.log(`Executando query pelo usuário ${req.user.email}:`, query);

    try {
        const result = await sql(query);

        // SELECT retorna rows
        if (/^\s*select/i.test(query)) {
            res.json({ success: true, data: result });
        } else {
            res.json({
                success: true,
                data: [{
                    status: `Comando executado com sucesso.`,
                    linhas_afetadas: result.length ?? 'N/A'
                }],
            });
        }
    } catch (err) {
        console.error('Erro ao executar query:', err);
        res.status(500).json({ success: false, error: 'Erro ao executar query.' });
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
