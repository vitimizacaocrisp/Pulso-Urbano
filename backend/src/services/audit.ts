// audit_log (doc 01/03). Nunca grava senha/token em `dados`.
import { q } from '../db/pool';
import { getClientIp } from '../middleware/rateLimiter';

import type { Req } from '../types/http';
async function log(req: Req, { atorTipo = 'sistema', atorId = null, acao, alvoTipo = null, alvoId = null, dados = null }: any) {
  try {
    await q(
      `INSERT INTO audit_log (ator_tipo, ator_id, acao, alvo_tipo, alvo_id, ip, user_agent, dados)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [atorTipo, atorId, acao, alvoTipo, alvoId,
       req ? getClientIp(req) : null,
       req ? String(req.headers['user-agent'] || '').slice(0, 255) : null,
       dados ? JSON.stringify(dados) : null]);
  } catch (e) {
    console.error('[audit] falhou:', e.message); // auditoria nunca derruba a request
  }
}

export { log };
