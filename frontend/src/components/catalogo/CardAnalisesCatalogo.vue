<template>
  <div class="analyses-grid" ref="postsContainer">
    <!-- Skeleton enquanto carrega -->
    <template v-if="isLoading && posts.length === 0">
      <div v-for="n in 6" :key="'sk' + n" class="analysis-card skeleton-card">
        <div class="sk-shimmer sk-cover"></div>
        <div class="card-border-top sk-shimmer"></div>
        <div class="card-body">
          <div class="sk-row"><span class="sk-shimmer sk-badge"></span><span class="sk-shimmer sk-badge"></span></div>
          <div class="sk-shimmer sk-title"></div>
          <div class="sk-shimmer sk-title sk-short"></div>
          <div class="sk-shimmer sk-text"></div>
          <div class="sk-shimmer sk-text"></div>
          <div class="sk-shimmer sk-text sk-short"></div>
          <div class="sk-footer"><span class="sk-shimmer sk-src"></span><span class="sk-shimmer sk-btn"></span></div>
        </div>
      </div>
    </template>

    <div v-else-if="error" class="error-message">{{ error }}</div>

    <div
      v-for="(post, index) in posts"
      :key="post.id"
      class="analysis-card scroll-reveal"
    >
      <router-link :to="{ name: 'AnalysisDetail', params: { id: post.id } }" class="card-cover-link">
        <AnalysisCover :analysis="post" />
      </router-link>
      <div class="card-border-top" :style="{ backgroundColor: getBorderColor(post.category) }"></div>
      <div class="card-body">
        <div class="card-header">
          <span class="badge category-badge" :style="{ color: getBorderColor(post.category), backgroundColor: getLightColor(post.category) }">
            {{ post.category || 'GERAL' }}
          </span>
          <span class="badge year-badge">{{ post.study_period || '—' }}</span>
        </div>
        <h3 class="card-title">{{ post.title }}</h3>
        <p class="card-description">{{ post.description || 'Sem descrição disponível.' }}</p>
        <div class="card-footer">
          <span class="source-name">{{ post.source || 'PulsoUrbano' }}</span>
          <router-link :to="{ name: 'AnalysisDetail', params: { id: post.id } }" class="btn-research">
            Ver pesquisa
          </router-link>
        </div>
      </div>
    </div>

    <!-- Sentinel para infinite scroll -->
    <div v-if="posts.length > 0 && hasMore" ref="sentinel" class="sentinel-card">
      <div v-if="isLoadingMore" class="loading-more-card">
        <div class="spinner-small"></div> Carregando mais...
      </div>
    </div>

    <div v-if="posts.length > 0 && !hasMore && !isLoading" class="end-card">
      <span>— Fim do acervo —</span>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { fetchWithCache, CacheKeys, TTL } from '@/utils/apiCache.js';
import AnalysisCover from '@/components/AnalysisCover.vue';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const PAGE_SIZE = 24; // cards por página — razoável para um grid visual

export default {
  name: 'CardAnalisesCatalogo',
  components: { AnalysisCover },
  props: {
    category: { type: String, default: null }
  },
  data() {
    return {
      posts: [],
      total: 0,
      currentPage: 1,
      isLoading: true,
      isLoadingMore: false,
      error: null,
      observer: null,
      scrollObserver: null,
      // Paleta para cores consistentes por categoria
      catPalette: ['#2f54eb', '#0ea5a4', '#d6336c', '#f59f00', '#7048e8', '#1c7ed6', '#e8590c', '#2f9e44', '#9c36b5', '#c92a2a']
    };
  },
  computed: {
    hasMore() { return this.posts.length < this.total; }
  },
  methods: {
    async fetchPosts(isNewFetch = false) {
      if (isNewFetch) {
        this.currentPage = 1; this.posts = []; this.total = 0; this.isLoading = true;
      } else {
        this.isLoadingMore = true;
      }
      this.error = null;

      try {
        const params = { page: this.currentPage, limit: PAGE_SIZE, sort: 'date_desc' };
        if (this.category) params.category = this.category;

        // Usa rota pública — sem token, sem sobrecarregar o admin endpoint
        const cacheKey = CacheKeys.analysesList(params);

        const result = await fetchWithCache(
          cacheKey,
          () => axios
            .get(`${API_BASE_URL}/api/analyses-list`, { params, timeout: 15000 })
            .then(r => r.data?.data),
          TTL.DEFAULT // 30 s
        );

        const fresh = result?.analyses || [];
        this.total  = result?.total   || 0;

        this.posts = isNewFetch ? fresh : [...this.posts, ...fresh];
      } catch (err) {
        console.error('Erro ao carregar catálogo:', err);
        this.error = 'Não foi possível carregar as publicações.';
      } finally {
        this.isLoading = false;
        this.isLoadingMore = false;
        this.$nextTick(() => {
          this.observeRevealElements();
          this.setupScrollObserver();
        });
      }
    },
    loadMore() {
      if (this.hasMore && !this.isLoadingMore && !this.isLoading) {
        this.currentPage++;
        this.fetchPosts(false);
      }
    },
    catColor(category) {
      const s = (category || 'geral').toString().toLowerCase().trim();
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return this.catPalette[h % this.catPalette.length];
    },
    getBorderColor(category) { return this.catColor(category); },
    getLightColor(category)  { return this.catColor(category) + '20'; },

    // Reveal animation observer
    initRevealObserver() {
      if (this.observer) this.observer.disconnect();
      if (!('IntersectionObserver' in window)) return;
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('is-visible'); });
      }, { threshold: 0.1 });
    },
    observeRevealElements() {
      if (!this.observer || !this.$refs.postsContainer) return;
      this.$refs.postsContainer.querySelectorAll('.scroll-reveal:not(.is-visible)')
        .forEach(el => this.observer.observe(el));
    },

    // Scroll observer para infinite scroll
    setupScrollObserver() {
      if (this.scrollObserver) this.scrollObserver.disconnect();
      const sentinel = this.$refs.sentinel;
      if (!sentinel) return;
      this.scrollObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) this.loadMore();
      }, { rootMargin: '200px', threshold: 0.1 });
      this.scrollObserver.observe(sentinel);
    }
  },
  mounted() {
    this.initRevealObserver();
    this.fetchPosts(true);
  },
  beforeUnmount() {
    if (this.observer) this.observer.disconnect();
    if (this.scrollObserver) this.scrollObserver.disconnect();
  }
};
</script>

