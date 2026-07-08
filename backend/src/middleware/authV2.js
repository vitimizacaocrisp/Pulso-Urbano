// ─────────────────────────────────────────────────────────────────────
// Auth v2 (docs 03/04) — FAIL-CLOSED, sessão única, roles.
//
// JWT { id, tipo:'user'|'admin', sid, ver:2 } em cookie httpOnly `authToken`.
// A cada request protegida: revalida sid + is_active (+ role) na fonte —
// cache de sessão quando disponível, Postgres quando não (nunca pula a checagem).
// Token sem ver:2 = 401 token_invalido (formato legado; ver doc 04).
// ─────────────────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');
const { q } = require('../db/pool');
const sessionCache = require('../services/sessionCache');

function fail(res, status, code, message) {
  return res.status(status).json({ success: false, error: { code, message } });
}

// Lê a sessão atual da conta: cache → Postgres. Devolve { sid, ativo, role } ou null.
async function loadSession(tipo, id) {
  const cached = await sessionCache.get(tipo, id);
  if (cached) return cached;
  const table = tipo === 'admin' ? 'admins' : 'users';
  const roleCol = tipo === 'admin' ? 'role' : `'user'::text AS role`;
  const r = await q(
    `SELECT session_id AS sid, is_active AS ativo, ${roleCol} FROM ${table} WHERE id = $1`, [id]);
  if (!r.rows.length) return null;
  const rec = { sid: r.rows[0].sid, ativo: r.rows[0].ativo, role: r.rows[0].role };
  await sessionCache.set(tipo, id, rec);
  return rec;
}

// Popula req.auth = { id, tipo, role }. Não bloqueia por role (isso é requireX).
async function authenticate(req, res, next) {
  const raw = req.cookies?.authToken
    || (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null;
  if (!raw || raw === 'null' || raw === 'undefined') {
    return fail(res, 401, 'sem_token', 'Faça login para continuar.');
  }
  let payload;
  try { payload = jwt.verify(raw, process.env.JWT_SECRET); }
  catch { return fail(res, 401, 'token_invalido', 'Sessão inválida ou expirada. Faça login novamente.'); }

  // formato legado (sem ver:2/sid/tipo) → inválido pós-corte (fail-closed, doc 04)
  if (payload.ver !== 2 || !payload.sid || !payload.tipo) {
    return fail(res, 401, 'token_invalido', 'Sessão desatualizada. Faça login novamente.');
  }

  const sess = await loadSession(payload.tipo, payload.id);
  if (!sess) return fail(res, 401, 'token_invalido', 'Conta não encontrada.');
  if (!sess.ativo) return fail(res, 401, 'conta_desativada', 'Conta desativada.');
  if (!sess.sid || sess.sid !== payload.sid) {
    return fail(res, 401, 'sessao_encerrada', 'Sua conta foi acessada em outro dispositivo.');
  }

  req.auth = { id: payload.id, tipo: payload.tipo, role: sess.role };
  next();
}

// Auth OPCIONAL: popula req.auth se houver sessão válida; caso contrário segue
// como anônimo (req.auth = null), SEM erro. Para rotas públicas cujo conteúdo é
// gated por login (prévia p/ anônimo, completo p/ logado — modelo de acesso v2).
// Mesma revalidação fail-closed do authenticate, mas falha = anônimo, não 401.
async function optionalAuth(req, res, next) {
  req.auth = null;
  const raw = req.cookies?.authToken
    || (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null;
  if (!raw || raw === 'null' || raw === 'undefined') return next();
  let payload;
  try { payload = jwt.verify(raw, process.env.JWT_SECRET); } catch { return next(); }
  if (payload.ver !== 2 || !payload.sid || !payload.tipo) return next();
  const sess = await loadSession(payload.tipo, payload.id);
  if (!sess || !sess.ativo || !sess.sid || sess.sid !== payload.sid) return next();
  req.auth = { id: payload.id, tipo: payload.tipo, role: sess.role };
  next();
}

// composição: exige autenticação + condição
const requireAuth = (req, res, next) => authenticate(req, res, next);

function requireAdmin(req, res, next) {
  return authenticate(req, res, () => {
    if (req.auth.tipo !== 'admin') return fail(res, 403, 'role_insuficiente', 'Acesso restrito a administradores.');
    next();
  });
}
function requireSuperadmin(req, res, next) {
  return authenticate(req, res, () => {
    if (req.auth.tipo !== 'admin' || req.auth.role !== 'superadmin') {
      return fail(res, 403, 'role_insuficiente', 'Ação restrita a superadministradores.');
    }
    next();
  });
}

module.exports = { authenticate, optionalAuth, requireAuth, requireAdmin, requireSuperadmin, loadSession };
