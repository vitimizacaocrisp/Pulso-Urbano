// ─────────────────────────────────────────────────────────────────────
// Rotas ADMIN v2 de postagens (contrato: doc 06; fluxo: doc 05).
// Wizard: POST cria rascunho → PATCH autosave → PUT /publicar.
//
// AUTH: middleware v2 (requireAdmin) — sessão única fail-closed + códigos de
// erro (doc 04). Toda mutação é registrada no audit_log.
// ─────────────────────────────────────────────────────────────────────
import express from 'express';
const router = express.Router();
import { asyncHandler } from '../../middleware/middlewares';
import { requireAdmin } from '../../middleware/authV2';
import { makeRateLimiter } from '../../middleware/rateLimiter';
import * as audit from '../../services/audit';
import { cacheInvalidate } from '../../cache/serverCache';
import {
  deleteByKey,
  presignPostagemUpload,
  confirmPostagemUpload,
  isAllowedAttachmentType,
} from '../../services/storage';
import * as repo from '../../repositories/postagensRepo';
import { q, withTx } from '../../db/pool';
import { criarSchema, validaPatch, validaPublicacao, TIPOS } from '../../validators/postagemSchemas';

import type { Response } from 'express';
import type { Req } from '../../types/http';
// Anti-abuso de presign (doc 05): 60/hora POR ADMIN (roda após requireAdmin).
const presignLimiter = makeRateLimiter({
  prefix: 'anexo-presign', tokens: 60, janela: '1 h', mensagem: 'Muitos uploads. Tente mais tarde.',
  chave: (req: Req) => 'admin:' + (req.auth?.id || 'anon'),
});
const TIPO_ANEXO_OK = ['cover', 'documento', 'dado', 'codigo', 'notebook', 'audio', 'video', 'imagem', 'anexo'];

// Convivência de caches (doc 02): mutação v2 invalida chaves v2 E legadas,
// senão público (legado) e admin (v2) servem dados divergentes.
async function invalidarCaches() {
  await Promise.all([
    cacheInvalidate('v2:'),
    cacheInvalidate('public:'),
    cacheInvalidate('analyses:'),
    cacheInvalidate('categories:'),
    cacheInvalidate('filter:'),
    cacheInvalidate('autocomplete:'),
  ]);
}

const err = (res: Response, status: any, code: any, message: any) =>
  res.status(status).json({ success: false, error: { code, message } });
const idParam = (value: any) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

// ── criar rascunho (wizard passo 1 — doc 05) ─────────────────────────
router.post('/postagens', requireAdmin, express.json(), asyncHandler(async (req, res) => {
  const parsed = criarSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return err(res, 400, 'validacao_falhou', `tipo é obrigatório (${TIPOS.join('|')}).`);
  }
  const id = await repo.criarRascunho(parsed.data.tipo, req.auth.id);
  await audit.log(req, { atorTipo: 'admin', atorId: req.auth.id, acao: 'postagem_criada', alvoTipo: 'postagem', alvoId: id, dados: { tipo: parsed.data.tipo } });
  res.status(201).json({ success: true, data: { id, tipo: parsed.data.tipo, status: 'rascunho' } });
}));

// ── autosave parcial ─────────────────────────────────────────────────
router.patch('/postagens/:id', requireAdmin, express.json(), asyncHandler(async (req, res) => {
  const id = idParam(req.params.id);
  if (!id) return err(res, 400, 'validacao_falhou', 'ID inválido.');
  const cur = await q(`SELECT tipo FROM postagens WHERE id = $1 AND deleted_at IS NULL`, [id]);
  if (!cur.rows.length) return err(res, 404, 'nao_encontrado', 'Postagem não encontrada.');

  const v = validaPatch(cur.rows[0].tipo, req.body);
  if (!v.ok) return err(res, 400, 'validacao_falhou', `${v.campo}: ${v.message}`);

  await repo.patchPostagem(id, v.data);
  await invalidarCaches();
  res.json({ success: true });
}));

// ── publicar (validação completa por tipo) ───────────────────────────
router.put('/postagens/:id/publicar', requireAdmin, asyncHandler(async (req, res) => {
  const id = idParam(req.params.id);
  if (!id) return err(res, 400, 'validacao_falhou', 'ID inválido.');
  const post = await repo.detalhe({ id, publico: false });
  if (!post) return err(res, 404, 'nao_encontrado', 'Postagem não encontrada.');

  const v = validaPublicacao(post);
  if (!v.ok) return err(res, 400, 'validacao_falhou', v.message);

  const slug = await repo.publicar(id);
  await invalidarCaches();
  await audit.log(req, { atorTipo: 'admin', atorId: req.auth.id, acao: 'postagem_publicada', alvoTipo: 'postagem', alvoId: id, dados: { slug } });
  res.json({ success: true, data: { slug } });
}));

