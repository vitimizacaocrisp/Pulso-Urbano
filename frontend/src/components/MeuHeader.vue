<template>
  <header class="header" :class="{ 'scrolled': isScrolled }">
    <div class="header-inner">
      <div class="header-bar">
        <h1 class="logo">
            <router-link to="/">Pulso<span class="highlight">Urbano</span></router-link>
        </h1>

        <div class="search-wrapper desktop-only">
          <div class="search-input-group">
              <i class="fas fa-search search-icon"></i>
              <input 
                type="text" 
                v-model="searchQuery" 
                placeholder="Pesquisar análises..."
                @focus="loadAllAnalyses"
                @blur="hideDropdown"
                class="search-input"
                @keyup.enter="onSearch"
                @input="isDropdownVisible = true"
              >
              <div v-if="isLoading" class="search-spinner"></div>
          </div>
          
          <transition name="fade">
            <div v-if="isDropdownVisible && (filteredAnalyses.length > 0 || (searchQuery && !isLoading))" class="search-dropdown">
              <ul v-if="filteredAnalyses.length > 0">
                <li v-for="analysis in filteredAnalyses" :key="analysis.id" @mousedown.prevent="selectAnalysis(analysis)">
                  <div class="dropdown-item">
                      <strong>{{ analysis.title }}</strong>
                      <small>{{ analysis.author }} • {{ analysis.category || 'Geral' }}</small>
                  </div>
                </li>
              </ul>
              <div v-else class="no-results">
                Nenhum resultado encontrado.
              </div>
            </div>
          </transition>
        </div>

        <nav class="desktop-nav">
             <ul>
                <!-- Item Publicações com Dropdown Hover -->
                <li class="nav-item has-dropdown" @mouseenter="submenuOpen = true" @mouseleave="submenuOpen = false">
                    <router-link to="/categoria" class="nav-link">
                        Publicações <i class="fas fa-chevron-down icon-tiny"></i>
                    </router-link>
                    
                    <transition name="pop-up">
                        <div v-if="submenuOpen" class="category-popover">
                            <div class="popover-header">
                                <h3>Explorar Tópicos</h3>
                                <router-link to="/categoria" class="view-all">Ver tudo</router-link>
                            </div>
                            <ul class="category-list-popover">
                                <li v-for="cat in categoriesWithCounts" :key="cat.path">
                                    <router-link :to="cat.path" class="cat-link">
                                        <span class="cat-name">{{ cat.name }}</span>
                                        <span class="cat-badge">{{ cat.count }}</span>
                                    </router-link>
                                </li>
                            </ul>
                        </div>
                    </transition>
                </li>

                <li><router-link to="/sobre" class="nav-link">Sobre</router-link></li>
                <li><router-link to="/contato" class="nav-link">Contato</router-link></li>
                <li><router-link to="/admin" class="nav-link admin-link"><i class="fas fa-lock"></i></router-link></li>
             </ul>
        </nav>

        <button class="menu-btn" @click="toggleMenu" aria-label="Abrir menu">
          <i class="fas fa-bars"></i>
        </button>
      </div>
    </div>

    <!-- Mobile Drawer -->
    <transition name="slide">
      <nav v-if="menuOpen" class="drawer">
        <div class="drawer-header">
          <h2>Menu</h2>
          <button @click="toggleMenu" class="close-btn" aria-label="Fechar menu">
              <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="mobile-search">
            <input 
                type="text" 
                v-model="searchQuery" 
                placeholder="Pesquisar..."
                @keyup.enter="onSearch"
            >
            <button @click="onSearch"><i class="fas fa-search"></i></button>
        </div>

        <ul class="mobile-menu-list">
            <li><router-link to="/" @click="toggleMenu">Início</router-link></li>
            <li><router-link to="/categoria" @click="toggleMenu">Publicações</router-link></li>
            
            <li class="mobile-categories-label">Categorias</li>
            <li v-for="cat in categories.slice(0, 5)" :key="cat.path" class="mobile-sub-item">
                <router-link :to="cat.path" @click="toggleMenu">{{ cat.name }}</router-link>
            </li>

            <li class="divider"></li>
            <li><router-link to="/sobre" @click="toggleMenu">Sobre</router-link></li>
            <li><router-link to="/contato" @click="toggleMenu">Contato</router-link></li>
            <li><router-link to="/admin" @click="toggleMenu">Administração</router-link></li>
        </ul>
      </nav>
    </transition>
    
    <div v-if="menuOpen" class="drawer-overlay" @click="toggleMenu"></div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const menuOpen = ref(false);
const submenuOpen = ref(false); // Controle do dropdown desktop
const isScrolled = ref(false);
const searchQuery = ref('');
const isDropdownVisible = ref(false);
const isLoading = ref(false);
const allAnalyses = ref([]);
let hasLoadedOnce = false;

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';
const router = useRouter();

