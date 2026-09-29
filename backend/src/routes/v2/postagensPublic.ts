// ─────────────────────────────────────────────────────────────────────
// Rotas públicas v2 (contrato: doc 06). Regra de visibilidade aplicada
// no repository (status='publicado' AND deleted_at IS NULL) — rascunho
// NUNCA vaza por aqui.
// ─────────────────────────────────────────────────────────────────────
import express from 'express';
const router = express.Router();
import { asyncHandler } from '../../middleware/middlewares';
import { makeRateLimiter } from '../../middleware/rateLimiter';
import { optionalAuth, requireAuth } from '../../middleware/authV2';
import { presignGetByKey } from '../../services/storage';
import { cacheGet, cacheSet } from '../../cache/serverCache';
import * as repo from '../../repositories/postagensRepo';
import { q } from '../../db/pool';
import { TIPOS } from '../../validators/postagemSchemas';

const TTL_LISTA = 30_000;
const TTL_DETALHE = 5 * 60_000;
const TTL_TAX = 10 * 60_000;

// ── gate de conteúdo (modelo de acesso v2) ───────────────────────────
// Anônimo recebe PRÉVIA: metadados + resumo + capa, mas SEM o corpo, a
// transcrição, o embed da mídia nem as URLs de download. `previa: true`
// sinaliza ao front exibir o CTA "crie uma conta". Ver docs/planejamento.
function toPreview(post: any) {
  const subtipo = { ...(post.subtipo || {}) };
  delete subtipo.transcricao; // corpo do podcast
  delete subtipo.embed_url;   // player/vídeo = conteúdo completo
  // anexos: lista o que existe (nome/tipo) mas sem URL — download exige login.
  const anexos = (post.anexos || []).map((a: any) => ({ id: a.id, tipo: a.tipo, nome: a.nome, ordem: a.ordem }));
  return { ...post, conteudo: null, subtipo, anexos, previa: true };
}

// beacon de views: 30/min por IP (doc 07)
const viewLimiter = makeRateLimiter({ prefix: 'view-beacon', tokens: 30, janela: '1 m' });

// ── listagem ─────────────────────────────────────────────────────────
router.get('/api/postagens', asyncHandler(async (req, res) => {
  const { tipo, categoria, tag, crisp, uf, q: busca, page = 1, limit = 24 } = req.query;
  const filtros = {
    tipo: TIPOS.includes(tipo) ? tipo : null,
    categoria: categoria || null,
    tag: tag || null,
    crisp: crisp === 'true' || crisp === '1',
    uf: uf || null,
    busca: busca || null,
  };
  const cacheKey = `v2:postagens:list:${JSON.stringify({ ...filtros, page, limit })}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  const data = await repo.listar(filtros, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 24,
    publico: true,
  });
  const payload = { success: true, data };
  await cacheSet(cacheKey, payload, TTL_LISTA);
  res.json(payload);
}));

// ── resolver de URL legada: /postagem/:id → slug (301 no front) ─────
router.get('/api/postagens/id/:legadoId', asyncHandler(async (req, res) => {
  const legadoId = parseInt(req.params.legadoId, 10);
  if (!Number.isInteger(legadoId)) {
    return res.status(400).json({ success: false, error: { code: 'validacao_falhou', message: 'id inválido.' } });
  }
  const r = await q(
    `SELECT slug FROM postagens WHERE legado_id = $1 AND status='publicado' AND deleted_at IS NULL`,
    [legadoId]);
  if (!r.rows.length) {
    return res.status(404).json({ success: false, error: { code: 'nao_encontrado', message: 'Postagem não encontrada.' } });
  }
  res.json({ success: true, data: { slug: r.rows[0].slug } });
}));

// ── detalhe por slug (prévia p/ anônimo, completo p/ logado) ─────────
// optionalAuth: não bloqueia anônimo; só decide o que devolver. Caches
// separados (previa/full) — o conteúdo completo é igual p/ toda conta logada,
// então é seguro compartilhar no cache do servidor (o gate é o acesso, não o dado).
router.get('/api/postagens/:slug', optionalAuth, asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const logado = !!req.auth;
  const cacheKey = `v2:postagem:${logado ? 'full' : 'previa'}:${slug}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  const post = await repo.detalhe({ slug, publico: true });
  if (!post) {
    return res.status(404).json({ success: false, error: { code: 'nao_encontrado', message: 'Postagem não encontrada.' } });
  }
  const data = logado ? { ...post, previa: false } : toPreview(post);
  const payload = { success: true, data };
  await cacheSet(cacheKey, payload, TTL_DETALHE);
  res.json(payload);
}));

