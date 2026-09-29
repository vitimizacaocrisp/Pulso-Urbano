// ─────────────────────────────────────────────────────────────────────
// Pool v2 — camada de dados do schema novo (postagens/pt_*/taxonomia).
//
// Decisão de driver (doc 02 §3a): `pg.Pool` NOS DOIS ambientes.
//   - Docker local:  TEST_DATABASE_URL (postgres://...@localhost:5433)
//   - Produção:      DATABASE_URL do Neon via pooler (TCP funciona na Vercel)
// O driver HTTP `neon()` não suporta transação interativa (INSERT ... RETURNING
// usado por INSERTs seguintes) — ele permanece APENAS nas rotas legadas
// (`dbConnect.js`) até o corte da Fase 5.
// ─────────────────────────────────────────────────────────────────────
import 'dotenv/config';
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

// Banco: Docker local (TEST_DATABASE_URL) tem prioridade p/ dev; senão o Neon
// de produção via NEON_DATABASE_URL (backend dedicado após o split de projetos).
// DATABASE_URL/V2_USE_PROD ficam como fallback de compat.
// Na Vercel a TEST_DATABASE_URL é ignorada: o Docker é só para máquina local.
const V2_URL = process.env.V2_DATABASE_URL
  || (process.env.VERCEL ? undefined : process.env.TEST_DATABASE_URL)
  || process.env.NEON_DATABASE_URL
  || (process.env.V2_USE_PROD === '1' ? process.env.DATABASE_URL : null);

if (!V2_URL) {
  console.error('❌ [v2] Sem banco: defina NEON_DATABASE_URL (prod) ou TEST_DATABASE_URL (Docker).');
}

// Neon exige TLS; Docker local não tem. Detecta pelo host.
const needsSsl = /neon\.tech|\bsslmode=require\b/.test(V2_URL || '');
const connectionString = needsSsl
  ? (V2_URL || '').replace(/([?&])sslmode=(prefer|require|verify-ca)(?=&|$)/i, '$1sslmode=verify-full')
  : V2_URL;

let pool: Pool | null = null;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: connectionString ?? undefined,
      max: 5,                       // serverless: pouca concorrência por instância
      idleTimeoutMillis: 30_000,
      ssl: needsSsl ? { rejectUnauthorized: true } : undefined,
    });
  }
  return pool;
}

// query simples (fora de transação)
const q = <R extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<R>> =>
  getPool().query<R>(text, params);

// Transação real: postagem + subtipo + junções + anexos são atômicos (doc 05).
async function withTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function closePool() { if (pool) { await pool.end(); pool = null; } }

export { getPool, q, withTx, closePool };
