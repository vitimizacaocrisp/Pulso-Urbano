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
import { fetchWithCache, CacheKeys, TTL } from '@/utils/apiCache.js';

const props = defineProps({
  apiBaseUrl: {
    type: String,
    default: () => process.env.VUE_APP_API_URL || 'http://localhost:3000'
  }
});

const emit = defineEmits(['select']);
const router = useRouter();

const query       = ref('');
const allAnalyses = ref([]);
const isLoading   = ref(false);
const isOpen      = ref(false);

// Usa a rota leve /autocomplete (id, title, author, tag, category)
// O cache compartilhado garante que múltiplos componentes não disparam chamadas duplicadas.
const fetchAllData = async () => {
  if (allAnalyses.value.length > 0) return;
  isLoading.value = true;
  try {
    const token   = localStorage.getItem('authToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const data = await fetchWithCache(
      CacheKeys.autocomplete,
      () => axios
        .get(`${props.apiBaseUrl}/api/admin/autocomplete`, { headers })
        .then(r => r.data?.data?.analyses || []),
      TTL.META // 10 min
    );

    allAnalyses.value = data;
  } catch (err) {
    console.error('Erro ao carregar autocomplete:', err);
  } finally {
    isLoading.value = false;
  }
};

const filteredResults = computed(() => {
  if (!query.value.trim()) return [];
  const q = query.value.toLowerCase();
  return allAnalyses.value.filter(a =>
    a.title?.toLowerCase().includes(q)    ||
    a.tag?.toLowerCase().includes(q)      ||
    a.author?.toLowerCase().includes(q)   ||
    a.category?.toLowerCase().includes(q)
  ).slice(0, 8);
});

const updateQuery = (val) => {
  query.value  = val;
  isOpen.value = true;
  fetchAllData();
};

const handleFocus = () => {
  fetchAllData();
  if (query.value.trim()) isOpen.value = true;
};

const handleFocusOut = (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) isOpen.value = false;
};

const selectItem = (item) => {
  query.value  = '';
  isOpen.value = false;
  emit('select', item);
  if (item?.id) router.push({ name: 'Pesquisa', query: { id: item.id } });
};

const handleEnter = () => {
  const q = query.value.trim();
  if (!q) return;
  isOpen.value = false;
  emit('select', null);
  router.push({ name: 'Pesquisa', query: { q } });
  query.value = '';
};
</script>

<style scoped>
.base-search-wrapper { position: relative; width: 100%; }
</style>
