// routes.js
require('dotenv').config();
const express = require('express');
const router = express.Router();

const publicRoutes = require('./publicRoutes');
const adminRoutes = require('./adminRoutes');

// Monta rotas públicas e privadas
router.use('/', publicRoutes);
router.use('/api/admin', adminRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Backend is online'
  });
});

module.exports = router;
