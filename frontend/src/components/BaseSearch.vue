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
    default: () => import.meta.env.VITE_API_URL || ''
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
    // Auth via cookie httpOnly (withCredentials global) — sem token em JS.
    const data = await fetchWithCache(
      CacheKeys.autocomplete,
      () => axios
        .get(`${props.apiBaseUrl}/api/admin/autocomplete`)
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

// Campos como tag/category podem vir como array (JSONB) — normaliza para texto
// antes de filtrar, evitando TypeError que quebraria a busca ao vivo.
const norm = (v) => {
  if (v == null) return '';
  return (Array.isArray(v) ? v.join(' ') : String(v)).toLowerCase();
};

const filteredResults = computed(() => {
  if (!query.value.trim()) return [];
  const q = query.value.toLowerCase();
  return allAnalyses.value.filter(a =>
    norm(a.title).includes(q)  ||
    norm(a.tag).includes(q)    ||
    norm(a.author).includes(q) ||
    norm(a.category).includes(q)
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
  // Abre a análise diretamente, em vez de "pesquisar pelo id".
  if (item?.id) router.push({ name: 'AnalysisDetail', params: { id: item.id } });
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
