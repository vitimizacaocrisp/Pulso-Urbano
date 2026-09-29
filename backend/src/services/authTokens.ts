// ─────────────────────────────────────────────────────────────────────
// Tokens de verificação/reset (docs 03/08). Guarda o sha256 do token, nunca
// o token puro. Single-use (usado_em) + expiração por finalidade.
// ─────────────────────────────────────────────────────────────────────
import crypto from 'crypto';
import { q } from '../db/pool';

const TTL_MIN: Record<string, any> = {
  reset_senha: 60,
  verificar_email: 24 * 60,
  trocar_email: 24 * 60,
  newsletter_optin: 7 * 24 * 60,
};

const sha256 = (s: any) => crypto.createHash('sha256').update(s).digest('hex');

// Cria um token: devolve o token PURO (vai no e-mail); guarda só o hash.
async function criar(contaTipo: any, contaId: any, finalidade: any, payload: any = null) {
  const token = crypto.randomBytes(32).toString('base64url');
  const min = TTL_MIN[finalidade] || 60;
  await q(
    `INSERT INTO auth_tokens (conta_tipo, conta_id, finalidade, token_hash, payload, expira_em)
     VALUES ($1,$2,$3,$4,$5, NOW() + ($6 || ' minutes')::interval)`,
    [contaTipo, contaId, finalidade, sha256(token), payload ? JSON.stringify(payload) : null, String(min)]);
  return token;
}

// Consome (single-use): valida hash+finalidade+não usado+não expirado e marca
// usado na MESMA transação (client passado pelo caller). Devolve a linha ou null.
async function consumir(client: any, token: any, finalidade: any) {
  const r = await client.query(
    `UPDATE auth_tokens SET usado_em = NOW()
     WHERE id = (
       SELECT id FROM auth_tokens
       WHERE token_hash = $1 AND finalidade = $2 AND usado_em IS NULL AND expira_em > NOW()
       FOR UPDATE SKIP LOCKED LIMIT 1
     )
     RETURNING conta_tipo, conta_id, payload`,
    [sha256(token), finalidade]);
  return r.rows[0] || null;
}

// Invalida tokens pendentes de uma finalidade (ex.: novo pedido de reset).
async function invalidarPendentes(contaTipo: any, contaId: any, finalidade: any) {
  await q(
    `UPDATE auth_tokens SET usado_em = NOW()
     WHERE conta_tipo=$1 AND conta_id=$2 AND finalidade=$3 AND usado_em IS NULL`,
    [contaTipo, contaId, finalidade]);
}

export { criar, consumir, invalidarPendentes, sha256 };
