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
                <li class="nav-item has-dropdown" @mouseenter="submenuOpen = true" @mouseleave="submenuOpen = false">
                    <router-link to="/categoria" class="nav-link">
                        Biblioteca <i class="fas fa-chevron-down icon-tiny"></i>
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
                
                <!-- Botão de Tema (Desktop) -->
                <li class="nav-item-toggle">
                  <ThemeToggle />
                </li>
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
          <!-- Botão de Tema e Fechar (Mobile) -->
          <div class="drawer-actions">
            <ThemeToggle />
            <button @click="toggleMenu" class="close-btn" aria-label="Fechar menu">
                <i class="fas fa-times"></i>
            </button>
          </div>
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
            <li><router-link to="/categoria" @click="toggleMenu">Biblioteca</router-link></li>
            
            <li class="mobile-categories-label">Categorias</li>
            <li v-for="cat in categories.slice(0, 8)" :key="cat.path" class="mobile-sub-item">
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
import ThemeToggle from './ThemeToggle.vue'; // Importando o componente

const menuOpen = ref(false);
const submenuOpen = ref(false);
const isScrolled = ref(false);
const searchQuery = ref('');
const isDropdownVisible = ref(false);
const isLoading = ref(false);
const allAnalyses = ref([]);
let hasLoadedOnce = false;

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';
const router = useRouter();

const categories = ref([
    { name: 'Metodologia e Amostra', path: '/categoria/metodologia-e-amostra' },
    { name: 'Crimes Contra o Patrimônio', path: '/categoria/crimes-contra-patrimonio' },
    { name: 'Crimes Contra a Pessoa', path: '/categoria/crimes-contra-pessoa' },
    { name: 'Sensação de Segurança', path: '/categoria/sensacao-de-seguranca' },
    { name: 'Subnotificação (Cifras Ocultas)', path: '/categoria/subnotificacao' },
    { name: 'Perfil das Vítimas', path: '/categoria/perfil-das-vitimas' },
    { name: 'Violência Doméstica e Gênero', path: '/categoria/violencia-domestica-genero' },
]);

const categoriesWithCounts = computed(() => {
    if (allAnalyses.value.length === 0) return categories.value.map(cat => ({ ...cat, count: 0 }));
    return categories.value.map(cat => {
        const count = allAnalyses.value.filter(analysis => {
            const apiCategory = (analysis.category || analysis.tag || '').toLowerCase().trim();
            const localCategory = cat.name.toLowerCase().trim();
            return apiCategory === localCategory;
        }).length;
        return { ...cat, count: count };
    });
});

const handleScroll = () => { isScrolled.value = window.scrollY > 20; };

onMounted(() => {
    window.addEventListener('scroll', handleScroll);
    loadAllAnalyses();
});

onUnmounted(() => { window.removeEventListener('scroll', handleScroll); });

const filteredAnalyses = computed(() => {
  if (!searchQuery.value) return [];
  const q = searchQuery.value.toLowerCase();
  return allAnalyses.value.filter(a =>
    (a.title?.toLowerCase().includes(q)) || (a.tag?.toLowerCase().includes(q)) || (a.author?.toLowerCase().includes(q))
  ).slice(0, 8);
});

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
  if(menuOpen.value && !hasLoadedOnce) loadAllAnalyses();
};

const loadAllAnalyses = async () => {
  if (searchQuery.value) isDropdownVisible.value = true;
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
  } catch (err) { console.error("Erro na busca:", err); } finally { isLoading.value = false; }
};

const hideDropdown = () => setTimeout(() => { isDropdownVisible.value = false; }, 200);
const selectAnalysis = (analysis) => {
  searchQuery.value = '';
  isDropdownVisible.value = false;
  router.push({ name: 'AnalysisDetail', params: { id: analysis.id } });
  if (menuOpen.value) toggleMenu();
};
const onSearch = () => {
    isDropdownVisible.value = true;
    if (!hasLoadedOnce) loadAllAnalyses();
    if (searchQuery.value.trim() && filteredAnalyses.value.length > 0) selectAnalysis(filteredAnalyses.value[0]);
};
</script>

<style scoped>
.header {
    position: sticky;
    top: 0;
    z-index: 1000;
    width: 100%;
    transition: all 0.3s ease;
    
    background: var(--bg-header);
    border-bottom: 1px solid var(--border-header);
}

.header.scrolled {
    background: var(--bg-header-scrolled);
    backdrop-filter: blur(12px);
    box-shadow: var(--shadow-md);
}

.header-inner {
    max-width: var(--container-width);
    margin: 0 auto;
}

.header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: var(--header-height);
    padding: 0 1.5rem;
}

/* Logo */
.logo a {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--text-header-logo);
    text-decoration: none;
    letter-spacing: -0.5px;
}
.highlight { color: var(--brand-primary); }

/* Search Bar (Desktop) */
.search-wrapper {
    position: relative;
    max-width: 400px;
    width: 100%;
    margin: 0 2rem;
}
.search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    pointer-events: none;
}
.search-input {
    width: 100%;
    background: var(--bg-input-nav);
    border: 1px solid var(--border-input-nav);
    border-radius: var(--radius-full);
    padding: 0.6rem 1rem 0.6rem 2.5rem;
    color: var(--text-main);
    font-size: 0.9rem;
    transition: all 0.2s;
}
.search-input:focus {
    outline: none;
    background: rgba(255,255,255,0.1);
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}
.search-spinner {
    position: absolute; right: 12px; top: 12px;
    width: 14px; height: 14px;
    border: 2px solid var(--text-muted); border-top-color: var(--brand-primary);
    border-radius: 50%; animation: spin 0.8s linear infinite;
}

