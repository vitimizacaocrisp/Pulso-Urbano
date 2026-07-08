// ─────────────────────────────────────────────────────────────────────
// Conta própria — /api/me (user e admin; a tabela sai de req.auth.tipo).
// Docs 03/04. Troca de senha/e-mail rotaciona a sessão (derruba os outros
// dispositivos). Avatar (upload R2) fica para a Fase 4 (frontend + presign).
// ─────────────────────────────────────────────────────────────────────
const express = require('express');
const { z } = require('zod');
const router = express.Router();
const { asyncHandler } = require('../../middleware/middlewares');
const { requireAuth } = require('../../middleware/authV2');
const { q, withTx } = require('../../db/pool');
const acc = require('../../services/accounts');
const tokens = require('../../services/authTokens');
const { sendEmail } = require('../../services/email');
const audit = require('../../services/audit');
const { presignAvatarUpload, deleteByKey } = require('../../services/storage');

const err = (res, s, code, message) => res.status(s).json({ success: false, error: { code, message } });
const emailSchema = z.string().trim().toLowerCase().email();

router.use(requireAuth);

// GET perfil (sem senha_hash/session_id)
router.get('/', asyncHandler(async (req, res) => {
  const { tipo, id } = req.auth;
  const cols = tipo === 'admin'
    ? 'id, nome, email, role, avatar_anexo_id, ultimo_login, created_at, totp_enabled'
    : 'id, nome, email, email_verificado, email_pendente, avatar_anexo_id, created_at';
  const r = await q(
    `SELECT ${cols},
       CASE WHEN c.avatar_anexo_id IS NOT NULL THEN '/api/media/' || c.avatar_anexo_id END AS avatar_url
       FROM ${acc.TABLE[tipo]} c WHERE c.id = $1`, [id]);
  res.json({ success: true, data: { ...r.rows[0], tipo } });
}));

// ── Avatar (foto de perfil) ──────────────────────────────────────────
// presign cria a linha em anexos (owner); o cliente sobe no R2; PUT confirma.
router.post('/avatar/presign', express.json(), asyncHandler(async (req, res) => {
  const { tipo, id } = req.auth;
  const { fileName, fileType, fileSize } = req.body || {};
  let presign;
  try { presign = await presignAvatarUpload({ tipo, id, fileName, fileType, fileSize }); }
  catch (e) { return err(res, 400, 'validacao_falhou', e.message); }
  // Bucket privado: url_r2 = chave (leitura via /api/media).
  const ins = await q(
    `INSERT INTO anexos (owner_tipo, owner_id, tipo, origem, chave_r2, url_r2, nome_arquivo, mime, tamanho_bytes)
     VALUES ($1,$2,'avatar','r2',$3,$3,$4,$5,$6) RETURNING id`,
    [tipo, id, presign.key, String(fileName || '').slice(0, 255),
     String(fileType || '').slice(0, 100) || null, fileSize != null ? Number(fileSize) : null]);
  res.json({ success: true, data: { anexoId: ins.rows[0].id, uploadUrl: presign.uploadUrl } });
}));

// confirma o avatar (após o upload): valida posse, troca e remove o anterior.
router.put('/avatar', express.json(), asyncHandler(async (req, res) => {
  const { tipo, id } = req.auth;
  const anexoId = parseInt(req.body?.anexoId, 10);
  if (!Number.isInteger(anexoId)) return err(res, 400, 'validacao_falhou', 'anexo inválido.');
  const a = await q(
    `SELECT id FROM anexos WHERE id=$1 AND tipo='avatar' AND owner_tipo=$2 AND owner_id=$3`,
    [anexoId, tipo, id]);
  if (!a.rows.length) return err(res, 404, 'nao_encontrado', 'Avatar não encontrado.');

  const prev = await q(`SELECT avatar_anexo_id FROM ${acc.TABLE[tipo]} WHERE id=$1`, [id]);
  const antigo = prev.rows[0].avatar_anexo_id;
  await q(`UPDATE ${acc.TABLE[tipo]} SET avatar_anexo_id=$1 WHERE id=$2`, [anexoId, id]);
  if (antigo && antigo !== anexoId) {
    const old = await q(`SELECT origem, chave_r2, url_r2 FROM anexos WHERE id=$1`, [antigo]);
    await q(`DELETE FROM anexos WHERE id=$1`, [antigo]);
    if (old.rows[0]?.origem === 'r2' && old.rows[0]?.chave_r2) await deleteByKey(old.rows[0].chave_r2);
  }
  await audit.log(req, { atorTipo: tipo, atorId: id, acao: 'avatar_atualizado' });
  res.json({ success: true });
}));

// remove o avatar atual
router.delete('/avatar', asyncHandler(async (req, res) => {
  const { tipo, id } = req.auth;
  const prev = await q(`SELECT avatar_anexo_id FROM ${acc.TABLE[tipo]} WHERE id=$1`, [id]);
  const antigo = prev.rows[0].avatar_anexo_id;
  if (!antigo) return res.json({ success: true });
  await q(`UPDATE ${acc.TABLE[tipo]} SET avatar_anexo_id=NULL WHERE id=$1`, [id]);
  const old = await q(`SELECT origem, chave_r2, url_r2 FROM anexos WHERE id=$1`, [antigo]);
  await q(`DELETE FROM anexos WHERE id=$1`, [antigo]);
  if (old.rows[0]?.origem === 'r2' && old.rows[0]?.chave_r2) await deleteByKey(old.rows[0].chave_r2);
  await audit.log(req, { atorTipo: tipo, atorId: id, acao: 'avatar_removido' });
  res.json({ success: true });
}));

