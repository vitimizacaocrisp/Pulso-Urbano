<template>
  <header class="header">
    <div class="header-bar">
      <h1 class="logo"><router-link to="/">Pulso Urbano</router-link></h1>

      <div class="search-wrapper">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Pesquisar por análises..."
          @focus="loadAllAnalyses"
          @blur="hideDropdown"
          class="search-input"
          @keyup.enter="onSearch"
          @input="isDropdownVisible = true"
        >
        <button @click="onSearch" class="search-button" aria-label="Pesquisar">
          <i class="fas fa-search"></i>
        </button>
        <div v-if="isLoading" class="search-loader"></div>
        
        <div v-if="isDropdownVisible && filteredAnalyses.length > 0" class="search-dropdown">
          <ul>
            <li v-for="analysis in filteredAnalyses" :key="analysis.id" @mousedown.prevent="selectAnalysis(analysis)">
              <strong>{{ analysis.title }}</strong>
              <small v-if="analysis.author || analysis.tag">{{ analysis.author }} - {{ analysis.tag }}</small>
            </li>
          </ul>
        </div>
        <div v-if="isDropdownVisible && filteredAnalyses.length === 0 && searchQuery && !isLoading" class="search-dropdown no-results">
          Nenhum resultado encontrado.
        </div>
      </div>

      <button class="menu-btn" @click="toggleMenu" aria-label="Abrir menu">
        <i class="fas fa-bars"></i>
      </button>
    </div>

    <nav class="desktop-submenu">
      <ul>
          <li @mouseenter="openSubmenu" @mouseleave="closeSubmenu">
            <span class="submenu-title">
              Publicações
              <i class="fas fa-chevron-down icon-small"></i>
            </span>
            <ul v-if="submenuOpen" class="submenu">
              <li v-for="category in categories" :key="category.path">
                <router-link :to="category.path">{{ category.name }}</router-link>
              </li>
            </ul>
          </li>
          <li><router-link to="/contato">Contato</router-link></li>
          <li><router-link to="/sobre">Sobre</router-link></li>
        </ul>
    </nav>

    <transition name="slide">
      <nav v-if="menuOpen" class="drawer">
        <div class="drawer-header">
          <h2>Menu</h2>
          <button @click="toggleMenu" class="close-btn" aria-label="Fechar menu">
              <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="search-wrapper">
            <input 
                type="text" 
                v-model="searchQuery" 
                placeholder="Pesquisar por análises..."
                @focus="loadAllAnalyses"
                @blur="hideDropdown"
                class="search-input"
                @keyup.enter="onSearch"
                @input="isDropdownVisible = true"
            >
            <button @click="onSearch" class="search-button" aria-label="Pesquisar">
                <i class="fas fa-search"></i>
            </button>
            <div v-if="isLoading" class="search-loader"></div>
            
            <div v-if="isDropdownVisible && filteredAnalyses.length > 0" class="search-dropdown">
                <ul>
                    <li v-for="analysis in filteredAnalyses" :key="analysis.id" @mousedown.prevent="selectAnalysis(analysis)">
                        <strong>{{ analysis.title }}</strong>
                        <small v-if="analysis.author || analysis.tag">{{ analysis.author }} - {{ analysis.tag }}</small>
                    </li>
                </ul>
            </div>
            <div v-if="isDropdownVisible && filteredAnalyses.length === 0 && searchQuery && !isLoading" class="search-dropdown no-results">
                Nenhum resultado encontrado.
            </div>
        </div>

        <ul class="menu-list">
            <li>
            <span @click="toggleSubmenu" class="submenu-title">
              Publicações
              <i class="fas fa-chevron-down icon-small"></i>
            </span>
            <ul v-if="submenuOpen" class="submenu-mobile">
              <li v-for="category in categories" :key="category.path">
                <router-link :to="category.path">{{ category.name }}</router-link>
              </li>
            </ul>
          </li>
          <li><router-link to="/contato">Contato</router-link></li>
          <li><router-link to="/sobre">Sobre</router-link></li>
        </ul>
      </nav>
    </transition>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

