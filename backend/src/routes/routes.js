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
  // O middleware da Multer processa os ficheiros ANTES da sua lógica
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'documentFile', maxCount: 1 },
    { name: 'dataFile', maxCount: 1 }
  ]),
  asyncHandler(async (req, res) => {

    testConnection(); // testa conexão ao iniciar

    // --- [DEBUG] Log inicial para verificar os dados recebidos ---
    console.log('----------------------------------------------------');
    console.log('[DEBUG] Nova requisição para /api/admin/analyses');
    console.log('[DEBUG] Dados de Texto (req.body):', req.body);
    console.log('[DEBUG] Dados dos Ficheiros (req.files):', req.files);
    console.log('----------------------------------------------------');

    // Os dados de texto estão em `req.body`
    const { title, tag, description, content, externalLink } = req.body;
    
    // As informações dos ficheiros estão em `req.files`
    // Usamos `?.` (optional chaining) para evitar erros se um ficheiro não for enviado
    const coverImagePath = req.files?.coverImage?.[0]?.path || null;
    const documentFilePath = req.files?.documentFile?.[0]?.path || null;
    const dataFilePath = req.files?.dataFile?.[0]?.path || null;

    // [NOVO] Lógica para guardar as informações na base de dados
    try {
      console.log('[DEBUG] A preparar para inserir os seguintes dados na DB:');
      console.table({ 
          title, tag, description, content, externalLink, 
          coverImagePath, documentFilePath, dataFilePath 
      });

      // Usamos a sintaxe de tagged template literals para uma query parametrizada e segura
      const result = await sql`
        INSERT INTO analyses (
          title, tag, description, content, external_link, 
          cover_image_path, document_file_path, data_file_path
        ) VALUES (
          ${title}, ${tag}, ${description}, ${content}, ${externalLink}, 
          ${coverImagePath}, ${documentFilePath}, ${dataFilePath}
        )
        RETURNING id; 
      `;

      // [DEBUG] Log de sucesso da inserção
      const newId = result[0]?.id;
      console.log(`[DEBUG] ✅ Dados inseridos com sucesso! Novo ID da análise: ${newId}`);

      res.status(201).json({ 
        success: true, 
        message: `Análise "${title}" publicada com sucesso!`,
        analysisId: newId 
      });

    } catch (dbError) {
      // [DEBUG] Log de erro específico da base de dados
      console.error('[DEBUG] ❌ Erro ao inserir na base de dados:', dbError);
      // O asyncHandler irá capturar este erro e enviar uma resposta 500,
      // mas podemos lançar um erro mais específico se quisermos.
      throw new Error('Falha ao guardar a análise na base de dados.');
    }
  })
);

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
// (Esta é uma versão simplificada. Uma versão completa lidaria com a exclusão de ficheiros antigos)
router.put(
  '/api/admin/analyses/:id', 
  verifyToken, 
  upload.fields([ /* ... mesma config da Multer ... */ ]), 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, tag, description, content, externalLink } = req.body;
    
    // NOTA: Para uma implementação profissional, aqui você adicionaria a lógica
    // para verificar se novos ficheiros foram enviados, apagar os antigos do servidor
    // e só então atualizar os caminhos na base de dados.
    
    await sql`
      UPDATE analyses 
      SET 
        title = ${title}, 
        tag = ${tag}, 
        description = ${description}, 
        content = ${content}, 
        external_link = ${externalLink}
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
