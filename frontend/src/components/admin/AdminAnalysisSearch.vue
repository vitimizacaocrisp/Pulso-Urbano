<template>
  <div class="search-panel">
    <div class="search-header">
      <div class="search-icon-wrap"><Icon icon="mdi:magnify" width="20" /></div>
      <div class="search-field-wrap">
        <input
          ref="inputRef"
          type="text"
          v-model="query"
          class="search-field"
          placeholder="Buscar por título, ID, autor, tag, categoria..."
          @input="onInput"
          @keydown.down.prevent="moveCursor(1)"
          @keydown.up.prevent="moveCursor(-1)"
          @keydown.enter.prevent="selectCurrent"
          @keydown.esc="close"
          @focus="onFocus"
          autocomplete="off"
        />
        <button v-if="query" class="clear-btn" @click="clear" type="button">
          <Icon icon="mdi:close" width="16" />
        </button>
      </div>
      <div v-if="isLoading" class="loader-dot"></div>
    </div>

    <!-- Dropdown results -->
    <transition name="drop-fade">
      <div v-if="isOpen && (results.length > 0 || (query && !isLoading))" class="dropdown" ref="dropdownRef">
        <ul v-if="results.length > 0" class="result-list">
          <li
            v-for="(item, i) in results"
            :key="item.id"
            class="result-item"
            :class="{ focused: cursor === i }"
            @mousedown.prevent="selectItem(item)"
            @mouseenter="cursor = i"
          >
            <div class="result-thumb">
              <Icon icon="mdi:file-document-outline" width="18" />
            </div>
            <div class="result-body">
              <span class="result-title" v-html="highlight(item.title)"></span>
              <div class="result-meta">
                <span class="result-cat" v-if="item.category">{{ item.category }}</span>
                <span class="result-sep" v-if="item.category && item.author">·</span>
                <span class="result-author" v-if="item.author">{{ item.author }}</span>
                <span class="result-id">ID: {{ item.id }}</span>
              </div>
            </div>
            <Icon icon="mdi:chevron-right" width="16" class="result-arrow" />
          </li>
        </ul>
        <div v-else-if="query && !isLoading" class="no-results">
          <Icon icon="mdi:file-search-outline" width="28" />
          <span>Nenhuma análise encontrada para "{{ query }}"</span>
        </div>
      </div>
    </transition>

    <!-- Selected analysis card -->
    <transition name="card-appear">
      <div v-if="selectedAnalysis" class="selected-card">
        <div class="selected-card-inner">
          <div class="sc-left">
            <div class="sc-img" v-if="selectedAnalysis.cover_image_path">
              <img :src="selectedAnalysis.cover_image_path" alt="" />
            </div>
            <div class="sc-img sc-img-placeholder" v-else>
              <Icon icon="mdi:image-off-outline" width="24" />
            </div>
          </div>
          <div class="sc-body">
            <div class="sc-top">
              <span class="sc-badge">Selecionada</span>
              <span class="sc-id">ID: {{ selectedAnalysis.id }}</span>
            </div>
            <h4 class="sc-title">{{ selectedAnalysis.title }}</h4>
            <div class="sc-meta">
              <span v-if="selectedAnalysis.category" class="sc-cat">{{ selectedAnalysis.category }}</span>
              <span v-if="selectedAnalysis.author" class="sc-author">{{ selectedAnalysis.author }}</span>
              <span v-if="selectedAnalysis.source" class="sc-source">{{ selectedAnalysis.source }}</span>
            </div>
          </div>
          <button class="sc-change" @click="changeSelection" type="button" title="Trocar análise">
            <Icon icon="mdi:swap-horizontal" width="18" />
            Trocar
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Icon } from '@iconify/vue';
import axios from 'axios';
import { fetchWithCache, CacheKeys, TTL } from '@/utils/apiCache.js';

const props = defineProps({
  modelValue: { type: Object, default: null }
});
const emit = defineEmits(['update:modelValue', 'select']);

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