// --- Estado da UI ---
const menuOpen = ref(false);
const submenuOpen = ref(false);

// --- Lista de Categorias ---
const categories = ref([
    { name: 'Todas', path: '/categoria' },
    { name: 'Educação', path: '/categoria/educacao' },
    { name: 'Saúde', path: '/categoria/saude' },
    { name: 'Política', path: '/categoria/politica' },
    { name: 'Criminalidade', path: '/categoria/criminalidade' },
    { name: 'Tecnologia', path: '/categoria/tecnologia' }
]);

// --- Estado da Busca ---
const searchQuery = ref('');
const isDropdownVisible = ref(false);
const isLoading = ref(false);
const allAnalyses = ref([]);
let hasLoadedOnce = false;

// --- Configuração da API ---
const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

const router = useRouter();

const filteredAnalyses = computed(() => {
  if (!searchQuery.value) {
    return [];
  }
  const lowerCaseQuery = searchQuery.value.toLowerCase();
  return allAnalyses.value.filter(analysis =>
    (analysis.title && analysis.title.toLowerCase().includes(lowerCaseQuery)) ||
    (analysis.tag && analysis.tag.toLowerCase().includes(lowerCaseQuery)) ||
    (analysis.author && analysis.author.toLowerCase().includes(lowerCaseQuery))
  );
});

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
};

// Funções para controle do submenu
const toggleSubmenu = () => { // Usado no mobile (clique)
  submenuOpen.value = !submenuOpen.value;
};
const openSubmenu = () => { // Usado no desktop (hover)
  submenuOpen.value = true;
};
const closeSubmenu = () => { // Usado no desktop (hover)
  submenuOpen.value = false;
};


