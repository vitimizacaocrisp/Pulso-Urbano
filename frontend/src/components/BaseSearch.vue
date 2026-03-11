<template>
  <div class="base-search-wrapper" @focusout="handleFocusOut">
    <slot
      :query="query"
      :results="filteredResults"
      :is-loading="isLoading"
      :is-open="isOpen"
      :update-query="updateQuery"
      :handle-focus="handleFocus"
      :handle-enter="handleEnter"
      :select-item="selectItem"
    ></slot>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const props = defineProps({
  apiBaseUrl: {
    type: String,
    default: () => process.env.VUE_APP_API_URL || 'http://localhost:3000'
  },
  navigateToDetail: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['select']);
const router = useRouter();

const query = ref('');
const allAnalyses = ref([]);
const isLoading = ref(false);
const isOpen = ref(false);
let hasLoadedOnce = false;

// Puxa TODOS os dados da API apenas uma vez
const fetchAllData = async () => {
  if (hasLoadedOnce) return;
  
  isLoading.value = true;
  try {
    const token = localStorage.getItem('authToken');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    // Passa limit=all para a nova rota
    const response = await axios.get(`${props.apiBaseUrl}/api/admin/analyses-list`, {
      params: { limit: 'all' },
      headers
    });
    
    allAnalyses.value = response.data?.data?.analyses || [];
    hasLoadedOnce = true;
  } catch (err) {
    console.error('Erro ao carregar base de pesquisa:', err);
  } finally {
    isLoading.value = false;
  }
};

// Filtra instantaneamente no cliente a cada caractere
const filteredResults = computed(() => {
  if (!query.value.trim()) return [];
  
  const q = query.value.toLowerCase();
  return allAnalyses.value.filter(a => 
    (a.title?.toLowerCase().includes(q)) || 
    (a.tag?.toLowerCase().includes(q)) || 
    (a.author?.toLowerCase().includes(q)) ||
    (a.category?.toLowerCase().includes(q))
  ).slice(0, 8); // Mantém o visual limpo mostrando os 8 melhores resultados
});

const updateQuery = (val) => {
  query.value = val;
  isOpen.value = true;
  if (!hasLoadedOnce) fetchAllData();
};

const handleFocus = () => {
  if (!hasLoadedOnce) fetchAllData();
  if (query.value.trim()) isOpen.value = true;
};

const handleFocusOut = (event) => {
  // Fecha se clicar fora do componente de pesquisa
  if (!event.currentTarget.contains(event.relatedTarget)) {
    isOpen.value = false;
  }
};

const selectItem = (item) => {
  query.value = '';
  isOpen.value = false;
  emit('select', item);
  
  if (item && item.id && props.navigateToDetail) {
    router.push({ name: 'AnalysisDetail', params: { id: item.id } });
  }
};

const handleEnter = () => {
  if (filteredResults.value.length > 0) {
    selectItem(filteredResults.value[0]);
  }
};
</script>

<style scoped>
.base-search-wrapper {
  position: relative;
  width: 100%;
}
</style>