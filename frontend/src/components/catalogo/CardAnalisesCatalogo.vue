<template>
  <div class="analyses-grid" ref="postsContainer">
    <div v-if="isLoading" class="loading">Carregando acervo completo...</div>

    <div v-else-if="error" class="error-message">{{ error }}</div>

    <div 
      v-else 
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
          <span class="badge year-badge">
            {{ post.year_range || post.year || '2024' }}
          </span>
        </div>

        <h3 class="card-title">{{ post.title }}</h3>
        
        <p class="card-description">
          {{ post.description || post.content || 'Sem descrição disponível para esta pesquisa.' }}
        </p>

        <div class="card-footer">
          <span class="source-name">{{ post.source || 'CRISP/UFMG' }}</span>
          <router-link :to="`/postagem/${post.id}`" class="btn-research">
            Ver pesquisa
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

export default {
  name: 'CardAnalisesCatalogo',
  props: {
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
      observer: null,
      colors: ['#802c5c', '#2c4c80', '#2c4c80', '#f1a139', '#1d3557', '#b08b26']
    };
  },
  methods: {
    async fetchAllPosts() {
      this.isLoading = true;
      this.error = null;
      try {
        const token = localStorage.getItem('authToken');
        
        const params = {};
        if (this.category) params.category = this.category;

        const response = await axios.get(`${API_BASE_URL}/api/admin/analyses-list`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { limit: 10000000000 },
          timeout: 15000
        });
        
        const analysesArray = response.data?.data?.analyses;
        if (!Array.isArray(analysesArray)) throw new Error("Formato de dados inválido.");
        
        // Ordena por data, mas atribui o array INTEIRO (removido o .slice)
        this.posts = [...analysesArray].sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );

      } catch (err) {
        console.error("Erro ao carregar publicações:", err);
        this.error = 'Não foi possível carregar as publicações.';
      } finally {
        this.isLoading = false;
        this.$nextTick(() => { this.observeElements(); });
      }
    },
    getBorderColor(index) {
      return this.colors[index % this.colors.length];
    },
    getLightColor(index) {
      const hex = this.getBorderColor(index);
      return hex + '15';
    },
    initObserver() {
      if (this.observer) this.observer.disconnect();
      if (!('IntersectionObserver' in window)) return;
      
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      }, { threshold: 0.1 });
    },
    observeElements() {
      if (!this.observer || !this.$refs.postsContainer) return;
      const elements = this.$refs.postsContainer.querySelectorAll('.scroll-reveal');
      elements.forEach(el => this.observer.observe(el));
    }
  },
  mounted() {
    this.initObserver();
    this.fetchAllPosts();
  },
  beforeUnmount() {
    if (this.observer) this.observer.disconnect();
  }
}
</script>

<style scoped>
/* O CSS permanece o mesmo, o grid vai crescer verticalmente conforme o número de itens */
.analyses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  padding: 20px;
  background-color: #f8f9fa;
}

.analysis-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
  opacity: 0;
  transform: translateY(20px);
}

.analysis-card.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.card-border-top {
  height: 6px;
  width: 100%;
}

.card-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.card-header {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.category-badge {
  background-color: #fdf2f2;
}

.year-badge {
  background-color: #fff8e6;
  color: #b08b26;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #0a1d37;
  line-height: 1.3;
  margin: 0 0 16px 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-description {
  font-size: 0.9rem;
  color: #666;
  line-height: 1.6;
  margin-bottom: 24px;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex-grow: 1;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.source-name {
  font-size: 0.85rem;
  color: #888;
  font-weight: 500;
}

.btn-research {
  background-color: #eef4ff;
  color: #0044cc;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-research:hover {
  background-color: #0044cc;
  color: white;
}

.loading, .error-message {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
  color: #666;
}
</style>