// Testes do repository/validações v2 contra o Postgres Docker (:5433).
// Se o banco de teste não estiver acessível, os testes são PULADOS (CI sem
// Docker não quebra — serviço postgres no CI é melhoria futura, doc 09).
const { test, before, after } = require('node:test');
const assert = require('node:assert');

process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL
  || 'postgresql://pulso:pulso_dev@localhost:5433/pulso_urbano';

const { q, withTx, closePool } = require('../src/db/pool');
const repo = require('../src/repositories/postagensRepo');
const { validaPatch, validaPublicacao } = require('../src/validators/postagemSchemas');
const { sanitizeConteudo } = require('../src/services/sanitize');

let dbOk = false;
const criadas = []; // ids p/ limpeza (não poluir os 93 do backfill)

before(async () => {
  try { await q('SELECT 1'); dbOk = true; }
  catch { console.log('⚠ Postgres de teste indisponível — testes v2 pulados.'); }
});
after(async () => {
  if (dbOk && criadas.length) {
    await q(`DELETE FROM postagens WHERE id = ANY($1)`, [criadas]); // CASCADE limpa pt_*/junções
    // taxonomia criada pelos testes (órfã após o delete acima) também sai
    await q(`DELETE FROM categorias WHERE slug IN ('cat-teste-a','cat-teste-b')`);
    await q(`DELETE FROM tags WHERE slug = 'tagteste'`);
  }
  await closePool();
});
const skipSemDb = (t) => { if (!dbOk) { t.skip('sem banco'); return true; } return false; };

test('rascunho nasce com subtipo (wizard passo 1)', async (t) => {
  if (skipSemDb(t)) return;
  const id = await repo.criarRascunho('analise', null);
  criadas.push(id);
  const p = await q(`SELECT status, tipo FROM postagens WHERE id=$1`, [id]);
  assert.strictEqual(p.rows[0].status, 'rascunho');
  const sub = await q(`SELECT 1 FROM pt_analises WHERE postagem_id=$1`, [id]);
  assert.strictEqual(sub.rows.length, 1);
});

test('patch sanitiza conteudo (XSS neutralizado no servidor)', async (t) => {
  if (skipSemDb(t)) return;
  const id = await repo.criarRascunho('analise', null);
  criadas.push(id);
  await repo.patchPostagem(id, {
    titulo: 'Teste XSS',
    conteudo: '<p onclick="x()">ok</p><script>alert(1)</script><img src=x onerror=alert(1)>',
    subtipo: {},
  });
  const r = await q(`SELECT conteudo FROM postagens WHERE id=$1`, [id]);
  assert.ok(!r.rows[0].conteudo.includes('<script'));
  assert.ok(!r.rows[0].conteudo.includes('onerror'));
  assert.ok(!r.rows[0].conteudo.includes('onclick'));
  assert.ok(r.rows[0].conteudo.includes('<p>ok</p>'));
});

test('taxonomia N:M sincroniza e rebuilda', async (t) => {
  if (skipSemDb(t)) return;
  const id = await repo.criarRascunho('analise', null);
  criadas.push(id);
  await repo.patchPostagem(id, { categorias: ['Cat Teste A', 'Cat Teste B'], tags: ['tagteste'], ufs: ['MG', 'SP'] });
  let n = await q(`SELECT COUNT(*)::int c FROM postagem_categorias WHERE postagem_id=$1`, [id]);
  assert.strictEqual(n.rows[0].c, 2);
  // rebuild: patch com 1 categoria substitui as 2
  await repo.patchPostagem(id, { categorias: ['Cat Teste A'] });
  n = await q(`SELECT COUNT(*)::int c FROM postagem_categorias WHERE postagem_id=$1`, [id]);
  assert.strictEqual(n.rows[0].c, 1);
  const ufs = await q(`SELECT COUNT(*)::int c FROM postagem_ufs WHERE postagem_id=$1`, [id]);
  assert.strictEqual(ufs.rows[0].c, 2);
});

test('publicar gera slug único (colisão → sufixo)', async (t) => {
  if (skipSemDb(t)) return;
  const a = await repo.criarRascunho('analise', null); criadas.push(a);
  const b = await repo.criarRascunho('analise', null); criadas.push(b);
  await repo.patchPostagem(a, { titulo: 'Título Colidente XYZ', resumo: 'r', conteudo: '<p>c</p>' });
  await repo.patchPostagem(b, { titulo: 'Título Colidente XYZ', resumo: 'r', conteudo: '<p>c</p>' });
  const s1 = await repo.publicar(a);
  const s2 = await repo.publicar(b);
  assert.strictEqual(s1, 'titulo-colidente-xyz');
  assert.strictEqual(s2, 'titulo-colidente-xyz-2');
});

test('visibilidade pública: rascunho e deletado NÃO aparecem', async (t) => {
  if (skipSemDb(t)) return;
  const rascunho = await repo.criarRascunho('analise', null); criadas.push(rascunho);
  await repo.patchPostagem(rascunho, { titulo: 'Rascunho Invisível QQQ' });
  const lista = await repo.listar({ busca: null }, { publico: true, limit: 100, page: 1 });
  assert.ok(!lista.itens.some((p) => p.id === rascunho), 'rascunho vazou na listagem pública');
  const det = await repo.detalhe({ id: rascunho, publico: true });
  assert.strictEqual(det, null, 'rascunho acessível no detalhe público');
  // deletado some até do admin? (admin vê rascunho, não vê deletado)
  await repo.softDelete(rascunho);
  const detAdmin = await repo.detalhe({ id: rascunho, publico: false });
  assert.strictEqual(detAdmin, null);
});

