// ─────────────────────────────────────────────────────────────────────
// Auth v2 (docs 03/04/07). Fluxos de user e admin compartilham a fábrica;
// register/verificar/confirmar-email são exclusivos de user.
//
// Anti-enumeração: respostas genéricas; login sempre roda bcrypt (dummy hash
// quando a conta não existe) p/ não vazar por timing.
// ─────────────────────────────────────────────────────────────────────
const express = require('express');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { asyncHandler } = require('../../middleware/middlewares');
const { makeRateLimiter } = require('../../middleware/rateLimiter');
const { q, withTx } = require('../../db/pool');
const acc = require('../../services/accounts');
const twofa = require('../../services/twofa');
const tokens = require('../../services/authTokens');
const { sendEmail } = require('../../services/email');
const audit = require('../../services/audit');

const err = (res, s, code, message) => res.status(s).json({ success: false, error: { code, message } });
const genericOk = { success: true, message: 'Se houver uma conta, você receberá um e-mail em instantes.' };

const rl = {
  login: makeRateLimiter({ prefix: 'auth-login', tokens: 5, janela: '15 m', mensagem: 'Muitas tentativas. Tente em alguns minutos.' }),
  register: makeRateLimiter({ prefix: 'auth-register', tokens: 3, janela: '1 h' }),
  esqueci: makeRateLimiter({ prefix: 'auth-esqueci', tokens: 3, janela: '1 h' }),
};

const emailSchema = z.string().trim().toLowerCase().email();

// ── fábrica: login/logout/esqueci/redefinir para um tipo (user|admin) ──
function buildAuth(tipo) {
  const router = express.Router();
  const table = acc.TABLE[tipo];

  router.post('/login', rl.login, express.json(), asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const senha = String(req.body?.password ?? req.body?.senha ?? '');
    const remember = req.body?.rememberMe !== false;
    if (!email || !senha) return err(res, 400, 'validacao_falhou', 'Email e senha são obrigatórios.');

    const r = await q(
      `SELECT id, senha_hash, is_active${tipo === 'admin' ? ', role, totp_enabled' : ''}
       FROM ${table} WHERE lower(email) = $1 AND deleted_at IS NULL LIMIT 1`, [email]);
    const conta = r.rows[0];
    const ok = acc.conferirSenha(senha, conta?.senha_hash); // sempre roda (timing)

    if (!conta || !ok) {
      await audit.log(req, { atorTipo: tipo, atorId: conta?.id ?? null, acao: 'login_falha', dados: { email } });
      return err(res, 401, 'credenciais_invalidas', 'Credenciais inválidas.');
    }
    if (!conta.is_active) return err(res, 401, 'conta_desativada', 'Conta desativada.');

    // 2FA de admin: senha OK mas ainda NÃO emite cookie — devolve um desafio
    // curto (5 min). O código TOTP é conferido em POST /2fa. (doc 07/P10)
    if (tipo === 'admin' && conta.totp_enabled) {
      const challenge = jwt.sign({ id: conta.id, tipo: 'admin', twofa: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
      await audit.log(req, { atorTipo: 'admin', atorId: conta.id, acao: '2fa_desafio' });
      return res.json({ success: true, data: { requer2fa: true, challenge } });
    }

    const sid = await acc.rotacionarSessao(tipo, conta.id);
    acc.emitirCookie(res, { id: conta.id, tipo, sid, remember });
    await audit.log(req, { atorTipo: tipo, atorId: conta.id, acao: 'login_ok' });
    res.json({ success: true, data: { tipo, role: conta.role || 'user' } });
  }));

  router.post('/logout', express.json(), asyncHandler(async (req, res) => {
    // funciona mesmo com sessão expirada: best-effort decodifica p/ encerrar
    const raw = req.cookies?.authToken;
    if (raw) {
      try {
        const p = jwt.verify(raw, process.env.JWT_SECRET);
        if (p?.tipo === tipo && p?.id) await acc.encerrarSessao(tipo, p.id);
      } catch { /* token inválido → só limpa cookie */ }
    }
    acc.limparCookie(res);
    res.json({ success: true });
  }));

  router.post('/esqueci-senha', rl.esqueci, express.json(), asyncHandler(async (req, res) => {
    const parsed = emailSchema.safeParse(req.body?.email);
    if (parsed.success) {
      const r = await q(`SELECT id FROM ${table} WHERE lower(email)=$1 AND is_active AND deleted_at IS NULL`, [parsed.data]);
      if (r.rows.length) {
        await tokens.invalidarPendentes(tipo, r.rows[0].id, 'reset_senha');
        const token = await tokens.criar(tipo, r.rows[0].id, 'reset_senha');
        await sendEmail({ to: parsed.data, template: 'reset_senha', dados: { token, tipo } });
        await audit.log(req, { atorTipo: tipo, atorId: r.rows[0].id, acao: 'reset_solicitado' });
      }
    }
    res.json(genericOk); // idêntico exista ou não a conta
  }));

  router.post('/redefinir-senha', express.json(), asyncHandler(async (req, res) => {
    const { token, senha } = req.body || {};
    const perr = acc.validarSenha(senha);
    if (perr) return err(res, 400, 'validacao_falhou', perr);
    const conta = await withTx(async (c) => tokens.consumir(c, String(token || ''), 'reset_senha'));
    if (!conta || conta.conta_tipo !== tipo) return err(res, 400, 'token_invalido', 'Link inválido ou expirado.');

    await q(`UPDATE ${table} SET senha_hash = $1 WHERE id = $2`, [acc.hashSenha(senha), conta.conta_id]);
    await acc.rotacionarSessao(tipo, conta.conta_id); // derruba sessões existentes
    const e = await q(`SELECT email FROM ${table} WHERE id=$1`, [conta.conta_id]);
    await sendEmail({ to: e.rows[0].email, template: 'aviso_troca_senha', dados: {} });
    await audit.log(req, { atorTipo: tipo, atorId: conta.conta_id, acao: 'senha_redefinida' });
    res.json({ success: true });
  }));

  return router;
}

