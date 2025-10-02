<template>
  <section class="recent-posts">
    <h2 class="section-title">Publicações e Painéis</h2>
    
    <div v-if="isLoading" class="status-message">
      <div class="spinner-large"></div>
      <p>Carregando publicações...</p>
    </div>
    <div v-else-if="error" class="status-message error">
      {{ error }}
    </div>
    <div v-else-if="posts.length === 0" class="status-message">
        Nenhuma publicação encontrada.
    </div>
    <div v-else class="posts-grid">
      <div v-for="post in posts" :key="post.id" class="card post-card">
        <img :src="getFullMediaPath(post.cover_image_path)" :alt="post.title">
        <div class="post-card-content">
          <h3>{{ post.title }}</h3>
          <p>{{ truncateText(post.description) }}</p>
          <a :href="`/postagem/${post.id}`" class="btn-secondary">Ler Análise <i class="fas fa-arrow-right"></i></a>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import axios from 'axios';

export default {
  name: 'RecentPosts',
  props: {
    // Propriedade para definir quantos posts exibir
    postCount: {
      type: Number,
      required: true,
      default: 6, // Um valor padrão caso não seja fornecido
    }
  },
  data() {
    return {
      posts: [],
      isLoading: true,
      error: null,
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
        timeout: 30000 // 30 segundos para aguardar a resposta
        });
        
        const analysesArray = response.data?.data?.analyses;

        if (!Array.isArray(analysesArray)) {
          throw new Error("A resposta da API não continha um array de análises.");
        }
        
        // Ordena as análises pela data de criação (da mais nova para a mais antiga)
        const sortedAnalyses = [...analysesArray].sort((a, b) => {
          return new Date(b.created_at) - new Date(a.created_at);
        });
        
        // Pega apenas a quantidade definida pela prop 'postCount'
        this.posts = sortedAnalyses.slice(0, this.postCount);

      } catch (err) {
        console.error("Erro ao carregar publicações recentes:", err);
        this.error = 'Não foi possível carregar as publicações.';
      } finally {
        this.isLoading = false;
      }
    },
    getFullMediaPath(path) {
      if (!path) {
        return 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=400&q=80';
      }
      const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';
      return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
    },
    truncateText(text, length = 80) {
      if (!text) return '';
      if (text.length <= length) return text;
      return text.substring(0, length) + '...';
    }
  },
  created() {
    this.fetchRecentPosts();
  },
}
</script>

<style scoped>
/* Estilos específicos para este componente */
.recent-posts {
  width: 100%;
}
.section-title {
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #6366f1;
  padding-bottom: 0.5rem;
  display: inline-block;
}
.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
.card {
  background-color: #fff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}
.post-card {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.post-card img {
  width: 100%;
  height: 180px;
  object-fit: cover;
}
.post-card-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}
.post-card-content h3 {
  font-size: 1.2rem;
  margin: 0 0 0.5rem 0;
  color: #111827;
}
.post-card-content p {
  color: #4b5563;
  flex-grow: 1;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  line-height: 1.6;
}
.btn-secondary {
  padding: 0.6rem 1rem;
  border-radius: 6px;
  border: 1px solid #6366f1;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  transition: background-color 0.2s, color 0.2s;
  background-color: transparent;
  color: #6366f1;
  margin-top: auto; /* Alinha o botão na parte inferior */
}
.btn-secondary:hover {
  background-color: #e0e7ff;
}

/* Utilitários de status */
@keyframes spin { to { transform: rotate(360deg); } }
.spinner-large {
  width: 40px; height: 40px; border: 4px solid #e9ecef;
  border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite;
  margin: 0 auto 1rem auto;
}
.status-message {
  padding: 2rem; text-align: center; color: #6b7280;
}
.status-message.error {
  color: #991b1b;
}
</style>