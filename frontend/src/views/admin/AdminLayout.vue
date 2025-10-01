<template>
  <div class="dashboard-body" style="display: fixed; top: 0; left: 0; width: 100%; height: 100vh;">
    <div class="dashboard-container">
      <!-- Sidebar (desktop) -->
      <aside class="dashboard-sidebar">
        <div class="sidebar-header">
          <span>Painel Admin</span>
        </div>

        <nav class="sidebar-nav">
          <ul>
            <li><router-link :to="{ name: 'AdminDashboard' }"><Icon icon="mdi:view-dashboard" /> Início</router-link></li>
            <li><router-link :to="{ name: 'ContentManager' }"><Icon icon="mdi:plus-circle" /> Nova Análise</router-link></li>
            <li><router-link :to="{ name: 'EditAnalysis' }"><Icon icon="mdi:pencil" /> Editar / Excluir</router-link></li>
          </ul>
        </nav>

        <div class="sidebar-footer">
          <button @click="logout" class="btn-logout"><Icon icon="mdi:logout" /> Sair</button>
        </div>
      </aside>

      <main class="dashboard-main">
        <router-view />
      </main>
    </div>

    <!-- Floating Expandable Menu (mobile) -->
    <div class="mobile-bottom-menu" :class="{ open: isMenuOpen }">
      <div class="menu-items">
        <router-link :to="{ name: 'AdminDashboard' }" class="menu-item" title="Início" @click="toggleMenu(false)">
          <Icon icon="mdi:view-dashboard" />
        </router-link>
        <router-link :to="{ name: 'ContentManager' }" class="menu-item" title="Nova Análise" @click="toggleMenu(false)">
          <Icon icon="mdi:plus-circle" />
        </router-link>
        <router-link :to="{ name: 'EditAnalysis' }" class="menu-item" title="Editar Análise" @click="toggleMenu(false)">
          <Icon icon="mdi:pencil" />
        </router-link>
        <button @click="logoutAndClose" class="menu-item" title="Sair">
          <Icon icon="mdi:logout" />
        </button>
      </div>

      <button class="menu-toggle" @click="toggleMenu()">
        <Icon icon="mdi:cog"/>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

import '../../assets/css/admin/base.css'
import '../../assets/css/admin/components.css'
import '../../assets/css/admin/layout.css'
import '../../assets/css/admin/responsive-lg.css'
import '../../assets/css/admin/responsive-md.css'
import '../../assets/css/admin/responsive-sm.css'

const router = useRouter()
const isMenuOpen = ref(false)

const logout = () => {
  localStorage.removeItem('authToken')
  router.push({ name: 'AdminLogin' })
}

const logoutAndClose = () => {
  isMenuOpen.value = false
  logout()
}

const toggleMenu = (state) => {
  isMenuOpen.value = state !== undefined ? state : !isMenuOpen.value
}
</script>

<style scoped>
/* ----------- Desktop Sidebar -----------*/
/*.mobile-bottom-menu {
  display: none;
}
.dashboard-body {
  display: flex;
  min-height: 100vh;
  background-color: #f4f6f8;
}
.dashboard-container {
  display: flex;
  width: 100%;
}
.dashboard-sidebar {
  width: 250px;
  background-color: #2c3e50;
  color: #ecf0f1;
  display: flex;
  flex-direction: column;
}
.sidebar-header {
  padding: 1.5rem;
  text-align: center;
  border-bottom: 1px solid #34495e;
  font-weight: bold;
}
.sidebar-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.sidebar-nav a {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 1rem 1.5rem;
  color: #ecf0f1;
  text-decoration: none;
}
.sidebar-nav a:hover {
  background-color: #34495e;
}
.sidebar-footer {
  margin-top: auto;
  padding: 1.5rem;
}
.btn-logout {
  width: 100%;
  padding: 0.75rem;
  background-color: #e74c3c;
  border: none;
  border-radius: 6px;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
}
.dashboard-main {
  flex-grow: 1;
  overflow-y: auto;
} */

/* ----------- Mobile Bottom Expanding Menu ----------- */
.mobile-bottom-menu {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border-radius: 100px;
  padding: 10px;
  align-items: center;
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
  transition: all 0.3s ease-in-out;
  z-index: 2000;
}
.mobile-bottom-menu .menu-items {
  display: flex;
  align-items: center;
  gap: 15px;
  max-width: 0;
  overflow: hidden;
  transition: max-width 0.3s ease-in-out;
}
.mobile-bottom-menu.open .menu-items {
  max-width: 500px;
  padding: 0 10px;
}
.menu-item {
  background: none;
  border: none;
  font-size: 1.6rem;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.menu-toggle {
  background: #7b2ff7;
  border: none;
  border-radius: 100px;
  padding: 10px;
  color: white;
  font-size: 1.6rem;
  cursor: pointer;
  transition: transform 0.3s;
}
.menu-toggle:active {
  transform: scale(0.9);
}

/* Mostrar apenas no mobile */
@media (max-width: 768px) {
  .dashboard-sidebar {
    display: none;
  }
  .mobile-bottom-menu {
    display: flex;
  }
}
</style>