// ── arquivar / deletar ───────────────────────────────────────────────
router.put('/postagens/:id/arquivar', requireAdmin, asyncHandler(async (req, res) => {
  const id = idParam(req.params.id);
  if (!id) return err(res, 400, 'validacao_falhou', 'ID inválido.');
  const result = await repo.arquivar(id);
  if (!result.rowCount) return err(res, 404, 'nao_encontrado', 'Postagem não encontrada.');
  await invalidarCaches();
  await audit.log(req, { atorTipo: 'admin', atorId: req.auth.id, acao: 'postagem_arquivada', alvoTipo: 'postagem', alvoId: id });
  res.json({ success: true });
}));

router.delete('/postagens/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = idParam(req.params.id);
  if (!id) return err(res, 400, 'validacao_falhou', 'ID inválido.');
  // Postagem apagada → apaga a mídia dela no R2 e as linhas de anexo (o registro
  // da postagem fica soft-deleted). GC (scripts/gc_orphans.js) é o backstop.
  const ax = await q(`SELECT chave_r2 FROM anexos WHERE postagem_id=$1 AND origem='r2' AND chave_r2 IS NOT NULL`, [id]);
  for (const a of ax.rows) await deleteByKey(a.chave_r2);
  await q(`DELETE FROM anexos WHERE postagem_id=$1`, [id]); // cover_anexo_id FK → SET NULL
  await repo.softDelete(id);
  await invalidarCaches();
  await audit.log(req, { atorTipo: 'admin', atorId: req.auth.id, acao: 'postagem_deletada', alvoTipo: 'postagem', alvoId: id, dados: { anexos_removidos: ax.rows.length } });
  res.json({ success: true });
}));

// ── listagem admin (inclui rascunhos/arquivados) ─────────────────────
router.get('/postagens', requireAdmin, asyncHandler(async (req, res) => {
  const { tipo, categoria, tag, crisp, uf, q: busca, status, page = 1, limit = 24 } = req.query;
  const data = await repo.listar(
    {
      tipo: TIPOS.includes(tipo) ? tipo : null,
      categoria: categoria || null, tag: tag || null,
      crisp: crisp === 'true', uf: uf || null, busca: busca || null,
    },
    {
      page: parseInt(page, 10) || 1, limit: parseInt(limit, 10) || 24,
      publico: false,
      status: ['rascunho', 'publicado', 'arquivado'].includes(status) ? status : null,
    });
  res.json({ success: true, data });
}));

// ── detalhe admin (shape completo p/ edição) ─────────────────────────
router.get('/postagens/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = idParam(req.params.id);
  if (!id) return err(res, 400, 'validacao_falhou', 'ID inválido.');
  const post = await repo.detalhe({ id, publico: false });
  if (!post) return err(res, 404, 'nao_encontrado', 'Postagem não encontrada.');
  res.json({ success: true, data: post });
}));

// ── presign de upload de mídia (layout postagens/{id}/ — doc 05/P5) ──
// Cria a linha em `anexos` (origem r2) e devolve a URL assinada de PUT. O
// cliente sobe o arquivo direto no R2. Órfãos (upload falho) → GC (P5).
router.post('/postagens/:id/anexos/presign', requireAdmin, presignLimiter, express.json(), asyncHandler(async (req, res) => {
  const id = idParam(req.params.id);
  if (!id) return err(res, 400, 'validacao_falhou', 'ID inválido.');
  const cur = await q(`SELECT id FROM postagens WHERE id = $1 AND deleted_at IS NULL`, [id]);
  if (!cur.rows.length) return err(res, 404, 'nao_encontrado', 'Postagem não encontrada.');

  const { fileName, fileType, fileSize, tipo } = req.body || {};
  if (!TIPO_ANEXO_OK.includes(tipo)) return err(res, 400, 'validacao_falhou', 'Categoria de anexo inválida.');
  const t = tipo;
  if (!isAllowedAttachmentType(t, fileType, fileName)) {
    return err(res, 400, 'validacao_falhou', 'O tipo do arquivo não corresponde à categoria escolhida.');
  }

  let presign;
  try { presign = await presignPostagemUpload({ postagemId: id, fileName, fileType, fileSize, attachmentType: t }); }
  catch (e) { return err(res, 400, 'validacao_falhou', e.message); }

  // Bucket privado: url_r2 guarda a CHAVE (não há URL pública). Leitura via presign.
  const normalizedType = String(fileType || 'application/octet-stream').toLowerCase();
  const declaredSize = Number(fileSize);
  const ins = await q(
    `INSERT INTO anexos (postagem_id, tipo, origem, chave_r2, url_r2, nome_arquivo, mime, tamanho_bytes, ordem)
     VALUES ($1,$2,'r2',$3,$3,$4,$5,$6, COALESCE((SELECT MAX(ordem)+1 FROM anexos WHERE postagem_id=$1),0))
     RETURNING id`,
     [id, t, presign.key, String(fileName || '').slice(0, 255),
      normalizedType.slice(0, 100), -declaredSize]);
  const anexoId = ins.rows[0].id;

  await invalidarCaches();
  await audit.log(req, { atorTipo: 'admin', atorId: req.auth.id, acao: 'anexo_presign', alvoTipo: 'anexo', alvoId: anexoId, dados: { postagem_id: id, tipo: t } });
  res.json({ success: true, data: { anexoId, uploadUrl: presign.uploadUrl, tipo: t } });
}));