/* Dropdown de Busca */
.search-dropdown {
    position: absolute;
    top: calc(100% + 10px);
    left: 0; right: 0;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    max-height: 350px;
    overflow-y: auto;
    padding: 0.5rem 0;
    z-index: 1001;
}
.search-dropdown ul { list-style: none; padding: 0; margin: 0; }
.dropdown-item {
    padding: 0.75rem 1rem;
    cursor: pointer;
    border-bottom: 1px solid var(--border-color);
}
.dropdown-item:hover { background: var(--bg-hover); }
.dropdown-item strong { display: block; color: var(--text-main); font-size: 0.95rem; }
.dropdown-item small { color: var(--text-muted); font-size: 0.75rem; }

.no-results { padding: 1rem; color: var(--text-muted); text-align: center; font-size: 0.9rem; }

/* Navegação Desktop */
.desktop-nav ul {
    display: flex;
    gap: 2rem;
    list-style: none;
    margin: 0; padding: 0;
    align-items: center;
}
.nav-item {
    position: relative;
    height: var(--header-height);
    display: flex;
    align-items: center;
}
.nav-link {
    color: var(--text-header-nav);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.95rem;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    cursor: pointer;
}
.nav-link:hover, .nav-link.router-link-active { color: var(--text-header-hover); }
.admin-link { opacity: 0.5; transition: opacity 0.2s; }
.admin-link:hover { opacity: 1; }
.icon-tiny { font-size: 0.7rem; margin-top: 2px; }

/* Theme Toggle Container */
.nav-item-toggle {
    display: flex;
    align-items: center;
    margin-left: 0.5rem;
}

/* Popover de Categorias */
.category-popover {
    position: absolute;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-surface);
    width: 300px;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    padding: 1.5rem;
    z-index: 1100;
    cursor: default;
    border: 1px solid var(--border-color);
}
.category-popover::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 12px;
    height: 12px;
    background: var(--bg-surface);
    border-top: 1px solid var(--border-color);
    border-left: 1px solid var(--border-color);
}

.popover-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color);
}
.popover-header h3 {
    font-size: 1rem;
    color: var(--text-main);
    font-weight: 800;
    margin: 0;
}
.view-all {
    font-size: 0.75rem;
    color: var(--brand-primary);
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
    border-radius: var(--radius-md);
    transition: background 0.2s;
}
.cat-link:hover {
    background-color: var(--bg-hover);
}
.cat-name {
    color: var(--text-main);
    font-size: 0.95rem;
    font-weight: 500;
}
.cat-link:hover .cat-name { color: var(--brand-primary); }

.cat-badge {
    background-color: var(--bg-body);
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.15rem 0.6rem;
    border-radius: var(--radius-full);
    min-width: 28px;
    text-align: center;
}
.cat-link:hover .cat-badge {
    background-color: var(--brand-primary);
    color: white;
}

/* Transições Pop-up */
.pop-up-enter-active, .pop-up-leave-active { transition: opacity 0.2s, transform 0.2s; }
.pop-up-enter-from, .pop-up-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

/* Mobile Menu */
.menu-btn {
    background: none; border: none;
    color: var(--text-header-nav); font-size: 1.5rem;
    cursor: pointer; display: none;
}
.drawer {
    position: fixed; top: 0; left: 0; bottom: 0;
    width: 280px; 
    background: var(--bg-surface);
    z-index: 2000; padding: 1.5rem;
    box-shadow: 5px 0 25px rgba(0,0,0,0.5);
    display: flex; flex-direction: column;
}
.drawer-overlay {
    position: fixed; inset: 0;
    background: var(--overlay-color);
    backdrop-filter: blur(2px);
    z-index: 1500;
}
.drawer-header {
    display: flex; justify-content: space-between;
    align-items: center; margin-bottom: 2rem;
    color: var(--text-main); border-bottom: 1px solid var(--border-color);
    padding-bottom: 1rem;
}
.drawer-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
}
.close-btn { background: none; border: none; color: var(--text-main); font-size: 1.5rem; cursor: pointer; }

.mobile-search {
    display: flex; gap: 0.5rem; margin-bottom: 2rem;
}
.mobile-search input {
    flex: 1; background: var(--bg-input-form); border: 1px solid var(--border-color);
    padding: 0.75rem; border-radius: var(--radius-md); color: var(--text-main);
}
.mobile-search button {
    background: var(--brand-primary); border: none; color: white;
    width: 44px; border-radius: var(--radius-md); cursor: pointer;
}

.mobile-menu-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; }
.mobile-menu-list li { margin-bottom: 0.5rem; }
.mobile-menu-list a {
    display: block; padding: 0.75rem;
    color: var(--text-secondary); text-decoration: none;
    border-radius: var(--radius-md); font-weight: 500;
}
.mobile-menu-list a:hover, .mobile-menu-list a.router-link-active {
    background: var(--bg-hover); color: var(--brand-primary);
}
.mobile-categories-label {
    margin: 1.5rem 0 0.5rem 0.75rem;
    font-size: 0.75rem; text-transform: uppercase;
    color: var(--text-muted); font-weight: 700;
}
.mobile-sub-item a { padding-left: 1.5rem; font-size: 0.9rem; opacity: 0.9; }
.divider { height: 1px; background: var(--border-color); margin: 1rem 0; }

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