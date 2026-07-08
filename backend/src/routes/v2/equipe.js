// ─────────────────────────────────────────────────────────────────────
// Gestão de contas (doc 03) — montado em /api/admin.
// Listagem: qualquer admin (leitura). Mutações: superadmin.
// Toda ação sensível → audit_log. Desativar/mudar role invalida a sessão alvo.
// ─────────────────────────────────────────────────────────────────────
const express = require('express');
const { z } = require('zod');
const router = express.Router();
const { asyncHandler } = require('../../middleware/middlewares');
const { requireAdmin, requireSuperadmin } = require('../../middleware/authV2');
const { q } = require('../../db/pool');
const acc = require('../../services/accounts');
const tokens = require('../../services/authTokens');
const sessionCache = require('../../services/sessionCache');
const { sendEmail } = require('../../services/email');
const audit = require('../../services/audit');

const err = (res, s, code, message) => res.status(s).json({ success: false, error: { code, message } });
const emailSchema = z.string().trim().toLowerCase().email();

// paginação simples
function pagina(req) {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 100);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  return { limit, offset: (page - 1) * limit, page };
}

// ── listar admins (qualquer admin) ───────────────────────────────────
router.get('/admins', requireAdmin, asyncHandler(async (req, res) => {
  const { limit, offset, page } = pagina(req);
  const [rows, total] = await Promise.all([
    q(`SELECT id, nome, email, role, is_active, ultimo_login, created_at
       FROM admins WHERE deleted_at IS NULL ORDER BY id LIMIT $1 OFFSET $2`, [limit, offset]),
    q(`SELECT COUNT(*)::int n FROM admins WHERE deleted_at IS NULL`),
  ]);
  res.json({ success: true, data: { itens: rows.rows, total: total.rows[0].n, page } });
}));

// ── listar usuários (qualquer admin) ─────────────────────────────────
router.get('/usuarios', requireAdmin, asyncHandler(async (req, res) => {
  const { limit, offset, page } = pagina(req);
  const busca = String(req.query.q || '').trim();
  const cond = busca ? `AND (nome ILIKE $3 OR email ILIKE $3)` : '';
  const params = busca ? [limit, offset, `%${busca}%`] : [limit, offset];
  const [rows, total] = await Promise.all([
    q(`SELECT id, nome, email, email_verificado, is_active, ultimo_login, created_at
       FROM users WHERE deleted_at IS NULL ${cond} ORDER BY id DESC LIMIT $1 OFFSET $2`, params),
    q(`SELECT COUNT(*)::int n FROM users WHERE deleted_at IS NULL`),
  ]);
  res.json({ success: true, data: { itens: rows.rows, total: total.rows[0].n, page } });
}));

// ── criar admin (superadmin) → envia convite p/ definir senha ────────
router.post('/admins', requireSuperadmin, express.json(), asyncHandler(async (req, res) => {
  const email = emailSchema.safeParse(req.body?.email);
  const nome = String(req.body?.nome || '').trim().slice(0, 120);
  const role = ['editor', 'superadmin'].includes(req.body?.role) ? req.body.role : 'editor';
  if (!email.success || !nome) return err(res, 400, 'validacao_falhou', 'Nome e e-mail válidos são obrigatórios.');
  const dup = await q(`SELECT 1 FROM admins WHERE lower(email)=$1 AND deleted_at IS NULL`, [email.data]);
  if (dup.rows.length) return err(res, 409, 'email_em_uso', 'Já existe admin com este e-mail.');

  // senha aleatória temporária; admin define a real pelo link do convite (nunca senha em texto)
  const crypto = require('crypto');
  const ins = await q(
    `INSERT INTO admins (nome, email, senha_hash, role) VALUES ($1,$2,$3,$4) RETURNING id`,
    [nome, email.data, acc.hashSenha(crypto.randomBytes(24).toString('base64url')), role]);
  const token = await tokens.criar('admin', ins.rows[0].id, 'reset_senha'); // define senha = reset
  await sendEmail({ to: email.data, template: 'convite_admin', dados: { token } });
  await audit.log(req, { atorTipo: 'admin', atorId: req.auth.id, acao: 'admin_criado', alvoTipo: 'admin', alvoId: ins.rows[0].id, dados: { role } });
  res.status(201).json({ success: true, data: { id: ins.rows[0].id } });
}));

