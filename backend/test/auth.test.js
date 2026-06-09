const { test } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
const { verifyToken } = require('../src/middleware/middlewares');

const validToken = jwt.sign({ id: 1, email: 'a@b.com' }, process.env.JWT_SECRET, { expiresIn: '1h' });

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

function run({ cookies = {}, headers = {} }) {
  const req = { cookies, headers };
  const res = mockRes();
  let nextCalled = false;
  verifyToken(req, res, () => { nextCalled = true; });
  return { req, res, nextCalled };
}

test('cookie válido autentica e popula req.user', () => {
  const { req, nextCalled } = run({ cookies: { authToken: validToken } });
  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.user.email, 'a@b.com');
});

test('header Bearer válido autentica (fallback)', () => {
  const { nextCalled } = run({ headers: { authorization: `Bearer ${validToken}` } });
  assert.strictEqual(nextCalled, true);
});

test('cookie tem prioridade sobre header inválido', () => {
  const { req, nextCalled } = run({
    cookies: { authToken: validToken },
    headers: { authorization: 'Bearer lixo' },
  });
  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.user.email, 'a@b.com');
});

test('sem token retorna 403', () => {
  const { res, nextCalled } = run({});
  assert.strictEqual(nextCalled, false);
  assert.strictEqual(res.statusCode, 403);
});

test('header literal "Bearer null" é ignorado → 403', () => {
  const { res, nextCalled } = run({ headers: { authorization: 'Bearer null' } });
  assert.strictEqual(nextCalled, false);
  assert.strictEqual(res.statusCode, 403);
});

test('token inválido retorna 401', () => {
  const { res, nextCalled } = run({ cookies: { authToken: 'token-invalido' } });
  assert.strictEqual(nextCalled, false);
  assert.strictEqual(res.statusCode, 401);
});

test('token expirado retorna 401', () => {
  const expired = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: -10 });
  const { res, nextCalled } = run({ cookies: { authToken: expired } });
  assert.strictEqual(nextCalled, false);
  assert.strictEqual(res.statusCode, 401);
});
