// publicRoutes.js
const express = require('express');
const router = express.Router();
const {asyncHandler} = require('../middleware/middlewares');
const apiConnect = require('../api/apiConnect');
const { testConnection } = require('../db/dbConnect');
const { testConnectionData } = require('../middleware/s3Connection');
const { sql } = require('../db/dbConnect');
// Rota de autenticação Admin
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Status da API
router.get('/', async (req, res) => {
  await testConnection();
  await testConnectionData();
  res.json({ success: true, message: 'Bem-vindo ao Pulso Urbano API!' });
});

// ROTA PÚBLICA PARA LER UMA ANÁLISE
router.get('/api/analyses/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const results = await sql`
    SELECT id, title, subtitle, last_update, study_period, source, category,
           tag, author, description, content, reference_links,
           cover_image_path, document_file_path, data_file_path
    FROM analyses 
    WHERE id = ${id}
  `;

  if (results.length === 0) {
    return res.status(404).json({ success: false, message: 'Análise não encontrada.' });
  }

  res.json({ success: true, data: results[0] });
}));
router.get('/api/analyses-list', asyncHandler(async (req, res) => {
  // Esta é uma versão simplificada da rota de admin, sem filtros complexos
  const analyses = await sql`
    SELECT id, title, author, tag, description, cover_image_path, created_at, category 
    FROM analyses 
    ORDER BY created_at DESC
  `;
  
  res.json({ 
    success: true, 
    data: { 
      analyses,
      total: analyses.length
    } 
  });
}));


// Contextos API
router.get('/api/contexto/populacao', asyncHandler(async (req, res) => {
  const dados = await apiConnect.getIBGEPopulationData();
  res.json({ success: true, data: dados });
}));

router.get('/api/contexto/vitimizacao', asyncHandler(async (req, res) => {
  const { uf, crime, ano, municipio, mes } = req.query;
  const dados = await apiConnect.getVictimizationData({ uf, crime, ano, municipio, mes });
  res.json({ success: true, data: dados });
}));

router.get('/api/contexto/gastos-seguranca', asyncHandler(async (req, res) => {
  const dados = await apiConnect.getPublicSecuritySpending(req.query.ano);
  res.json({ success: true, data: dados });
}));

router.get('/api/contexto/legislacao-seguranca', asyncHandler(async (req, res) => {
  const dados = await apiConnect.getSecurityLegislation(req.query.ano);
  res.json({ success: true, data: dados });
}));

// Paineis API
router.get('/api/paineis/homicidios', async (req, res) => {
  try {
    const dadosHomicidios = await apiConnect.getHomicideData();
    res.json(dadosHomicidios);
  } catch (error) {
    console.error("Erro na rota /api/paineis/homicidios:", error);
    res.status(500).json({ message: 'Erro ao buscar dados de homicídios.' });
  }
});

router.get('/api/paineis/vitimizacao', async (req, res) => {
  try {
    console.log('Filtros recebidos:', req.query);
    const dados = await apiConnect.getVictimizationData(req.query);
    res.status(200).json(dados);
  } catch (error) {
    console.error("Erro na rota /api/paineis/vitimizacao:", error);
    res.status(500).json({ message: 'Erro no servidor ao buscar dados de vitimização.' });
  }
});

router.post('/admin-auth', asyncHandler(async (req, res) => {
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

module.exports = router;