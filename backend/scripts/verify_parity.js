/* eslint-disable no-console */
// Paridade Neon (produção, SÓ LEITURA) ↔ Docker (v2).
// Compara registro a registro via legado_id: campos escalares, contagens de
// taxonomia vs o JSONB original, anexos vs cover+refs originais.
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const { Client } = require('pg');

const neonSql = neon(process.env.DATABASE_URL);
const pg = new Client({ connectionString: process.env.TEST_DATABASE_URL
  || 'postgresql://pulso:pulso_dev@localhost:5433/pulso_urbano' });

const asList = (v) => {
  if (v == null) return [];
  let x = v;
  if (typeof v === 'string') { try { x = JSON.parse(v); } catch { x = v; } }
  if (Array.isArray(x)) return x.map((s) => String(s).trim()).filter(Boolean);
  if (typeof x === 'string') return x.trim() ? [x.trim()] : [];
  if (typeof x === 'object') return Object.values(x).map((s) => String(s).trim()).filter(Boolean);
  return [];
};
const parseRefs = (raw) => asList(raw).filter((l) => l.replace(/[^a-zA-Z0-9]/g, '').length >= 2);

(async () => {
  await pg.connect();
  const src = await neonSql`SELECT * FROM analyses ORDER BY id`;
  const dst = await pg.query(`
    SELECT p.*,
      (SELECT COUNT(*)::int FROM postagem_categorias WHERE postagem_id=p.id) n_cat,
      (SELECT COUNT(*)::int FROM postagem_autores    WHERE postagem_id=p.id) n_aut,
      (SELECT COUNT(*)::int FROM anexos              WHERE postagem_id=p.id) n_anx,
      (SELECT COUNT(*)::int FROM anexos WHERE postagem_id=p.id AND tipo='cover') n_cover
    FROM postagens p ORDER BY legado_id`);
  const byLegado = new Map(dst.rows.map((r) => [r.legado_id, r]));

  const falhas = [];
  for (const a of src) {
    const p = byLegado.get(a.id);
    if (!p) { falhas.push(`#${a.id}: AUSENTE no Docker`); continue; }
    const chk = (cond, msg) => { if (!cond) falhas.push(`#${a.id}: ${msg}`); };
    chk(p.titulo === (a.title || '(sem título)'), `titulo difere`);
    chk((p.subtitulo || null) === (a.subtitle || null), `subtitulo difere`);
    chk((p.resumo || '') === (a.description || ''), `resumo difere`);
    chk((p.conteudo || '').length === (a.content || '').length,
      `conteudo len ${String((p.conteudo || '').length)} vs ${String((a.content || '').length)}`);
    chk(p.is_crisp === !!a.is_crisp, `is_crisp difere`);
    chk((p.periodo_estudo || null) === (a.study_period || null), `periodo difere`);
    chk((p.nacionalidade || null) === (a.nationality || null), `nacionalidade difere`);
    const nCatSrc = asList(a.category).length;
    chk(p.n_cat === nCatSrc, `categorias ${p.n_cat} vs ${nCatSrc}`);
    const esperadoAnexos = parseRefs(a.reference_links).length + (a.cover_image_path ? 1 : 0);
    chk(p.n_anx === esperadoAnexos, `anexos ${p.n_anx} vs ${esperadoAnexos}`);
    chk(p.n_cover === (a.cover_image_path ? 1 : 0), `cover difere`);
    chk(p.status === 'publicado' && p.deleted_at === null, `status/deleted inesperado`);
    chk(!!p.slug, `slug vazio`);
  }
  // sobras no destino (postagens sem origem)
  const extras = dst.rows.filter((r) => !src.some((a) => a.id === r.legado_id));
  extras.forEach((r) => falhas.push(`Docker#${r.id}: sem origem no Neon (legado_id=${r.legado_id})`));

  console.log(`Origem: ${src.length} | Destino: ${dst.rows.length}`);
  if (falhas.length) {
    console.log(`FALHAS (${falhas.length}):`);
    falhas.slice(0, 30).forEach((f) => console.log('  ' + f));
    process.exitCode = 1;
  } else {
    console.log('PARIDADE 100% — todos os campos/contagens conferem.');
  }
  await pg.end();
})().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
