<template>
  <MeuHeader />
  <main class="page-content">
    <div class="content-wrapper">
      <header class="page-header">
        <h2 class="section-title">Todas as Postagens</h2>
        <p class="section-subtitle">Artigos que interpretam dados e exploram as tendências da segurança pública no Brasil.</p>
      </header>

      <section class="controls-container">
        <div class="search-wrapper">
          <i class="fas fa-search search-icon"></i>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Pesquisar por título, tag ou autor..."
            class="search-input"
          />
        </div>
        <div class="filter-wrapper">
          <select v-model.number="limit" @change="handleSearch" class="limit-select">
            <option value="10">10 por página</option>
            <option value="20">20 por página</option>
            <option value="50">50 por página</option>
          </select>
        </div>
      </section>

      <section class="analysis-list">
        <div v-if="isLoading" class="feedback-container">
          <div class="spinner"></div>
          <p>Carregando catálogo...</p>
        </div>
        <div v-else-if="error" class="feedback-container error">
          <i class="fas fa-exclamation-circle fa-2x"></i>
          <p>{{ error }}</p>
        </div>

        <div v-else class="grid-layout">
          <article v-for="analysis in analyses" :key="analysis.id" class="card-analysis">
            <div class="card-image-container">
               <router-link :to="{ name: 'AnalysisDetail', params: { id: analysis.id } }" class="img-link" v-if="analysis.cover_image_path">
                  <img :src="getFullMediaPath(analysis.cover_image_path)" alt="Capa" loading="lazy">
                  <div class="overlay">Ler Mais</div>
               </router-link>
               <div v-else class="no-image-placeholder">Pulso Urbano</div>
            </div>
            
            <div class="card-content">
              <div class="meta-top">
                <span class="date">{{ new Date(analysis.created_at).toLocaleDateString() }}</span>
                <span class="author">por {{ analysis.author }}</span>
              </div>
              
              <h4 class="card-title">
                <router-link :to="{ name: 'AnalysisDetail', params: { id: analysis.id } }">
                  {{ analysis.title }}
                </router-link>
              </h4>
              
              <p class="card-description">{{ analysis.description }}</p>
              
              <div class="tags-container">
                <span v-for="(tag, index) in processTags(analysis.tag)" :key="index" class="tag-pill">
                  #{{ tag }}
                </span>
              </div>
            </div>
          </article>
        </div>

        <div v-if="!isLoading && analyses.length === 0" class="feedback-container empty">
          <i class="far fa-folder-open fa-3x"></i>
          <p>Nenhuma análise encontrada para sua busca.</p>
        </div>
      </section>

      <section v-if="hasMore" class="load-more-container">
        <button @click="loadMore" :disabled="isLoadingMore" class="btn-load-more">
          <span v-if="isLoadingMore"><i class="fas fa-spinner fa-spin"></i> Carregando...</span>
          <span v-else>Carregar Mais Artigos</span>
        </button>
      </section>
    </div>
  </main>
  <MeuFooter />
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import axios from 'axios';
import MeuHeader from '@/components/MeuHeader.vue';
import MeuFooter from '@/components/MeuFooter.vue';


const analyses = ref([]);
const searchQuery = ref('');
const currentPage = ref(1);
const limit = ref(10);
const totalAnalyses = ref(0);
const isLoading = ref(true);
const isLoadingMore = ref(false);
const error = ref(null);

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

const hasMore = computed(() => {
  return analyses.value.length < totalAnalyses.value;
});

const getFullMediaPath = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const processTags = (tagString) => {
  if (!tagString) return [];
  const cleanedString = tagString.replace(/['"-:;()\d]/g, '');
  return cleanedString.split(' ').filter(tag => tag.trim() !== '').slice(0, 3); // Limita a 3 tags
};

const fetchAnalyses = async (isNewSearch = false) => {
  if (isNewSearch) {
    currentPage.value = 1;
    analyses.value = [];
    totalAnalyses.value = 0;
    isLoading.value = true;
  } else {
    isLoadingMore.value = true;
  }
  error.value = null;

  try {
    const token = localStorage.getItem('authToken');
    const params = {
      search: searchQuery.value,
      page: currentPage.value,
      limit: limit.value
    };

    const response = await axios.get(`${API_BASE_URL}/api/admin/analyses-list`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params
    });

    const result = response.data;

    analyses.value = isNewSearch
      ? result.data.analyses
      : [...analyses.value, ...result.data.analyses];

    totalAnalyses.value = result.data.total;

  } catch (err) {
    error.value = err.response?.data?.message || 'Falha ao buscar análises.';
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
  }
};

const loadMore = () => {
  if (hasMore.value) {
    currentPage.value++;
    fetchAnalyses(false);
  }
};

const handleSearch = () => {
    fetchAnalyses(true);
};

let searchTimeout = null;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchAnalyses(true);
  }, 500);
});

