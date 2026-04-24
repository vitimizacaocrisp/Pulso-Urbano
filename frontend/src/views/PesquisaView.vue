<template>
  <MeuHeader />
  <main class="page-content">

    <div class="search-hero">
      <div class="hero-noise"></div>
      <div class="hero-inner">
        <p class="hero-eyebrow"><i class="fas fa-search"></i> Pesquisa</p>
        <h1 class="hero-title">
          <span v-if="displayQuery">Resultados para <em>"{{ displayQuery }}"</em></span>
          <span v-else>Explorar o acervo</span>
        </h1>
        <p class="hero-sub" v-if="!isLoading">
          <strong>{{ totalAnalyses }}</strong> análise{{ totalAnalyses !== 1 ? 's' : '' }} encontrada{{ totalAnalyses !== 1 ? 's' : '' }}
        </p>
      </div>
    </div>

    <div class="layout-wrapper">
      <div v-if="filtersOpen" class="sidebar-overlay" @click="filtersOpen = false"></div>

      <aside class="filters-sidebar" :class="{ 'is-open': filtersOpen }">
        <div class="sidebar-header">
          <span class="sidebar-title"><i class="fas fa-sliders-h"></i> Filtros</span>
          <div class="sidebar-header-actions">
            <button class="clear-all-btn" @click="clearAllFilters" v-if="hasActiveFilters">Limpar</button>
            <button class="sidebar-close-btn" @click="filtersOpen = false"><i class="fas fa-times"></i></button>
          </div>
        </div>

        <div v-if="metaLoading" class="meta-loading">
          <div class="spinner-small"></div> Carregando filtros...
        </div>

        <template v-else>
          <div class="filter-group">
            <button class="filter-group-toggle" @click="toggleGroup('category')">
              <span>Categoria</span>
              <i class="fas" :class="openGroups.category ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
            </button>
            <transition name="collapse">
              <div v-if="openGroups.category" class="filter-group-body">
                <label v-for="cat in availableCategories" :key="cat" class="filter-checkbox">
                  <input type="checkbox" :value="cat" v-model="activeFilters.categories" @change="applyFilters" />
                  <span class="checkbox-label">{{ cat }}</span>
                </label>
                <p v-if="availableCategories.length === 0" class="no-options">Nenhuma categoria.</p>
              </div>
            </transition>
          </div>

          <div class="filter-group">
            <button class="filter-group-toggle" @click="toggleGroup('source')">
              <span>Fonte</span>
              <i class="fas" :class="openGroups.source ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
            </button>
            <transition name="collapse">
              <div v-if="openGroups.source" class="filter-group-body">
                <label v-for="src in availableSources" :key="src" class="filter-checkbox">
                  <input type="checkbox" :value="src" v-model="activeFilters.sources" @change="applyFilters" />
                  <span class="checkbox-label">{{ src }}</span>
                </label>
                <p v-if="availableSources.length === 0" class="no-options">Nenhuma fonte.</p>
              </div>
            </transition>
          </div>

          <div class="filter-group">
            <button class="filter-group-toggle" @click="toggleGroup('period')">
              <span>Período</span>
              <i class="fas" :class="openGroups.period ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
            </button>
            <transition name="collapse">
              <div v-if="openGroups.period" class="filter-group-body period-inputs">
                <div class="period-row">
                  <label>De</label>
                  <input type="number" v-model.number="activeFilters.yearFrom" placeholder="2000" min="1900" max="2100" @change="applyFilters" class="year-input" />
                </div>
                <div class="period-row">
                  <label>Até</label>
                  <input type="number" v-model.number="activeFilters.yearTo" placeholder="2024" min="1900" max="2100" @change="applyFilters" class="year-input" />
                </div>
              </div>
            </transition>
          </div>

          <div class="filter-group">
            <button class="filter-group-toggle" @click="toggleGroup('tags')">
              <span>Tags</span>
              <i class="fas" :class="openGroups.tags ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
            </button>
            <transition name="collapse">
              <div v-if="openGroups.tags" class="filter-group-body tags-cloud">
                <button v-for="tag in availableTags" :key="tag" class="tag-filter-btn"
                  :class="{ active: activeFilters.tags.includes(tag) }" @click="toggleTag(tag)">
                  #{{ tag }}
                </button>
                <p v-if="availableTags.length === 0" class="no-options">Nenhuma tag.</p>
              </div>
            </transition>
          </div>
        </template>
      </aside>

      <div class="main-content">
        <div class="controls-bar">
          <div class="search-field-wrapper">
            <i class="fas fa-search field-icon"></i>
            <input ref="searchInputRef" type="text" v-model="searchQuery"
              placeholder="Título, ID, fonte, tag, texto..." class="main-search-input" @keyup.enter="applyFilters" />
            <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''; applyFilters()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="controls-right">
            <select v-model="sortBy" @change="applyFilters" class="sort-select">
              <option value="relevance">Relevância</option>
              <option value="date_desc">Mais recentes</option>
              <option value="date_asc">Mais antigos</option>
              <option value="title_asc">A → Z</option>
            </select>
            <button class="filter-toggle-btn" @click="filtersOpen = !filtersOpen" :class="{ active: hasActiveFilters }">
              <i class="fas fa-filter"></i>
              <span class="filter-toggle-label">Filtros</span>
              <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
            </button>
          </div>
        </div>

        <div class="active-pills" v-if="hasActiveFilters">
          <span v-for="cat in activeFilters.categories" :key="'c-'+cat" class="pill" @click="removeFilter('categories', cat)">{{ cat }} <i class="fas fa-times"></i></span>
          <span v-for="src in activeFilters.sources" :key="'s-'+src" class="pill" @click="removeFilter('sources', src)">{{ src }} <i class="fas fa-times"></i></span>
          <span v-for="tag in activeFilters.tags" :key="'t-'+tag" class="pill" @click="removeFilter('tags', tag)">#{{ tag }} <i class="fas fa-times"></i></span>
          <span v-if="activeFilters.yearFrom || activeFilters.yearTo" class="pill" @click="clearPeriod">
            {{ activeFilters.yearFrom || '...' }} – {{ activeFilters.yearTo || '...' }} <i class="fas fa-times"></i>
          </span>
        </div>

        <div v-if="isLoading && analyses.length === 0" class="state-container">
          <div class="loader-ring"></div>
          <p>Buscando análises...</p>
        </div>
        <div v-else-if="error" class="state-container error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>{{ error }}</p>
          <button @click="applyFilters" class="retry-btn">Tentar novamente</button>
        </div>
        <div v-else-if="!isLoading && analyses.length === 0" class="state-container empty-state">
          <i class="fas fa-search"></i>
          <p>Nenhuma análise encontrada.</p>
          <button @click="clearAllFilters" class="retry-btn">Limpar filtros</button>
        </div>

        <div v-else class="results-grid">
          <article v-for="(analysis, index) in analyses" :key="analysis.id" class="result-card"
            :style="{ animationDelay: `${(index % limit) * 40}ms` }">
            <router-link :to="{ name: 'AnalysisDetail', params: { id: analysis.id } }" class="card-image-link" v-if="analysis.cover_image_path">
              <img :src="getFullMediaPath(analysis.cover_image_path)" alt="" loading="lazy" />
              <div class="card-img-overlay"><i class="fas fa-arrow-right"></i></div>
            </router-link>
            <div v-else class="card-no-image"><span>{{ getInitials(analysis.title) }}</span></div>
            <div class="card-body">
              <div class="card-meta-top">
                <span class="card-category" v-if="analysis.category">{{ analysis.category }}</span>
                <span class="card-date">{{ formatDate(analysis.created_at) }}</span>
              </div>
              <h3 class="card-title">
                <router-link :to="{ name: 'AnalysisDetail', params: { id: analysis.id } }">
                  <span v-html="highlight(analysis.title)"></span>
                </router-link>
              </h3>
              <p class="card-desc">{{ analysis.description }}</p>
              <div class="card-footer">
                <span class="card-source" v-if="analysis.source"><i class="fas fa-landmark"></i> {{ analysis.source }}</span>
                <div class="card-tags" v-if="analysis.tag">
                  <span v-for="(tag, i) in processTags(analysis.tag)" :key="i" class="tag-chip">#{{ tag }}</span>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div v-if="analyses.length > 0 && hasMore" ref="sentinel" class="sentinel">
          <div v-if="isLoadingMore" class="loading-more">
            <div class="spinner-small"></div>
            <span>Carregando mais...</span>
          </div>
        </div>
        <div v-if="analyses.length > 0 && !hasMore && !isLoading" class="end-message">
          <span>— fim dos resultados —</span>
        </div>
      </div>
    </div>
  </main>
  <MeuFooter />
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import MeuHeader from '@/components/MeuHeader.vue';
import MeuFooter from '@/components/MeuFooter.vue';
import { fetchWithCache, CacheKeys, TTL } from '@/utils/apiCache.js';

