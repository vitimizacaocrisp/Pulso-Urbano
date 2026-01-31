// routes.js
require('dotenv').config();
const express = require('express');
const router = express.Router();

const publicRoutes = require('./publicRoutes');
const adminRoutes = require('./adminRoutes');

// Monta rotas públicas e privadas
router.use('/', publicRoutes);
router.use('/api/admin', adminRoutes);

module.exports = router;