onMounted(() => {
  fetchAnalyses(true);
});
</script>

<style scoped>
.page-content {
    background-color: #f8fafc; /* Cor de fundo suave para a página inteira */
    min-height: 100vh;
    padding-bottom: 4rem;
}
.content-wrapper {
    max-width: 1200px;
    margin: 0 auto;
    padding: 3rem 1.5rem;
}

/* HEADER DA PÁGINA */
.page-header {
    text-align: center;
    margin-bottom: 3.5rem;
    max-width: 700px;
    margin-left: auto;
    margin-right: auto;
}
.section-title {
    font-size: 2.5rem;
    font-weight: 800;
    color: #1e293b;
    margin-bottom: 1rem;
    letter-spacing: -0.025em;
}
.section-subtitle {
    font-size: 1.125rem;
    color: #64748b;
    line-height: 1.6;
}

/* CONTROLES (PESQUISA) */
.controls-container {
  display: flex;
  gap: 1rem;
  margin-bottom: 3rem;
  justify-content: center;
  flex-wrap: wrap;
}
.search-wrapper {
  position: relative;
  flex-grow: 1;
  max-width: 600px;
  width: 100%;
}
.search-icon {
    position: absolute;
    left: 1.25rem;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
}
.search-input {
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  font-size: 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 50px; /* Borda redonda completa */
  background-color: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}
.search-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}
.limit-select {
  padding: 0 1.5rem;
  height: 100%;
  min-height: 54px;
  border: 1px solid #cbd5e1;
  border-radius: 50px;
  background-color: white;
  color: #475569;
  cursor: pointer;
}

/* GRID DE CARDS */
.grid-layout {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 2.5rem;
}

/* CARD DESIGN REFINADO */
.card-analysis {
    background-color: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
    border: 1px solid rgba(0,0,0,0.02);
}
.card-analysis:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.card-image-container {
    height: 220px;
    width: 100%;
    position: relative;
    background-color: #e2e8f0;
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
.card-analysis:hover .img-link img {
    transform: scale(1.05);
}
.overlay {
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
.card-analysis:hover .overlay {
    opacity: 1;
}

.card-content {
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}

.meta-top {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #94a3b8;
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 0.75rem;
    letter-spacing: 0.5px;
}

.card-title {
    margin: 0 0 0.75rem 0;
    font-size: 1.25rem;
    line-height: 1.4;
    font-weight: 700;
    color: #1e293b;
}
.card-title a {
    color: inherit;
    text-decoration: none;
    transition: color 0.2s;
}
.card-title a:hover {
    color: #6366f1;
}

.card-description {
    font-size: 0.95rem;
    color: #64748b;
    line-height: 1.6;
    margin-bottom: 1.5rem;
    flex-grow: 1;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: auto; /* Empurra tags para baixo */
}
.tag-pill {
    background-color: #f1f5f9;
    color: #475569;
    padding: 0.25rem 0.75rem;
    border-radius: 99px;
    font-size: 0.75rem;
    font-weight: 600;
    transition: background 0.2s;
}
.card-analysis:hover .tag-pill {
    background-color: #e0e7ff;
    color: #4338ca;
}

/* FEEDBACK E LOADERS */
.feedback-container {
  width: 100%;
  text-align: center;
  padding: 4rem 1rem;
  color: #64748b;
}
.feedback-container.error { color: #ef4444; }
.feedback-container.empty { color: #94a3b8; }
.spinner {
    border: 3px solid #e2e8f0;
    border-top: 3px solid #6366f1;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem auto;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.load-more-container {
  text-align: center;
  margin-top: 3rem;
}
.btn-load-more {
  padding: 0.85rem 2.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  background-color: white;
  color: #334155;
  border: 1px solid #cbd5e1;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
.btn-load-more:hover:not(:disabled) {
  background-color: #f8fafc;
  border-color: #94a3b8;
  transform: translateY(-1px);
}
.btn-load-more:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>