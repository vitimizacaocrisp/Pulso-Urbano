// ─────────────────────────────────────────────────────────────────────
// Repository v2 de postagens (docs 01/05/06).
// Toda escrita multi-tabela é transacional (withTx). Colunas SEMPRE de
// listas fixas (nunca chaves vindas do cliente) — sem SQL dinâmico inseguro.
// ─────────────────────────────────────────────────────────────────────
const { q, withTx } = require('../db/pool');
const { sanitizeConteudo } = require('../services/sanitize');

const PT_TABLE = {
  analise: 'pt_analises', academico: 'pt_academicos', dado: 'pt_dados',
  podcast: 'pt_podcasts', livro: 'pt_livros', video: 'pt_videos',
};
// allowlist de colunas por subtipo (espelha o schema — doc 01)
const PT_COLS = {
  analise:   ['metodologia', 'indicadores'],
  academico: ['tipo_producao', 'ano', 'veiculo', 'doi', 'qualis', 'issn', 'orientador', 'programa'],
  dado:      ['instrumento', 'formato', 'tamanho_amostra', 'cobertura', 'periodo_coleta', 'licenca', 'metodologia_amostral'],
  podcast:   ['formato_midia', 'numero_episodio', 'temporada', 'duracao_seg', 'plataforma', 'embed_url', 'transcricao', 'convidados'],
  livro:     ['isbn', 'editora', 'ano_pub', 'edicao', 'num_paginas', 'compra_url', 'sumario'],
  video:     ['plataforma', 'embed_url', 'duracao_seg', 'legendas_url'],
};
// campos comuns editáveis via PATCH (allowlist)
const COMUNS_COLS = [
  'titulo', 'subtitulo', 'resumo', 'conteudo', 'destaque', 'is_crisp',
  'periodo_estudo', 'nacionalidade', 'with_header', 'with_footer',
];

const slugify = (s) => String(s || '').toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160);

// ── criação (wizard passo 1: rascunho nasce primeiro — doc 05) ──────
async function criarRascunho(tipo, adminId) {
  return withTx(async (c) => {
    const p = await c.query(
      `INSERT INTO postagens (tipo, titulo, status, criado_por)
       VALUES ($1, '(sem título)', 'rascunho', $2) RETURNING id`,
      [tipo, adminId ?? null]);
    const id = p.rows[0].id;
    await c.query(`INSERT INTO ${PT_TABLE[tipo]} (postagem_id) VALUES ($1)`, [id]);
    return id;
  });
}

