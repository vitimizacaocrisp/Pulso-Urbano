// Configura CORS do bucket privado para uploads diretos por URL pré-assinada.
// Dry-run por padrão; use --apply para gravar. Regras alheias são preservadas.
require('dotenv').config();
const { GetBucketCorsCommand, PutBucketCorsCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../src/services/storage');

const APPLY = process.argv.includes('--apply');
const bucket = process.env.STORAGE_BUCKET_NAME;
const origins = [...new Set([
  process.env.ALLOWED_ORIGIN,
  process.env.ALLOWED_ORIGIN_LOCALHOST,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean).map((x) => String(x).replace(/\/$/, '')))];

async function currentRules() {
  try {
    return (await s3Client.send(new GetBucketCorsCommand({ Bucket: bucket }))).CORSRules || [];
  } catch (e) {
    if (e?.name === 'NoSuchCORSConfiguration' || e?.$metadata?.httpStatusCode === 404) return [];
    throw e;
  }
}

(async () => {
  if (!bucket) throw new Error('STORAGE_BUCKET_NAME não configurado.');
  const existing = await currentRules();
  const rule = {
    ID: 'pulso-browser-uploads',
    AllowedOrigins: origins,
    AllowedMethods: ['GET', 'HEAD', 'PUT'],
    AllowedHeaders: ['Content-Type'],
    ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
    MaxAgeSeconds: 3600,
  };
  const rules = [...existing.filter((x) => x.ID !== rule.ID), rule];
  console.log(`R2 CORS — bucket=${bucket} modo=${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`origens do app: ${origins.join(', ')}`);
  console.log(`regras preservadas: ${rules.length - 1}`);
  if (!APPLY) return console.log('Nada alterado. Rode com --apply para gravar.');
  await s3Client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: rules } }));
  const verified = await currentRules();
  if (!verified.some((x) => x.ID === rule.ID)) throw new Error('A regra não apareceu na verificação após gravação.');
  console.log('Política aplicada e verificada. A propagação pode levar até 30 segundos.');
})().catch((e) => { console.error(`ERRO: ${e.message}`); process.exitCode = 1; });
