const express = require('express');
const { asyncHandler } = require('../middleware/middlewares.js');
const {
  getIBGEPopulationData,
  getVictimizationData,
  getPublicSecuritySpending,
  getSecurityLegislation,
  getHomicideData
} = require('../api/apiConnect');

const router = express.Router();

// ================= ROTAS "/api" =================

// Contexto: população IBGE
router.get('/contexto/populacao', asyncHandler(async (req, res) => {
  const dados = await getIBGEPopulationData();
  res.json({ success: true, data: dados });
}));

// Contexto: vitimização
router.get('/contexto/vitimizacao', asyncHandler(async (req, res) => {
  const { uf, crime, ano, municipio, mes } = req.query;
  const dados = await getVictimizationData({ uf, crime, ano, municipio, mes });
  res.json({ success: true, data: dados });
}));

// Contexto: gastos em segurança pública
router.get('/contexto/gastos-seguranca', asyncHandler(async (req, res) => {
  const dados = await getPublicSecuritySpending(req.query.ano);
  res.json({ success: true, data: dados });
}));

// Contexto: legislação de segurança
router.get('/contexto/legislacao-seguranca', asyncHandler(async (req, res) => {
  const dados = await getSecurityLegislation(req.query.ano);
  res.json({ success: true, data: dados });
}));

// Painéis: homicídios
router.get('/paineis/homicidios', asyncHandler(async (req, res) => {
  const dados = await getHomicideData();
  res.json(dados);
}));

// Painéis: vitimização
router.get('/paineis/vitimizacao', asyncHandler(async (req, res) => {
  const dados = await getVictimizationData(req.query);
  res.json(dados);
}));

module.exports = router;
