// ─────────────────────────────────────────────────────────────────────
// Helpers de conta compartilhados por auth/conta/equipe (docs 03/04).
// ─────────────────────────────────────────────────────────────────────
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { q } from '../db/pool';
import * as sessionCache from './sessionCache';

import type { CookieOptions, Response } from 'express';
const BCRYPT_COST = 12;
// hash fixo p/ equalizar timing quando a conta não existe (anti-enumeração, doc 07)
const DUMMY_HASH = bcrypt.hashSync('conta-inexistente-timing-guard', BCRYPT_COST);

const TABLE: Record<string, any> = { user: 'users', admin: 'admins' };
// Frontend e backend agora vivem em domínios diferentes (pulsourbano.vercel.app
// × pulso-urbano-backend.vercel.app). Como `vercel.app` está na Public Suffix
// List, são "sites" distintos: o cookie httpOnly de auth SÓ viaja cross-site com
// SameSite=None + Secure. Em dev (localhost via proxy do Vite = same-origin)
// mantemos Lax sem Secure (HTTP local).
const PROD = process.env.NODE_ENV === 'production';
const cookieOpts = (maxAgeMs?: number): CookieOptions => ({
  httpOnly: true,
  secure: PROD,
  sameSite: PROD ? 'none' : 'lax',
  path: '/',
  ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
});

const hashSenha = (s: any) => bcrypt.hashSync(s, BCRYPT_COST);
const conferirSenha = (s: any, hash: any) => bcrypt.compareSync(s, hash || DUMMY_HASH);
// Política: mínimo 10 (doc 03). Devolve mensagem de erro ou null.
const validarSenha = (s: any) =>
  (!s || String(s).length < 10) ? 'A senha deve ter ao menos 10 caracteres.'
  : (String(s).length > 128) ? 'Senha muito longa.' : null;

// Rotaciona session_id (novo login / troca de senha / "sair de todos"):
// grava novo sid, invalida cache (kick imediato dos outros dispositivos).
async function rotacionarSessao(tipo: any, id: any) {
  const sid = crypto.randomUUID();
  await q(`UPDATE ${TABLE[tipo]} SET session_id = $1, ultimo_login = NOW() WHERE id = $2`, [sid, id]);
  await sessionCache.invalidate(tipo, id);
  return sid;
}
// Encerra sessão (logout / desativação): zera sid + invalida cache.
async function encerrarSessao(tipo: any, id: any) {
  await q(`UPDATE ${TABLE[tipo]} SET session_id = NULL WHERE id = $1`, [id]);
  await sessionCache.invalidate(tipo, id);
}

// Emite cookie de auth com JWT { id, tipo, sid, ver:2 }.
function emitirCookie(res: Response, { id, tipo, sid, remember }: any) {
  const maxAgeMs = remember ? 168 * 3600 * 1000 : 12 * 3600 * 1000;
  const token = jwt.sign({ id, tipo, sid, ver: 2 }, process.env.JWT_SECRET as string,
    { expiresIn: remember ? '168h' : '12h' });
  res.cookie('authToken', token, cookieOpts(maxAgeMs));
}
const limparCookie = (res: Response) => res.clearCookie('authToken', cookieOpts());

export {
  BCRYPT_COST,
  TABLE,
  hashSenha,
  conferirSenha,
  validarSenha,
  rotacionarSessao,
  encerrarSessao,
  emitirCookie,
  limparCookie,
};