const route  = useRoute();
const router = useRouter();
const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

const analyses      = ref([]);
const totalAnalyses = ref(0);
const currentPage   = ref(1);
const limit         = ref(12);
const isLoading     = ref(true);
const isLoadingMore = ref(false);
const error         = ref(null);
const sentinel      = ref(null);
const searchInputRef = ref(null);
let observer = null;

const searchQuery  = ref('');
const sortBy       = ref('relevance');
const displayQuery = ref('');
const filtersOpen  = ref(false);
const metaLoading  = ref(false);
const openGroups   = ref({ category: true, source: false, period: false, tags: false });

const activeFilters = ref({ categories: [], sources: [], tags: [], yearFrom: null, yearTo: null });

const availableCategories = ref([]);
const availableSources    = ref([]);
const availableTags       = ref([]);

const hasMore = computed(() => analyses.value.length < totalAnalyses.value);

const activeFilterCount = computed(() => {
  let n = activeFilters.value.categories.length + activeFilters.value.sources.length + activeFilters.value.tags.length;
  if (activeFilters.value.yearFrom || activeFilters.value.yearTo) n++;
  return n;
});

const hasActiveFilters = computed(() => activeFilterCount.value > 0 || searchQuery.value.trim() !== '');

const getFullMediaPath = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const processTags = (tagString) => {
  if (!tagString) return [];
  return tagString.replace(/['"\-:;()\d]/g, '').split(/[\s,]+/).filter(t => t.trim().length > 1).slice(0, 4);
};

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getInitials = (title) => {
  if (!title) return 'PU';
  return title.split(' ').filter(w => w.length > 2).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'PU';
};

const highlight = (text) => {
  if (!searchQuery.value.trim() || !text) return text;
  const terms = searchQuery.value.trim().split(/\s+/).filter(t => t.length > 1);
  let result = text;
  terms.forEach(term => {
    const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(re, '<mark>$1</mark>');
  });
  return result;
};

const scoreAnalysis = (a, q) => {
  if (!q) return 1;
  const terms = q.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  let score = 0;
  const check = (field, weight) => {
    if (!field) return;
    const f = String(field).toLowerCase();
    terms.forEach(t => {
      if (f === t) score += weight * 2;
      else if (f.startsWith(t)) score += weight * 1.5;
      else if (f.includes(t)) score += weight;
    });
  };
  check(a.id, 10); check(a.title, 8); check(a.tag, 6);
  check(a.category, 5); check(a.source, 5); check(a.author, 4);
  check(a.study_period, 3); check(a.description, 2);
  return score;
};

// Carrega metadados de filtro via rota dedicada /filter-meta (cache 10 min)
// Elimina a segunda chamada limit=all que existia antes
const loadFilterMeta = async () => {
  if (availableCategories.value.length > 0) return;
  metaLoading.value = true;
  try {
    const token   = localStorage.getItem('authToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const meta = await fetchWithCache(
      CacheKeys.filterMeta,
      () => axios.get(`${API_BASE_URL}/api/admin/filter-meta`, { headers }).then(r => r.data?.data),
      TTL.META
    );
    if (meta) {
      availableCategories.value = meta.categories || [];
      availableSources.value    = meta.sources    || [];
      availableTags.value       = meta.tags       || [];
    }
  } catch (e) {
    console.error('Erro ao carregar filtros:', e);
  } finally {
    metaLoading.value = false;
  }
};

const fetchAnalyses = async (isNewSearch = false) => {
  if (isNewSearch) {
    currentPage.value = 1; analyses.value = []; totalAnalyses.value = 0; isLoading.value = true;
  } else {
    isLoadingMore.value = true;
  }
  error.value = null;

  try {
    const token   = localStorage.getItem('authToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const params = { page: currentPage.value, limit: limit.value };
    if (searchQuery.value)                     params.search    = searchQuery.value;
    if (activeFilters.value.categories.length) params.category  = activeFilters.value.categories.join(',');
    if (activeFilters.value.sources.length)    params.source    = activeFilters.value.sources.join(',');
    if (activeFilters.value.tags.length)       params.tag       = activeFilters.value.tags.join(',');
    if (activeFilters.value.yearFrom)          params.year_from = activeFilters.value.yearFrom;
    if (activeFilters.value.yearTo)            params.year_to   = activeFilters.value.yearTo;
    if (sortBy.value !== 'relevance')          params.sort      = sortBy.value;

    const cacheKey = CacheKeys.analysesList(params);

    const result = await fetchWithCache(
      cacheKey,
      () => axios.get(`${API_BASE_URL}/api/admin/analyses-list`, { headers, params }).then(r => r.data?.data),
      TTL.DEFAULT
    );

    let fresh = result?.analyses || [];
    totalAnalyses.value = result?.total || 0;

    if (sortBy.value === 'relevance' && searchQuery.value.trim()) {
      fresh = fresh.map(a => ({ ...a, _score: scoreAnalysis(a, searchQuery.value) }))
                   .sort((a, b) => b._score - a._score);
    }

    analyses.value = isNewSearch ? fresh : [...analyses.value, ...fresh];
  } catch (err) {
    error.value = err.response?.data?.message || 'Falha ao buscar análises.';
  } finally {
    isLoading.value = false; isLoadingMore.value = false;
  }
};

const applyFilters = () => { displayQuery.value = searchQuery.value; syncQueryParams(); fetchAnalyses(true); };
const loadMore = () => { if (hasMore.value && !isLoadingMore.value && !isLoading.value) { currentPage.value++; fetchAnalyses(false); } };
const clearAllFilters = () => { searchQuery.value = ''; sortBy.value = 'relevance'; activeFilters.value = { categories: [], sources: [], tags: [], yearFrom: null, yearTo: null }; applyFilters(); };
const clearPeriod = () => { activeFilters.value.yearFrom = null; activeFilters.value.yearTo = null; applyFilters(); };
const removeFilter = (type, val) => { activeFilters.value[type] = activeFilters.value[type].filter(v => v !== val); applyFilters(); };
const toggleTag = (tag) => { const idx = activeFilters.value.tags.indexOf(tag); if (idx === -1) activeFilters.value.tags.push(tag); else activeFilters.value.tags.splice(idx, 1); applyFilters(); };
const toggleGroup = (key) => { openGroups.value[key] = !openGroups.value[key]; };

const syncQueryParams = () => {
  const q = {};
  if (searchQuery.value)                     q.q   = searchQuery.value;
  if (activeFilters.value.categories.length) q.cat = activeFilters.value.categories.join(',');
  if (activeFilters.value.sources.length)    q.src = activeFilters.value.sources.join(',');
  if (activeFilters.value.tags.length)       q.tag = activeFilters.value.tags.join(',');
  if (activeFilters.value.yearFrom)          q.de  = activeFilters.value.yearFrom;
  if (activeFilters.value.yearTo)            q.ate = activeFilters.value.yearTo;
  router.replace({ query: q });
};

const readQueryParams = () => {
  const q = route.query;
  if (q.q)   searchQuery.value = q.q;
  if (q.id)  searchQuery.value = String(q.id);
  if (q.cat) activeFilters.value.categories = q.cat.split(',');
  if (q.src) activeFilters.value.sources    = q.src.split(',');
  if (q.tag) activeFilters.value.tags       = q.tag.split(',');
  if (q.de)  activeFilters.value.yearFrom   = Number(q.de);
  if (q.ate) activeFilters.value.yearTo     = Number(q.ate);
  displayQuery.value = searchQuery.value;
};

const setupObserver = () => {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore.value && !isLoadingMore.value) loadMore();
  }, { rootMargin: '200px', threshold: 0.1 });
  if (sentinel.value) observer.observe(sentinel.value);
};

