const { test } = require('node:test');
const assert = require('node:assert');

// Sem Upstash configurado, o limiter deve ser um no-op (chama next()).
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
const { loginRateLimiter } = require('../src/middleware/rateLimiter');

test('sem Upstash, o rate limiter deixa passar (no-op)', async () => {
  let nextCalled = false;
  await loginRateLimiter({ headers: {} }, {}, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, true);
});