const loadAllAnalyses = async () => {
  isDropdownVisible.value = true;
  if (hasLoadedOnce) {
    return;
  }
  
  isLoading.value = true;
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_BASE_URL}/api/admin/analyses-list`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const analysesArray = response.data?.data?.analyses;

    if (Array.isArray(analysesArray)) {
        allAnalyses.value = analysesArray;
    } else {
        allAnalyses.value = [];
    }
    
    hasLoadedOnce = true;
  } catch (err) {
    console.error("Erro ao carregar a lista de análises:", err);
    allAnalyses.value = [];
  } finally {
    isLoading.value = false;
  }
};

const hideDropdown = () => {
  setTimeout(() => { isDropdownVisible.value = false; }, 200);
};

const selectAnalysis = (analysis) => {
  searchQuery.value = ''; // Limpa a busca após selecionar
  isDropdownVisible.value = false;
  router.push({ name: 'AnalysisDetail', params: { id: analysis.id } });
  if (menuOpen.value) toggleMenu(); // Fecha o menu mobile após a seleção
};

const onSearch = () => {
  if (searchQuery.value.trim() !== "") {
    isDropdownVisible.value = false;
    if (filteredAnalyses.value.length > 0) {
        selectAnalysis(filteredAnalyses.value[0]);
    }
  }
};
</script>

<style scoped>
/* --- 1. CONFIGURAÇÃO GERAL E VARIÁVEIS --- */
.header {
  --color-bg-dark: #0f172a;
  --color-bg-medium: #1e293b;
  --color-text-primary: #cbd5e1;
  --color-text-headings: #f8fafc;
  --color-accent-primary: #6366f1;
  --color-border: #334155;
  --color-white: #fff;

  width: 100%;
  background: var(--color-bg-dark);
  color: var(--color-text-primary);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 6px rgba(0,0,0,0.2);
}

a {
  color: var(--color-text-primary);
  text-decoration: none;
  transition: color 0.2s ease-in-out;
}
a:hover, a.router-link-exact-active {
  color: var(--color-accent-primary);
}
ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* --- 2. BARRA PRINCIPAL (LOGO E PESQUISA) --- */
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0;
}
.logo a {
  color: var(--color-text-headings);
}

/* --- 3. BARRA DE PESQUISA --- */
.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 400px;
}

.search-input {
  flex-grow: 1;
  height: 40px;
  padding: 0 40px 0 15px;
  background-color: var(--color-bg-medium);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.search-input:focus {
  border-color: var(--color-accent-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
}
.search-input::placeholder {
  color: #94a3b8;
}

.search-button {
  position: absolute;
  right: 1px;
  top: 1px;
  bottom: 1px;
  width: 40px;
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  cursor: pointer;
  border-radius: 0 6px 6px 0;
}

.search-loader {
  position: absolute;
  right: 45px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  width: 100%;
  background: var(--color-bg-medium);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 110;
  padding: 0.5rem 0;
  box-shadow: 0 8px 16px rgba(0,0,0,0.3);
}
.search-dropdown li {
  padding: 0.75rem 1rem;
  cursor: pointer;
  line-height: 1.4;
}
.search-dropdown li:hover {
  background-color: var(--color-accent-primary);
}
.search-dropdown li strong {
  color: var(--color-text-headings);
  display: block;
}
.search-dropdown li small {
  color: #94a3b8;
  font-size: 0.8rem;
}
.search-dropdown li:hover strong,
.search-dropdown li:hover small {
  color: var(--color-white);
}
.search-dropdown.no-results {
  padding: 1rem;
  color: #94a3b8;
}

/* --- 4. MENUS (DESKTOP E MOBILE) --- */
.desktop-submenu {
  background: var(--color-bg-medium);
  border-top: 1px solid var(--color-border);
}
.desktop-submenu > ul {
  display: flex;
  justify-content: center;
  gap: 2rem;
  padding: 0.75rem;
  max-width: 1200px;
  margin: 0 auto;
}
.desktop-submenu li {
  position: relative;
}
.submenu-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  color: var(--color-text-primary);
  padding: 0.25rem 0;
}
.submenu-title:hover {
  color: var(--color-accent-primary);
}
.icon-small {
  font-size: 0.7em;
  transition: transform 0.2s;
}
.submenu-title:hover .icon-small {
  transform: translateY(2px);
}
.submenu {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--color-bg-medium);
  border: 1px solid var(--color-border);
  border-radius: 0 0 6px 6px;
  padding: 0.5rem;
  min-width: 200px;
  z-index: 120;
  box-shadow: 0 8px 16px rgba(0,0,0,0.3);
}
.submenu li a {
  display: block;
  padding: 0.5rem 1rem;
  border-radius: 4px;
}
.submenu li a:hover {
  background-color: var(--color-accent-primary);
  color: var(--color-white);
}

.menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  display: none;
  color: var(--color-text-headings);
  font-size: 1.5rem;
}

.drawer {
  position: fixed;
  top: 0;
  left: 0;
  width: 280px;
  height: 100%;
  background: var(--color-bg-dark);
  box-shadow: 2px 0 15px rgba(0,0,0,0.5);
  padding: 1.5rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-headings);
}
.drawer-header h2 {
  margin: 0;
}
.drawer .search-wrapper {
  margin-bottom: 1.5rem;
  max-width: 100%;
}
.close-btn {
  font-size: 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-headings);
}
.menu-list {
  padding: 0;
}
.menu-list > li {
  margin-bottom: 0.5rem;
}
.menu-list a, .menu-list .submenu-title {
  display: block;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
}
.menu-list a:hover, .menu-list .submenu-title:hover {
  background-color: var(--color-bg-medium);
}
.submenu-mobile {
  padding-left: 1.5rem;
  margin-top: 0.5rem;
}
.submenu-mobile li a {
  padding: 0.5rem;
  font-size: 0.9rem;
  opacity: 0.8;
}

/* --- 5. ANIMAÇÕES E RESPONSIVIDADE --- */
@keyframes spin {
  to { transform: translateY(-50%) rotate(360deg); }
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}

@media (max-width: 768px) {
  .desktop-submenu {
    display: none;
  }
  .header-bar > .search-wrapper { /* Esconde apenas a barra de pesquisa do topo */
    display: none;
  }
  .menu-btn {
    display: block;
  }
}
</style>