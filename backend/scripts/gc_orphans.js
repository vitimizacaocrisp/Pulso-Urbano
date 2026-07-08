// ─────────────────────────────────────────────────────────────────────
// GC de objetos R2 órfãos (P5). Reconcilia o bucket com a tabela `anexos`:
// objetos SEM linha correspondente e mais velhos que N dias são candidatos.
//
// SEGURANÇA:
//  - DRY-RUN por padrão. Só deleta com --apply.
//  - Só considera prefixos geridos pelo v2 (`postagens/` e `avatares/`).
//    Objetos legados `uploads/*` são do app antigo — NUNCA tocados aqui até o
//    cutover (P9). Depois do cutover, incluir 'uploads/' em PREFIXOS.
//  - Roda contra o banco de `pool.js` (Docker em dev; prod só com V2_USE_PROD=1).
//
// Uso:
//   node scripts/gc_orphans.js                 # dry-run, 7 dias
//   node scripts/gc_orphans.js --days=3        # janela custom
//   node scripts/gc_orphans.js --apply         # deleta de fato
// ─────────────────────────────────────────────────────────────────────
require('dotenv').config();
const { ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../src/services/storage');
const { q, closePool } = require('../src/db/pool');

const PREFIXOS = ['postagens/', 'avatares/']; // só o que o v2 gerencia
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const DAYS = Number((args.find((a) => a.startsWith('--days=')) || '').split('=')[1]) || 7;
const bucket = process.env.STORAGE_BUCKET_NAME;

async function listar(prefix) {
  const out = [];
  let token;
  do {
    const r = await s3Client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }));
    for (const o of (r.Contents || [])) {
      if (o.Key.endsWith('/')) continue; // marcador de "pasta" (0 byte) — ignora
      out.push({ key: o.Key, size: o.Size, mod: o.LastModified });
    }
    token = r.IsTruncated ? r.NextContinuationToken : null;
  } while (token);
  return out;
}

(async () => {
  const corte = Date.now() - DAYS * 24 * 60 * 60 * 1000;
  // Conjunto de chaves referenciadas em anexos (fonte da verdade).
  const ref = new Set((await q(`SELECT chave_r2 FROM anexos WHERE chave_r2 IS NOT NULL`)).rows.map((r) => r.chave_r2));

  let candidatos = [];
  for (const p of PREFIXOS) {
    const objs = await listar(p);
    for (const o of objs) {
      if (ref.has(o.key)) continue;                    // tem linha em anexos → mantém
      if (new Date(o.mod).getTime() > corte) continue; // recente → pode ser upload em andamento
      candidatos.push(o);
    }
  }

  console.log(`GC órfãos — bucket=${bucket} prefixos=[${PREFIXOS.join(', ')}] janela=${DAYS}d modo=${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`anexos referenciados: ${ref.size} | candidatos órfãos: ${candidatos.length}`);
  candidatos.forEach((c) => console.log(`  ${APPLY ? 'DEL ' : '(dry) '}${c.key}  ${(c.size / 1024).toFixed(1)}KB  ${new Date(c.mod).toISOString()}`));

  if (APPLY && candidatos.length) {
    for (const c of candidatos) {
      await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: c.key }));
    }
    console.log(`Removidos: ${candidatos.length}`);
  } else if (!APPLY && candidatos.length) {
    console.log('Nada removido (dry-run). Rode com --apply para deletar.');
  }
  await closePool();
})().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
