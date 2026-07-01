<template>
  <section class="recent-posts-container" ref="postsContainer">
    <div class="section-header scroll-reveal">
      <h2 class="title">Publicações e Painéis</h2>
      <div class="divider"></div>
    </div>

    <div v-if="isLoading" class="posts-grid">
      <article v-for="n in 6" :key="'sk' + n" class="post-card skeleton-card">
        <div class="card-image-wrapper"><div class="sk-shimmer sk-img"></div></div>
        <div class="card-content">
          <div class="sk-shimmer sk-meta"></div>
          <div class="sk-shimmer sk-title"></div>
          <div class="sk-shimmer sk-title sk-short"></div>
          <div class="sk-shimmer sk-text"></div>
          <div class="sk-shimmer sk-text sk-short"></div>
        </div>
      </article>
    </div>
    <div v-else-if="error" class="state-container error">
      <Icon icon="mdi:alert-circle" /> {{ error }}
    </div>
    <div v-else-if="posts.length === 0" class="state-container empty">
      <Icon icon="mdi:newspaper-variant-outline" width="32" />
      <p>Nenhuma publicação encontrada no momento.</p>
    </div>

    <div v-else class="posts-grid">
      <article
        v-for="(post, index) in posts"
        :key="post.id"
        class="post-card scroll-reveal"
        :style="{ transitionDelay: `${index * 100}ms` }"
      >
        <div class="card-image-wrapper">
          <router-link :to="{ name: 'AnalysisDetail', params: { id: post.id } }" class="img-link">
            <AnalysisCover :analysis="post" />
            <div class="card-overlay"><span class="read-more">Ler Artigo</span></div>
          </router-link>
        </div>
        <div class="card-content">
          <div class="meta-info">
            <span class="date">{{ new Date(post.created_at).toLocaleDateString() }}</span>
            <span class="author">por {{ post.author }}</span>
          </div>
          <h3>
            <router-link :to="{ name: 'AnalysisDetail', params: { id: post.id } }" class="title-link">
              {{ post.title }}
            </router-link>
          </h3>
          <p class="description">{{ post.description }}</p>
          <div class="tags-container" v-if="post.tag">
            <span v-for="(tag, idx) in processTags(post.tag)" :key="idx" class="tag-pill">#{{ tag }}</span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script>
import { Icon } from '@iconify/vue';
import api, { mediaUrl } from '@/services/api';
import { fetchWithCache, CacheKeys, TTL } from '@/utils/apiCache.js';
import AnalysisCover from '@/components/AnalysisCover.vue';

export default {
  name: 'RecentPosts',
  components: { Icon, AnalysisCover },
  props: {
    postCount: { type: Number, required: true, default: 6 },
    category:  { type: String, default: null }
  },
  data() {
    return { posts: [], isLoading: true, error: null, observer: null };
  },
  methods: {
    async fetchRecentPosts() {
      this.isLoading = true;
      this.error = null;
      try {
        // Usa a rota PÚBLICA /api/analyses-list com paginação (limit = postCount)
        // Sem precisar de token, sem puxar tudo para ordenar no cliente
        const params = { limit: this.postCount, sort: 'date_desc' };
        if (this.category) params.category = this.category;

        const cacheKey = CacheKeys.analysesList(params);

        const result = await fetchWithCache(
          cacheKey,
          () => api
            .get('/api/analyses-list', { params, timeout: 15000 })
            .then(r => r.data?.data),
          TTL.DEFAULT // 30 s
        );

        this.posts = result?.analyses || [];
      } catch (err) {
        console.error('Erro ao carregar publicações:', err);
        this.error = 'Não foi possível carregar as publicações recentes.';
      } finally {
        this.isLoading = false;
        this.$nextTick(() => this.observeElements());
      }
    },
    getFullMediaPath(path) {
      return mediaUrl(path);
    },
    processTags(tagString) {
      if (!tagString) return [];
      return tagString.replace(/['"\-:;()\d]/g, '')
        .split(/[\s,]+/)
        .filter(t => t.trim().length > 1)
        .slice(0, 3);
    },
    initObserver() {
      if (this.observer) this.observer.disconnect();
      if (!('IntersectionObserver' in window)) return;
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
        });
      }, { threshold: 0.1 });
    },
    observeElements() {
      if (!this.observer || !this.$refs.postsContainer) return;
      this.$refs.postsContainer.querySelectorAll('.scroll-reveal')
        .forEach(el => this.observer.observe(el));
    }
  },
  mounted() {
    this.initObserver();
    this.fetchRecentPosts();
  },
  beforeUnmount() {
    if (this.observer) this.observer.disconnect();
  }
};
</script>