const query           = ref('');
const allAnalyses     = ref([]);
const isLoading       = ref(false);
const isOpen          = ref(false);
const cursor          = ref(-1);
const inputRef        = ref(null);
const selectedAnalysis = ref(props.modelValue || null);

// Load all analyses for autocomplete (uses shared cache /autocomplete endpoint)
const loadAll = async () => {
  if (allAnalyses.value.length > 0) return;
  isLoading.value = true;
  try {
    const token   = localStorage.getItem('authToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const data = await fetchWithCache(
      CacheKeys.autocomplete,
      () => axios.get(`${API_BASE_URL}/api/admin/autocomplete`, { headers })
              .then(r => r.data?.data?.analyses || []),
      TTL.META
    );
    allAnalyses.value = data;
  } catch (e) {
    console.error('Erro ao carregar autocomplete:', e);
  } finally {
    isLoading.value = false;
  }
};

// Scoring: exact ID match first, then title, then rest
const results = computed(() => {
  const q = query.value.toLowerCase().trim();
  if (!q) return [];

  return allAnalyses.value
    .map(a => {
      let score = 0;
      const id   = String(a.id).toLowerCase();
      const title = (a.title || '').toLowerCase();
      const author = (a.author || '').toLowerCase();
      const tag   = (a.tag || '').toLowerCase();
      const cat   = (a.category || '').toLowerCase();

      if (id === q)        score += 100;
      if (title === q)     score += 80;
      if (title.startsWith(q)) score += 50;
      if (title.includes(q))   score += 20;
      if (cat.includes(q))     score += 10;
      if (tag.includes(q))     score += 8;
      if (author.includes(q))  score += 6;

      return { ...a, _score: score };
    })
    .filter(a => a._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 8);
});

