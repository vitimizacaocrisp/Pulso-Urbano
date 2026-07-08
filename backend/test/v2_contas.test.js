// Testes de auth v2 / sessão única contra o Postgres Docker (:5433).
// Pulados se o banco não estiver acessível. Requer os seeds (super@/editor@).
const { test, before, after } = require('node:test');
const assert = require('node:assert');

process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL
  || 'postgresql://pulso:pulso_dev@localhost:5433/pulso_urbano';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-v2';

const jwt = require('jsonwebtoken');
const { q, closePool } = require('../src/db/pool');
const { authenticate, requireSuperadmin } = require('../src/middleware/authV2');
const acc = require('../src/services/accounts');
const sessionCache = require('../src/services/sessionCache');

let dbOk = false, superId = null, editorId = null;

before(async () => {
  try {
    await q('SELECT 1'); dbOk = true;
    const s = await q(`SELECT id FROM admins WHERE email='super@teste.local'`);
    const e = await q(`SELECT id FROM admins WHERE email='editor@teste.local'`);
    superId = s.rows[0]?.id; editorId = e.rows[0]?.id;
    if (!superId || !editorId) { dbOk = false; console.log('⚠ seeds ausentes — rode seed_and_backfill.'); }
  } catch { console.log('⚠ Postgres de teste indisponível — testes de conta pulados.'); }
});
after(async () => { await closePool(); });
const skip = (t) => { if (!dbOk) { t.skip('sem banco/seed'); return true; } return false; };

// mock req/res
const mkReq = (token) => ({ cookies: token ? { authToken: token } : {}, headers: {} });
function mkRes() {
  return { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
}
const run = async (mw, req) => {
  const res = mkRes();
  let nextCalled = false;
  await mw(req, res, () => { nextCalled = true; });
  return { res, nextCalled };
};
const sign = (id, tipo, sid, extra = {}) => jwt.sign({ id, tipo, sid, ver: 2, ...extra }, process.env.JWT_SECRET);

test('rotacionarSessao gera sid novo a cada chamada', async (t) => {
  if (skip(t)) return;
  const a = await acc.rotacionarSessao('admin', superId);
  const b = await acc.rotacionarSessao('admin', superId);
  assert.ok(a && b && a !== b);
});

test('authenticate: cookie com sid atual passa e popula req.auth', async (t) => {
  if (skip(t)) return;
  const sid = await acc.rotacionarSessao('admin', superId);
  await sessionCache.invalidate('admin', superId); // força ler do Postgres (fail-closed path)
  const { res, nextCalled } = await run(authenticate, mkReq(sign(superId, 'admin', sid)));
  assert.strictEqual(nextCalled, true, JSON.stringify(res.body));
});

test('authenticate: sid obsoleto → 401 sessao_encerrada', async (t) => {
  if (skip(t)) return;
  const antigo = await acc.rotacionarSessao('admin', superId);
  await acc.rotacionarSessao('admin', superId); // novo login invalida o antigo
  const { res, nextCalled } = await run(authenticate, mkReq(sign(superId, 'admin', antigo)));
  assert.strictEqual(nextCalled, false);
  assert.strictEqual(res.code, 401);
  assert.strictEqual(res.body.error.code, 'sessao_encerrada');
});

test('authenticate: token legado (sem ver:2) → token_invalido', async (t) => {
  if (skip(t)) return;
  const legacy = jwt.sign({ id: superId, email: 'x' }, process.env.JWT_SECRET); // formato v1
  const { res } = await run(authenticate, mkReq(legacy));
  assert.strictEqual(res.code, 401);
  assert.strictEqual(res.body.error.code, 'token_invalido');
});

test('authenticate: sem token → sem_token', async (t) => {
  if (skip(t)) return;
  const { res } = await run(authenticate, mkReq(null));
  assert.strictEqual(res.body.error.code, 'sem_token');
});

test('encerrarSessao (logout) invalida qualquer token', async (t) => {
  if (skip(t)) return;
  const sid = await acc.rotacionarSessao('admin', superId);
  await acc.encerrarSessao('admin', superId);
  const { res } = await run(authenticate, mkReq(sign(superId, 'admin', sid)));
  assert.strictEqual(res.body.error.code, 'sessao_encerrada');
});

test('requireSuperadmin: editor recebe 403 role_insuficiente', async (t) => {
  if (skip(t)) return;
  const sid = await acc.rotacionarSessao('admin', editorId);
  const { res, nextCalled } = await run(requireSuperadmin, mkReq(sign(editorId, 'admin', sid)));
  assert.strictEqual(nextCalled, false);
  assert.strictEqual(res.code, 403);
  assert.strictEqual(res.body.error.code, 'role_insuficiente');
});

test('conta desativada → 401 conta_desativada', async (t) => {
  if (skip(t)) return;
  const sid = await acc.rotacionarSessao('user', null); // n/a
  void sid;
  // cria user descartável, desativa, tenta autenticar
  const ins = await q(`INSERT INTO users (nome,email,senha_hash,is_active)
    VALUES ('Tmp','tmp-desativado@teste.local',$1,FALSE) RETURNING id`, [acc.hashSenha('senha123456')]);
  const uid = ins.rows[0].id;
  const usid = await acc.rotacionarSessao('user', uid);
  await q(`UPDATE users SET is_active=FALSE WHERE id=$1`, [uid]);
  await sessionCache.invalidate('user', uid);
  const { res } = await run(authenticate, mkReq(sign(uid, 'user', usid)));
  assert.strictEqual(res.body.error.code, 'conta_desativada');
  await q(`DELETE FROM users WHERE id=$1`, [uid]);
});

test('validarSenha aplica mínimo de 10', () => {
  assert.ok(acc.validarSenha('curta'));      // rejeita
  assert.strictEqual(acc.validarSenha('senhaforte123'), null); // aceita
});
