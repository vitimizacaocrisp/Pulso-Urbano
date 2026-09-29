// Prepara o Postgres LOCAL (Docker) para rodar o backend inteiro: schema v2 +
// tabela legada `analyses` + migrações. Idempotente. Recusa qualquer banco que
// não seja localhost — nunca toca Neon/produção.
//
//   npm run db:local:up      (sobe o container, porta 5433)
//   npm run db:local:setup   (este script)
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import { isLocalUrl } from '../src/db/localDb';

const url = process.env.TEST_DATABASE_URL
  || 'postgresql://pulso:pulso_dev@localhost:5433/pulso_urbano';

if (!isLocalUrl(url)) {
  console.error(`❌ Recusado: ${new URL(url).hostname} não é localhost. Este script só roda no Docker local.`);
  process.exit(1);
}

const dbDir = path.resolve(__dirname, '../../database');
const read = (p: string) => fs.readFileSync(p, 'utf8');

// database/schema.sql mistura a tabela `analyses` com o `admins` legado (formato
// e seed incompatíveis com o v2) — só a parte de `analyses` interessa.
const schema = read(path.join(dbDir, 'schema.sql'));
const analysesOnly = schema.slice(0, schema.indexOf('-- Tabela de administradores'));

const steps: Array<[string, string]> = [
  ['schema v2', read(path.join(dbDir, 'migrations/2026_v2_schema.sql'))],
  ['analyses (legado)', analysesOnly],
  ['tipos de conteúdo', read(path.join(dbDir, 'migrations/2026_content_types.sql'))],
  ['is_crisp', read(path.join(dbDir, 'migrations/2026_is_crisp.sql'))],
  ['full-text search', read(path.join(dbDir, 'migrations/2026_full_text_search.sql'))],
  ['editor alpha (studio)', read(path.join(dbDir, 'migrations/2026_studio_documents.sql'))],
  ['workspaces de anexos', read(path.join(__dirname, 'migrations/2026_attachment_workspaces.sql'))],
];

(async () => {
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    for (const [nome, ddl] of steps) {
      await c.query(ddl);
      console.log(`✔ ${nome}`);
    }
  } finally {
    await c.end();
  }
})().catch((e) => { console.error('❌', (e as Error).message); process.exit(1); });
