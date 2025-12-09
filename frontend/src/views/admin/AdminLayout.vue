<template>
  <div class="dashboard-body"> 
    <div class="dashboard-container">
      <!-- Sidebar Desktop (Mantida igual) -->
      <aside class="dashboard-sidebar">
        <div class="sidebar-header">
          <span>Painel Admin</span>
        </div>

        <nav class="sidebar-nav">
          <ul>
            <li>
              <router-link :to="{ name: 'AdminDashboard' }">
                <Icon icon="mdi:view-dashboard" /> Início
              </router-link>
            </li>
            <li>
              <router-link :to="{ name: 'ContentManager' }">
                <Icon icon="mdi:plus-circle" /> Nova Análise
              </router-link>
            </li>
            <li>
              <router-link :to="{ name: 'EditAnalysis' }">
                <Icon icon="mdi:pencil" /> Editar / Excluir
              </router-link>
            </li>
            <li class="separator"></li>
            <li>
              <router-link to="/" target="_blank">
                <Icon icon="mdi:home" /> Ir para o Site
              </router-link>
            </li>
          </ul>
        </nav>

        <div class="sidebar-footer">
          <button @click="logout" class="btn-logout">
            <Icon icon="mdi:logout" /> Sair
          </button>
        </div>
      </aside>

      <!-- Área Principal -->
      <main class="dashboard-main">
        <router-view />
      </main>
    </div>

    <!-- NOVA BARRA DE NAVEGAÇÃO MOBILE (Bottom Bar) -->
    <!-- Substitui o antigo menu flutuante -->
    <nav class="mobile-navbar">
      <router-link to="/" class="nav-item" title="Ir para o Site">
        <Icon icon="mdi:home-outline" class="nav-icon" />
        <span class="nav-label">Site</span>
      </router-link>

      <router-link :to="{ name: 'AdminDashboard' }" class="nav-item">
        <Icon icon="mdi:view-dashboard-outline" class="nav-icon" />
        <span class="nav-label">Início</span>
      </router-link>

      <!-- Botão Central Destacado para Nova Análise -->
      <router-link :to="{ name: 'ContentManager' }" class="nav-item center-item" title="Nova Análise">
        <div class="center-icon-bg">
          <Icon icon="mdi:plus" class="nav-icon white-icon" />
        </div>
        <span class="nav-label">Novo</span>
      </router-link>

      <router-link :to="{ name: 'EditAnalysis' }" class="nav-item">
        <Icon icon="mdi:file-document-edit-outline" class="nav-icon" />
        <span class="nav-label">Editar</span>
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

// Imports CSS
import '../../assets/css/admin/base.css'
import '../../assets/css/admin/components.css'
import '../../assets/css/admin/layout.css'
import '../../assets/css/admin/responsive-lg.css'
import '../../assets/css/admin/responsive-md.css'
import '../../assets/css/admin/responsive-sm.css'

const router = useRouter()

const logout = () => {
  localStorage.removeItem('authToken')
  router.push({ name: 'AdminLogin' })
}
</script>

<style scoped>
/* ----------- Layout Principal -----------*/
.dashboard-body {
  display: flex;
  min-height: 100vh;
  background-color: #f4f6f8;
}

.dashboard-container {
  display: flex;
  width: 100%;
}

/* ----------- Sidebar Desktop -----------*/
.dashboard-sidebar {
  width: 250px;
  background-color: #1e293b;
  color: #ecf0f1;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100vh;
  position: sticky;
  top: 0;
  left: 0;
  z-index: 100;
}

.sidebar-header {
  padding: 1.5rem;
  text-align: center;
  border-bottom: 1px solid #334155;
  font-weight: 700;
  font-size: 1.2rem;
  background-color: #0f172a;
}

.sidebar-nav {
  flex: 1;
  padding-top: 1rem;
  overflow-y: auto;
}

.sidebar-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar-nav a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 1rem 1.5rem;
  color: #94a3b8;
  text-decoration: none;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.sidebar-nav a:hover,
.sidebar-nav a.router-link-active {
  background-color: #334155;
  color: white;
  border-right: 3px solid #3b82f6;
}

.separator {
  margin: 1rem 1.5rem;
  border-top: 1px solid #334155;
}

.sidebar-footer {
  padding: 1.5rem;
  border-top: 1px solid #334155;
  background-color: #0f172a;
}

.btn-logout {
  width: 100%;
  padding: 0.75rem;
  background-color: transparent;
  border: 1px solid #ef4444;
  border-radius: 6px;
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logout:hover {
  background-color: #ef4444;
  color: white;
}

/* ----------- Área Principal -----------*/
.dashboard-main {
  flex-grow: 1;
  width: calc(100% - 250px);
  overflow-y: auto;
  min-height: 100vh;
}

/* ----------- Mobile Navigation Bar (NOVO ESTILO) ----------- */
.mobile-navbar {
  display: none; /* Desktop: Oculto */
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 70px; /* Altura fixa da barra */
  background-color: white;
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  padding: 0 1rem;
  justify-content: space-between; /* Distribui os itens igualmente */
  align-items: center;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 500;
  gap: 4px;
  flex: 1; /* Cada item ocupa espaço igual */
  height: 100%;
  cursor: pointer;
  background: none;
  border: none;
}

.nav-icon {
  font-size: 1.5rem;
  transition: color 0.2s;
}

/* Estado Ativo */
.nav-item.router-link-active,
.nav-item:hover {
  color: #3b82f6;
}

.nav-item.router-link-active .nav-icon {
  color: #3b82f6;
}

/* Botão de Logout Específico */
.logout-btn:hover {
  color: #ef4444;
}

/* Botão Central (Novo) com destaque */
.center-item {
  position: relative;
  top: -10px; /* Eleva o botão um pouco acima da barra */
}

.center-icon-bg {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);
  border: 4px solid #f4f6f8; /* Borda da cor do fundo do site para criar "corte" */
  transition: transform 0.2s;
}

.center-item:active .center-icon-bg {
  transform: scale(0.95);
}

.white-icon {
  color: white;
  font-size: 1.75rem;
}

/* ----------- Responsividade ----------- */
@media (max-width: 768px) {
  .dashboard-sidebar {
    display: none; /* Sidebar some no mobile */
  }

  .dashboard-main {
    width: 100%;
    /* Adiciona padding no final para o conteúdo não ficar escondido atrás da barra */
    padding-bottom: 80px; 
  }

  .mobile-navbar {
    display: flex; /* Barra aparece no mobile */
  }
}
</style>