// ── URL de download de anexo (exige conta — modelo de acesso v2) ─────
// requireAuth (user OU admin). O anexo é amarrado ao slug da postagem visível,
// então não dá pra enumerar anexos de rascunhos/outras postagens.
router.get('/api/postagens/:slug/anexos/:anexoId/url', requireAuth, asyncHandler(async (req, res) => {
  const anexoId = parseInt(req.params.anexoId, 10);
  if (!Number.isInteger(anexoId)) {
    return res.status(400).json({ success: false, error: { code: 'validacao_falhou', message: 'anexo inválido.' } });
  }
  const r = await q(
    `SELECT ax.tipo, ax.origem, ax.chave_r2, ax.url_r2, ax.nome_arquivo, ax.mime
       FROM anexos ax JOIN postagens p ON p.id = ax.postagem_id
      WHERE ax.id = $1 AND p.slug = $2 AND ax.tipo <> 'cover'
        AND (ax.origem <> 'r2' OR ax.chave_r2 NOT LIKE 'postagens/%' OR ax.tamanho_bytes > 0)
        AND p.status = 'publicado' AND p.deleted_at IS NULL`,
    [anexoId, req.params.slug]);
  if (!r.rows.length) {
    return res.status(404).json({ success: false, error: { code: 'nao_encontrado', message: 'Arquivo não encontrado.' } });
  }
  const a = r.rows[0];
  // Players de Ã¡udio/vÃ­deo precisam de Content-Disposition inline. Mantemos
  // todos os demais tipos como download para que HTML/SVG e documentos ativos
  // nunca sejam renderizados pelo navegador a partir deste endpoint.
  const inline = req.query.inline === '1'
    && ['audio', 'video', 'imagem', 'dado', 'documento', 'codigo', 'notebook'].includes(a.tipo);
  // Fontes e notebooks são sempre entregues como texto puro. Mesmo que um
  // navegador informe MIME executável, a URL assinada nunca os executa.
  const safeText = ['codigo', 'notebook'].includes(a.tipo)
    || /\.(txt|md|csv|tsv|json|geojson)$/i.test(a.nome_arquivo || '');
  // Bucket privado: gera URL assinada de GET (TTL curto). Externo/legado: url direta.
  const url = a.origem === 'r2'
    ? await presignGetByKey(a.chave_r2, inline ? 3600 : 300,
      inline ? { inline: true, contentType: safeText ? 'text/plain; charset=utf-8' : undefined }
        : { downloadName: a.nome_arquivo })
    : a.url_r2;
  res.json({ success: true, data: { url, nome: a.nome_arquivo, mime: a.mime, inline } });
}));

// ── proxy de imagem pública (capa/avatar) — bucket privado ───────────
// Redireciona 302 para uma URL assinada de GET. Só serve tipos públicos
// (cover/avatar); arquivos de download passam pelo endpoint autenticado acima.
router.get('/api/media/:anexoId', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.anexoId, 10);
  if (!Number.isInteger(id)) return res.status(400).end();
  const r = await q(
    `SELECT ax.tipo, ax.origem, ax.chave_r2, ax.url_r2
       FROM anexos ax
       LEFT JOIN postagens p ON p.id=ax.postagem_id
      WHERE ax.id=$1 AND (
        ax.tipo='avatar'
        OR (ax.tipo='cover' AND p.status='publicado' AND p.deleted_at IS NULL
            AND (ax.origem <> 'r2' OR ax.chave_r2 NOT LIKE 'postagens/%' OR ax.tamanho_bytes > 0))
      )`, [id]);
  const a = r.rows[0];
  if (!a || !['cover', 'avatar'].includes(a.tipo)) return res.status(404).end();
  if (a.origem === 'r2' && a.chave_r2) {
    const url = await presignGetByKey(a.chave_r2, 300, { inline: true });
    res.set('Cache-Control', 'private, max-age=240'); // < TTL da URL assinada
    return res.redirect(302, url as string);
  }
  if (a.url_r2) return res.redirect(302, a.url_r2); // externo/legado
  return res.status(404).end();
}));

// ── beacon de visualização (não toca no cache do detalhe — doc 05) ──
router.post('/api/postagens/:id/view', viewLimiter, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isInteger(id)) await repo.registrarView(id);
  res.json({ success: true }); // sempre 200 — beacon não vaza existência
}));

// ── taxonomia com contagens (menus/filtros) ─────────────────────────
router.get('/api/taxonomia', asyncHandler(async (req, res) => {
  const cacheKey = 'v2:tax:all';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  const VIS = `p.status='publicado' AND p.deleted_at IS NULL`;
  const [categorias, tags, ufs, tipos] = await Promise.all([
    q(`SELECT c.id, c.nome, c.slug, COUNT(pc.postagem_id)::int AS n
       FROM categorias c
       LEFT JOIN postagem_categorias pc ON pc.categoria_id = c.id
       LEFT JOIN postagens p ON p.id = pc.postagem_id AND ${VIS}
       GROUP BY c.id ORDER BY n DESC, c.nome`),
    q(`SELECT t.id, t.nome, t.slug, COUNT(pt.postagem_id)::int AS n
       FROM tags t
       JOIN postagem_tags pt ON pt.tag_id = t.id
       JOIN postagens p ON p.id = pt.postagem_id AND ${VIS}
       GROUP BY t.id ORDER BY n DESC LIMIT 60`),
    q(`SELECT u.sigla, u.nome, COUNT(pu.postagem_id)::int AS n
       FROM ufs u
       LEFT JOIN postagem_ufs pu ON pu.uf_id = u.id
       LEFT JOIN postagens p ON p.id = pu.postagem_id AND ${VIS}
       GROUP BY u.id ORDER BY u.sigla`),
    q(`SELECT tipo, COUNT(*)::int AS n FROM postagens p WHERE ${VIS} GROUP BY tipo`),
  ]);
  const payload = {
    success: true,
    data: { categorias: categorias.rows, tags: tags.rows, ufs: ufs.rows, tipos: tipos.rows },
  };
  await cacheSet(cacheKey, payload, TTL_TAX);
  res.json(payload);
}));

export default router;
export { toPreview };
