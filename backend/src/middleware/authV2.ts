// ─────────────────────────────────────────────────────────────────────
// Auth v2 (docs 03/04) — FAIL-CLOSED, sessão única, roles.
//
// JWT { id, tipo:'user'|'admin', sid, ver:2 } em cookie httpOnly `authToken`.
// A cada request protegida: revalida sid + is_active (+ role) na fonte —
// cache de sessão quando disponível, Postgres quando não (nunca pula a checagem).
// Token sem ver:2 = 401 token_invalido (formato legado; ver doc 04).
// ─────────────────────────────────────────────────────────────────────
import jwt from 'jsonwebtoken';
import { q } from '../db/pool';
import * as sessionCache from '../services/sessionCache';

import type { NextFunction, Response } from 'express';
import type { Req } from '../types/http';
function fail(res: Response, status: any, code: any, message: any) {
  return res.status(status).json({ success: false, error: { code, message } });
}

// Lê a sessão atual da conta: cache → Postgres. Devolve { sid, ativo, role } ou null.
interface Session { sid: string | null; ativo: boolean; role: string }

async function loadSession(tipo: any, id: any): Promise<Session | null> {
  const cached: Session | null = await sessionCache.get(tipo, id);
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
async function authenticate(req: Req, res: Response, next: NextFunction) {
  const raw = req.cookies?.authToken
    || (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null;
  if (!raw || raw === 'null' || raw === 'undefined') {
    return fail(res, 401, 'sem_token', 'Faça login para continuar.');
  }
  let payload: any;
  try { payload = jwt.verify(raw, process.env.JWT_SECRET as string); }
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
async function optionalAuth(req: Req, res: Response, next: NextFunction) {
  (req as any).auth = null; // anônimo (ver types/express.d.ts)
  const raw = req.cookies?.authToken
    || (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null;
  if (!raw || raw === 'null' || raw === 'undefined') return next();
  let payload: any;
  try { payload = jwt.verify(raw, process.env.JWT_SECRET as string); } catch { return next(); }
  if (payload.ver !== 2 || !payload.sid || !payload.tipo) return next();
  const sess = await loadSession(payload.tipo, payload.id);
  if (!sess || !sess.ativo || !sess.sid || sess.sid !== payload.sid) return next();
  req.auth = { id: payload.id, tipo: payload.tipo, role: sess.role };
  next();
}

// composição: exige autenticação + condição
const requireAuth = (req: Req, res: Response, next: NextFunction) => authenticate(req, res, next);

function requireAdmin(req: Req, res: Response, next: NextFunction) {
  return authenticate(req, res, () => {
    if (req.auth.tipo !== 'admin') return fail(res, 403, 'role_insuficiente', 'Acesso restrito a administradores.');
    next();
  });
}
function requireSuperadmin(req: Req, res: Response, next: NextFunction) {
  return authenticate(req, res, () => {
    if (req.auth.tipo !== 'admin' || req.auth.role !== 'superadmin') {
      return fail(res, 403, 'role_insuficiente', 'Ação restrita a superadministradores.');
    }
    next();
  });
}

export { authenticate, optionalAuth, requireAuth, requireAdmin, requireSuperadmin, loadSession };
