// publicRoutes.js
const express = require('express');
const router = express.Router();
const {asyncHandler} = require('../middleware/middlewares');
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

router.post('/admin-auth', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const isAdminEmail = email === process.env.ADMIN_EMAIL;
  const isPasswordCorrect = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);

  if (!isAdminEmail || !isPasswordCorrect) {
    return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
  }

  const payload = { email: process.env.ADMIN_EMAIL };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '168h' });

  res.json({ success: true, message: 'Login bem-sucedido!', token });
}));

module.exports = router;