// routes.js
require('dotenv').config();
const express = require('express');
const router = express.Router();

const publicRoutes = require('./publicRoutes');
const adminRoutes = require('./adminRoutes');
// v2 (schema novo: postagens/pt_*) — convive com as rotas legadas (analyses)
// durante as Fases 3/4; caminhos não colidem. Doc: docs/planejamento/06-api.md
const v2Public = require('./v2/postagensPublic');
const v2Admin  = require('./v2/postagensAdmin');
const { userAuth, adminAuth } = require('./v2/auth');
const v2Conta  = require('./v2/conta');
const v2Equipe = require('./v2/equipe');
const v2Twofa  = require('./v2/twofa');

// Monta rotas públicas e privadas
router.use('/', publicRoutes);
router.use('/', v2Public);
router.use('/api/auth', userAuth);          // cadastro/login/reset de usuário
router.use('/api/admin/auth', adminAuth);   // login/reset de admin
router.use('/api/me', v2Conta);             // conta própria (user e admin)
router.use('/api/admin/2fa', v2Twofa);      // 2FA TOTP do admin (setup/enable/disable)
router.use('/api/admin', v2Equipe);         // gestão de contas (/admins, /usuarios, /audit)
router.use('/api/admin', adminRoutes);
router.use('/api/admin', v2Admin);

module.exports = router;