const highlight = (text) => {
  if (!query.value.trim() || !text) return text;
  const q = query.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${q})`, 'gi'), '<mark>$1</mark>');
};

let debounce = null;
const onInput = () => {
  isOpen.value = true;
  cursor.value = -1;
  clearTimeout(debounce);
  debounce = setTimeout(loadAll, 200);
};

const onFocus = () => {
  loadAll();
  if (query.value) isOpen.value = true;
};

const close = () => { isOpen.value = false; cursor.value = -1; };

const clear = () => {
  query.value = '';
  isOpen.value = false;
  inputRef.value?.focus();
};

const changeSelection = () => {
  selectedAnalysis.value = null;
  query.value = '';
  emit('update:modelValue', null);
  emit('select', null);
  setTimeout(() => inputRef.value?.focus(), 100);
};

const moveCursor = (dir) => {
  if (!isOpen.value || results.value.length === 0) return;
  cursor.value = Math.max(-1, Math.min(results.value.length - 1, cursor.value + dir));
};

const selectCurrent = () => {
  if (cursor.value >= 0 && results.value[cursor.value]) {
    selectItem(results.value[cursor.value]);
  }
};

const selectItem = (item) => {
  query.value = '';
  isOpen.value = false;
  cursor.value = -1;
  selectedAnalysis.value = item;
  emit('update:modelValue', item);
  emit('select', item);
};

// Sync with v-model
watch(() => props.modelValue, (v) => { selectedAnalysis.value = v; });
</script>

<style scoped>
.search-panel { display: flex; flex-direction: column; gap: 12px; }

/* Search bar */
.search-header {
  display: flex; align-items: center;
  border: 2px solid var(--border-color); border-radius: 12px;
  background: var(--bg-input-form, var(--bg-body));
  transition: border-color 0.2s, box-shadow 0.2s;
  overflow: visible; position: relative;
}
.search-header:focus-within {
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 4px rgba(99,102,241,0.12);
}
.search-icon-wrap {
  padding: 0 12px; color: var(--text-muted); flex-shrink: 0;
  display: flex; align-items: center;
}
.search-field-wrap { flex: 1; position: relative; display: flex; align-items: center; }
.search-field {
  width: 100%; padding: 13px 36px 13px 0;
  border: none; background: transparent; outline: none;
  font-size: 0.95rem; color: var(--text-main);
}
.search-field::placeholder { color: var(--text-muted); }
.clear-btn {
  position: absolute; right: 8px;
  background: var(--bg-hover); border: none; border-radius: 50%;
  width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); cursor: pointer; transition: background 0.15s;
}
.clear-btn:hover { background: var(--border-color); color: var(--text-main); }
.loader-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--brand-primary); margin-right: 14px;
  animation: pulse 1s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }

/* Dropdown */
.dropdown {
  background: var(--bg-card, #fff); border: 1px solid var(--border-color);
  border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.12);
  overflow: hidden; max-height: 360px; overflow-y: auto;
}
.result-list { list-style: none; padding: 6px; margin: 0; display: flex; flex-direction: column; gap: 2px; }
.result-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 8px; cursor: pointer;
  transition: background 0.12s;
}
.result-item:hover, .result-item.focused { background: var(--bg-hover); }
.result-thumb {
  width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0;
  background: rgba(99,102,241,0.1); color: var(--brand-primary);
  display: flex; align-items: center; justify-content: center;
}
.result-body { flex: 1; min-width: 0; }
.result-title { font-size: 0.9rem; font-weight: 600; color: var(--text-main); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.result-title :deep(mark) { background: rgba(99,102,241,0.2); color: var(--brand-primary); border-radius: 2px; }
.result-meta { display: flex; align-items: center; gap: 6px; margin-top: 2px; flex-wrap: wrap; }
.result-cat   { font-size: 0.72rem; background: rgba(99,102,241,0.1); color: var(--brand-primary); padding: 1px 7px; border-radius: 4px; font-weight: 600; }
.result-sep   { color: var(--text-muted); font-size: 0.72rem; }
.result-author { font-size: 0.72rem; color: var(--text-secondary); }
.result-id    { font-size: 0.7rem; color: var(--text-muted); font-family: monospace; margin-left: auto; }
.result-arrow { color: var(--text-muted); flex-shrink: 0; }

.no-results {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 2.5rem; color: var(--text-muted); font-size: 0.875rem; text-align: center;
}

/* Selected card */
.selected-card {
  border: 1px solid var(--border-color); border-radius: 12px;
  background: var(--bg-card, #fff); overflow: hidden;
}
.selected-card-inner { display: flex; align-items: stretch; gap: 0; }
.sc-left { flex-shrink: 0; }
.sc-img { width: 90px; height: 90px; overflow: hidden; }
.sc-img img { width: 100%; height: 100%; object-fit: cover; }
.sc-img-placeholder {
  width: 90px; height: 90px; background: var(--bg-hover);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted);
}
.sc-body { flex: 1; padding: 12px 14px; min-width: 0; }
.sc-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.sc-badge {
  font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
  background: rgba(16,185,129,0.12); color: #10b981; padding: 2px 8px; border-radius: 4px;
}
.sc-id { font-size: 0.7rem; color: var(--text-muted); font-family: monospace; }
.sc-title { font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.sc-cat  { font-size: 0.72rem; background: rgba(99,102,241,0.1); color: var(--brand-primary); padding: 1px 7px; border-radius: 4px; font-weight: 600; }
.sc-author, .sc-source { font-size: 0.72rem; color: var(--text-secondary); }
.sc-change {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  padding: 0 14px; border: none; border-left: 1px solid var(--border-color);
  background: var(--bg-hover); color: var(--text-secondary);
  cursor: pointer; font-size: 0.72rem; font-weight: 600;
  transition: background 0.15s, color 0.15s;
}
.sc-change:hover { background: rgba(99,102,241,0.08); color: var(--brand-primary); }

/* Transitions */
.drop-fade-enter-active, .drop-fade-leave-active { transition: opacity 0.15s, transform 0.15s; }
.drop-fade-enter-from, .drop-fade-leave-to { opacity: 0; transform: translateY(-6px); }
.card-appear-enter-active, .card-appear-leave-active { transition: opacity 0.2s, transform 0.2s; }
.card-appear-enter-from, .card-appear-leave-to { opacity: 0; transform: translateY(8px); }
</style>
