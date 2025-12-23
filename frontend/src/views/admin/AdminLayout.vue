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
        <!-- Topbar Mobile/Desktop Opcional para Breadcrumbs ou Título -->
        <header class="mobile-header">
           <span class="mobile-logo">Pulso<strong>Admin</strong></span>
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

// Importando CSS base se necessário, mas focando em scoped styles para garantir o visual
const router = useRouter()

const logout = () => {
  localStorage.removeItem('authToken')
  router.push({ name: 'AdminLogin' })
}
</script>

<style scoped>
/* RESET & BASE */
.dashboard-body {
  display: flex;
  min-height: 100vh;
  background-color: #f1f5f9; /* Slate-100 */
  font-family: 'Inter', sans-serif;
}

.dashboard-container {
  display: flex;
  width: 100%;
}

/* SIDEBAR DESKTOP */
.dashboard-sidebar {
  width: 260px;
  background-color: #0f172a; /* Slate-900 */
  color: #cbd5e1; /* Slate-300 */
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
  border-right: 1px solid #1e293b;
  z-index: 50;
  transition: width 0.3s;
}

.sidebar-header {
  height: 70px;
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  border-bottom: 1px solid #1e293b;
}

.admin-logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  text-decoration: none;
  letter-spacing: -0.5px;
}
.highlight { color: #6366f1; }

.sidebar-nav {
  flex: 1;
  padding: 1.5rem 1rem;
  overflow-y: auto;
}

.nav-section-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #64748b;
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
  color: #94a3b8;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
}

.sidebar-nav a:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.sidebar-nav a.router-link-active {
  background-color: #6366f1;
  color: #fff;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.separator {
  height: 1px;
  background-color: #1e293b;
  margin: 1.5rem 0;
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid #1e293b;
  background-color: #0b1120;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-mini-profile {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar-circle {
  width: 36px; height: 36px;
  background-color: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: bold;
}

.user-info { display: flex; flex-direction: column; }
.user-name { color: #fff; font-size: 0.9rem; font-weight: 600; }
.user-role { color: #64748b; font-size: 0.75rem; }

.btn-logout-icon {
  background: none; border: none; color: #94a3b8; cursor: pointer;
  padding: 0.5rem; transition: color 0.2s;
}
.btn-logout-icon:hover { color: #ef4444; }

/* MAIN AREA */
.dashboard-main {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden; /* Scroll interno */
  padding: 0%; 
}

.mobile-header { display: none; } /* Só aparece no mobile */

.main-content-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0; /* Padding gerido pelas views */
}

/* MOBILE NAVBAR */
.mobile-navbar {
  display: none;
  position: fixed;
  bottom: 0; left: 0; width: 100%; height: 65px;
  background-color: #fff;
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.05);
  z-index: 100;
  padding: 0 1rem;
  justify-content: space-around;
  align-items: center;
}

.nav-item {
  display: flex; flex-direction: column; align-items: center;
  text-decoration: none; color: #94a3b8; font-size: 0.7rem; gap: 4px;
  background: none; border: none; cursor: pointer;
}
.nav-item.router-link-active { color: #6366f1; }
.nav-icon { font-size: 1.5rem; }

.center-item { position: relative; top: -20px; }
.center-icon-bg {
  width: 56px; height: 56px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 15px rgba(99, 102, 241, 0.4);
  border: 4px solid #f1f5f9;
}
.white-icon { color: white; font-size: 1.8rem; }

/* TRANSITIONS */
.fade-page-enter-active, .fade-page-leave-active { transition: opacity 0.2s ease; }
.fade-page-enter-from, .fade-page-leave-to { opacity: 0; }

/* RESPONSIVIDADE */
@media (max-width: 768px) {
  .dashboard-sidebar { display: none; }
  .mobile-navbar { display: flex; }
  .dashboard-main { padding-bottom: 70px; } /* Espaço para a barra mobile */
  
  .mobile-header {
    display: flex; align-items: center; justify-content: center;
    height: 60px; background: #fff; border-bottom: 1px solid #e2e8f0;
    font-size: 1.2rem; color: #0f172a;
  }
}
</style>