// Lista de categorias simples (para mobile/geral)
const categories = ref([
    { name: 'Educação', path: '/categoria/Educação' },
    { name: 'Saúde', path: '/categoria/Saúde' },
    { name: 'Segurança', path: '/categoria/Criminalidade' },
    { name: 'Tecnologia', path: '/categoria/Tecnologia' },
    { name: 'Economia', path: '/categoria/Economia' },
]);

// Lista detalhada com contadores para o Popover Desktop
const categoriesWithCounts = ref([
    { name: 'Economia', path: '/categoria/Economia', count: 38 },
    { name: 'Transportes', path: '/categoria/Transportes', count: 33 },
    { name: 'Agricultura', path: '/categoria/Agricultura', count: 25 },
    { name: 'Saúde', path: '/categoria/Saúde', count: 21 },
    { name: 'Política', path: '/categoria/Política', count: 20 },
    { name: 'Educação', path: '/categoria/Educação', count: 8 },
    { name: 'Segurança', path: '/categoria/Criminalidade', count: 15 },
]);

// Scroll Listener para efeito glass
const handleScroll = () => {
    isScrolled.value = window.scrollY > 20;
};

onMounted(() => {
    window.addEventListener('scroll', handleScroll);
});
onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
});

const filteredAnalyses = computed(() => {
  if (!searchQuery.value) return [];
  const q = searchQuery.value.toLowerCase();
  return allAnalyses.value.filter(a =>
    (a.title?.toLowerCase().includes(q)) ||
    (a.tag?.toLowerCase().includes(q)) ||
    (a.author?.toLowerCase().includes(q))
  ).slice(0, 8); // Limita resultados
});

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
  if(menuOpen.value) loadAllAnalyses(); // Pre-load para mobile se precisar
};

