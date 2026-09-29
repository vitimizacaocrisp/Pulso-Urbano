import { test } from 'node:test';
import assert from 'node:assert';

// Sem Upstash configurado, o limiter continua protegendo por processo.
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
import { loginRateLimiter, makeRateLimiter } from '../src/middleware/rateLimiter';

test('sem Upstash, o primeiro login passa pelo fallback em memoria', async () => {
  let nextCalled = false;
  await loginRateLimiter({ headers: {} } as any, {} as any, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, true);
});

test('fallback em memoria bloqueia quando o limite e excedido', async () => {
  const limiter = makeRateLimiter({ prefix: 'teste', tokens: 2, janela: '1 m' });
  const req = { headers: { 'x-real-ip': '203.0.113.10' } };
  let passed = 0;
  let status = null;
  const res = {
    status(code: any) { status = code; return this; },
    json(body: any) { return body; },
  };

  await limiter(req as any, res as any, () => { passed += 1; });
  await limiter(req as any, res as any, () => { passed += 1; });
  await limiter(req as any, res as any, () => { passed += 1; });

  assert.strictEqual(passed, 2);
  assert.strictEqual(status, 429);
});
