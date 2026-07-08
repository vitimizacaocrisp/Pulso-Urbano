// Adaptadores entre a API v2 (`/api/postagens`) e os componentes de UI que
// nasceram no shape legado. Mantém os cards/capas existentes sem reescrevê-los.

// entryType legado (config/acervoTypes.js) → tipo v2 (postagens.tipo).
const ENTRY_TO_TIPO = {
  analysis: 'analise',
  academic: 'academico',
  dataset: 'dado',
  podcast: 'podcast',
  livro: 'livro',
  video: 'video',
};

export const entryToTipo = (entryType) => ENTRY_TO_TIPO[entryType] || null;

// Rótulos amigáveis por tipo v2 (badges/heros).
export const TIPO_LABEL = {
  analise: 'Análise', academico: 'Produção Científica', dado: 'Dados',
  podcast: 'Podcast', livro: 'Livro', video: 'Vídeo',
};

// Item da lista v2 → shape que o card/AnalysisCover esperam (legado).
export function v2ToCard(item) {
  return {
    id: item.slug,               // rota de detalhe passa a usar slug
    slug: item.slug,
    tipo: item.tipo,
    title: item.titulo,
    description: item.resumo,
    category: item.categorias?.[0]?.nome || TIPO_LABEL[item.tipo] || null,
    tag: item.tags?.map((t) => t.nome).join(' ') || null,
    source: item.fontes?.[0]?.nome || item.autores?.[0]?.nome || null,
    author: item.autores?.[0]?.nome || item.fontes?.[0]?.nome || 'Pulso Urbano',
    study_period: item.periodo_estudo || null,
    created_at: item.publicado_em || item.created_at || null,
    cover_image_path: item.cover?.url || null,
  };
}

// Detalhe v2 → modelo usado pela capa/hero (coverUtils.pickCover/buildCoverSvg).
export function coverModel(post) {
  return {
    id: post.slug,
    title: post.titulo,
    category: post.categorias?.[0]?.nome || null,
    tag: post.tags?.[0]?.nome || null,
    source: post.fontes?.[0]?.nome || post.autores?.[0]?.nome || null,
    cover_image_path: post.cover?.url || null,
  };
}

// Cidades/UF em texto simples p/ os metadados do hero.
export const nomesMunicipios = (post) => (post.municipios || []).map((m) => m.nome);