const loadAllAnalyses = async () => {
  isDropdownVisible.value = true;
  if (hasLoadedOnce) return;
  
  isLoading.value = true;
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_BASE_URL}/api/admin/analyses-list`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = response.data?.data?.analyses;
    allAnalyses.value = Array.isArray(data) ? data : [];
    hasLoadedOnce = true;
  } catch (err) {
    console.error("Erro na busca:", err);
  } finally {
    isLoading.value = false;
  }
};

const hideDropdown = () => setTimeout(() => { isDropdownVisible.value = false; }, 200);

const selectAnalysis = (analysis) => {
  searchQuery.value = '';
  isDropdownVisible.value = false;
  router.push({ name: 'AnalysisDetail', params: { id: analysis.id } });
  if (menuOpen.value) toggleMenu();
};

const onSearch = () => {
  if (searchQuery.value.trim() && filteredAnalyses.value.length > 0) {
      selectAnalysis(filteredAnalyses.value[0]);
  }
};
</script>

<style scoped>
/* Variáveis locais para o header */
.header {
    --header-bg: #0f172a;
    --header-text: #cbd5e1;
    --accent: #6366f1;
    --border: rgba(255,255,255,0.1);
    
    position: sticky;
    top: 0;
    z-index: 1000;
    width: 100%;
    transition: all 0.3s ease;
    background: var(--header-bg);
    border-bottom: 1px solid var(--border);
}

.header.scrolled {
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(12px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.header-inner {
    max-width: 1280px;
    margin: 0 auto;
}

.header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 70px;
    padding: 0 1.5rem;
}

/* Logo */
.logo a {
    font-size: 1.5rem;
    font-weight: 800;
    color: #fff;
    text-decoration: none;
    letter-spacing: -0.5px;
}
.highlight { color: var(--accent); }

/* Search Bar (Desktop) */
.search-wrapper {
    position: relative;
    max-width: 400px;
    width: 100%;
    margin: 0 2rem;
}
.search-input-group {
    position: relative;
}
.search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #64748b;
    pointer-events: none;
}
.search-input {
    width: 100%;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border);
    border-radius: 99px;
    padding: 0.6rem 1rem 0.6rem 2.5rem;
    color: #fff;
    font-size: 0.9rem;
    transition: all 0.2s;
}
.search-input:focus {
    outline: none;
    background: rgba(255,255,255,0.1);
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}
.search-spinner {
    position: absolute; right: 12px; top: 12px;
    width: 14px; height: 14px;
    border: 2px solid #64748b; border-top-color: var(--accent);
    border-radius: 50%; animation: spin 0.8s linear infinite;
}

/* Dropdown de Busca */
.search-dropdown {
    position: absolute;
    top: calc(100% + 10px);
    left: 0; right: 0;
    background: #1e293b;
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    max-height: 350px;
    overflow-y: auto;
    padding: 0.5rem 0;
}
.search-dropdown ul { list-style: none; padding: 0; margin: 0; }
.dropdown-item {
    padding: 0.75rem 1rem;
    cursor: pointer;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}
.dropdown-item:hover { background: var(--accent); }
.dropdown-item strong { display: block; color: #fff; font-size: 0.95rem; }
.dropdown-item small { color: #94a3b8; font-size: 0.75rem; }
.dropdown-item:hover small { color: rgba(255,255,255,0.8); }
.no-results { padding: 1rem; color: #94a3b8; text-align: center; font-size: 0.9rem; }

/* Navegação Desktop */
.desktop-nav ul {
    display: flex;
    gap: 2rem;
    list-style: none;
    margin: 0; padding: 0;
    align-items: center;
}
.nav-item {
    position: relative; /* Necessário para o popover */
    height: 70px; /* Mesma altura do header */
    display: flex;
    align-items: center;
}
.nav-link {
    color: var(--header-text);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.95rem;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    cursor: pointer;
}
.nav-link:hover, .nav-link.router-link-active { color: #fff; }
.admin-link { opacity: 0.5; transition: opacity 0.2s; }
.admin-link:hover { opacity: 1; }
.icon-tiny { font-size: 0.7rem; margin-top: 2px; }

/* --- POPOVER DE CATEGORIAS (A Janelinha) --- */
.category-popover {
    position: absolute;
    top: 60px; /* Um pouco abaixo do header */
    left: 50%;
    transform: translateX(-50%);
    background: #fff;
    width: 300px;
    border-radius: 12px;
    box-shadow: 0 15px 35px rgba(0,0,0,0.2), 0 5px 15px rgba(0,0,0,0.1);
    padding: 1.5rem;
    z-index: 1100;
    cursor: default;
}
/* Triângulo pontando para cima */
.category-popover::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 12px;
    height: 12px;
    background: #fff;
    box-shadow: -2px -2px 5px rgba(0,0,0,0.03);
}

.popover-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #f1f5f9;
}
.popover-header h3 {
    font-size: 1rem;
    color: #0f172a;
    font-weight: 800;
    margin: 0;
}
.view-all {
    font-size: 0.75rem;
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
}
.view-all:hover { text-decoration: underline; }

.category-list-popover {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.cat-link {
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-decoration: none;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    transition: background 0.2s;
}
.cat-link:hover {
    background-color: #f8fafc;
}
.cat-name {
    color: #334155;
    font-size: 0.95rem;
    font-weight: 500;
}
.cat-link:hover .cat-name { color: var(--accent); }

.cat-badge {
    background-color: #f1f5f9;
    color: #64748b;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.15rem 0.6rem;
    border-radius: 99px;
    min-width: 28px;
    text-align: center;
}
.cat-link:hover .cat-badge {
    background-color: var(--accent);
    color: white;
}

/* Transição Pop-up */
.pop-up-enter-active, .pop-up-leave-active {
    transition: opacity 0.2s, transform 0.2s;
}
.pop-up-enter-from, .pop-up-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
}

/* Mobile */
.menu-btn {
    background: none; border: none;
    color: #fff; font-size: 1.5rem;
    cursor: pointer; display: none;
}
.drawer {
    position: fixed; top: 0; left: 0; bottom: 0;
    width: 280px; background: #0f172a;
    z-index: 2000; padding: 1.5rem;
    box-shadow: 5px 0 25px rgba(0,0,0,0.5);
    display: flex; flex-direction: column;
}
.drawer-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(2px);
    z-index: 1500;
}
.drawer-header {
    display: flex; justify-content: space-between;
    align-items: center; margin-bottom: 2rem;
    color: #fff; border-bottom: 1px solid var(--border);
    padding-bottom: 1rem;
}
.close-btn { background: none; border: none; color: #fff; font-size: 1.5rem; cursor: pointer; }

.mobile-search {
    display: flex; gap: 0.5rem; margin-bottom: 2rem;
}
.mobile-search input {
    flex: 1; background: #1e293b; border: 1px solid var(--border);
    padding: 0.75rem; border-radius: 6px; color: #fff;
}
.mobile-search button {
    background: var(--accent); border: none; color: white;
    width: 44px; border-radius: 6px; cursor: pointer;
}

.mobile-menu-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; }
.mobile-menu-list li { margin-bottom: 0.5rem; }
.mobile-menu-list a {
    display: block; padding: 0.75rem;
    color: #cbd5e1; text-decoration: none;
    border-radius: 6px; font-weight: 500;
}
.mobile-menu-list a:hover, .mobile-menu-list a.router-link-active {
    background: #1e293b; color: #fff;
}
.mobile-categories-label {
    margin: 1.5rem 0 0.5rem 0.75rem;
    font-size: 0.75rem; text-transform: uppercase;
    color: #64748b; font-weight: 700;
}
.mobile-sub-item a {
    padding-left: 1.5rem; font-size: 0.9rem; opacity: 0.8;
}
.divider { height: 1px; background: var(--border); margin: 1rem 0; }

/* Transições */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: transform 0.3s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 992px) {
    .desktop-nav, .desktop-only { display: none; }
    .menu-btn { display: block; }
}
</style>