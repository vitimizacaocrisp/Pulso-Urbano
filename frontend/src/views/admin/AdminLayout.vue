<template>
  <div class="dashboard-body"> 
    <div class="dashboard-container">
      <!-- Sidebar Desktop Modernizada -->
      <aside class="dashboard-sidebar">
        <div class="sidebar-header">
          <router-link to="/admin" class="admin-logo">
            Pulso<span class="highlight">Admin</span>
          </router-link>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section-label">GERAL</div>
          <ul>
            <li>
              <router-link :to="{ name: 'AdminDashboard' }">
                <Icon icon="mdi:view-dashboard-outline" width="20" /> Visão Geral
              </router-link>
            </li>
          </ul>

          <div class="nav-section-label">CONTEÚDO</div>
          <ul>
            <li>
              <router-link :to="{ name: 'ContentManager' }">
                <Icon icon="mdi:plus-circle-outline" width="20" /> Nova Análise
              </router-link>
            </li>
            <li>
              <router-link :to="{ name: 'EditAnalysis' }">
                <Icon icon="mdi:file-document-edit-outline" width="20" /> Gerenciar Publicações
              </router-link>
            </li>
          </ul>

          <div class="separator"></div>

          <ul>
            <li>
              <router-link to="/" target="_blank" class="nav-external">
                <Icon icon="mdi:open-in-new" width="20" /> Ver Site Público
              </router-link>
            </li>
          </ul>
        </nav>

        <div class="sidebar-footer">
          <!-- Botão de Tema Integrado na Sidebar -->
          <div class="theme-wrapper">
             <ThemeToggle />
          </div>
          
          <div class="user-divider"></div>

          <div class="user-mini-profile">
            <div class="avatar-circle">A</div>
            <div class="user-info">
              <span class="user-name">Administrador</span>
              <span class="user-role">Super Admin</span>
            </div>
          </div>
          <button @click="logout" class="btn-logout-icon" title="Sair">
            <Icon icon="mdi:logout" width="20" />
          </button>
        </div>
      </aside>

      <!-- Área Principal -->
      <main class="dashboard-main">
        <!-- Topbar Mobile -->
        <header class="mobile-header">
           <span class="mobile-logo">Pulso<strong>Admin</strong></span>
           <div class="mobile-actions">
             <ThemeToggle />
           </div>
        </header>
        
        <div class="main-content-scroll">
            <router-view v-slot="{ Component }">
                <transition name="fade-page" mode="out-in">
                    <component :is="Component" />
                </transition>
            </router-view>
        </div>
      </main>
    </div>

    <!-- MOBILE BOTTOM BAR (Mantida e Estilizada) -->
    <nav class="mobile-navbar">
      <router-link to="/" class="nav-item">
        <Icon icon="mdi:home-outline" class="nav-icon" />
        <span class="nav-label">Site</span>
      </router-link>

      <router-link :to="{ name: 'AdminDashboard' }" class="nav-item">
        <Icon icon="mdi:view-dashboard-outline" class="nav-icon" />
        <span class="nav-label">Início</span>
      </router-link>

      <router-link :to="{ name: 'ContentManager' }" class="nav-item center-item">
        <div class="center-icon-bg">
          <Icon icon="mdi:plus" class="nav-icon white-icon" />
        </div>
      </router-link>

      <router-link :to="{ name: 'EditAnalysis' }" class="nav-item">
        <Icon icon="mdi:file-document-multiple-outline" class="nav-icon" />
        <span class="nav-label">Conteúdo</span>
      </router-link>

      <button @click="logout" class="nav-item logout-btn">
        <Icon icon="mdi:logout" class="nav-icon" />
        <span class="nav-label">Sair</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import ThemeToggle from '@/components/ThemeToggle.vue';

const router = useRouter()

const logout = () => {
  localStorage.removeItem('authToken')
  router.push({ name: 'AdminLogin' })
}
</script>

<style scoped>
/* RESET & BASE - Usando Variáveis */
.dashboard-body {
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-dashboard); /* Usando variável do tema */
  color: var(--text-main);
  font-family: 'Inter', sans-serif;
  transition: background-color 0.3s;
}

