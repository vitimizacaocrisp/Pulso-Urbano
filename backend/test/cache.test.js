const { test } = require('node:test');
const assert = require('node:assert');

// Garante o caminho de fallback em memória (sem Upstash configurado).
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
const { cacheGet, cacheSet, cacheInvalidate } = require('../src/cache/serverCache');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('get retorna o objeto previamente setado', async () => {
  await cacheSet('k:1', { n: 1 }, 1000);
  assert.deepStrictEqual(await cacheGet('k:1'), { n: 1 });
});

test('chave inexistente retorna null', async () => {
  assert.strictEqual(await cacheGet('nao-existe'), null);
});

test('invalidate por prefixo limpa as chaves do prefixo', async () => {
  await cacheSet('analyses:list:a', { n: 1 }, 1000);
  await cacheSet('analyses:list:b', { n: 2 }, 1000);
  await cacheSet('outro:c', { n: 3 }, 1000);
  await cacheInvalidate('analyses:list');
  assert.strictEqual(await cacheGet('analyses:list:a'), null);
  assert.strictEqual(await cacheGet('analyses:list:b'), null);
  assert.deepStrictEqual(await cacheGet('outro:c'), { n: 3 }); // não afetado
});

test('TTL expira a chave', async () => {
  await cacheSet('ttl:k', { v: 1 }, 30);
  await sleep(50);
  assert.strictEqual(await cacheGet('ttl:k'), null);
});