watch([hasMore, analyses], () => nextTick(setupObserver));

let searchTimeout = null;
watch(searchQuery, () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => applyFilters(), 400); });

onMounted(() => {
  readQueryParams();
  loadFilterMeta();     // paralelo — não bloqueia a lista
  fetchAnalyses(true);
  nextTick(() => { if (searchInputRef.value) searchInputRef.value.focus(); });
});

onUnmounted(() => { if (observer) observer.disconnect(); clearTimeout(searchTimeout); });
</script>

<style scoped>
.page-content { background: var(--bg-body); min-height: 100vh; }
.search-hero  { position: relative; background: var(--bg-header); padding: 3.5rem 1.5rem 4.5rem; overflow: hidden; }
.hero-noise   { position: absolute; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"); opacity: 0.5; pointer-events: none; }
.hero-inner   { position: relative; max-width: var(--container-width); margin: 0 auto; }
.hero-eyebrow { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 3px; color: var(--brand-primary); font-weight: 700; margin-bottom: 0.75rem; }
.hero-title   { font-size: clamp(1.8rem, 4vw, 3rem); font-weight: 900; color: #fff; margin: 0 0 0.5rem; line-height: 1.15; }
.hero-title em { font-style: normal; color: var(--brand-primary); }
.hero-sub     { color: var(--text-muted); font-size: 0.95rem; }
.hero-sub strong { color: var(--brand-primary); }
.layout-wrapper { max-width: var(--container-width); margin: -2rem auto 0; padding: 0 1.5rem 4rem; display: grid; grid-template-columns: 260px 1fr; gap: 2rem; position: relative; z-index: 10; }
.sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1999; }
.filters-sidebar { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem; height: fit-content; position: sticky; top: calc(var(--header-height) + 1rem); }
.sidebar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); }
.sidebar-title  { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem; }
.sidebar-header-actions { display: flex; align-items: center; gap: 0.5rem; }
.clear-all-btn  { background: none; border: none; font-size: 0.75rem; color: var(--brand-primary); cursor: pointer; font-weight: 600; padding: 0; }
.clear-all-btn:hover { text-decoration: underline; }
.sidebar-close-btn { display: none; background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.1rem; padding: 0.2rem; }
.meta-loading   { display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0; }
.no-options     { font-size: 0.8rem; color: var(--text-muted); margin: 0; }
.filter-group   { border-bottom: 1px solid var(--border-color); }
.filter-group:last-child { border-bottom: none; }
.filter-group-toggle { width: 100%; background: none; border: none; padding: 0.75rem 0; display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; font-weight: 600; color: var(--text-main); cursor: pointer; }
.filter-group-toggle i { font-size: 0.7rem; color: var(--text-muted); }
.filter-group-body { padding-bottom: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; }
.filter-checkbox { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
.filter-checkbox input { accent-color: var(--brand-primary); width: 14px; height: 14px; }
.checkbox-label { font-size: 0.85rem; color: var(--text-secondary); }
.filter-checkbox:hover .checkbox-label { color: var(--brand-primary); }
.period-inputs  { gap: 0.5rem; }
.period-row     { display: flex; align-items: center; gap: 0.5rem; }
.period-row label { font-size: 0.8rem; color: var(--text-muted); width: 24px; flex-shrink: 0; }
.year-input     { flex: 1; padding: 0.4rem 0.6rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-input-form); color: var(--text-main); font-size: 0.85rem; }
.year-input:focus { outline: none; border-color: var(--brand-primary); }
.tags-cloud     { flex-direction: row; flex-wrap: wrap; gap: 0.4rem; }
.tag-filter-btn { background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 99px; padding: 0.2rem 0.6rem; font-size: 0.75rem; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
.tag-filter-btn.active, .tag-filter-btn:hover { background: var(--brand-primary); border-color: var(--brand-primary); color: #fff; }
.collapse-enter-active, .collapse-leave-active { transition: max-height 0.25s ease, opacity 0.2s; overflow: hidden; }
.collapse-enter-from, .collapse-leave-to { max-height: 0; opacity: 0; }
.collapse-enter-to, .collapse-leave-from { max-height: 600px; opacity: 1; }
.main-content { min-width: 0; }
.controls-bar { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1rem 1.25rem; display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; }
.search-field-wrapper { position: relative; flex: 1; min-width: 200px; }
.field-icon   { position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.85rem; pointer-events: none; }
.main-search-input { width: 100%; padding: 0.625rem 2.25rem; border: 1px solid var(--border-color); border-radius: var(--radius-full); background: var(--bg-input-form); color: var(--text-main); font-size: 0.9rem; transition: border-color 0.2s, box-shadow 0.2s; }
.main-search-input:focus { outline: none; border-color: var(--brand-primary); box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
.clear-search { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.8rem; }
.controls-right { display: flex; gap: 0.5rem; align-items: center; }
.sort-select  { padding: 0.575rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-input-form); color: var(--text-main); font-size: 0.85rem; cursor: pointer; }
.sort-select:focus { outline: none; border-color: var(--brand-primary); }
.filter-toggle-btn { display: none; position: relative; background: var(--bg-input-form); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.575rem 0.875rem; font-size: 0.85rem; color: var(--text-main); cursor: pointer; gap: 0.4rem; align-items: center; }
.filter-toggle-btn.active { border-color: var(--brand-primary); color: var(--brand-primary); }
.filter-badge { background: var(--brand-primary); color: #fff; font-size: 0.65rem; font-weight: 700; border-radius: 99px; padding: 0.1rem 0.4rem; margin-left: 0.25rem; }
.active-pills { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1.25rem; }
.pill { display: inline-flex; align-items: center; gap: 0.35rem; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25); color: var(--brand-primary); border-radius: 99px; padding: 0.25rem 0.75rem; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
.pill:hover { background: rgba(99,102,241,0.2); }
.pill i { font-size: 0.65rem; }
.state-container { text-align: center; padding: 6rem 2rem; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.state-container i { font-size: 2.5rem; opacity: 0.3; }
.retry-btn { background: var(--brand-primary); border: none; color: #fff; padding: 0.5rem 1.5rem; border-radius: var(--radius-full); cursor: pointer; font-size: 0.85rem; font-weight: 600; }
.loader-ring { width: 40px; height: 40px; border: 3px solid var(--border-color); border-top-color: var(--brand-primary); border-radius: 50%; animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
.result-card  { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-xl); overflow: hidden; display: flex; flex-direction: column; transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s; animation: fadeUp 0.4s ease both; opacity: 0; }
.result-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--brand-primary); }
@keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.card-image-link { display: block; height: 180px; overflow: hidden; position: relative; }
.card-image-link img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
.result-card:hover .card-image-link img { transform: scale(1.04); }
.card-img-overlay { position: absolute; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.25rem; opacity: 0; transition: opacity 0.25s; backdrop-filter: blur(2px); }
.result-card:hover .card-img-overlay { opacity: 1; }
.card-no-image { height: 180px; background: linear-gradient(135deg, var(--bg-hover), var(--bg-card)); display: flex; align-items: center; justify-content: center; }
.card-no-image span { font-size: 2rem; font-weight: 900; color: var(--brand-primary); opacity: 0.35; }
.card-body    { padding: 1.25rem 1.5rem 1.5rem; display: flex; flex-direction: column; flex: 1; }
.card-meta-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; }
.card-category { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--brand-primary); background: rgba(99,102,241,0.08); padding: 0.15rem 0.6rem; border-radius: 99px; }
.card-date    { font-size: 0.72rem; color: var(--text-muted); }
.card-title   { margin: 0 0 0.6rem; font-size: 1.05rem; font-weight: 700; line-height: 1.4; }
.card-title a { color: var(--text-main); text-decoration: none; transition: color 0.2s; }
.card-title a:hover { color: var(--brand-primary); }
.card-title :deep(mark) { background: rgba(99,102,241,0.2); color: var(--brand-primary); border-radius: 2px; padding: 0 2px; }
.card-desc    { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 1rem; }
.card-footer  { display: flex; flex-direction: column; gap: 0.5rem; margin-top: auto; }
.card-source  { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem; }
.card-tags    { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.tag-chip     { font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); background: var(--bg-hover); border-radius: 99px; padding: 0.15rem 0.6rem; transition: all 0.15s; }
.result-card:hover .tag-chip { background: rgba(99,102,241,0.1); color: var(--brand-primary); }
.sentinel     { width: 100%; padding: 2.5rem 0; display: flex; justify-content: center; }
.loading-more { display: flex; align-items: center; gap: 0.75rem; color: var(--text-secondary); font-size: 0.875rem; }
.spinner-small { width: 18px; height: 18px; border: 2px solid var(--border-color); border-top-color: var(--brand-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
.end-message  { text-align: center; padding: 3rem 1rem; color: var(--text-muted); font-size: 0.8rem; letter-spacing: 2px; text-transform: uppercase; }
@media (max-width: 900px) {
  .layout-wrapper { grid-template-columns: 1fr; margin-top: -1rem; }
  .sidebar-overlay { display: block; }
  .filters-sidebar { position: fixed; top: 0; left: 0; bottom: 0; width: 280px; z-index: 2000; overflow-y: auto; transform: translateX(-100%); transition: transform 0.3s ease; border-radius: 0; box-shadow: 5px 0 30px rgba(0,0,0,0.3); }
  .filters-sidebar.is-open { transform: translateX(0); }
  .filter-toggle-btn { display: flex; }
  .sidebar-close-btn { display: block; }
}
@media (max-width: 600px) { .results-grid { grid-template-columns: 1fr; } .controls-bar { padding: 0.75rem; } .hero-title { font-size: 1.6rem; } }
</style>
