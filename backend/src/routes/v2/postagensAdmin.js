// ─────────────────────────────────────────────────────────────────────
// Rotas ADMIN v2 de postagens (contrato: doc 06; fluxo: doc 05).
// Wizard: POST cria rascunho → PATCH autosave → PUT /publicar.
//
// AUTH: middleware v2 (requireAdmin) — sessão única fail-closed + códigos de
// erro (doc 04). Toda mutação é registrada no audit_log.
// ─────────────────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/middlewares');
const { requireAdmin } = require('../../middleware/authV2');
const { makeRateLimiter } = require('../../middleware/rateLimiter');
const audit = require('../../services/audit');
const { cacheInvalidate } = require('../../cache/serverCache');
const { deleteByKey, presignPostagemUpload } = require('../../services/storage');
const repo = require('../../repositories/postagensRepo');
const { q, withTx } = require('../../db/pool');
const { criarSchema, validaPatch, validaPublicacao, TIPOS } = require('../../validators/postagemSchemas');

// Anti-abuso de presign (doc 05): 60/hora POR ADMIN (roda após requireAdmin).
const presignLimiter = makeRateLimiter({
  prefix: 'anexo-presign', tokens: 60, janela: '1 h', mensagem: 'Muitos uploads. Tente mais tarde.',
  chave: (req) => 'admin:' + (req.auth?.id || 'anon'),
});
const TIPO_ANEXO_OK = ['cover', 'documento', 'dado', 'audio', 'video', 'imagem', 'anexo'];

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

const err = (res, status, code, message) =>
  res.status(status).json({ success: false, error: { code, message } });

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
  const id = parseInt(req.params.id, 10);
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
  const id = parseInt(req.params.id, 10);
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
  const id = parseInt(req.params.id, 10);
  await repo.arquivar(id);
  await invalidarCaches();
  await audit.log(req, { atorTipo: 'admin', atorId: req.auth.id, acao: 'postagem_arquivada', alvoTipo: 'postagem', alvoId: id });
  res.json({ success: true });
}));

router.delete('/postagens/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
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
  const post = await repo.detalhe({ id: parseInt(req.params.id, 10), publico: false });
  if (!post) return err(res, 404, 'nao_encontrado', 'Postagem não encontrada.');
  res.json({ success: true, data: post });
}));

// ── presign de upload de mídia (layout postagens/{id}/ — doc 05/P5) ──
// Cria a linha em `anexos` (origem r2) e devolve a URL assinada de PUT. O
// cliente sobe o arquivo direto no R2. Órfãos (upload falho) → GC (P5).
router.post('/postagens/:id/anexos/presign', requireAdmin, presignLimiter, express.json(), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const cur = await q(`SELECT id FROM postagens WHERE id = $1 AND deleted_at IS NULL`, [id]);
  if (!cur.rows.length) return err(res, 404, 'nao_encontrado', 'Postagem não encontrada.');

  const { fileName, fileType, fileSize, tipo } = req.body || {};
  const t = TIPO_ANEXO_OK.includes(tipo) ? tipo : 'anexo';

  let presign;
  try { presign = await presignPostagemUpload({ postagemId: id, fileName, fileType, fileSize }); }
  catch (e) { return err(res, 400, 'validacao_falhou', e.message); }

  // Bucket privado: url_r2 guarda a CHAVE (não há URL pública). Leitura via presign.
  const ins = await q(
    `INSERT INTO anexos (postagem_id, tipo, origem, chave_r2, url_r2, nome_arquivo, mime, tamanho_bytes, ordem)
     VALUES ($1,$2,'r2',$3,$3,$4,$5,$6, COALESCE((SELECT MAX(ordem)+1 FROM anexos WHERE postagem_id=$1),0))
     RETURNING id`,
    [id, t, presign.key, String(fileName || '').slice(0, 255),
     String(fileType || '').slice(0, 100) || null, fileSize != null ? Number(fileSize) : null]);
  const anexoId = ins.rows[0].id;
  if (t === 'cover') await q(`UPDATE postagens SET cover_anexo_id = $1 WHERE id = $2`, [anexoId, id]);

  await invalidarCaches();
  await audit.log(req, { atorTipo: 'admin', atorId: req.auth.id, acao: 'anexo_presign', alvoTipo: 'anexo', alvoId: anexoId, dados: { postagem_id: id, tipo: t } });
  res.json({ success: true, data: { anexoId, uploadUrl: presign.uploadUrl, tipo: t } });
}));

// ── deleção de anexo por POSSE (doc 05 — nunca por URL do cliente) ───
router.delete('/anexos/:id', requireAdmin, asyncHandler(async (req, res) => {
  const anexoId = parseInt(req.params.id, 10);
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

module.exports = router;
