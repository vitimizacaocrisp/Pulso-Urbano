// ─────────────────────────────────────────────────────────────────────
// Tarefas agendadas (Vercel Cron). Protegidas por CRON_SECRET: a Vercel injeta
// `Authorization: Bearer $CRON_SECRET` nas invocações de cron quando a env var
// existe. Sem o segredo correto → 401 (impede disparo manual por terceiros).
// ─────────────────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/middlewares');
const { q } = require('../../db/pool');
const { deleteByKey } = require('../../services/storage');

const RASCUNHO_TTL_DIAS = 30; // rascunhos são apagados 30 dias após a criação

function autorizado(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sem segredo configurado, nada roda
  return (req.headers.authorization || '') === `Bearer ${secret}`;
}

// Purga rascunhos antigos: remove mídia no R2 e soft-deleta a postagem
// (deleted_at) — some das listagens, preservando histórico/legado_id.
router.get('/purge-rascunhos', asyncHandler(async (req, res) => {
  if (!autorizado(req)) return res.status(401).json({ success: false, error: { code: 'nao_autorizado' } });

  const alvos = await q(
    `SELECT id FROM postagens
      WHERE status = 'rascunho' AND deleted_at IS NULL
        AND created_at < NOW() - ($1 || ' days')::interval`, [RASCUNHO_TTL_DIAS]);

  let anexosRemovidos = 0;
  for (const { id } of alvos.rows) {
    const ax = await q(
      `SELECT chave_r2 FROM anexos WHERE postagem_id=$1 AND origem='r2' AND chave_r2 IS NOT NULL`, [id]);
    for (const a of ax.rows) { await deleteByKey(a.chave_r2); anexosRemovidos++; }
    await q(`DELETE FROM anexos WHERE postagem_id=$1`, [id]); // cover_anexo_id FK → SET NULL
    await q(`UPDATE postagens SET deleted_at = NOW() WHERE id=$1`, [id]);
  }

  console.log(JSON.stringify({ evt: 'purge_rascunhos', purgados: alvos.rows.length, anexosRemovidos }));
  res.json({ success: true, data: { purgados: alvos.rows.length, anexosRemovidos, ttlDias: RASCUNHO_TTL_DIAS } });
}));

module.exports = router;