// Confirma o PUT no R2 antes de tornar o anexo visível/publicável. Enquanto
// pendente, tamanho_bytes é negativo (o módulo é o tamanho declarado).
router.post('/anexos/:id/confirmar', requireAdmin, asyncHandler(async (req, res) => {
  const anexoId = idParam(req.params.id);
  if (!anexoId) return err(res, 400, 'validacao_falhou', 'ID de anexo inválido.');
  const found = await q(
    `SELECT id, postagem_id, tipo, chave_r2, mime, tamanho_bytes
       FROM anexos WHERE id=$1 AND postagem_id IS NOT NULL AND origem='r2'`, [anexoId]);
  if (!found.rows.length) return err(res, 404, 'nao_encontrado', 'Anexo não encontrado.');
  const pending = found.rows[0];
  if (Number(pending.tamanho_bytes) > 0) return res.json({ success: true, data: { anexoId } });
  const expectedSize = Math.abs(Number(pending.tamanho_bytes));

  let actual;
  try {
    actual = await confirmPostagemUpload({
      key: pending.chave_r2,
      expectedSize,
      expectedType: pending.mime,
    });
  } catch (e) {
    if (e.code === 'upload_pendente') {
      return err(res, 409, 'upload_pendente', e.message);
    }
    await deleteByKey(pending.chave_r2);
    await q(`DELETE FROM anexos WHERE id=$1`, [anexoId]);
    return err(res, 400, 'upload_invalido', e.message || 'Não foi possível confirmar o arquivo.');
  }

  const oldCover = await withTx(async (c) => {
    await c.query(`UPDATE anexos SET tamanho_bytes=$1, mime=$2 WHERE id=$3`,
      [actual.size, actual.contentType, anexoId]);
    if (pending.tipo !== 'cover') return null;
    const post = await c.query(`SELECT cover_anexo_id FROM postagens WHERE id=$1 FOR UPDATE`, [pending.postagem_id]);
    const oldId = post.rows[0]?.cover_anexo_id;
    await c.query(`UPDATE postagens SET cover_anexo_id=$1 WHERE id=$2`, [anexoId, pending.postagem_id]);
    if (!oldId || oldId === anexoId) return null;
    const old = await c.query(`DELETE FROM anexos WHERE id=$1 RETURNING chave_r2, origem`, [oldId]);
    return old.rows[0] || null;
  });
  if (oldCover?.origem === 'r2' && oldCover.chave_r2) await deleteByKey(oldCover.chave_r2);
  await invalidarCaches();
  await audit.log(req, { atorTipo: 'admin', atorId: req.auth.id, acao: 'anexo_confirmado', alvoTipo: 'anexo', alvoId: anexoId, dados: { postagem_id: pending.postagem_id, tipo: pending.tipo, tamanho: actual.size } });
  res.json({ success: true, data: { anexoId, tamanho: actual.size } });
}));

// ── deleção de anexo por POSSE (doc 05 — nunca por URL do cliente) ───
router.delete('/anexos/:id', requireAdmin, asyncHandler(async (req, res) => {
  const anexoId = idParam(req.params.id);
  if (!anexoId) return err(res, 400, 'validacao_falhou', 'ID de anexo inválido.');
  await withTx(async (c) => {
    const a = await c.query(
      `SELECT id, origem, chave_r2, url_r2, postagem_id FROM anexos WHERE id = $1`, [anexoId]);
    if (!a.rows.length) return err(res, 404, 'nao_encontrado', 'Anexo não encontrado.');
    const anexo = a.rows[0];
    // posse: anexo de postagem (admins têm CRUD de postagens — matriz doc 03).
    // Avatares (owner_tipo) serão tratados no fluxo de contas.
    if (!anexo.postagem_id) return err(res, 403, 'role_insuficiente', 'Anexo não pertence a uma postagem.');
    await c.query(`DELETE FROM anexos WHERE id = $1`, [anexoId]);
    // objeto no bucket só quando é nosso (deleção SEMPRE por chave_r2 do banco)
    if (anexo.origem === 'r2' && anexo.chave_r2) {
      await deleteByKey(anexo.chave_r2);
    }
    await invalidarCaches();
    await audit.log(req, { atorTipo: 'admin', atorId: req.auth.id, acao: 'anexo_deletado', alvoTipo: 'anexo', alvoId: anexoId, dados: { postagem_id: anexo.postagem_id } });
    res.json({ success: true });
  });
}));

export default router;
