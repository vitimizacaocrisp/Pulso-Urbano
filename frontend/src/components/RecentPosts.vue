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
          <img :src="getFullMediaPath(post.cover_image_path)" :alt="post.title" loading="lazy">
          <div class="card-overlay">
            <span class="read-more">Ler Análise</span>
          </div>
          <span v-if="post.category" class="category-badge">{{ post.category }}</span>
        </div>
        
        <div class="card-content">
          <div class="meta-info">
             <span class="date">{{ new Date(post.created_at).toLocaleDateString() }}</span>
          </div>
          <h3>
            <a :href="`/postagem/${post.id}`" class="title-link">{{ post.title }}</a>
          </h3>
          <p class="description">{{ truncateText(post.description) }}</p>
          
          <div class="card-footer">
            <a :href="`/postagem/${post.id}`" class="btn-link">
              Ler mais <i class="fas fa-arrow-right"></i>
            </a>
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
        const response = await axios.get(`${API_BASE_URL}/api/admin/analyses-list`, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 30000
        });
        const analysesArray = response.data?.data?.analyses;
        if (!Array.isArray(analysesArray)) throw new Error("Formato de dados inválido.");
        
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
      if (!path) return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80';
      const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';
      return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
    },
    truncateText(text, length = 100) {
      if (!text) return '';
      if (text.length <= length) return text;
      return text.substring(0, length) + '...';
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

/* Grid Layout */
.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
}

/* Card Design Moderno */
.post-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--border-color);
}

.post-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-xl);
}

/* Imagem e Overlay */
.card-image-wrapper {
  position: relative;
  height: 220px;
  overflow: hidden;
  background-color: var(--slate-200); /* Placeholder */
}
.card-image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}
.post-card:hover .card-image-wrapper img {
  transform: scale(1.05);
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.3);
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s ease;
}
.post-card:hover .card-overlay {
  opacity: 1;
}
.read-more {
  color: white;
  font-weight: 600;
  border: 1px solid white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  backdrop-filter: blur(4px);
}

.category-badge {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: rgba(255, 255, 255, 0.95);
  color: var(--brand-primary);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-transform: uppercase;
}

/* Conteúdo do Card */
.card-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}
.meta-info {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
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
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  flex-grow: 1;
}

.card-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}
.btn-link {
  color: var(--brand-primary);
  font-weight: 600;
  text-decoration: none;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: gap 0.2s;
}
.btn-link:hover {
  gap: 0.75rem;
}

/* Estados de Loading/Error */
.state-container {
  padding: 3rem;
  text-align: center;
  background: var(--bg-hover);
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
}
.state-container.error { color: var(--sys-danger); }
.state-container i { font-size: 2rem; margin-bottom: 1rem; display: block; }
.spinner {
  width: 40px; height: 40px; 
  border: 3px solid var(--border-color); border-top-color: var(--brand-primary); 
  border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;
}
@keyframes spin { to { transform: rotate(360deg); } }

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