<style scoped>
.analyses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  padding: 20px;
  background-color: var(--bg-body);
}
.analysis-card {
  background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden;
  box-shadow: var(--shadow-md); display: flex; flex-direction: column;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  opacity: 0; transform: translateY(20px);
}
.analysis-card.is-visible { opacity: 1; transform: translateY(0); transition: opacity 0.5s ease, transform 0.5s ease; }
.analysis-card { transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; }
.analysis-card:hover { transform: translateY(-6px); box-shadow: var(--shadow-lg); border-color: var(--brand-primary); }
.card-cover-link { display: block; width: 100%; height: 168px; overflow: hidden; }
.card-cover-link :deep(img) { transition: transform 0.4s ease; }
.analysis-card:hover .card-cover-link :deep(img) { transform: scale(1.05); }
.card-border-top { height: 6px; width: 100%; }
.card-body { padding: 24px; display: flex; flex-direction: column; flex-grow: 1; }
.card-header { display: flex; gap: 8px; margin-bottom: 16px; }
.badge { padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.category-badge { background-color: var(--bg-hover); }
.year-badge { background-color: var(--bg-hover); color: var(--text-secondary); }
.card-title { font-size: 1.15rem; font-weight: 800; color: var(--text-main); line-height: 1.3; margin: 0 0 16px 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.card-description { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 24px; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; flex-grow: 1; }
.card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid var(--border-color); }
.source-name { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }
.btn-research { background-color: var(--bg-hover); color: var(--brand-primary); border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; text-decoration: none; }
.btn-research:hover { background-color: var(--brand-primary); color: #fff; }
.loading { grid-column: 1 / -1; text-align: center; padding: 60px 40px; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.error-message { grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--sys-danger); }
.spinner-card { width: 36px; height: 36px; border: 3px solid var(--border-color); border-top-color: var(--brand-primary); border-radius: 50%; animation: spin 0.9s linear infinite; }
.sentinel-card { grid-column: 1 / -1; display: flex; justify-content: center; padding: 2rem; }
.loading-more-card { display: flex; align-items: center; gap: 0.75rem; color: var(--text-muted); font-size: 0.9rem; }
.spinner-small { width: 18px; height: 18px; border: 2px solid var(--border-color); border-top-color: var(--brand-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
.end-card { grid-column: 1 / -1; text-align: center; padding: 2.5rem; color: var(--text-muted); font-size: 0.8rem; letter-spacing: 2px; text-transform: uppercase; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Skeleton loader ── */
.skeleton-card { pointer-events: none; }
.sk-shimmer {
  display: block;
  background: linear-gradient(90deg, var(--bg-hover) 25%, var(--border-color) 37%, var(--bg-hover) 63%);
  background-size: 400% 100%;
  border-radius: 6px;
  animation: sk-shimmer 1.4s ease infinite;
}
@keyframes sk-shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
.sk-row { display: flex; gap: 8px; margin-bottom: 16px; }
.sk-badge { width: 84px; height: 20px; }
.sk-title { height: 18px; margin-bottom: 10px; }
.sk-text  { height: 12px; margin-bottom: 8px; }
.sk-short { width: 55%; }
.sk-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; margin-top: 8px; border-top: 1px solid var(--border-color); }
.sk-src { width: 90px; height: 12px; }
.sk-btn { width: 92px; height: 32px; border-radius: 8px; }
.card-border-top.sk-shimmer { height: 6px; border-radius: 0; }
.sk-cover { height: 168px; border-radius: 0; }
</style>
