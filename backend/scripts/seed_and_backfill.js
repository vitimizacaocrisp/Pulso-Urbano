/* eslint-disable no-console */
// Seed (2 admins + 2 users de teste) + backfill dos posts de PRODUÇÃO (Neon)
// para o Postgres de TESTE (Docker), reorganizando no schema v2.
//
// PRODUÇÃO É SÓ LEITURA aqui. Escrita apenas no Docker.
// IDEMPOTENTE por legado_id: re-executar converge (não duplica) — é o mecanismo
// anti-deriva da Fase 5 (docs/planejamento/02-migracao.md).
//
//   cd backend && node scripts/seed_and_backfill.js          (reset + backfill)
//   RESET=0 node scripts/seed_and_backfill.js                (re-run incremental)
//
// Requer: backend/.env com DATABASE_URL (Neon). Docker em localhost:5433.
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const NEON_URL = process.env.DATABASE_URL;
const TEST_URL = process.env.TEST_DATABASE_URL
  || 'postgresql://pulso:pulso_dev@localhost:5433/pulso_urbano';
const RESET = process.env.RESET !== '0';
const BCRYPT_COST = 12; // padronizado (doc 07)

if (!NEON_URL) { console.error('DATABASE_URL (Neon) ausente no backend/.env'); process.exit(1); }

const neonSql = neon(NEON_URL);
const pg = new Client({ connectionString: TEST_URL });

// relatório de descartes — nada é descartado em silêncio (doc 02)
const descartes = [];

// ── helpers de normalização ──────────────────────────────────────────
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
// autores por ';' apenas (preserva "CRISP/UFMG")
const parseAutores = (raw) => {
  const t = asText(raw); if (!t) return [];
  return [...new Set(t.split(/;/).map((s) => s.trim()).filter(Boolean))];
};
const parseRefs = (raw) => asList(raw).filter((l) => l.replace(/[^a-zA-Z0-9]/g, '').length >= 2);
const parseMeta = (m) => { try { return typeof m === 'string' ? JSON.parse(m || '{}') : (m || {}); } catch { return {}; } };

