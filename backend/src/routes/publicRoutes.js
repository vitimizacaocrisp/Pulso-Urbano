// publicRoutes.js
const express = require('express');
const router = express.Router();
const {asyncHandler} = require('../middleware/middlewares');
const apiConnect = require('../api/apiConnect');
const { testConnection } = require('../db/dbConnect');
const { testConnectionData } = require('../middleware/s3Connection');
// Rota de autenticação Admin
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Status da API
router.get('/', async (req, res) => {
  await testConnection();
  await testConnectionData();
  res.json({ success: true, message: 'Bem-vindo ao Pulso Urbano API!' });
});

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