// ─────────────────────────────────────────────────────────────────────
// Cache de servidor com Upstash Redis.
//
// Em ambiente serverless (Vercel) a memória do processo não persiste entre
// invocações, então um Map em memória quase nunca "esquenta". O Upstash é um
// Redis serverless acessado via REST, compartilhado entre todas as invocações.
//
// Degradação graciosa: sem UPSTASH_REDIS_REST_URL/TOKEN (ex.: dev local), cai
// para um Map em memória — funciona, mas sem persistência entre invocações.
// ─────────────────────────────────────────────────────────────────────
require('dotenv').config();
const { Redis } = require('@upstash/redis');

const url   = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis = null;
if (url && token) {
  redis = new Redis({ url, token });
} else {
  console.warn('⚠️  Cache distribuído desativado: usando memória (não persiste no serverless).');
}

// Fallback em memória (dev ou sem Upstash)
const mem = new Map();

async function cacheGet(key) {
  if (redis) {
    try {
      return await redis.get(key); // @upstash/redis (de)serializa JSON automaticamente
    } catch (e) {
      console.error('[cache] get falhou:', e.message);
      return null;
    }
  }
  const entry = mem.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { mem.delete(key); return null; }
  return entry.data;
}

async function cacheSet(key, data, ttlMs) {
  if (redis) {
    try {
      await redis.set(key, data, { px: ttlMs }); // px = expiração em ms
    } catch (e) {
      console.error('[cache] set falhou:', e.message);
    }
    return;
  }
  mem.set(key, { data, expiresAt: Date.now() + ttlMs });
}

async function cacheInvalidate(prefix) {
  if (redis) {
    try {
      let cursor = 0;
      do {
        const [next, keys] = await redis.scan(cursor, { match: `${prefix}*`, count: 100 });
        cursor = Number(next);
        if (keys.length) await redis.del(...keys);
      } while (cursor !== 0);
    } catch (e) {
      console.error('[cache] invalidate falhou:', e.message);
    }
    return;
  }
  for (const key of mem.keys()) {
    if (key.startsWith(prefix)) mem.delete(key);
  }
}

module.exports = { cacheGet, cacheSet, cacheInvalidate };