// origem/chave do anexo: só é 'r2' quando a URL é do nosso storage (doc 01)
const R2_HOSTS = /\.r2\.dev$|\.r2\.cloudflarestorage\.com$/;
const anexoOrigem = (url) => {
  try {
    const u = new URL(url);
    if (R2_HOSTS.test(u.hostname)) return { origem: 'r2', chave: u.pathname.replace(/^\//, '') };
  } catch { /* URL relativa/inválida → externo sem chave */ }
  return { origem: 'externo', chave: null };
};
// URL embutida numa string de fonte (ex.: "IBGE — https://ibge.gov.br/...")
const extractUrl = (s) => (String(s).match(/https?:\/\/[^\s"')]+/) || [null])[0];

const ENTRY_MAP = { analysis: 'analise', academic: 'academico', dataset: 'dado', podcast: 'podcast' };

// upsert com ON CONFLICT (dedup segura sob concorrência — doc 01)
async function upsertSlugged(table, nome) {
  const slug = slugify(nome);
  const r = await pg.query(
    `INSERT INTO ${table} (nome, slug) VALUES ($1,$2)
     ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug RETURNING id`, [nome, slug]);
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

    if (RESET) {
      await pg.query(`TRUNCATE postagens, anexos, categorias, tags, autores, fontes, municipios,
        admins, users, auth_tokens, audit_log RESTART IDENTITY CASCADE`);
      console.log('RESET: tabelas de conteúdo/contas zeradas (ufs preservadas).');
    }

    // ── seed: 2 admins + 2 users de teste (idempotente por e-mail) ──
    const hash = (p) => bcrypt.hashSync(p, BCRYPT_COST);
    const seedConta = async (table, cols, vals, email) => {
      const exists = await pg.query(`SELECT id FROM ${table} WHERE lower(email) = lower($1)`, [email]);
      if (exists.rows.length) return exists.rows[0].id;
      const ph = vals.map((_, i) => `$${i + 1}`);
      const r = await pg.query(`INSERT INTO ${table} (${cols}) VALUES (${ph.join(',')}) RETURNING id`, vals);
      return r.rows[0].id;
    };
    const superId = await seedConta('admins', 'nome,email,senha_hash,role',
      ['Admin Chefe (teste)', 'super@teste.local', hash('senha123'), 'superadmin'], 'super@teste.local');
    await seedConta('admins', 'nome,email,senha_hash,role',
      ['Editor (teste)', 'editor@teste.local', hash('senha123'), 'editor'], 'editor@teste.local');
    await seedConta('users', 'nome,email,senha_hash,email_verificado',
      ['Usuária Teste Um', 'user1@teste.local', hash('senha123'), true], 'user1@teste.local');
    await seedConta('users', 'nome,email,senha_hash,email_verificado',
      ['Usuário Teste Dois', 'user2@teste.local', hash('senha123'), false], 'user2@teste.local');
    console.log(`Seed: 2 admins + 2 users (senha: senha123, bcrypt cost ${BCRYPT_COST}).`);

    // ── lê produção (SÓ LEITURA) ──
    const rows = await neonSql`SELECT * FROM analyses ORDER BY id`;
    console.log(`Lidos ${rows.length} registros de produção (Neon).`);

    let criadas = 0, atualizadas = 0;
    for (const a of rows) {
      const tipo = ENTRY_MAP[a.entry_type] || 'analise';
      const slug = `${slugify(a.title) || 'postagem'}-${a.id}`;
      const pubEm = a.last_update || a.created_at || null;

      // idempotência: legado_id é a âncora (re-run atualiza em vez de duplicar)
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
         a.with_header ?? true, a.with_footer ?? true, superId, pubEm, a.created_at || new Date()]);
      const pid = post.rows[0].id;
      post.rows[0].inserted ? criadas++ : atualizadas++;

      // subtipo (mapeamento campo-a-campo; bug sampleSize→cobertura corrigido)
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
        // sampleSize numérico puro → tamanho_amostra (INT); senão → cobertura (texto)
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

      // taxonomia (rebuild determinístico das junções desta postagem)
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
        if (q.rows.length) {
          await pg.query(`INSERT INTO postagem_ufs VALUES ($1,$2) ON CONFLICT DO NOTHING`, [pid, q.rows[0].id]);
        } else {
          descartes.push({ legado_id: a.id, campo: 'states', valor: st }); // nada some em silêncio
        }
      }
      await pg.query(`DELETE FROM postagem_municipios WHERE postagem_id=$1`, [pid]);
      for (const ci of asList(a.cities)) {
        // municípios sob demanda; uf desconhecida = NULL (listado no relatório)
        const r = await pg.query(
          `INSERT INTO municipios (uf_id, nome) VALUES (NULL, $1)
           ON CONFLICT (uf_id, nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`, [ci]);
        await pg.query(`INSERT INTO postagem_municipios VALUES ($1,$2) ON CONFLICT DO NOTHING`, [pid, r.rows[0].id]);
      }

      // anexos: rebuild determinístico (cover + referências), com origem/chave corretas
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
    // search_vector: preenchido pelo trigger trg_postagens_fts (INSERT/UPDATE)

    await pg.query('COMMIT');
    console.log(`Backfill: ${criadas} criadas, ${atualizadas} atualizadas.`);

    // ── relatório de descartes ──
    if (descartes.length) {
      console.log(`\n⚠ Descartes (${descartes.length}) — valores sem match, NÃO migrados:`);
      descartes.forEach((d) => console.log(`  legado#${d.legado_id} ${d.campo}: "${d.valor}"`));
    } else {
      console.log('Descartes: 0');
    }
    const semUf = await pg.query(`SELECT COUNT(*)::int c FROM municipios WHERE uf_id IS NULL`);
    if (semUf.rows[0].c) console.log(`⚠ Municípios sem UF (ambíguos): ${semUf.rows[0].c}`);

    // ── verificação ──
    const q = async (s) => (await pg.query(s)).rows[0].c;
    console.log('\n=== VERIFICAÇÃO (Docker) ===');
    console.log('postagens:', await q('SELECT COUNT(*)::int c FROM postagens'));
    console.log('  por tipo:', JSON.stringify((await pg.query('SELECT tipo, COUNT(*)::int n FROM postagens GROUP BY tipo')).rows));
    console.log('  is_crisp:', await q('SELECT COUNT(*)::int c FROM postagens WHERE is_crisp'));
    console.log('  legado_id nulos:', await q('SELECT COUNT(*)::int c FROM postagens WHERE legado_id IS NULL'));
    console.log('  sem subtipo:', await q(`SELECT COUNT(*)::int c FROM postagens p
      WHERE NOT EXISTS (SELECT 1 FROM pt_analises  WHERE postagem_id=p.id)
        AND NOT EXISTS (SELECT 1 FROM pt_academicos WHERE postagem_id=p.id)
        AND NOT EXISTS (SELECT 1 FROM pt_dados     WHERE postagem_id=p.id)
        AND NOT EXISTS (SELECT 1 FROM pt_podcasts  WHERE postagem_id=p.id)
        AND NOT EXISTS (SELECT 1 FROM pt_livros    WHERE postagem_id=p.id)
        AND NOT EXISTS (SELECT 1 FROM pt_videos    WHERE postagem_id=p.id)`));
    console.log('  search_vector nulos:', await q('SELECT COUNT(*)::int c FROM postagens WHERE search_vector IS NULL'));
    console.log('pt_analises:', await q('SELECT COUNT(*)::int c FROM pt_analises'));
    console.log('categorias:', await q('SELECT COUNT(*)::int c FROM categorias'),
                '| tags:', await q('SELECT COUNT(*)::int c FROM tags'),
                '| autores:', await q('SELECT COUNT(*)::int c FROM autores'),
                '| fontes:', await q('SELECT COUNT(*)::int c FROM fontes'));
    console.log('anexos:', await q('SELECT COUNT(*)::int c FROM anexos'),
                '(r2:', await q(`SELECT COUNT(*)::int c FROM anexos WHERE origem='r2'`),
                '| externo:', await q(`SELECT COUNT(*)::int c FROM anexos WHERE origem='externo'`) + ')');
    console.log('admins:', await q('SELECT COUNT(*)::int c FROM admins'),
                '| users:', await q('SELECT COUNT(*)::int c FROM users'));
  } catch (e) {
    await pg.query('ROLLBACK');
    console.error('ERRO — rollback:', e.message);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
})();