// PUT nome
router.put('/', express.json(), asyncHandler(async (req, res) => {
  const { tipo, id } = req.auth;
  const nome = String(req.body?.nome || '').trim().slice(0, 120);
  if (!nome) return err(res, 400, 'validacao_falhou', 'Nome é obrigatório.');
  await q(`UPDATE ${acc.TABLE[tipo]} SET nome = $1 WHERE id = $2`, [nome, id]);
  res.json({ success: true });
}));

// PUT senha (atual + nova) → rotaciona sessão + reemite cookie desta sessão
router.put('/senha', express.json(), asyncHandler(async (req, res) => {
  const { tipo, id } = req.auth;
  const { senhaAtual, novaSenha } = req.body || {};
  const perr = acc.validarSenha(novaSenha);
  if (perr) return err(res, 400, 'validacao_falhou', perr);

  const r = await q(`SELECT senha_hash, email FROM ${acc.TABLE[tipo]} WHERE id = $1`, [id]);
  if (!acc.conferirSenha(String(senhaAtual || ''), r.rows[0].senha_hash)) {
    return err(res, 400, 'senha_incorreta', 'Senha atual incorreta.');
  }
  await q(`UPDATE ${acc.TABLE[tipo]} SET senha_hash = $1 WHERE id = $2`, [acc.hashSenha(novaSenha), id]);
  const sid = await acc.rotacionarSessao(tipo, id);      // derruba OUTRAS sessões
  acc.emitirCookie(res, { id, tipo, sid, remember: true }); // mantém ESTA logada
  await sendEmail({ to: r.rows[0].email, template: 'aviso_troca_senha', dados: {} });
  await audit.log(req, { atorTipo: tipo, atorId: id, acao: 'senha_alterada' });
  res.json({ success: true });
}));

// PUT e-mail (senha atual + novo) → email_pendente + token; confirma no novo, avisa o antigo
router.put('/email', express.json(), asyncHandler(async (req, res) => {
  const { tipo, id } = req.auth;
  const novo = emailSchema.safeParse(req.body?.novoEmail);
  if (!novo.success) return err(res, 400, 'validacao_falhou', 'Novo e-mail inválido.');

  const r = await q(`SELECT senha_hash, email FROM ${acc.TABLE[tipo]} WHERE id = $1`, [id]);
  if (!acc.conferirSenha(String(req.body?.senhaAtual || ''), r.rows[0].senha_hash)) {
    return err(res, 400, 'senha_incorreta', 'Senha atual incorreta.');
  }
  const dup = await q(`SELECT 1 FROM ${acc.TABLE[tipo]} WHERE lower(email)=$1 AND id<>$2 AND deleted_at IS NULL`, [novo.data, id]);
  if (dup.rows.length) return err(res, 409, 'email_em_uso', 'Este e-mail já está em uso.');

  await q(`UPDATE ${acc.TABLE[tipo]} SET email_pendente = $1 WHERE id = $2`, [novo.data, id]).catch(() => {});
  await tokens.invalidarPendentes(tipo, id, 'trocar_email');
  const token = await tokens.criar(tipo, id, 'trocar_email', { novo_email: novo.data });
  await sendEmail({ to: novo.data, template: 'confirmar_novo_email', dados: { token } });
  await sendEmail({ to: r.rows[0].email, template: 'aviso_troca_email', dados: { novoEmail: novo.data } });
  await audit.log(req, { atorTipo: tipo, atorId: id, acao: 'troca_email_solicitada', dados: { novo: novo.data } });
  res.json({ success: true, message: 'Confirme no e-mail enviado ao novo endereço.' });
}));

// "Sair de todos os dispositivos"
router.post('/logout-all', asyncHandler(async (req, res) => {
  await acc.encerrarSessao(req.auth.tipo, req.auth.id);
  acc.limparCookie(res);
  res.json({ success: true });
}));

// DELETE conta (LGPD: soft-delete + anonimização). Só USER — admins pela /equipe.
router.delete('/', express.json(), asyncHandler(async (req, res) => {
  const { tipo, id } = req.auth;
  if (tipo !== 'user') return err(res, 403, 'role_insuficiente', 'Contas admin são geridas pela equipe.');
  const r = await q(`SELECT senha_hash FROM users WHERE id = $1`, [id]);
  if (!acc.conferirSenha(String(req.body?.senha || ''), r.rows[0].senha_hash)) {
    return err(res, 400, 'senha_incorreta', 'Senha incorreta.');
  }
  await withTx(async (c) => {
    await c.query(
      `UPDATE users SET deleted_at=NOW(), nome=NULL, session_id=NULL,
         email = 'excluido-' || id || '@anon.local', email_pendente=NULL, senha_hash=''
       WHERE id = $1`, [id]);
  });
  await require('../../services/sessionCache').invalidate('user', id);
  acc.limparCookie(res);
  await audit.log(req, { atorTipo: 'user', atorId: id, acao: 'conta_excluida' });
  res.json({ success: true });
}));

module.exports = router;
