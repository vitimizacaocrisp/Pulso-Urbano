/* eslint-disable no-console */
// Backfill de PRODUÇÃO: analyses (legado) → tabelas v2, TUDO no mesmo Neon.
// NÃO trunca nada, NÃO cria contas de teste. Idempotente por legado_id
// (ON CONFLICT) — é o mecanismo anti-deriva (rodar de novo pouco antes do flip).
// `criado_por` = admin real (o 1º da tabela admins).
//
//   cd backend && node scripts/backfill_prod.js
//
// Usa a conexão DIRETA do Neon (não-pooler) p/ transação + trigger de FTS.
require('dotenv').config();
const { Client } = require('pg');

const direct = process.env.DATABASE_URL.replace('-pooler', '');
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL ausente'); process.exit(1); }
const pg = new Client({ connectionString: direct, ssl: { rejectUnauthorized: false } });
const descartes = [];

const slugify = (s) => String(s || '').toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160);
const asList = (v) => {
  if (v == null) return [];
  let x = v;
  if (typeof v === 'string') { try { x = JSON.parse(v); } catch { x = v; } }
  if (Array.isArray(x)) return x.map((s) => String(s).trim()).filter(Boolean);
  if (typeof x === 'string') return x.trim() ? [x.trim()] : [];
  if (typeof x === 'object') return Object.values(x).map((s) => String(s).trim()).filter(Boolean);
  return [];
};
const asText = (v) => {
  if (v == null) return null;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return typeof p === 'string' ? p : v; } catch { return v; } }
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};
const parseTags = (raw) => {
  const t = asText(raw); if (!t) return [];
  return [...new Set(t.replace(/#/g, '').split(/[,;\n]+|\s{2,}/).map((s) => s.trim())
    .filter((s) => s.replace(/[^a-zA-ZÀ-ÿ0-9]/g, '').length >= 2))];
};
const parseAutores = (raw) => {
  const t = asText(raw); if (!t) return [];
  return [...new Set(t.split(/;/).map((s) => s.trim()).filter(Boolean))];
};
const parseRefs = (raw) => asList(raw).filter((l) => l.replace(/[^a-zA-Z0-9]/g, '').length >= 2);
const parseMeta = (m) => { try { return typeof m === 'string' ? JSON.parse(m || '{}') : (m || {}); } catch { return {}; } };
const R2_HOSTS = /\.r2\.dev$|\.r2\.cloudflarestorage\.com$/;
const anexoOrigem = (url) => {
  try { const u = new URL(url); if (R2_HOSTS.test(u.hostname)) return { origem: 'r2', chave: u.pathname.replace(/^\//, '') }; }
  catch { /* relativa/inválida */ }
  return { origem: 'externo', chave: null };
};
const extractUrl = (s) => (String(s).match(/https?:\/\/[^\s"')]+/) || [null])[0];
const ENTRY_MAP = { analysis: 'analise', academic: 'academico', dataset: 'dado', podcast: 'podcast' };

async function upsertSlugged(table, nome) {
  const r = await pg.query(
    `INSERT INTO ${table} (nome, slug) VALUES ($1,$2)
     ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug RETURNING id`, [nome, slugify(nome)]);
  return r.rows[0].id;
}
async function upsertNamed(table, nome, extra = {}) {
  const cols = ['nome', ...Object.keys(extra)];
  const vals = [nome, ...Object.values(extra)];
  const ph = vals.map((_, i) => `$${i + 1}`);
  const updates = cols.map((c) => `${c} = EXCLUDED.${c}`).join(', ');
  const r = await pg.query(
    `INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph.join(',')})
     ON CONFLICT (nome) DO UPDATE SET ${updates} RETURNING id`, vals);
  return r.rows[0].id;
}

(async () => {
  await pg.connect();
  try {
    await pg.query('BEGIN');
    const adm = await pg.query(`SELECT id FROM admins WHERE deleted_at IS NULL ORDER BY id LIMIT 1`);
    if (!adm.rows.length) throw new Error('Nenhum admin em produção p/ criado_por.');
    const adminId = adm.rows[0].id;

    const rows = (await pg.query('SELECT * FROM analyses ORDER BY id')).rows;
    console.log(`Lidos ${rows.length} registros de analyses (produção).`);

    let criadas = 0, atualizadas = 0;
    for (const a of rows) {
      const tipo = ENTRY_MAP[a.entry_type] || 'analise';
      const slug = `${slugify(a.title) || 'postagem'}-${a.id}`;
      const pubEm = a.last_update || a.created_at || null;
      const post = await pg.query(
        `INSERT INTO postagens
          (legado_id,tipo,slug,titulo,subtitulo,resumo,conteudo,status,is_crisp,
           periodo_estudo,nacionalidade,with_header,with_footer,criado_por,publicado_em,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'publicado',$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (legado_id) DO UPDATE SET
           tipo=EXCLUDED.tipo, slug=EXCLUDED.slug, titulo=EXCLUDED.titulo,
           subtitulo=EXCLUDED.subtitulo, resumo=EXCLUDED.resumo, conteudo=EXCLUDED.conteudo,
           is_crisp=EXCLUDED.is_crisp, periodo_estudo=EXCLUDED.periodo_estudo,
           nacionalidade=EXCLUDED.nacionalidade, with_header=EXCLUDED.with_header,
           with_footer=EXCLUDED.with_footer, publicado_em=EXCLUDED.publicado_em
         RETURNING id, (xmax = 0) AS inserted`,
        [a.id, tipo, slug, a.title || '(sem título)', a.subtitle || null, a.description || null,
         a.content || null, !!a.is_crisp, a.study_period || null, a.nationality || null,
         a.with_header ?? true, a.with_footer ?? true, adminId, pubEm, a.created_at || new Date()]);
      const pid = post.rows[0].id;
      post.rows[0].inserted ? criadas++ : atualizadas++;

      const m = parseMeta(a.meta);
      if (tipo === 'analise') {
        await pg.query(`INSERT INTO pt_analises (postagem_id) VALUES ($1) ON CONFLICT (postagem_id) DO NOTHING`, [pid]);
      } else if (tipo === 'academico') {
        await pg.query(`INSERT INTO pt_academicos (postagem_id,tipo_producao,ano,veiculo,doi)
          VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT (postagem_id) DO UPDATE SET tipo_producao=EXCLUDED.tipo_producao,
            ano=EXCLUDED.ano, veiculo=EXCLUDED.veiculo, doi=EXCLUDED.doi`,
          [pid, m.academicType || null, parseInt(m.year, 10) || null, m.venue || null, m.doi || null]);
      } else if (tipo === 'dado') {
        const raw = String(m.sampleSize || '').trim();
        const ehNumero = /^\d+$/.test(raw.replace(/[.\s]/g, ''));
        const tamanho = ehNumero ? parseInt(raw.replace(/[.\s]/g, ''), 10) : null;
        const cobertura = ehNumero ? null : (raw || null);
        await pg.query(`INSERT INTO pt_dados (postagem_id,instrumento,formato,tamanho_amostra,cobertura)
          VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT (postagem_id) DO UPDATE SET instrumento=EXCLUDED.instrumento,
            formato=EXCLUDED.formato, tamanho_amostra=EXCLUDED.tamanho_amostra, cobertura=EXCLUDED.cobertura`,
          [pid, m.instrument || null, m.dataFormat || null, tamanho, cobertura]);
      } else if (tipo === 'podcast') {
        await pg.query(`INSERT INTO pt_podcasts (postagem_id,embed_url)
          VALUES ($1,$2) ON CONFLICT (postagem_id) DO UPDATE SET embed_url=EXCLUDED.embed_url`,
          [pid, m.embedUrl || null]);
      }

      await pg.query(`DELETE FROM postagem_categorias WHERE postagem_id=$1`, [pid]);
      for (const c of asList(a.category)) {
        const cid = await upsertSlugged('categorias', c);
        await pg.query(`INSERT INTO postagem_categorias VALUES ($1,$2) ON CONFLICT DO NOTHING`, [pid, cid]);
      }
      await pg.query(`DELETE FROM postagem_tags WHERE postagem_id=$1`, [pid]);
      for (const t of parseTags(a.tag)) {
        const tid = await upsertSlugged('tags', t);
        await pg.query(`INSERT INTO postagem_tags VALUES ($1,$2) ON CONFLICT DO NOTHING`, [pid, tid]);
      }
      await pg.query(`DELETE FROM postagem_autores WHERE postagem_id=$1`, [pid]);
      let ordem = 0;
      for (const au of parseAutores(a.author)) {
        const aid = await upsertNamed('autores', au);
        await pg.query(`INSERT INTO postagem_autores (postagem_id,autor_id,ordem) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [pid, aid, ordem++]);
      }
      await pg.query(`DELETE FROM postagem_fontes WHERE postagem_id=$1`, [pid]);
      const fonteTxt = asText(a.source);
      if (fonteTxt) {
        const fid = await upsertNamed('fontes', fonteTxt, { url: extractUrl(fonteTxt) });
        await pg.query(`INSERT INTO postagem_fontes VALUES ($1,$2) ON CONFLICT DO NOTHING`, [pid, fid]);
      }
      await pg.query(`DELETE FROM postagem_ufs WHERE postagem_id=$1`, [pid]);
      for (const st of asList(a.states)) {
        const q = st.length === 2
          ? await pg.query(`SELECT id FROM ufs WHERE sigla = UPPER($1)`, [st])
          : await pg.query(`SELECT id FROM ufs WHERE nome ILIKE $1`, [st]);
        if (q.rows.length) await pg.query(`INSERT INTO postagem_ufs VALUES ($1,$2) ON CONFLICT DO NOTHING`, [pid, q.rows[0].id]);
        else descartes.push({ legado_id: a.id, campo: 'states', valor: st });
      }
      await pg.query(`DELETE FROM postagem_municipios WHERE postagem_id=$1`, [pid]);
      for (const ci of asList(a.cities)) {
        const r = await pg.query(
          `INSERT INTO municipios (uf_id, nome) VALUES (NULL, $1)
           ON CONFLICT (uf_id, nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`, [ci]);
        await pg.query(`INSERT INTO postagem_municipios VALUES ($1,$2) ON CONFLICT DO NOTHING`, [pid, r.rows[0].id]);
      }

      await pg.query(`UPDATE postagens SET cover_anexo_id = NULL WHERE id=$1`, [pid]);
      await pg.query(`DELETE FROM anexos WHERE postagem_id=$1`, [pid]);
      if (a.cover_image_path) {
        const { origem, chave } = anexoOrigem(a.cover_image_path);
        const an = await pg.query(
          `INSERT INTO anexos (postagem_id,tipo,origem,url_r2,chave_r2) VALUES ($1,'cover',$2,$3,$4) RETURNING id`,
          [pid, origem, a.cover_image_path, chave]);
        await pg.query(`UPDATE postagens SET cover_anexo_id = $1 WHERE id = $2`, [an.rows[0].id, pid]);
      }
      let o2 = 0;
      for (const link of parseRefs(a.reference_links)) {
        const { origem, chave } = anexoOrigem(link);
        await pg.query(`INSERT INTO anexos (postagem_id,tipo,origem,url_r2,chave_r2,ordem) VALUES ($1,'anexo',$2,$3,$4,$5)`,
          [pid, origem, link, chave, o2++]);
      }
    }

    await pg.query('COMMIT');
    console.log(`Backfill PROD: ${criadas} criadas, ${atualizadas} atualizadas.`);
    if (descartes.length) { console.log(`Descartes (${descartes.length}):`); descartes.forEach((d) => console.log(`  legado#${d.legado_id} ${d.campo}: "${d.valor}"`)); }
    else console.log('Descartes: 0');

    const c = async (s) => (await pg.query(s)).rows[0].c;
    console.log('=== VERIFICAÇÃO (Neon) ===');
    console.log('postagens:', await c('SELECT COUNT(*)::int c FROM postagens'),
      '| legado_id nulos:', await c('SELECT COUNT(*)::int c FROM postagens WHERE legado_id IS NULL'),
      '| fts nulos:', await c('SELECT COUNT(*)::int c FROM postagens WHERE search_vector IS NULL'));
    console.log('por tipo:', JSON.stringify((await pg.query('SELECT tipo, COUNT(*)::int n FROM postagens GROUP BY tipo')).rows));
    console.log('is_crisp:', await c('SELECT COUNT(*)::int c FROM postagens WHERE is_crisp'),
      '| pt_analises:', await c('SELECT COUNT(*)::int c FROM pt_analises'));
    console.log('categorias:', await c('SELECT COUNT(*)::int c FROM categorias'),
      '| tags:', await c('SELECT COUNT(*)::int c FROM tags'),
      '| autores:', await c('SELECT COUNT(*)::int c FROM autores'),
      '| anexos:', await c('SELECT COUNT(*)::int c FROM anexos'));
    console.log('admins:', await c('SELECT COUNT(*)::int c FROM admins'), '| users:', await c('SELECT COUNT(*)::int c FROM users'));
  } catch (e) {
    await pg.query('ROLLBACK');
    console.error('ERRO — rollback:', e.message);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
})();