test('invariante tipo↔subtipo: trigger rejeita subtipo errado', async (t) => {
  if (skipSemDb(t)) return;
  const id = await repo.criarRascunho('analise', null); criadas.push(id);
  await assert.rejects(
    () => q(`INSERT INTO pt_podcasts (postagem_id) VALUES ($1)`, [id]),
    /não aceita linha/);
});

test('view beacon incrementa só publicado', async (t) => {
  if (skipSemDb(t)) return;
  const id = await repo.criarRascunho('analise', null); criadas.push(id);
  await repo.patchPostagem(id, { titulo: 'Post View VVV', resumo: 'r', conteudo: '<p>c</p>' });
  await repo.registrarView(id); // rascunho: não conta
  let v = await q(`SELECT visualizacoes FROM postagens WHERE id=$1`, [id]);
  assert.strictEqual(v.rows[0].visualizacoes, 0);
  await repo.publicar(id);
  await repo.registrarView(id);
  v = await q(`SELECT visualizacoes FROM postagens WHERE id=$1`, [id]);
  assert.strictEqual(v.rows[0].visualizacoes, 1);
});

test('detalhe traz subtipo e arrays', async (t) => {
  if (skipSemDb(t)) return;
  const id = await repo.criarRascunho('dado', null); criadas.push(id);
  await repo.patchPostagem(id, {
    titulo: 'Dataset Teste DDD', resumo: 'r', conteudo: '<p>c</p>',
    categorias: ['Cat Teste A'],
    subtipo: { instrumento: 'Questionário', tamanho_amostra: 2500 },
  });
  const slug = await repo.publicar(id);
  const det = await repo.detalhe({ slug, publico: true });
  assert.strictEqual(det.subtipo.instrumento, 'Questionário');
  assert.strictEqual(det.subtipo.tamanho_amostra, 2500);
  assert.strictEqual(det.categorias[0].nome, 'Cat Teste A');
});

// ── validações puras (sem DB) ────────────────────────────────────────
test('validaPatch: embed_url fora da allowlist é rejeitada', () => {
  const v = validaPatch('podcast', { subtipo: { embed_url: 'https://malicioso.com/ep' } });
  assert.strictEqual(v.ok, false);
  const ok = validaPatch('podcast', { subtipo: { embed_url: 'https://open.spotify.com/episode/x' } });
  assert.strictEqual(ok.ok, true);
});

test('validaPatch: http (não-https) em compra_url é rejeitado', () => {
  const v = validaPatch('livro', { subtipo: { compra_url: 'http://loja.com/livro' } });
  assert.strictEqual(v.ok, false);
});

test('validaPublicacao exige mídia para podcast/vídeo', () => {
  const v = validaPublicacao({ tipo: 'podcast', titulo: 't', resumo: 'r', subtipo: {} });
  assert.strictEqual(v.ok, false);
  const ok = validaPublicacao({ tipo: 'podcast', titulo: 't', resumo: 'r', subtipo: { embed_url: 'https://open.spotify.com/e/x' } });
  assert.strictEqual(ok.ok, true);
});

test('sanitizeConteudo preserva iframes de embed permitidos', () => {
  const html = '<iframe src="https://www.youtube.com/embed/abc"></iframe><iframe src="https://mal.com/x"></iframe>';
  const out = sanitizeConteudo(html);
  assert.ok(out.includes('youtube.com/embed/abc'));
  assert.ok(!out.includes('mal.com'));
});

// ── gate de acesso (prévia p/ anônimo — modelo v2) ──────────────────
test('toPreview remove corpo, transcrição, embed e URLs de anexo', () => {
  const { toPreview } = require('../src/routes/v2/postagensPublic');
  const full = {
    titulo: 't', resumo: 'r',
    conteudo: '<p>corpo completo secreto</p>',
    cover: { id: 9, url: 'https://cdn/x.jpg' },
    subtipo: { plataforma: 'Spotify', embed_url: 'https://open.spotify.com/e/x', transcricao: 'texto integral' },
    anexos: [{ id: 1, tipo: 'dataset', nome: 'base.csv', ordem: 0, url: 'https://cdn/base.csv' }],
  };
  const p = toPreview(full);
  assert.strictEqual(p.previa, true);
  assert.strictEqual(p.conteudo, null, 'corpo vazou na prévia');
  assert.ok(!('transcricao' in p.subtipo), 'transcrição vazou na prévia');
  assert.ok(!('embed_url' in p.subtipo), 'embed vazou na prévia');
  assert.strictEqual(p.subtipo.plataforma, 'Spotify', 'metadado deve permanecer');
  assert.strictEqual(p.anexos[0].url, undefined, 'URL de download vazou na prévia');
  assert.strictEqual(p.anexos[0].nome, 'base.csv', 'nome do anexo deve permanecer');
  assert.deepStrictEqual(p.cover, { id: 9, url: 'https://cdn/x.jpg' }, 'capa deve permanecer');
});
