// routes.js
import 'dotenv/config';
import express from 'express';
const router = express.Router();

import publicRoutes from './publicRoutes';
import adminRoutes from './adminRoutes';
// v2 (schema novo: postagens/pt_*) — convive com as rotas legadas (analyses)
// durante as Fases 3/4; caminhos não colidem. Doc: docs/planejamento/06-api.md
import v2Public from './v2/postagensPublic';
import v2Admin from './v2/postagensAdmin';
import { userAuth, adminAuth } from './v2/auth';
import v2Conta from './v2/conta';
import v2Equipe from './v2/equipe';
import v2Twofa from './v2/twofa';
import v2Cron from './v2/cron';
// Editor Alpha (GraphicStudio): documento em JSON. Admin escreve, público lê
// só o que está publicado. Requer a migração 2026_studio_documents.sql.
import * as v2Studio from './v2/studioAlpha';

// Monta rotas públicas e privadas
router.use('/', publicRoutes);
router.use('/', v2Public);
router.use('/', v2Studio.publico);           // GET /api/studio/:slug (publicado)
router.use('/api/auth', userAuth);          // cadastro/login/reset de usuário
router.use('/api/admin/auth', adminAuth);   // login/reset de admin
router.use('/api/me', v2Conta);             // conta própria (user e admin)
router.use('/api/cron', v2Cron);            // tarefas agendadas (Vercel Cron)
router.use('/api/admin/2fa', v2Twofa);      // 2FA TOTP do admin (setup/enable/disable)
router.use('/api/admin', v2Equipe);         // gestão de contas (/admins, /usuarios, /audit)
router.use('/api/admin', adminRoutes);
router.use('/api/admin', v2Admin);
router.use('/api/admin', v2Studio.admin);   // documentos do Editor Alpha

export default router;