<style scoped>
.recent-posts-container { padding: 0; }
.section-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
.title { font-size: 1.75rem; font-weight: 800; color: var(--text-main); margin: 0; }
.divider { flex: 1; height: 2px; background: var(--border-color); }
.posts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem; }
.post-card { background-color: var(--bg-card); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); transition: transform 0.3s ease, box-shadow 0.3s ease; display: flex; flex-direction: column; overflow: hidden; height: 100%; border: 1px solid var(--border-color); }
.post-card:hover { transform: translateY(-6px); box-shadow: var(--shadow-lg); }
.card-image-wrapper { height: 220px; width: 100%; position: relative; background-color: var(--slate-200); overflow: hidden; }
.img-link { display: block; width: 100%; height: 100%; position: relative; }
.img-link img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
.post-card:hover .img-link img { transform: scale(1.05); }
.card-overlay { position: absolute; inset: 0; background: rgba(15,23,42,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; opacity: 0; transition: opacity 0.3s ease; backdrop-filter: blur(2px); }
.post-card:hover .card-overlay { opacity: 1; }
.read-more { border: 1px solid white; padding: 0.5rem 1rem; border-radius: 20px; }
.no-image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--text-muted); font-size: 1.5rem; }
.card-content { padding: 1.75rem; display: flex; flex-direction: column; flex-grow: 1; }
.meta-info { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 0.75rem; letter-spacing: 0.5px; }
.title-link { color: var(--text-main); text-decoration: none; font-size: 1.25rem; font-weight: 700; line-height: 1.4; transition: color 0.2s; display: block; margin-bottom: 0.75rem; }
.title-link:hover { color: var(--brand-primary); }
.description { font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.5rem; flex-grow: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.tags-container { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: auto; }
.tag-pill { background-color: var(--bg-hover); color: var(--text-secondary); padding: 0.25rem 0.75rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600; transition: background 0.2s; }
.post-card:hover .tag-pill { background-color: rgba(47, 84, 235,0.1); color: var(--brand-primary); }

/* ── Skeleton ── */
.skeleton-card { pointer-events: none; }
.sk-shimmer {
  display: block;
  background: linear-gradient(90deg, var(--bg-hover) 25%, var(--border-color) 37%, var(--bg-hover) 63%);
  background-size: 400% 100%;
  border-radius: 6px;
  animation: sk-shimmer 1.4s ease infinite;
}
@keyframes sk-shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
.sk-img   { width: 100%; height: 200px; border-radius: 0; }
.sk-meta  { width: 60%; height: 12px; margin-bottom: 14px; }
.sk-title { height: 18px; margin-bottom: 10px; }
.sk-text  { height: 12px; margin-bottom: 8px; }
.sk-short { width: 55%; }
.state-container { padding: 3rem; text-align: center; background: var(--bg-hover); border-radius: var(--radius-lg); color: var(--text-secondary); }
.state-container.error { color: var(--sys-danger); }
.state-container i { font-size: 2rem; margin-bottom: 1rem; display: block; }
.spinner { border: 3px solid var(--border-color); border-top: 3px solid var(--brand-primary); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.scroll-reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1); }
.scroll-reveal.is-visible { opacity: 1; transform: translateY(0); }
</style>