.dashboard-container {
  display: flex;
  width: 100%;
}

/* SIDEBAR DESKTOP */
.dashboard-sidebar {
  width: 260px;
  background-color: var(--bg-header); /* Adapta ao tema (Branco ou Escuro) */
  color: var(--text-main);
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
  border-right: 1px solid var(--border-color);
  z-index: 50;
  transition: all 0.3s;
}

.sidebar-header {
  height: 70px;
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.admin-logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-header-logo); /* Texto adapta ao tema */
  text-decoration: none;
  letter-spacing: -0.5px;
}
.highlight { color: var(--brand-primary); }

.sidebar-nav {
  flex: 1;
  padding: 1.5rem 1rem;
  overflow-y: auto;
}

.nav-section-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  margin: 1.5rem 0 0.5rem 0.75rem;
  font-weight: 600;
}
.nav-section-label:first-child { margin-top: 0; }

.sidebar-nav ul { list-style: none; padding: 0; margin: 0; }

.sidebar-nav a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0.75rem 1rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
}

.sidebar-nav a:hover {
  background-color: var(--bg-hover);
  color: var(--brand-primary);
}

.sidebar-nav a.router-link-active {
  background-color: var(--brand-primary);
  color: #fff;
  box-shadow: var(--shadow-sm);
}

.separator {
  height: 1px;
  background-color: var(--border-color);
  margin: 1.5rem 0;
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-surface); /* Adapta ao tema */
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.theme-wrapper {
  display: flex;
  justify-content: flex-end;
}

.user-divider {
  width: 100%; height: 1px; background: var(--border-color);
}

.user-mini-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.avatar-circle {
  width: 36px; height: 36px;
  background-color: var(--brand-primary);
  color: white;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: bold;
}

.user-info { display: flex; flex-direction: column; }
.user-name { color: var(--text-main); font-size: 0.9rem; font-weight: 600; }
.user-role { color: var(--text-muted); font-size: 0.75rem; }

.btn-logout-icon {
  background: none; border: none; color: var(--text-secondary); cursor: pointer;
  padding: 0.5rem; transition: color 0.2s; margin-left: auto;
}
.btn-logout-icon:hover { color: var(--sys-danger); }

/* MAIN AREA */
.dashboard-main {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden; /* Scroll interno */
  padding: 0; 
}

.mobile-header { display: none; } /* Só aparece no mobile */

.main-content-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

/* MOBILE NAVBAR */
.mobile-navbar {
  display: none;
  position: fixed;
  bottom: 0; left: 0; width: 100%; height: 65px;
  background-color: var(--bg-surface);
  border-top: 1px solid var(--border-color);
  box-shadow: 0 -4px 20px rgba(0,0,0,0.05);
  z-index: 100;
  padding: 0 1rem;
  justify-content: space-around;
  align-items: center;
}

.nav-item {
  display: flex; flex-direction: column; align-items: center;
  text-decoration: none; color: var(--text-muted); font-size: 0.7rem; gap: 4px;
  background: none; border: none; cursor: pointer;
}
.nav-item.router-link-active { color: var(--brand-primary); }
.nav-icon { font-size: 1.5rem; }

.center-item { position: relative; top: -20px; }
.center-icon-bg {
  width: 56px; height: 56px;
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover));
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: var(--shadow-md);
  border: 4px solid var(--bg-body);
}
.white-icon { color: white; font-size: 1.8rem; }

/* TRANSITIONS */
.fade-page-enter-active, .fade-page-leave-active { transition: opacity 0.2s ease; }
.fade-page-enter-from, .fade-page-leave-to { opacity: 0; }

/* RESPONSIVIDADE */
@media (max-width: 768px) {
  .dashboard-sidebar { display: none; }
  .mobile-navbar { display: flex; }
  .dashboard-main { padding-bottom: 70px; }
  
  .mobile-header {
    display: flex; align-items: center; justify-content: space-between;
    height: 60px; background: var(--bg-surface); border-bottom: 1px solid var(--border-color);
    font-size: 1.2rem; color: var(--text-main); padding: 0 1.5rem;
  }
}
</style>