// ── router de USER (inclui cadastro/verificação) ─────────────────────
const userAuth = buildAuth('user');

userAuth.post('/register', rl.register, express.json(), asyncHandler(async (req, res) => {
  const email = emailSchema.safeParse(req.body?.email);
  const nome = String(req.body?.nome || '').trim().slice(0, 120) || null;
  const perr = acc.validarSenha(req.body?.senha ?? req.body?.password);
  if (!email.success) return err(res, 400, 'validacao_falhou', 'E-mail inválido.');
  if (perr) return err(res, 400, 'validacao_falhou', perr);

  const existe = await q(`SELECT 1 FROM users WHERE lower(email)=$1 AND deleted_at IS NULL`, [email.data]);
  if (!existe.rows.length) {
    const ins = await q(
      `INSERT INTO users (nome, email, senha_hash) VALUES ($1,$2,$3) RETURNING id`,
      [nome, email.data, acc.hashSenha(req.body.senha ?? req.body.password)]);
    const token = await tokens.criar('user', ins.rows[0].id, 'verificar_email');
    await sendEmail({ to: email.data, template: 'verificar_email', dados: { nome, token } });
    await audit.log(req, { atorTipo: 'user', atorId: ins.rows[0].id, acao: 'cadastro' });
  }
  res.status(201).json({ success: true, message: 'Cadastro recebido. Verifique seu e-mail para ativar a conta.' });
}));

userAuth.post('/verificar', express.json(), asyncHandler(async (req, res) => {
  const conta = await withTx(async (c) => tokens.consumir(c, String(req.body?.token || ''), 'verificar_email'));
  if (!conta) return err(res, 400, 'token_invalido', 'Link inválido ou expirado.');
  await q(`UPDATE users SET email_verificado = TRUE WHERE id = $1`, [conta.conta_id]);
  res.json({ success: true });
}));

userAuth.post('/confirmar-email', express.json(), asyncHandler(async (req, res) => {
  const conta = await withTx(async (c) => tokens.consumir(c, String(req.body?.token || ''), 'trocar_email'));
  if (!conta) return err(res, 400, 'token_invalido', 'Link inválido ou expirado.');
  const novo = conta.payload?.novo_email;
  if (!novo) return err(res, 400, 'token_invalido', 'Token sem e-mail alvo.');
  // corrida: e-mail pode ter sido tomado nesse meio-tempo
  const dup = await q(`SELECT 1 FROM users WHERE lower(email)=lower($1) AND id<>$2 AND deleted_at IS NULL`, [novo, conta.conta_id]);
  if (dup.rows.length) return err(res, 409, 'email_em_uso', 'Este e-mail já está em uso.');
  await q(`UPDATE users SET email=$1, email_pendente=NULL, email_verificado=TRUE WHERE id=$2`, [novo, conta.conta_id]);
  await acc.rotacionarSessao('user', conta.conta_id);
  await audit.log(req, { atorTipo: 'user', atorId: conta.conta_id, acao: 'email_trocado' });
  res.json({ success: true });
}));

// ── router de ADMIN (inclui verificação de 2FA no login) ─────────────
const adminAuth = buildAuth('admin');

// Segundo passo do login de admin com 2FA: recebe o desafio + código TOTP
// (ou um código de recuperação, consumido no uso). Emite o cookie de sessão.
adminAuth.post('/2fa', rl.login, express.json(), asyncHandler(async (req, res) => {
  const { challenge, code } = req.body || {};
  let p;
  try { p = jwt.verify(String(challenge || ''), process.env.JWT_SECRET); }
  catch { return err(res, 401, 'challenge_invalido', 'Verificação expirada. Faça login novamente.'); }
  if (p.twofa !== true || p.tipo !== 'admin' || !p.id) {
    return err(res, 401, 'challenge_invalido', 'Desafio inválido.');
  }
  const r = await q(
    `SELECT id, is_active, role, totp_secret, totp_recovery FROM admins WHERE id = $1 AND deleted_at IS NULL`, [p.id]);
  const a = r.rows[0];
  if (!a || !a.is_active) return err(res, 401, 'conta_desativada', 'Conta indisponível.');

  const input = String(code || '').replace(/\s+/g, '');
  let ok = await twofa.conferir(a.totp_secret, input);

  // fallback: código de recuperação (consome-se ao usar)
  if (!ok && Array.isArray(a.totp_recovery)) {
    const h = twofa.hashCode(input);
    if (a.totp_recovery.includes(h)) {
      ok = true;
      const rest = a.totp_recovery.filter((x) => x !== h);
      await q(`UPDATE admins SET totp_recovery = $1 WHERE id = $2`, [JSON.stringify(rest), a.id]);
      await audit.log(req, { atorTipo: 'admin', atorId: a.id, acao: '2fa_recovery_usado', dados: { restantes: rest.length } });
    }
  }
  if (!ok) {
    await audit.log(req, { atorTipo: 'admin', atorId: a.id, acao: '2fa_falha' });
    return err(res, 401, 'codigo_invalido', 'Código inválido.');
  }
  const sid = await acc.rotacionarSessao('admin', a.id);
  acc.emitirCookie(res, { id: a.id, tipo: 'admin', sid, remember: true });
  await audit.log(req, { atorTipo: 'admin', atorId: a.id, acao: 'login_ok_2fa' });
  res.json({ success: true, data: { tipo: 'admin', role: a.role } });
}));

module.exports = { userAuth, adminAuth };
