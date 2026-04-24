<template>
  <div class="analyses-grid" ref="postsContainer">
    <div v-if="isLoading && posts.length === 0" class="loading">
      <div class="spinner-card"></div>
      Carregando acervo...
    </div>
    <div v-else-if="error" class="error-message">{{ error }}</div>

    <div
      v-for="(post, index) in posts"
      :key="post.id"
      class="analysis-card scroll-reveal"
    >
      <div class="card-border-top" :style="{ backgroundColor: getBorderColor(index) }"></div>
      <div class="card-body">
        <div class="card-header">
          <span class="badge category-badge" :style="{ color: getBorderColor(index), backgroundColor: getLightColor(index) }">
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

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';
const PAGE_SIZE = 24; // cards por página — razoável para um grid visual

export default {
  name: 'CardAnalisesCatalogo',
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
      colors: ['#802c5c', '#2c4c80', '#2c4c80', '#f1a139', '#1d3557', '#b08b26']
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
    getBorderColor(index) { return this.colors[index % this.colors.length]; },
    getLightColor(index)  { return this.getBorderColor(index) + '15'; },

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
  background-color: #f8f9fa;
}
.analysis-card {
  background: white; border-radius: 12px; overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08); display: flex; flex-direction: column;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  opacity: 0; transform: translateY(20px);
}
.analysis-card.is-visible { opacity: 1; transform: translateY(0); transition: opacity 0.5s ease, transform 0.5s ease; }
.analysis-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
.card-border-top { height: 6px; width: 100%; }
.card-body { padding: 24px; display: flex; flex-direction: column; flex-grow: 1; }
.card-header { display: flex; gap: 8px; margin-bottom: 16px; }
.badge { padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.category-badge { background-color: #fdf2f2; }
.year-badge { background-color: #fff8e6; color: #b08b26; }
.card-title { font-size: 1.15rem; font-weight: 800; color: #0a1d37; line-height: 1.3; margin: 0 0 16px 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.card-description { font-size: 0.9rem; color: #666; line-height: 1.6; margin-bottom: 24px; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; flex-grow: 1; }
.card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #f0f0f0; }
.source-name { font-size: 0.85rem; color: #888; font-weight: 500; }
.btn-research { background-color: #eef4ff; color: #0044cc; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; text-decoration: none; }
.btn-research:hover { background-color: #0044cc; color: white; }
.loading { grid-column: 1 / -1; text-align: center; padding: 60px 40px; color: #666; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.error-message { grid-column: 1 / -1; text-align: center; padding: 40px; color: #991b1b; }
.spinner-card { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.9s linear infinite; }
.sentinel-card { grid-column: 1 / -1; display: flex; justify-content: center; padding: 2rem; }
.loading-more-card { display: flex; align-items: center; gap: 0.75rem; color: #64748b; font-size: 0.9rem; }
.spinner-small { width: 18px; height: 18px; border: 2px solid #e2e8f0; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; }
.end-card { grid-column: 1 / -1; text-align: center; padding: 2.5rem; color: #94a3b8; font-size: 0.8rem; letter-spacing: 2px; text-transform: uppercase; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