// ── PATCH (autosave por passo) ───────────────────────────────────────
async function patchPostagem(id, dados) {
  return withTx(async (c) => {
    const cur = await c.query(
      `SELECT tipo FROM postagens WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (!cur.rows.length) return null;
    const tipo = cur.rows[0].tipo;

    // comuns (só colunas presentes; conteudo é sanitizado aqui — doc 05)
    const sets = []; const vals = []; let i = 1;
    for (const col of COMUNS_COLS) {
      if (dados[col] !== undefined) {
        const v = col === 'conteudo' ? sanitizeConteudo(dados[col]) : dados[col];
        sets.push(`${col} = $${i++}`); vals.push(v);
      }
    }
    if (sets.length) {
      vals.push(id);
      await c.query(`UPDATE postagens SET ${sets.join(', ')} WHERE id = $${i}`, vals);
    }

    // subtipo
    const sub = dados.subtipo || {};
    const subSets = []; const subVals = []; let j = 1;
    for (const col of PT_COLS[tipo]) {
      if (sub[col] !== undefined) {
        const v = col === 'transcricao' ? sanitizeConteudo(sub[col]) : sub[col];
        subSets.push(`${col} = $${j++}`); subVals.push(v);
      }
    }
    if (subSets.length) {
      subVals.push(id);
      await c.query(`UPDATE ${PT_TABLE[tipo]} SET ${subSets.join(', ')} WHERE postagem_id = $${j}`, subVals);
    }

    // taxonomia: rebuild determinístico só dos arrays PRESENTES
    if (dados.categorias) await syncSlugged(c, id, 'categorias', 'postagem_categorias', 'categoria_id', dados.categorias);
    if (dados.tags)       await syncSlugged(c, id, 'tags', 'postagem_tags', 'tag_id', dados.tags);
    if (dados.autores)    await syncAutores(c, id, dados.autores);
    if (dados.fontes)     await syncFontes(c, id, dados.fontes);
    if (dados.ufs)        await syncUfs(c, id, dados.ufs);
    if (dados.municipios) await syncMunicipios(c, id, dados.municipios);
    return true;
  });
}

async function syncSlugged(c, pid, table, juncao, fkCol, nomes) {
  await c.query(`DELETE FROM ${juncao} WHERE postagem_id = $1`, [pid]);
  for (const nome of nomes) {
    const slug = slugify(nome);
    const r = await c.query(
      `INSERT INTO ${table} (nome, slug) VALUES ($1,$2)
       ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug RETURNING id`, [nome, slug]);
    await c.query(
      `INSERT INTO ${juncao} (postagem_id, ${fkCol}) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [pid, r.rows[0].id]);
  }
}
async function syncAutores(c, pid, nomes) {
  await c.query(`DELETE FROM postagem_autores WHERE postagem_id = $1`, [pid]);
  let ordem = 0;
  for (const nome of nomes) {
    const r = await c.query(
      `INSERT INTO autores (nome) VALUES ($1)
       ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`, [nome]);
    await c.query(
      `INSERT INTO postagem_autores (postagem_id, autor_id, ordem) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [pid, r.rows[0].id, ordem++]);
  }
}
async function syncFontes(c, pid, nomes) {
  await c.query(`DELETE FROM postagem_fontes WHERE postagem_id = $1`, [pid]);
  for (const nome of nomes) {
    const r = await c.query(
      `INSERT INTO fontes (nome) VALUES ($1)
       ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`, [nome]);
    await c.query(`INSERT INTO postagem_fontes VALUES ($1,$2) ON CONFLICT DO NOTHING`, [pid, r.rows[0].id]);
  }
}
async function syncUfs(c, pid, siglas) {
  await c.query(`DELETE FROM postagem_ufs WHERE postagem_id = $1`, [pid]);
  for (const s of siglas) {
    const r = await c.query(`SELECT id FROM ufs WHERE sigla = UPPER($1)`, [s]);
    if (r.rows.length) {
      await c.query(`INSERT INTO postagem_ufs VALUES ($1,$2) ON CONFLICT DO NOTHING`, [pid, r.rows[0].id]);
    }
  }
}
async function syncMunicipios(c, pid, nomes) {
  await c.query(`DELETE FROM postagem_municipios WHERE postagem_id = $1`, [pid]);
  for (const nome of nomes) {
    const r = await c.query(
      `INSERT INTO municipios (uf_id, nome) VALUES (NULL, $1)
       ON CONFLICT (uf_id, nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`, [nome]);
    await c.query(`INSERT INTO postagem_municipios VALUES ($1,$2) ON CONFLICT DO NOTHING`, [pid, r.rows[0].id]);
  }
}

// ── publicar / arquivar / deletar ────────────────────────────────────
// Slug server-side, imutável após publicado, colisão → -2, -3 (doc 05).
async function publicar(id) {
  return withTx(async (c) => {
    const cur = await c.query(
      `SELECT titulo, slug, status FROM postagens WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (!cur.rows.length) return null;
    let { slug } = cur.rows[0];
    if (!slug) {
      const base = slugify(cur.rows[0].titulo) || `postagem-${id}`;
      slug = base;
      for (let n = 2; ; n++) {
        const dup = await c.query(`SELECT 1 FROM postagens WHERE slug = $1 AND id <> $2`, [slug, id]);
        if (!dup.rows.length) break;
        slug = `${base}-${n}`;
      }
    }
    await c.query(
      `UPDATE postagens SET status = 'publicado', slug = $1,
         publicado_em = COALESCE(publicado_em, NOW())
       WHERE id = $2`, [slug, id]);
    return slug;
  });
}
const arquivar   = (id) => q(`UPDATE postagens SET status = 'arquivado' WHERE id = $1 AND deleted_at IS NULL`, [id]);
const softDelete = (id) => q(`UPDATE postagens SET deleted_at = NOW() WHERE id = $1`, [id]);
const registrarView = (id) => q(
  `UPDATE postagens SET visualizacoes = visualizacoes + 1
   WHERE id = $1 AND status = 'publicado' AND deleted_at IS NULL`, [id]);

// ── leitura ──────────────────────────────────────────────────────────
// Regra de visibilidade pública (doc 02, aceite F3): publicado + não deletado.
const VISIVEL = `p.status = 'publicado' AND p.deleted_at IS NULL`;

const SHAPE_ARRAYS = `
  (SELECT json_agg(json_build_object('id',c.id,'nome',c.nome,'slug',c.slug) ORDER BY c.nome)
     FROM postagem_categorias pc JOIN categorias c ON c.id=pc.categoria_id WHERE pc.postagem_id=p.id) AS categorias,
  (SELECT json_agg(json_build_object('id',t.id,'nome',t.nome) ORDER BY t.nome)
     FROM postagem_tags ptg JOIN tags t ON t.id=ptg.tag_id WHERE ptg.postagem_id=p.id) AS tags,
  (SELECT json_agg(json_build_object('id',a.id,'nome',a.nome,'tipo',a.tipo,'ordem',pa.ordem) ORDER BY pa.ordem)
     FROM postagem_autores pa JOIN autores a ON a.id=pa.autor_id WHERE pa.postagem_id=p.id) AS autores,
  (SELECT json_agg(json_build_object('id',f.id,'nome',f.nome,'url',f.url))
     FROM postagem_fontes pf JOIN fontes f ON f.id=pf.fonte_id WHERE pf.postagem_id=p.id) AS fontes,
  (SELECT json_agg(u.sigla ORDER BY u.sigla)
     FROM postagem_ufs pu JOIN ufs u ON u.id=pu.uf_id WHERE pu.postagem_id=p.id) AS ufs,
  (SELECT json_agg(json_build_object('nome',m.nome,'uf',u2.sigla))
     FROM postagem_municipios pm JOIN municipios m ON m.id=pm.municipio_id
     LEFT JOIN ufs u2 ON u2.id=m.uf_id WHERE pm.postagem_id=p.id) AS municipios,
  (SELECT json_build_object('id',ax.id,'url','/api/media/'||ax.id) FROM anexos ax WHERE ax.id=p.cover_anexo_id) AS cover`;

const LIST_COLS = `p.id, p.legado_id, p.tipo, p.slug, p.titulo, p.subtitulo, p.resumo,
  p.status, p.destaque, p.is_crisp, p.periodo_estudo, p.nacionalidade,
  p.visualizacoes, p.publicado_em, p.created_at, p.updated_at`;

function buildFiltros({ tipo, categoria, tag, crisp, uf, busca }, startIdx, publico = true) {
  const where = [publico ? VISIVEL : `p.deleted_at IS NULL`];
  const vals = []; let i = startIdx;
  if (tipo)      { where.push(`p.tipo = $${i++}`); vals.push(tipo); }
  if (crisp)     { where.push(`p.is_crisp = TRUE`); }
  if (categoria) { where.push(`EXISTS (SELECT 1 FROM postagem_categorias pc JOIN categorias c ON c.id=pc.categoria_id WHERE pc.postagem_id=p.id AND c.slug = $${i++})`); vals.push(categoria); }
  if (tag)       { where.push(`EXISTS (SELECT 1 FROM postagem_tags ptg JOIN tags t ON t.id=ptg.tag_id WHERE ptg.postagem_id=p.id AND t.slug = $${i++})`); vals.push(slugify(tag)); }
  if (uf)        { where.push(`EXISTS (SELECT 1 FROM postagem_ufs pu JOIN ufs u ON u.id=pu.uf_id WHERE pu.postagem_id=p.id AND u.sigla = UPPER($${i++}))`); vals.push(uf); }
  if (busca)     { where.push(`p.search_vector @@ websearch_to_tsquery('portuguese', f_unaccent($${i++}))`); vals.push(busca); }
  return { where: where.join(' AND '), vals, next: i };
}

async function listar(filtros, { page = 1, limit = 24, publico = true, status = null } = {}) {
  const lim = Math.min(Math.max(limit, 1), 100);
  const off = (Math.max(page, 1) - 1) * lim;
  const f = buildFiltros(filtros, 1, publico);
  let extra = '';
  if (!publico && status) { extra = ` AND p.status = $${f.next}`; f.vals.push(status); f.next++; }
  const [itens, total] = await Promise.all([
    q(`SELECT ${LIST_COLS}, ${SHAPE_ARRAYS}
       FROM postagens p WHERE ${f.where}${extra}
       ORDER BY COALESCE(p.publicado_em, p.created_at) DESC
       LIMIT ${lim} OFFSET ${off}`, f.vals),
    q(`SELECT COUNT(*)::int AS n FROM postagens p WHERE ${f.where}${extra}`, f.vals),
  ]);
  return { itens: itens.rows, total: total.rows[0].n, page, pages: Math.ceil(total.rows[0].n / lim) };
}

async function detalhe({ slug, legadoId, id, publico = true }) {
  const where = publico ? VISIVEL : 'p.deleted_at IS NULL';
  let cond, val;
  if (slug) { cond = 'p.slug = $1'; val = slug; }
  else if (legadoId) { cond = 'p.legado_id = $1'; val = legadoId; }
  else { cond = 'p.id = $1'; val = id; }
  const r = await q(
    `SELECT ${LIST_COLS}, p.conteudo, p.with_header, p.with_footer, ${SHAPE_ARRAYS},
      (SELECT json_agg(json_build_object('id',ax.id,'tipo',ax.tipo,'origem',ax.origem,
        'nome',ax.nome_arquivo,'ordem',ax.ordem) ORDER BY ax.ordem)
        FROM anexos ax WHERE ax.postagem_id=p.id AND ax.tipo <> 'cover') AS anexos
     FROM postagens p WHERE ${cond} AND ${where}`, [val]);
  if (!r.rows.length) return null;
  const post = r.rows[0];
  const sub = await q(`SELECT * FROM ${PT_TABLE[post.tipo]} WHERE postagem_id = $1`, [post.id]);
  const { postagem_id, ...subtipo } = sub.rows[0] || {};
  return { ...post, subtipo };
}

module.exports = {
  criarRascunho, patchPostagem, publicar, arquivar, softDelete, registrarView,
  listar, detalhe, PT_TABLE,
};
