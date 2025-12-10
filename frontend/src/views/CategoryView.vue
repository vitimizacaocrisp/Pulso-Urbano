<template>
  <main class="page-content">
    <div class="category-hero">
        <header class="page-header">
            <span class="eyebrow">Categoria</span>
            <h2 class="section-title">{{ pageTitle }}</h2>
            <p class="section-subtitle">Explorando dados e análises sobre {{ categoryNameForDescription }}.</p>
        </header>
    </div>

    <div class="content-wrapper">
      <section class="controls-container">
        <div class="search-wrapper">
          <i class="fas fa-search search-icon"></i>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Filtrar nesta categoria..."
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
          <p>Buscando conteúdo...</p>
        </div>
        <div v-else-if="error" class="feedback-container error">
          <p>{{ error }}</p>
        </div>

        <div v-else class="grid-layout">
            <article v-for="analysis in analyses" :key="analysis.id" class="card-analysis">
                <div class="card-image-container">
                <router-link :to="{ name: 'AnalysisDetail', params: { id: analysis.id } }" class="img-link" v-if="analysis.cover_image_path">
                    <img :src="getFullMediaPath(analysis.cover_image_path)" alt="Capa" loading="lazy">
                    <div class="overlay">Ler Artigo</div>
                </router-link>
                <div v-else class="no-image-placeholder">PU</div>
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
          <p>Nenhuma postagem encontrada nesta categoria.</p>
        </div>
      </section>

      <section v-if="hasMore" class="load-more-container">
        <button @click="loadMore" :disabled="isLoadingMore" class="btn-load-more">
          <span v-if="isLoadingMore">Carregando...</span>
          <span v-else>Ver Mais</span>
        </button>
      </section>
    </div>
  </main>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const analyses = ref([]);
const searchQuery = ref('');
const currentPage = ref(1);
const limit = ref(10);
const totalAnalyses = ref(0);
const isLoading = ref(true);
const isLoadingMore = ref(false);
const error = ref(null);

const category = ref(route.params.categoryName);

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

const pageTitle = computed(() => {
  if (!category.value) return 'Postagens';
  return `${category.value.charAt(0).toUpperCase() + category.value.slice(1)}`;
});
const categoryNameForDescription = computed(() => category.value || 'diversos tópicos');

const hasMore = computed(() => analyses.value.length < totalAnalyses.value);

const getFullMediaPath = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const processTags = (tagString) => {
  if (!tagString) return [];
  const cleanedString = tagString.replace(/['"-:;()\d]/g, '');
  return cleanedString.split(' ').filter(tag => tag.trim() !== '').slice(0, 3);
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
      limit: limit.value,
      category: category.value
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

watch(() => route.params.categoryName, (newCategory) => {
    if (newCategory) {
        category.value = newCategory;
        fetchAnalyses(true);
    }
});

onMounted(() => {
  fetchAnalyses(true);
});
</script>

<style scoped>
.page-content {
    background-color: #f8fafc;
    min-height: 100vh;
    padding-bottom: 4rem;
}

/* Hero específico da Categoria - Diferente do PostsView para dar variedade */
.category-hero {
    background-color: #1e293b;
    color: white;
    padding: 4rem 1.5rem;
    text-align: center;
    margin-bottom: -3rem; /* Efeito de sobreposição do conteúdo */
}
.eyebrow {
    text-transform: uppercase;
    font-size: 0.8rem;
    letter-spacing: 2px;
    opacity: 0.7;
    display: block;
    margin-bottom: 0.5rem;
}
.section-title {
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 1rem;
    color: white;
}
.section-subtitle {
    color: #cbd5e1;
    font-size: 1.2rem;
    max-width: 600px;
    margin: 0 auto;
}

.content-wrapper {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
    position: relative;
    z-index: 10;
}

/* Reutilizando os estilos modernos do PostsView (já que são o mesmo padrão de card) */
.controls-container {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 1rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
}
.search-wrapper { position: relative; flex-grow: 1; min-width: 250px; }
.search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #94a3b8; }
.search-input { width: 100%; padding: 0.75rem 0.75rem 0.75rem 2.5rem; border: 1px solid #e2e8f0; border-radius: 6px; }
.search-input:focus { outline: none; border-color: #6366f1; }
.limit-select { padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 6px; background: white; }

/* Grid e Cards - Mesma estrutura do PostsView */
.grid-layout {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 2.5rem;
}
.card-analysis {
    background-color: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
}
.card-analysis:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
.card-image-container {
    height: 200px;
    position: relative;
    background-color: #e2e8f0;
}
.img-link img { width: 100%; height: 100%; object-fit: cover; }
.overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); opacity: 0; transition: opacity 0.3s; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
.card-analysis:hover .overlay { opacity: 1; }
.card-content { padding: 1.5rem; display: flex; flex-direction: column; flex-grow: 1; }
.meta-top { display: flex; justify-content: space-between; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 600; margin-bottom: 0.5rem; }
.card-title { margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 700; color: #1e293b; }
.card-title a { color: inherit; text-decoration: none; }
.card-title a:hover { color: #6366f1; }
.card-description { font-size: 0.95rem; color: #64748b; line-height: 1.6; margin-bottom: 1.5rem; flex-grow: 1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.tags-container { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: auto; }
.tag-pill { background-color: #f1f5f9; color: #475569; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }

/* Loaders */
.feedback-container { text-align: center; padding: 4rem; color: #64748b; width: 100%; grid-column: 1 / -1; }
.spinner { border: 3px solid #e2e8f0; border-top-color: #6366f1; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.load-more-container { text-align: center; margin-top: 3rem; padding-bottom: 2rem; }
.btn-load-more { padding: 0.75rem 2rem; background: white; border: 1px solid #cbd5e1; border-radius: 50px; cursor: pointer; font-weight: 600; color: #475569; }
.btn-load-more:hover { background: #f1f5f9; }
</style>