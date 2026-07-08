// ─────────────────────────────────────────────────────────────────────
// Zod v2 — schemas de postagem por tipo (docs 01/05/06).
// PATCH aceita subconjunto (autosave do wizard); PUBLICAR exige o mínimo viável.
// ─────────────────────────────────────────────────────────────────────
const { z } = require('zod');
const { validaEmbedUrl, validaHttpsUrl } = require('../services/sanitize');

const TIPOS = ['analise', 'academico', 'dado', 'podcast', 'livro', 'video'];

const optStr = (max) => z.string().trim().max(max).nullish();
const optInt = z.coerce.number().int().nullish().catch(null);

// ── subtipos ─────────────────────────────────────────────────────────
const subAnalise = z.object({
  metodologia: optStr(20000),
  indicadores: z.any().nullish(), // JSONB livre (números de destaque)
}).partial();

const subAcademico = z.object({
  tipo_producao: optStr(40), ano: optInt, veiculo: optStr(255),
  doi: optStr(120), qualis: optStr(4), issn: optStr(20),
  orientador: optStr(160), programa: optStr(160),
}).partial();

const subDado = z.object({
  instrumento: optStr(60), formato: optStr(40), tamanho_amostra: optInt,
  cobertura: optStr(160), periodo_coleta: optStr(60), licenca: optStr(60),
  metodologia_amostral: optStr(20000),
}).partial();

const subPodcast = z.object({
  formato_midia: z.enum(['audio', 'video']).nullish(),
  numero_episodio: optInt, temporada: optInt, duracao_seg: optInt,
  plataforma: optStr(30),
  embed_url: z.string().trim().max(1000).nullish(),
  transcricao: optStr(200000), convidados: optStr(2000),
}).partial();

const subLivro = z.object({
  isbn: optStr(20), editora: optStr(160), ano_pub: optInt, edicao: optStr(30),
  num_paginas: optInt,
  compra_url: z.string().trim().max(1000).nullish(),
  sumario: optStr(20000),
}).partial();

const subVideo = z.object({
  plataforma: optStr(30),
  embed_url: z.string().trim().max(1000).nullish(),
  duracao_seg: optInt,
  legendas_url: z.string().trim().max(1000).nullish(),
}).partial();

const SUBTIPO_SCHEMAS = {
  analise: subAnalise, academico: subAcademico, dado: subDado,
  podcast: subPodcast, livro: subLivro, video: subVideo,
};

// ── campos comuns (PATCH parcial) ────────────────────────────────────
const camposComuns = z.object({
  titulo: z.string().trim().min(1).max(255),
  subtitulo: optStr(255),
  resumo: optStr(5000),
  conteudo: z.string().max(2_000_000).nullish(), // sanitizado no repo
  destaque: z.boolean().optional(),
  is_crisp: z.boolean().optional(),
  periodo_estudo: optStr(100),
  nacionalidade: optStr(100),
  with_header: z.boolean().optional(),
  with_footer: z.boolean().optional(),
  // taxonomia por NOMES/siglas — o repo faz upsert + rebuild das junções
  categorias: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  autores: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
  fontes: z.array(z.string().trim().min(1).max(255)).max(20).optional(),
  ufs: z.array(z.string().trim().length(2)).max(27).optional(),
  municipios: z.array(z.string().trim().min(1).max(120)).max(100).optional(),
  subtipo: z.record(z.string(), z.any()).optional(),
}).partial();

const criarSchema = z.object({ tipo: z.enum(TIPOS) });

// Valida PATCH: comuns parciais + subtipo do tipo certo + URLs seguras.
function validaPatch(tipo, body) {
  const comuns = camposComuns.safeParse(body || {});
  if (!comuns.success) {
    return { ok: false, message: comuns.error.issues[0].message, campo: comuns.error.issues[0].path.join('.') };
  }
  let subtipo = {};
  if (body?.subtipo) {
    const s = SUBTIPO_SCHEMAS[tipo].safeParse(body.subtipo);
    if (!s.success) {
      return { ok: false, message: s.error.issues[0].message, campo: 'subtipo.' + s.error.issues[0].path.join('.') };
    }
    subtipo = s.data;
    // allowlist de embed por tipo + https em URLs (doc 05)
    if (subtipo.embed_url && !validaEmbedUrl(subtipo.embed_url, tipo)) {
      return { ok: false, message: 'embed_url fora da allowlist de domínios para este tipo.', campo: 'subtipo.embed_url' };
    }
    for (const campo of ['compra_url', 'legendas_url']) {
      if (subtipo[campo] && !validaHttpsUrl(subtipo[campo])) {
        return { ok: false, message: `${campo} precisa ser https.`, campo: `subtipo.${campo}` };
      }
    }
  }
  return { ok: true, data: { ...comuns.data, subtipo } };
}

// Mínimo para PUBLICAR (doc 05 passo 7).
function validaPublicacao(postagemCompleta) {
  const falta = [];
  if (!postagemCompleta.titulo?.trim()) falta.push('titulo');
  if (!postagemCompleta.resumo?.trim()) falta.push('resumo');
  const precisaConteudo = ['analise', 'academico', 'livro', 'dado'].includes(postagemCompleta.tipo);
  if (precisaConteudo && !postagemCompleta.conteudo?.trim()) falta.push('conteudo');
  if (postagemCompleta.tipo === 'podcast' && !postagemCompleta.subtipo?.embed_url
      && !postagemCompleta.subtipo?.audio_anexo_id && !postagemCompleta.subtipo?.video_anexo_id) {
    falta.push('subtipo.embed_url (ou upload de mídia)');
  }
  if (postagemCompleta.tipo === 'video' && !postagemCompleta.subtipo?.embed_url
      && !postagemCompleta.subtipo?.video_anexo_id) {
    falta.push('subtipo.embed_url (ou upload de vídeo)');
  }
  return falta.length
    ? { ok: false, message: `Campos obrigatórios para publicar: ${falta.join(', ')}.` }
    : { ok: true };
}

module.exports = { TIPOS, criarSchema, validaPatch, validaPublicacao, SUBTIPO_SCHEMAS };
