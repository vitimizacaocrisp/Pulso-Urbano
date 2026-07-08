// ─────────────────────────────────────────────────────────────────────
// Helpers de conta compartilhados por auth/conta/equipe (docs 03/04).
// ─────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { q } = require('../db/pool');
const sessionCache = require('./sessionCache');

const BCRYPT_COST = 12;
// hash fixo p/ equalizar timing quando a conta não existe (anti-enumeração, doc 07)
const DUMMY_HASH = bcrypt.hashSync('conta-inexistente-timing-guard', BCRYPT_COST);

const TABLE = { user: 'users', admin: 'admins' };
const cookieOpts = (maxAgeMs) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
});

const hashSenha = (s) => bcrypt.hashSync(s, BCRYPT_COST);
const conferirSenha = (s, hash) => bcrypt.compareSync(s, hash || DUMMY_HASH);
// Política: mínimo 10 (doc 03). Devolve mensagem de erro ou null.
const validarSenha = (s) =>
  (!s || String(s).length < 10) ? 'A senha deve ter ao menos 10 caracteres.'
  : (String(s).length > 128) ? 'Senha muito longa.' : null;

// Rotaciona session_id (novo login / troca de senha / "sair de todos"):
// grava novo sid, invalida cache (kick imediato dos outros dispositivos).
async function rotacionarSessao(tipo, id) {
  const sid = crypto.randomUUID();
  await q(`UPDATE ${TABLE[tipo]} SET session_id = $1, ultimo_login = NOW() WHERE id = $2`, [sid, id]);
  await sessionCache.invalidate(tipo, id);
  return sid;
}
// Encerra sessão (logout / desativação): zera sid + invalida cache.
async function encerrarSessao(tipo, id) {
  await q(`UPDATE ${TABLE[tipo]} SET session_id = NULL WHERE id = $1`, [id]);
  await sessionCache.invalidate(tipo, id);
}

// Emite cookie de auth com JWT { id, tipo, sid, ver:2 }.
function emitirCookie(res, { id, tipo, sid, remember }) {
  const maxAgeMs = remember ? 168 * 3600 * 1000 : 12 * 3600 * 1000;
  const token = jwt.sign({ id, tipo, sid, ver: 2 }, process.env.JWT_SECRET,
    { expiresIn: remember ? '168h' : '12h' });
  res.cookie('authToken', token, cookieOpts(maxAgeMs));
}
const limparCookie = (res) => res.clearCookie('authToken', cookieOpts());

module.exports = {
  BCRYPT_COST, TABLE, hashSenha, conferirSenha, validarSenha,
  rotacionarSessao, encerrarSessao, emitirCookie, limparCookie,
};
