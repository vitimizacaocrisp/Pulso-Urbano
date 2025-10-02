<template>
  <div>
    <section class="hero-video">
      <div class="video-overlay"></div>
      <video 
        src="https://www.pexels.com/pt-br/download/video/1851190/" 
        autoplay 
        loop 
        muted 
        playsinline
      >
        Seu navegador não suporta o elemento de vídeo.
      </video>
      <div class="hero-content">
        <h1>Pulso Urbano</h1>
        <p>Analisando os ritmos da segurança pública e justiça no Brasil.</p>
      </div>
    </section>

    <div class="page-container">
      <main class="main-content">
        
        <article class="featured-article card">
          <div v-if="dailyHighlight.isLoading" class="status-message">
            <div class="spinner-large"></div>
            <p>Gerando destaque do dia...</p>
          </div>
          <div v-else-if="dailyHighlight.error" class="status-message error">
            {{ dailyHighlight.error }}
          </div>
          <template v-else-if="dailyHighlight.data">
            <header class="article-header">
              <router-link :to="`/categoria/${dailyHighlight.data.category.toLowerCase()}`" class="category-tag">
                {{ dailyHighlight.data.category }}
              </router-link>
              <h1>{{ dailyHighlight.data.title }}</h1>
              <div class="article-meta">
                <span><i class="fas fa-calendar-alt"></i> {{ new Date(dailyHighlight.data.created_at).toLocaleDateString() }}</span>
                <span><i class="fas fa-user"></i> Por {{ dailyHighlight.data.author }}</span>
              </div>
            </header>
            <figure class="featured-image">
              <img :src="getFullMediaPath(dailyHighlight.data.cover_image_path)" alt="Imagem de capa do destaque">
            </figure>
            <div class="article-content">
              <p class="lead">
                {{ dailyHighlight.data.description }}
              </p>
              <router-link :to="{ name: 'AnalysisDetail', params: { id: dailyHighlight.data.id } }" class="btn-primary">
                Ler Análise Completa →
              </router-link>
            </div>
          </template>
        </article>

        <RecentPosts :post-count="6" />

      </main>

      <aside class="sidebar">
        <div class="sidebar-widget card">
          <h3 class="widget-title">Categorias</h3>
          <div v-if="categories.isLoading" class="status-message small">
            <div class="spinner-badge"></div> Carregando...
          </div>
          <div v-else-if="categories.error" class="status-message small error">
            {{ categories.error }}
          </div>
          <ul v-else class="category-list">
            <li v-for="category in categories.data" :key="category.name">
              <router-link :to="`/categoria/${category.name.toLowerCase()}`">
                {{ category.name }}
                <span class="count">{{ category.count }}</span>
              </router-link>
            </li>
          </ul>
        </div>
        <div class="sidebar-widget card">
          <h3 class="widget-title">Contexto Nacional</h3>
            <div v-if="population.isLoading" class="status-message small">
              <div class="spinner-badge"></div> Carregando...
            </div>
            <div v-else-if="population.error" class="status-message small error">Falha ao carregar.</div>
            <div v-else class="stats-list">
              <div class="stat-item">
                <span>População Total ({{ population.data.ano }})</span>
                <strong>{{ formatNumber(population.data.total) }}</strong>
              </div>
              <div v-if="population.data.topState" class="stat-item">
                <span>Estado mais populoso</span>
                <strong>{{ population.data.topState.uf }}</strong>
              </div>
            </div>
        </div>
        <div class="sidebar-widget card newsletter-widget">
          <h3 class="widget-title">Inscreva-se</h3>
          <p>Receba as últimas análises e destaques diretamente no seu email.</p>
          <form class="subscribe-form">
            <input type="email" placeholder="Seu melhor email">
            <button type="submit" class="btn-primary">Inscrever</button>
          </form>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import {reactive, onMounted } from 'vue';
import axios from 'axios';
import RecentPosts from '@/components/RecentPosts.vue';

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

// --- Estado Reativo ---
const population = reactive({
  isLoading: true,
  error: null,
  data: { total: 0, topState: null, ano: null }
});

const dailyHighlight = reactive({
  isLoading: true,
  error: null,
  data: null
});

const categories = reactive({
  isLoading: true,
  error: null,
  data: []
});

// --- Funções Auxiliares ---
const formatNumber = (num) => {
  if (typeof num !== 'number') return '...';
  return num.toLocaleString('pt-BR');
};

const getFullMediaPath = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};


// --- Lógica de Busca de Dados ---
const fetchPopulationData = async () => {
  population.isLoading = true;
  try {
    const ano = new Date().getFullYear() - 1;
    const url = `https://apisidra.ibge.gov.br/values/t/6579/n3/all/v/9324/p/${ano}/h/n`;
    const response = await axios.get(url);
    const rawData = response.data;

    if (!Array.isArray(rawData) || rawData.length < 2) throw new Error("Formato de resposta inesperado do IBGE.");
    
    const processedData = rawData.slice(1).map(item => ({
      uf: item.D3N,
      populacao: Number(item.V) || 0,
    }));

    population.data.total = processedData.reduce((sum, state) => sum + state.populacao, 0);
    population.data.topState = [...processedData].sort((a, b) => b.populacao - a.populacao)[0];
    population.data.ano = ano;
    population.error = null;
  } catch (err) {
    console.error("Erro ao buscar dados do IBGE:", err);
    population.error = "Falha ao carregar dados populacionais.";
  } finally {
    population.isLoading = false;
  }
};

