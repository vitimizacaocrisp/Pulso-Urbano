const express = require('express');
const rootRoutes = require('./rootRoutes');
const apiRoutes = require('./apiRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.use('/', rootRoutes);
router.use('/api', apiRoutes);
router.use('/admin', adminRoutes);

// Handler global de erros
router.use((err, req, res, next) => {
  console.error("❌ Erro interno:", err.message);
  res.status(500).json({ success: false, message: 'Erro interno no servidor.' });
});

module.exports = router;
