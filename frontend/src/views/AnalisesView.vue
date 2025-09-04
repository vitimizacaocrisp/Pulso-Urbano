<template>
  <main class="page-content">
    <header class="page-header">
      <h2>Análises & Cenários</h2>
      <p>Artigos que interpretam dados e exploram as tendências da segurança pública no Brasil.</p>
    </header>

    <section class="search-container">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="Pesquisar por título, tag ou autor..."
      />
      <select v-model.number="limit" @change="handleSearch">
        <option value="10">Mostrar 10</option>
        <option value="20">Mostrar 20</option>
        <option value="50">Mostrar 50</option>
      </select>
    </section>

    <section class="analysis-list">
      <div v-if="isLoading" class="feedback-container">
        <p>A carregar análises...</p>
      </div>
      <div v-else-if="error" class="feedback-container error">
        <p>{{ error }}</p>
      </div>

      <article v-for="analysis in analyses" :key="analysis.id" class="card card-analysis">
        <div class="card-content">
          <span class="analysis-tag">{{ analysis.tag }}</span>
          <h4>{{ analysis.title }}</h4>
          <p class="author-info">Por {{ analysis.author }} em {{ analysis.created_date }}</p>
          <p>{{ analysis.description }}</p>
          <router-link :to="{ name: 'AnalysisDetail', params: { id: analysis.id } }" class="card-link">
            Ler Análise Completa
          </router-link>
        </div>
      </article>

      <div v-if="!isLoading && analyses.length === 0" class="feedback-container">
        <p>Nenhuma análise encontrada.</p>
      </div>
    </section>

    <section v-if="hasMore" class="load-more-container">
      <button @click="loadMore" :disabled="isLoadingMore" class="btn-load-more">
        <span v-if="isLoadingMore">A carregar...</span>
        <span v-else>Carregar Mais</span>
      </button>
    </section>
  </main>
</template>

<script setup>
// 'useRouter' foi removido porque não estava a ser usado
import { ref, watch, onMounted, computed } from 'vue';
import axios from 'axios';

// [CORRIGIDO] A variável 'router' foi removida
// const router = useRouter(); 

const analyses = ref([]);
const searchQuery = ref('');
const currentPage = ref(1);
const limit = ref(20);
const totalAnalyses = ref(0);
const isLoading = ref(true);
const isLoadingMore = ref(false);
const error = ref(null);

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

const hasMore = computed(() => {
  return analyses.value.length < totalAnalyses.value;
});

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
    error.value = err.response?.data?.message || err.message;
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
// [CORRIGIDO] O parâmetro não utilizado 'newQuery' foi removido
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
/* Os seus estilos não precisam de ser alterados */
.page-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
}
.page-header {
    text-align: left;
    margin-bottom: 3rem;
}
.page-header h2 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    color: #2c3e50;
}
.page-header p {
    font-size: 1.1rem;
    color: #555;
    max-width: 600px;
    margin: 0;
}
.analysis-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 2rem;
}
.card-analysis {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #fff;
    box-shadow: 0 4px 8px rgba(0,0,0,0.05);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    display: flex;
    flex-direction: column;
}
.card-analysis:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}
.card-content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}
.analysis-tag {
    display: inline-block;
    background-color: #e7eefc;
    color: #0056b3;
    padding: 0.25rem 0.75rem;
    border-radius: 15px;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 1rem;
    align-self: flex-start;
}
.card-content h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    color: #2c3e50;
}
.card-content p {
    margin: 0 0 1.5rem 0;
    color: #555;
    flex-grow: 1;
    line-height: 1.6;
}
.card-link {
    text-decoration: none;
    font-weight: 600;
    color: #007bff;
    align-self: flex-start;
}
.card-link:hover {
    text-decoration: underline;
}
.search-container {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}
.search-container input {
  flex-grow: 1;
  padding: 0.75rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}
.search-container select {
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: white;
}
.feedback-container {
  width: 100%;
  text-align: center;
  padding: 3rem;
  color: #6c757d;
  grid-column: 1 / -1;
}
.feedback-container.error {
  color: #dc3545;
}
.load-more-container {
  text-align: center;
  margin-top: 2rem;
}
.btn-load-more {
  padding: 0.8rem 2rem;
  font-size: 1rem;
  font-weight: 500;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.btn-load-more:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}
.author-info {
    font-size: 0.85em;
    color: #6c757d;
    margin-bottom: 1rem;
}
</style>