const fetchAnalysesData = async () => {
  dailyHighlight.isLoading = true;
  categories.isLoading = true;
  try {
    // Usando a nova rota pública
    const response = await axios.get(`${API_BASE_URL}/api/analyses-list`);
    const analyses = response.data?.data?.analyses;

    if (!Array.isArray(analyses) || analyses.length === 0) throw new Error("Nenhuma análise encontrada.");
    
    // Processar Destaque do Dia (a análise mais recente)
    dailyHighlight.data = analyses[0];
    dailyHighlight.error = null;

    // Processar Categorias
    const counts = analyses.reduce((acc, analysis) => {
      const cat = analysis.category || 'Sem Categoria';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
    
    categories.data = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    categories.error = null;

  } catch (err) {
    console.error("Erro ao buscar análises:", err);
    dailyHighlight.error = 'Não foi possível gerar um destaque.';
    categories.error = 'Não foi possível carregar as categorias.';
  } finally {
    dailyHighlight.isLoading = false;
    categories.isLoading = false;
  }
};

// --- Hook de Ciclo de Vida ---
onMounted(() => {
  fetchPopulationData();
  fetchAnalysesData();
});
</script>

<style scoped>
/* SEÇÃO HERO VIDEO */
.hero-video {
  position: relative;
  height: 60vh;
  width: 100%;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #111827;
}
.hero-video video {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 100%;
  min-height: 100%;
  width: auto;
  height: auto;
  z-index: 1;
}
.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(17, 24, 39, 0.6);
  z-index: 2;
}
.hero-content {
  position: relative;
  z-index: 3;
  color: #fff;
  text-align: center;
  padding: 2rem;
}
.hero-content h1 {
  font-size: 4rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.7);
}
.hero-content p {
  font-size: 1.25rem;
  max-width: 600px;
  margin: 0 auto;
  text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.7);
}

/* GERAL E LAYOUT */
.page-container {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1rem;
}
.main-content {
  flex: 3;
  min-width: 60%;
}
.sidebar {
  flex: 1;
  min-width: 300px;
}
.card {
  background-color: #fff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  padding: 1.5rem;
  margin-bottom: 2rem;
}
/* ARTIGO EM DESTAQUE */
.article-header {
  margin-bottom: 1.5rem;
}
.category-tag {
  display: inline-block;
  background-color: #e0e7ff;
  color: #4338ca;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 1rem;
  text-decoration: none;
  transition: background-color 0.2s;
}
.category-tag:hover {
  background-color: #c7d2fe;
}
.article-header h1 {
  font-size: 2.5rem;
  color: #111827;
  line-height: 1.2;
  margin: 0;
}
.article-meta {
  display: flex;
  gap: 1.5rem;
  color: #6b7280;
  font-size: 0.9rem;
  margin-top: 1rem;
}
.article-meta i {
  margin-right: 0.5rem;
}
.featured-image {
  margin: 0 0 1.5rem 0;
}
.featured-image img {
  width: 100%;
  height: auto;
  border-radius: 8px;
}
.article-content .lead {
  font-size: 1.1rem;
  color: #4b5563;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}
.article-content .btn-primary {
  display: inline-block;
  margin-top: 1rem;
  text-decoration: none;
}

/* BARRA LATERAL (SIDEBAR) */
.sidebar-widget {
  padding: 1.5rem;
}
.widget-title {
  font-size: 1.3rem;
  color: #111827;
  margin: 0 0 1rem 0;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 0.75rem;
}
.category-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.category-list li a {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  color: #4b5563;
  text-decoration: none;
  border-bottom: 1px solid #f3f4f6;
  transition: color 0.2s;
}
.category-list li a:hover {
  color: #6366f1;
}
.category-list .count {
  background-color: #e9ecef;
  color: #6b7280;
  font-size: 0.8rem;
  padding: 0.1rem 0.5rem;
  border-radius: 8px;
}
.stats-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}
.stat-item strong {
  font-size: 1.1rem;
  color: #111827;
}
.newsletter-widget p {
  color: #4b5563;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}
.subscribe-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.subscribe-form input {
  padding: 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 1rem;
}
.subscribe-form input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 2px #e0e7ff;
}
.btn-primary {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  transition: background-color 0.2s, transform 0.2s;
  background-color: #6366f1;
  color: white;
}
.btn-primary:hover {
  background-color: #4f46e5;
  transform: translateY(-2px);
}

/* UTILITÁRIOS E SPINNERS */
@keyframes spin { to { transform: rotate(360deg); } }
.spinner-badge {
  width: 16px; height: 16px; border: 2px solid #ced4da;
  border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite;
  display: inline-block;
}
.spinner-large {
  width: 40px; height: 40px; border: 4px solid #e9ecef;
  border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite;
  margin: 0 auto 1rem auto;
}
.status-message {
  padding: 2rem; text-align: center; color: #6b7280;
}
.status-message.small { padding: 1rem; display: flex; align-items: center; gap: 0.5rem; justify-content: center; }
.status-message.error { color: #991b1b; }

/* RESPONSIVIDADE */
@media (max-width: 992px) {
  .page-container { flex-direction: column; }
  .main-content, .sidebar { min-width: 100%; }
  .article-header h1 { font-size: 2rem; }
}
@media (max-width: 768px) {
  .hero-content h1 { font-size: 2.5rem; }
  .hero-content p { font-size: 1.1rem; }
}
</style>