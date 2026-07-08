// ─────────────────────────────────────────────────────────────────────
// Cache de SESSÃO — dedicado e FAIL-CLOSED (doc 04).
//
// Diferente do serverCache (fail-open + fallback em memória): aqui NÃO há
// fallback em memória (é por-instância serverless → invalidação não propaga)
// e um miss/erro do Redis NUNCA libera acesso — apenas cai para o Postgres
// no middleware. Chave: sess:{tipo}:{id} → { sid, ativo, role }.
// ─────────────────────────────────────────────────────────────────────
require('dotenv').config();
const { Redis } = require('@upstash/redis');

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = (url && token) ? new Redis({ url, token }) : null;

const TTL_S = 60; // 60s; invalidação explícita (del) no login/logout torna o kick imediato
const key = (tipo, id) => `sess:${tipo}:${id}`;

// Retorna o registro cacheado ou null (miss/erro → o middleware consulta o Postgres).
async function get(tipo, id) {
  if (!redis) return null;
  try { return await redis.get(key(tipo, id)); }
  catch (e) { console.error('[sessionCache] get:', e.message); return null; }
}
async function set(tipo, id, record) {
  if (!redis) return;
  try { await redis.set(key(tipo, id), record, { ex: TTL_S }); }
  catch (e) { console.error('[sessionCache] set:', e.message); }
}
// Chamado no login/logout/troca-de-senha/desativação → kick imediato (≤1 request).
async function invalidate(tipo, id) {
  if (!redis) return;
  try { await redis.del(key(tipo, id)); }
  catch (e) { console.error('[sessionCache] del:', e.message); }
}

module.exports = { get, set, invalidate };
