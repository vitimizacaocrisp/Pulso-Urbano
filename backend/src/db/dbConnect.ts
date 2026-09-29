import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createLocalSql, localDatabaseUrl, type Sql } from './localDb';

// Local (dev/teste): Postgres do Docker via `pg` — o driver HTTP do Neon não
// alcança esse banco. Produção (Vercel): NEON_DATABASE_URL + driver do Neon,
// exatamente como antes; `localDatabaseUrl()` é sempre null lá (ver localDb.ts).
const localUrl = localDatabaseUrl();
const driverName = localUrl ? 'PostgreSQL local (Docker)' : 'Neon PostgreSQL';

// 1. Captura a variável (padrão novo: NEON_DATABASE_URL; DATABASE_URL = compat)
const dbUrl = localUrl || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

// 2. Verifica se ela existe ANTES de tentar usar
if (!dbUrl) {
  console.error("❌ ERRO CRÍTICO: 'NEON_DATABASE_URL' NÃO foi encontrada.");
  console.error("   Verifique em Settings > Environment Variables na Vercel.");
} else {
  console.log(`✅ URL do banco encontrada (${driverName}). Tentando conectar...`);
}

// 3. Inicializa o cliente
// Se a URL não existir, passamos undefined, o que vai gerar erro apenas na hora da query, não no boot.
const sql: Sql = localUrl ? createLocalSql(localUrl) : (neon(dbUrl as string) as unknown as Sql);

const testConnection = async () => {
  try {
    if (!dbUrl) throw new Error("DATABASE_URL está vazia.");
    await sql`SELECT 1;`;
    console.log(`✅ Conexão com ${driverName} bem-sucedida!`);
    return true;
  } catch (error) {
    console.error('❌ Falha na conexão:', (error as Error).message);
    return false;
  }
};

// Detecta (uma vez, com cache) se a migração 2026_content_types.sql foi
// aplicada (colunas entry_type + meta). Antes dela, o backend ignora os
// campos de tipo de conteúdo e funciona exatamente como antes.
let contentTypeColumns: boolean | null = null;
const hasContentTypeColumns = async () => {
  if (contentTypeColumns !== null) return contentTypeColumns;
  try {
    const rows = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'analyses' AND column_name = 'entry_type'
      LIMIT 1
    `;
    contentTypeColumns = rows.length > 0;
    if (!contentTypeColumns) {
      console.warn('⚠️  Coluna entry_type ausente — tipos de conteúdo desativados. Rode database/migrations/2026_content_types.sql para ativar.');
    }
  } catch {
    contentTypeColumns = false;
  }
  return contentTypeColumns;
};

// Detecta (uma vez, com cache) se a coluna is_crisp existe. Enquanto a migração
// não roda, o filtro "CRISP" é ignorado e o site funciona normalmente.
let crispColumn: boolean | null = null;
const hasCrispColumn = async () => {
  if (crispColumn !== null) return crispColumn;
  try {
    const rows = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'analyses' AND column_name = 'is_crisp'
      LIMIT 1
    `;
    crispColumn = rows.length > 0;
  } catch {
    crispColumn = false;
  }
  return crispColumn;
};

const requestHandler = async (_req: IncomingMessage, res: ServerResponse) => {
  try {
    if (!dbUrl) {
        throw new Error("A variável DATABASE_URL não está configurada no servidor.");
    }
    const result = await sql`SELECT version()`;
    const { version } = result[0];
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`Sucesso! Versão do Banco: ${version}`);
  } catch (error) {
    console.error("Erro no requestHandler:", error);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Erro de Conexão: " + (error as Error).message);
  }
};

export {
  sql,
  testConnection,
  requestHandler,
  hasContentTypeColumns,
  hasCrispColumn,
};