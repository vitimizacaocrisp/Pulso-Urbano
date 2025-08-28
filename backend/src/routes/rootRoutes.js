const express = require('express');
const { testConnection } = require('../db/dbConnect');
const router = express.Router();

// ================= ROTAS PÚBLICAS ("/") =================

// Status da API
router.get('/', async (req, res) => {
  await testConnection();
  res.json({ success: true, message: 'Bem-vindo ao Pulso Urbano API!' });
});

module.exports = router;
