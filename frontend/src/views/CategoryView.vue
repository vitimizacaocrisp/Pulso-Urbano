<template>
  <MeuHeader />
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
        <div v-if="isLoading && analyses.length === 0" class="feedback-container">
          <div class="spinner"></div>
          <p>Buscando conteúdo...</p>
        </div>
        <div v-else-if="error" class="feedback-container error">
          <p>{{ error }}</p>
        </div>

        <!-- Usando o componente RecentPosts com os dados da categoria -->
        <div v-else class="posts-grid-wrapper">
          <article 
            v-for="(analysis, index) in analyses" 
            :key="analysis.id" 
            class="post-card"
            :style="{ animationDelay: `${index * 50}ms` }"
          >
            <div class="card-image-wrapper">
              <router-link :to="{ name: 'AnalysisDetail', params: { id: analysis.id } }" class="img-link" v-if="analysis.cover_image_path">
                <img :src="getFullMediaPath(analysis.cover_image_path)" alt="Capa" loading="lazy">
                <div class="card-overlay">
                  <span class="read-more">Ler Artigo</span>
                </div>
              </router-link>
              <div v-else class="no-image-placeholder">PU</div>
            </div>
            
            <div class="card-content">
              <div class="meta-info">
                <span class="date">{{ new Date(analysis.created_at).toLocaleDateString() }}</span>
                <span class="author">por {{ analysis.author }}</span>
              </div>
              <h3>
                <router-link :to="{ name: 'AnalysisDetail', params: { id: analysis.id } }" class="title-link">
                  {{ analysis.title }}
                </router-link>
              </h3>
              <p class="description">{{ analysis.description }}</p>
              
              <div class="tags-container" v-if="analysis.tag">
                <span v-for="(tag, idx) in processTags(analysis.tag)" :key="idx" class="tag-pill">
                  #{{ tag }}
                </span>
              </div>
            </div>
          </article>
        </div>

        <div v-if="!isLoading && analyses.length === 0" class="feedback-container empty">
          <p>Nenhuma postagem encontrada nesta categoria.</p>
        </div>

        <!-- Sentinel para infinite scroll -->
        <div v-if="analyses.length > 0 && hasMore" ref="sentinel" class="sentinel">
          <div v-if="isLoadingMore" class="loading-more">
            <div class="spinner-small"></div>
            <span>Carregando mais...</span>
          </div>
        </div>

        <!-- Mensagem de fim da lista -->
        <div v-if="analyses.length > 0 && !hasMore" class="end-message">
          <span>Você viu tudo!</span>
        </div>
      </section>
    </div>
  </main>
  <MeuFooter />
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import MeuHeader from '@/components/MeuHeader.vue';
import MeuFooter from '@/components/MeuFooter.vue';

const route = useRoute();
const analyses = ref([]);
const searchQuery = ref('');
const currentPage = ref(1);
const limit = ref(10);
const totalAnalyses = ref(0);
const isLoading = ref(true);
const isLoadingMore = ref(false);
const error = ref(null);
const sentinel = ref(null);
let observer = null;

const category = ref(route.params.categoryName);

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

const pageTitle = computed(() => {
  if (!category.value) return 'Biblioteca';
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
  if (hasMore.value && !isLoadingMore.value && !isLoading.value) {
    currentPage.value++;
    fetchAnalyses(false);
  }
};

const handleSearch = () => {
  fetchAnalyses(true);
};

// Configurar IntersectionObserver para infinite scroll
const setupIntersectionObserver = () => {
  if (observer) observer.disconnect();

  observer = new IntersectionObserver((entries) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore.value && !isLoadingMore.value) {
      loadMore();
    }
  }, {
    root: null,
    rootMargin: '150px',
    threshold: 0.1
  });

  if (sentinel.value) {
    observer.observe(sentinel.value);
  }
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

// Reconfigurar observer quando os dados mudam
watch([hasMore, analyses], () => {
  setTimeout(() => {
    setupIntersectionObserver();
  }, 0);
});

onMounted(() => {
  fetchAnalyses(true);
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
  clearTimeout(searchTimeout);
});
</script>

<style scoped>
.page-content {
    background-color: var(--bg-body);
    min-height: 100vh;
    padding-bottom: 4rem;
}

/* Hero específico da Categoria */
.category-hero {
    background-color: var(--bg-header);
    color: white;
    padding: 4rem 1.5rem;
    text-align: center;
    margin-bottom: -3rem;
}
.eyebrow {
    text-transform: uppercase;
    font-size: 0.8rem;
    letter-spacing: 2px;
    opacity: 0.7;
    display: block;
    margin-bottom: 0.5rem;
    color: var(--brand-primary);
}
.section-title {
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 1rem;
    color: white;
}
.section-subtitle {
    color: var(--text-muted);
    font-size: 1.2rem;
    max-width: 600px;
    margin: 0 auto;
}

.content-wrapper {
    max-width: var(--container-width);
    margin: 0 auto;
    padding: 0 1.5rem;
    position: relative;
    z-index: 10;
}

.controls-container {
  background: var(--bg-card);
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  gap: 1rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
  border: 1px solid var(--border-color);
}
.search-wrapper { position: relative; flex-grow: 1; min-width: 250px; }
.search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.search-input { 
    width: 100%; padding: 0.75rem 0.75rem 0.75rem 2.5rem; 
    border: 1px solid var(--border-color); border-radius: 6px; 
    background: var(--bg-input-form); color: var(--text-main);
}
.search-input:focus { outline: none; border-color: var(--brand-primary); }
.limit-select { 
    padding: 0.75rem; border: 1px solid var(--border-color); 
    border-radius: 6px; background: var(--bg-input-form); color: var(--text-main); 
}

/* Grid e Cards - Mesmo estilo do componente RecentPosts */
.posts-grid-wrapper {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 2.5rem;
}

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
    animation: fadeInUp 0.5s ease forwards;
    opacity: 0;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.post-card:hover {
    transform: translateY(-6px);
    box-shadow: var(--shadow-lg);
}

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

/* Loaders */
.feedback-container { text-align: center; padding: 4rem; color: var(--text-muted); width: 100%; grid-column: 1 / -1; }
.spinner { border: 3px solid var(--border-color); border-top-color: var(--brand-primary); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* Infinite Scroll Styles */
.sentinel {
  width: 100%;
  padding: 2rem 0;
  display: flex;
  justify-content: center;
  align-items: center;
  grid-column: 1 / -1;
}

.loading-more {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
}

.spinner-small {
  border: 2px solid var(--border-color);
  border-top-color: var(--brand-primary);
  border-radius: 50%;
  width: 20px;
  height: 20px;
  animation: spin 0.8s linear infinite;
}

.end-message {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-muted);
  font-size: 0.9rem;
  grid-column: 1 / -1;
  position: relative;
}

.end-message::before,
.end-message::after {
  content: '';
  display: inline-block;
  width: 50px;
  height: 1px;
  background: var(--border-color);
  vertical-align: middle;
  margin: 0 0.75rem;
}
</style>