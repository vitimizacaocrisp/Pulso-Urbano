<template>
  <section class="recent-posts-container" ref="postsContainer">
    <!-- Header com animação -->
    <div class="section-header scroll-reveal">
      <h2 class="title">Publicações e Painéis</h2>
      <div class="divider"></div>
    </div>
    
    <!-- Estados de Loading e Feedback -->
    <div v-if="isLoading" class="state-container">
      <div class="spinner"></div>
      <p>A atualizar feed...</p>
    </div>
    
    <div v-else-if="error" class="state-container error">
      <i class="fas fa-exclamation-circle"></i>
      {{ error }}
    </div>
    
    <div v-else-if="posts.length === 0" class="state-container empty">
       <i class="far fa-newspaper"></i>
       <p>Nenhuma publicação encontrada no momento.</p>
    </div>
    
    <!-- Grid de Posts -->
    <div v-else class="posts-grid">
      <article 
        v-for="(post, index) in posts" 
        :key="post.id" 
        class="post-card scroll-reveal"
        :style="{ transitionDelay: `${index * 100}ms` }"
      >
        <div class="card-image-wrapper">
          <router-link :to="{ name: 'AnalysisDetail', params: { id: post.id } }" class="img-link" v-if="post.cover_image_path">
            <img :src="getFullMediaPath(post.cover_image_path)" :alt="post.title" loading="lazy">
            <div class="card-overlay">
              <span class="read-more">Ler Artigo</span>
            </div>
          </router-link>
          <div v-else class="no-image-placeholder">PU</div>
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
            <span v-for="(tag, idx) in processTags(post.tag)" :key="idx" class="tag-pill">
              #{{ tag }}
            </span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script>
import axios from 'axios';

export default {
  name: 'RecentPosts',
  props: {
    postCount: {
      type: Number,
      required: true,
      default: 6,
    },
    category: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      posts: [],
      isLoading: true,
      error: null,
      observer: null
    };
  },
  methods: {
    async fetchRecentPosts() {
      this.isLoading = true;
      this.error = null;
      try {
        const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';
        const token = localStorage.getItem('authToken');
        
        const params = {
          limit: this.postCount
        };
        
        if (this.category) {
          params.category = this.category;
        }

        const response = await axios.get(`${API_BASE_URL}/api/admin/analyses-list`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params,
          timeout: 30000
        });
        
        const analysesArray = response.data?.data?.analyses;
        if (!Array.isArray(analysesArray)) throw new Error("Formato de dados inválido.");
        
        // Ordenar por data mais recente
        const sortedAnalyses = [...analysesArray].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        this.posts = sortedAnalyses.slice(0, this.postCount);

      } catch (err) {
        console.error("Erro ao carregar publicações:", err);
        this.error = 'Não foi possível carregar as publicações recentes.';
      } finally {
        this.isLoading = false;
        this.$nextTick(() => { this.observeElements(); });
      }
    },
    getFullMediaPath(path) {
      if (!path) return '';
      const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';
      return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
    },
    processTags(tagString) {
      if (!tagString) return [];
      const cleanedString = tagString.replace(/['"-:;()\d]/g, '');
      return cleanedString.split(' ').filter(tag => tag.trim() !== '').slice(0, 3);
    },
    initObserver() {
      if (this.observer) this.observer.disconnect();
      if (!('IntersectionObserver' in window)) {
        const elements = this.$refs.postsContainer.querySelectorAll('.scroll-reveal');
        elements.forEach(el => el.classList.add('is-visible'));
        return;
      }
      this.observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      this.observeElements();
    },
    observeElements() {
      if (!this.observer || !this.$refs.postsContainer) return;
      const elements = this.$refs.postsContainer.querySelectorAll('.scroll-reveal:not(.is-visible)');
      elements.forEach(el => this.observer.observe(el));
    }
  },
  watch: {
    category() {
      this.fetchRecentPosts();
    }
  },
  mounted() {
    this.initObserver();
    this.fetchRecentPosts();
  },
  beforeUnmount() {
    if (this.observer) this.observer.disconnect();
  }
}
</script>

<style scoped>
.recent-posts-container {
  width: 100%;
  padding: 1rem 0;
  min-height: 200px;
}

/* Header da Seção */
.section-header {
  margin-bottom: 2.5rem;
}
.title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-main);
  margin-bottom: 0.5rem;
}
.divider {
  width: 50px;
  height: 4px;
  background: var(--brand-primary);
  border-radius: 2px;
}

/* Grid Layout - Mesmo da página de categoria */
.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 2.5rem;
}

/* Card Design - Mesmo estilo da página de categoria */
.post-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  border: 1px solid var(--border-color);
}

.post-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-lg);
}

/* Imagem e Overlay */
.card-image-wrapper {
  height: 220px;
  width: 100%;
  position: relative;
  background-color: var(--slate-200);
  overflow: hidden;
}

.img-link {
  display: block;
  width: 100%;
  height: 100%;
  position: relative;
}

.img-link img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.post-card:hover .img-link img {
  transform: scale(1.05);
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(2px);
}

.post-card:hover .card-overlay {
  opacity: 1;
}

.read-more {
  border: 1px solid white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  backdrop-filter: blur(4px);
}

.no-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--text-muted);
  font-size: 1.5rem;
}

/* Conteúdo do Card */
.card-content {
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.meta-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 0.75rem;
  letter-spacing: 0.5px;
}

.title-link {
  color: var(--text-main);
  text-decoration: none;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.4;
  transition: color 0.2s;
  display: block;
  margin-bottom: 0.75rem;
}

.title-link:hover {
  color: var(--brand-primary);
}

.description {
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  flex-grow: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Tags */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: auto;
}

.tag-pill {
  background-color: var(--bg-hover);
  color: var(--text-secondary);
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  transition: background 0.2s;
}

.post-card:hover .tag-pill {
  background-color: rgba(99, 102, 241, 0.1);
  color: var(--brand-primary);
}

/* Estados de Loading/Error */
.state-container {
  padding: 3rem;
  text-align: center;
  background: var(--bg-hover);
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
}

.state-container.error { 
  color: var(--sys-danger); 
}

.state-container i { 
  font-size: 2rem; 
  margin-bottom: 1rem; 
  display: block; 
}

.spinner {
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--brand-primary);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin { 
  0% { transform: rotate(0deg); } 
  100% { transform: rotate(360deg); } 
}

/* Animação Scroll Reveal */
.scroll-reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.scroll-reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}
</style>