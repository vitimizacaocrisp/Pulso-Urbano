/**
 * apiCache.js — Cache de API em memória + sessionStorage
 *
 * Estratégia:
 *  - Memória (Map): válido durante a sessão de navegação atual.
 *    Compartilhado entre todos os componentes via importação de módulo (singleton).
 *  - sessionStorage: persiste entre re-renders e navegações dentro da aba,
 *    mas é limpo ao fechar a aba.
 *
 * TTLs padrão (ms):
 *  - listas paginadas / pesquisa  →  30 s  (dados que mudam com filtros)
 *  - listas completas (autocomplete, filtros)  →  5 min
 *  - categorias / fontes / tags   →  10 min
 *  - dados externos (IBGE)        →  24 h
 */

const DEFAULT_TTL = 30_000;           // 30 s
const LONG_TTL    = 5 * 60_000;       // 5 min
const META_TTL    = 10 * 60_000;      // 10 min
const IBGE_TTL    = 24 * 60 * 60_000; // 24 h

// ─── Memória ────────────────────────────────────────────────────────
const memCache = new Map(); // { key → { data, expiresAt } }

function memGet(key) {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memCache.delete(key); return null; }
  return entry.data;
}

function memSet(key, data, ttl = DEFAULT_TTL) {
  memCache.set(key, { data, expiresAt: Date.now() + ttl });
}

// ─── SessionStorage ─────────────────────────────────────────────────
function ssGet(key) {
  try {
    const raw = sessionStorage.getItem(`pu_cache:${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) { sessionStorage.removeItem(`pu_cache:${key}`); return null; }
    return entry.data;
  } catch { return null; }
}

function ssSet(key, data, ttl = DEFAULT_TTL) {
  try {
    sessionStorage.setItem(`pu_cache:${key}`, JSON.stringify({ data, expiresAt: Date.now() + ttl }));
  } catch { /* quota exceeded — ignorar silenciosamente */ }
}

// ─── API pública ────────────────────────────────────────────────────

/**
 * get(key) — tenta memória primeiro, depois sessionStorage.
 */
export function cacheGet(key) {
  return memGet(key) ?? ssGet(key);
}

/**
 * set(key, data, ttl) — grava em ambas as camadas.
 */
export function cacheSet(key, data, ttl = DEFAULT_TTL) {
  memSet(key, data, ttl);
  ssSet(key, data, ttl);
}

/**
 * invalidate(prefix) — remove tudo que começa com `prefix` em ambas as camadas.
 * Use após criar/editar/deletar uma análise.
 */
export function cacheInvalidate(prefix = '') {
  for (const key of [...memCache.keys()]) {
    if (key.startsWith(prefix)) memCache.delete(key);
  }
  try {
    const ssPrefix = `pu_cache:${prefix}`;
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(ssPrefix))
      .forEach(k => sessionStorage.removeItem(k));
  } catch { /* noop */ }
}

/**
 * fetchWithCache(key, fetcher, ttl)
 * — helper que evita chamadas duplicadas simultâneas (request deduplication).
 *   Se dois componentes chamarem ao mesmo tempo, apenas uma requisição é feita.
 */
const inflight = new Map(); // key → Promise

export async function fetchWithCache(key, fetcher, ttl = DEFAULT_TTL) {
  const cached = cacheGet(key);
  if (cached !== null) return cached;

  if (inflight.has(key)) return inflight.get(key);

  const promise = fetcher().then(data => {
    cacheSet(key, data, ttl);
    inflight.delete(key);
    return data;
  }).catch(err => {
    inflight.delete(key);
    throw err;
  });

  inflight.set(key, promise);
  return promise;
}

// ─── Chaves canônicas (evita typos espalhados) ───────────────────────
export const CacheKeys = {
  // Metadados globais
  filterMeta:       'filter:meta',                     // categorias + fontes + tags para filtros
  categories:       'categories:count',                // sidebar widget
  ibge:             (ano) => `ibge:${ano}`,            // dados populacionais

  // Listas paginadas — chave baseada nos params
  analysesList:     (params) => `analyses:list:${JSON.stringify(params)}`,

  // Itens individuais
  analysis:         (id) => `analysis:${id}`,

  // Autocomplete (todas as análises, campos leves)
  autocomplete:     'analyses:autocomplete',
};

// ─── TTLs exportados para uso externo ───────────────────────────────
export const TTL = { DEFAULT: DEFAULT_TTL, LONG: LONG_TTL, META: META_TTL, IBGE: IBGE_TTL };