// ── alterar admin: role / ativar-desativar (superadmin) ──────────────
router.patch('/admins/:id', requireSuperadmin, express.json(), asyncHandler(async (req, res) => {
  const alvo = parseInt(req.params.id, 10);
  const r = await q(`SELECT id, role, is_active FROM admins WHERE id=$1 AND deleted_at IS NULL`, [alvo]);
  if (!r.rows.length) return err(res, 404, 'nao_encontrado', 'Admin não encontrado.');

  const novoRole = ['editor', 'superadmin'].includes(req.body?.role) ? req.body.role : r.rows[0].role;
  const novoAtivo = typeof req.body?.is_active === 'boolean' ? req.body.is_active : r.rows[0].is_active;

  // proteção: não rebaixar/desativar o ÚLTIMO superadmin ativo
  if ((r.rows[0].role === 'superadmin') && (novoRole !== 'superadmin' || !novoAtivo)) {
    const outros = await q(
      `SELECT COUNT(*)::int n FROM admins WHERE role='superadmin' AND is_active AND deleted_at IS NULL AND id<>$1`, [alvo]);
    if (outros.rows[0].n === 0) return err(res, 409, 'ultimo_superadmin', 'Não é possível remover o último superadmin ativo.');
  }
  await q(`UPDATE admins SET role=$1, is_active=$2 WHERE id=$3`, [novoRole, novoAtivo, alvo]);
  // mudança de role/desativação invalida a sessão do alvo (kick imediato — doc 04)
  await sessionCache.invalidate('admin', alvo);
  if (!novoAtivo) await q(`UPDATE admins SET session_id=NULL WHERE id=$1`, [alvo]);
  await audit.log(req, { atorTipo: 'admin', atorId: req.auth.id, acao: 'admin_alterado', alvoTipo: 'admin', alvoId: alvo, dados: { role: novoRole, is_active: novoAtivo } });
  res.json({ success: true });
}));

// ── ativar/desativar usuário (superadmin) ────────────────────────────
router.patch('/usuarios/:id', requireSuperadmin, express.json(), asyncHandler(async (req, res) => {
  const alvo = parseInt(req.params.id, 10);
  if (typeof req.body?.is_active !== 'boolean') return err(res, 400, 'validacao_falhou', 'is_active (boolean) é obrigatório.');
  const r = await q(`UPDATE users SET is_active=$1 WHERE id=$2 AND deleted_at IS NULL RETURNING id`, [req.body.is_active, alvo]);
  if (!r.rows.length) return err(res, 404, 'nao_encontrado', 'Usuário não encontrado.');
  await sessionCache.invalidate('user', alvo);
  if (!req.body.is_active) await q(`UPDATE users SET session_id=NULL WHERE id=$1`, [alvo]);
  await audit.log(req, { atorTipo: 'admin', atorId: req.auth.id, acao: 'usuario_alterado', alvoTipo: 'user', alvoId: alvo, dados: { is_active: req.body.is_active } });
  res.json({ success: true });
}));

// ── log de auditoria (superadmin) ────────────────────────────────────
router.get('/audit', requireSuperadmin, asyncHandler(async (req, res) => {
  const { limit, offset, page } = pagina(req);
  const rows = await q(
    `SELECT id, ator_tipo, ator_id, acao, alvo_tipo, alvo_id, ip, created_at
     FROM audit_log ORDER BY id DESC LIMIT $1 OFFSET $2`, [limit, offset]);
  res.json({ success: true, data: { itens: rows.rows, page } });
}));

module.exports = router;
