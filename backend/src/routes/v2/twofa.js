// ─────────────────────────────────────────────────────────────────────
// Gestão de 2FA TOTP do próprio admin (doc 07/P10). requireAdmin.
// Fluxo: setup (gera segredo, ainda inativo) → enable (valida código, ativa
// + gera recovery) → disable (exige senha). Verificação no LOGIN fica em auth.js.
// ─────────────────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/middlewares');
const { requireAdmin } = require('../../middleware/authV2');
const { q } = require('../../db/pool');
const acc = require('../../services/accounts');
const twofa = require('../../services/twofa');
const audit = require('../../services/audit');

const err = (res, s, code, message) => res.status(s).json({ success: false, error: { code, message } });

router.use(requireAdmin);

// status do 2FA
router.get('/', asyncHandler(async (req, res) => {
  const r = await q(`SELECT totp_enabled FROM admins WHERE id = $1`, [req.auth.id]);
  res.json({ success: true, data: { enabled: !!r.rows[0].totp_enabled } });
}));

// setup: gera um segredo (NÃO ativa) e devolve QR + URI + segredo p/ digitar
router.post('/setup', express.json(), asyncHandler(async (req, res) => {
  const r = await q(`SELECT email, totp_enabled FROM admins WHERE id = $1`, [req.auth.id]);
  if (r.rows[0].totp_enabled) return err(res, 400, 'ja_ativo', '2FA já está ativo. Desative antes de reconfigurar.');
  const secret = await twofa.novoSecret();
  await q(`UPDATE admins SET totp_secret = $1 WHERE id = $2`, [secret, req.auth.id]);
  const uri = await twofa.uri(secret, r.rows[0].email);
  const qr = await twofa.qrDataUrl(uri);
  res.json({ success: true, data: { secret, uri, qr } });
}));

// enable: confere o código contra o segredo pendente; ativa + gera recovery
router.post('/enable', express.json(), asyncHandler(async (req, res) => {
  const r = await q(`SELECT totp_secret, totp_enabled FROM admins WHERE id = $1`, [req.auth.id]);
  if (r.rows[0].totp_enabled) return err(res, 400, 'ja_ativo', '2FA já está ativo.');
  if (!r.rows[0].totp_secret) return err(res, 400, 'sem_setup', 'Rode o setup antes de ativar.');
  if (!(await twofa.conferir(r.rows[0].totp_secret, req.body?.code))) {
    return err(res, 400, 'codigo_invalido', 'Código inválido. Confira o relógio do app autenticador.');
  }
  const { plain, hashed } = twofa.gerarRecovery(8);
  await q(`UPDATE admins SET totp_enabled = TRUE, totp_recovery = $1 WHERE id = $2`, [JSON.stringify(hashed), req.auth.id]);
  await audit.log(req, { atorTipo: 'admin', atorId: req.auth.id, acao: '2fa_ativado' });
  res.json({ success: true, data: { recovery: plain } }); // mostrados UMA vez
}));

// disable: exige a senha atual
router.post('/disable', express.json(), asyncHandler(async (req, res) => {
  const r = await q(`SELECT senha_hash FROM admins WHERE id = $1`, [req.auth.id]);
  if (!acc.conferirSenha(String(req.body?.senha || ''), r.rows[0].senha_hash)) {
    return err(res, 400, 'senha_incorreta', 'Senha incorreta.');
  }
  await q(`UPDATE admins SET totp_enabled = FALSE, totp_secret = NULL, totp_recovery = NULL WHERE id = $1`, [req.auth.id]);
  await audit.log(req, { atorTipo: 'admin', atorId: req.auth.id, acao: '2fa_desativado' });
  res.json({ success: true });
}));

module.exports = router;
