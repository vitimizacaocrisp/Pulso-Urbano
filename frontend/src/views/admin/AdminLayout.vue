<template>
  <div class="admin-shell" :class="{ 'sidebar-collapsed': sidebarCollapsed }">

    <!-- SIDEBAR DESKTOP -->
    <aside class="admin-sidebar">
      <div class="sidebar-top">
        <div class="sidebar-brand">
          <div class="brand-icon">P</div>
          <transition name="brand-text">
            <span v-if="!sidebarCollapsed" class="brand-label">Pulso<strong>Admin</strong></span>
          </transition>
        </div>
        <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed" :title="sidebarCollapsed ? 'Expandir' : 'Recolher'">
          <Icon :icon="sidebarCollapsed ? 'mdi:chevron-right' : 'mdi:chevron-left'" width="18" />
        </button>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-group">
          <span v-if="!sidebarCollapsed" class="nav-group-label">Geral</span>
          <router-link :to="{ name: 'AdminDashboard' }" class="nav-link" :title="sidebarCollapsed ? 'Visão Geral' : ''">
            <span class="nav-icon"><Icon icon="mdi:view-dashboard-outline" width="20" /></span>
            <span v-if="!sidebarCollapsed" class="nav-text">Visão Geral</span>
            <span v-if="!sidebarCollapsed" class="nav-active-bar"></span>
          </router-link>
        </div>

        <div class="nav-group">
          <span v-if="!sidebarCollapsed" class="nav-group-label">Conteúdo</span>
          <router-link :to="{ name: 'ContentManager' }" class="nav-link" :title="sidebarCollapsed ? 'Nova Análise' : ''">
            <span class="nav-icon"><Icon icon="mdi:plus-circle-outline" width="20" /></span>
            <span v-if="!sidebarCollapsed" class="nav-text">Nova Análise</span>
          </router-link>
          <router-link :to="{ name: 'EditAnalysis' }" class="nav-link" :title="sidebarCollapsed ? 'Gerenciar' : ''">
            <span class="nav-icon"><Icon icon="mdi:file-document-edit-outline" width="20" /></span>
            <span v-if="!sidebarCollapsed" class="nav-text">Gerenciar</span>
          </router-link>
        </div>

        <div class="nav-divider"></div>

        <router-link to="/" target="_blank" class="nav-link nav-external" :title="sidebarCollapsed ? 'Ver Site' : ''">
          <span class="nav-icon"><Icon icon="mdi:open-in-new" width="20" /></span>
          <span v-if="!sidebarCollapsed" class="nav-text">Ver Site</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <ThemeToggle />
        <div class="footer-divider"></div>
        <div class="user-row">
          <div class="user-avatar">A</div>
          <transition name="brand-text">
            <div v-if="!sidebarCollapsed" class="user-meta">
              <span class="user-name">Administrador</span>
              <span class="user-role">Super Admin</span>
            </div>
          </transition>
          <button @click="logout" class="logout-btn" title="Sair">
            <Icon icon="mdi:logout" width="18" />
          </button>
        </div>
      </div>
    </aside>

    <!-- MAIN AREA -->
    <div class="admin-main">
      <!-- MOBILE HEADER -->
      <header class="mobile-topbar">
        <button class="mobile-menu-btn" @click="mobileDrawerOpen = true">
          <Icon icon="mdi:menu" width="22" />
        </button>
        <span class="mobile-brand">Pulso<strong>Admin</strong></span>
        <ThemeToggle />
      </header>

      <!-- MOBILE DRAWER OVERLAY -->
      <transition name="drawer-fade">
        <div v-if="mobileDrawerOpen" class="drawer-overlay" @click="mobileDrawerOpen = false"></div>
      </transition>
      <transition name="drawer-slide">
        <aside v-if="mobileDrawerOpen" class="mobile-drawer">
          <div class="drawer-header">
            <span class="mobile-brand">Pulso<strong>Admin</strong></span>
            <button @click="mobileDrawerOpen = false"><Icon icon="mdi:close" width="22" /></button>
          </div>
          <nav class="drawer-nav">
            <router-link :to="{ name: 'AdminDashboard' }" class="drawer-link" @click="mobileDrawerOpen = false">
              <Icon icon="mdi:view-dashboard-outline" width="20" /> Visão Geral
            </router-link>
            <router-link :to="{ name: 'ContentManager' }" class="drawer-link" @click="mobileDrawerOpen = false">
              <Icon icon="mdi:plus-circle-outline" width="20" /> Nova Análise
            </router-link>
            <router-link :to="{ name: 'EditAnalysis' }" class="drawer-link" @click="mobileDrawerOpen = false">
              <Icon icon="mdi:file-document-edit-outline" width="20" /> Gerenciar
            </router-link>
            <router-link to="/" target="_blank" class="drawer-link" @click="mobileDrawerOpen = false">
              <Icon icon="mdi:open-in-new" width="20" /> Ver Site
            </router-link>
            <button @click="logout" class="drawer-link drawer-logout">
              <Icon icon="mdi:logout" width="20" /> Sair
            </button>
          </nav>
        </aside>
      </transition>

      <!-- PAGE CONTENT -->
      <div class="main-scroll">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>

      <!-- MOBILE BOTTOM NAV -->
      <nav class="bottom-nav">
        <router-link :to="{ name: 'AdminDashboard' }" class="bottom-item">
          <Icon icon="mdi:view-dashboard-outline" width="22" />
          <span>Início</span>
        </router-link>
        <router-link :to="{ name: 'ContentManager' }" class="bottom-item bottom-cta">
          <div class="cta-circle"><Icon icon="mdi:plus" width="26" /></div>
        </router-link>
        <router-link :to="{ name: 'EditAnalysis' }" class="bottom-item">
          <Icon icon="mdi:file-document-multiple-outline" width="22" />
          <span>Conteúdo</span>
        </router-link>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import ThemeToggle from '@/components/ThemeToggle.vue';

const router = useRouter();
const sidebarCollapsed = ref(false);
const mobileDrawerOpen = ref(false);

const logout = () => {
  localStorage.removeItem('authToken');
  router.push({ name: 'AdminLogin' });
};
</script>

<style scoped>
/* ── Shell ── */
.admin-shell {
  display: flex;
  min-height: 100vh;
  background: var(--bg-dashboard, var(--bg-body));
  color: var(--text-main);
  transition: background 0.3s;
}

/* ── Sidebar ── */
.admin-sidebar {
  width: 240px;
  background: var(--bg-header);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
  z-index: 50;
  transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
  overflow: hidden;
}
.admin-shell.sidebar-collapsed .admin-sidebar { width: 64px; }

.sidebar-top {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 0 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}
.sidebar-brand { display: flex; align-items: center; gap: 10px; overflow: hidden; }
.brand-icon {
  width: 32px; height: 32px; flex-shrink: 0;
  background: var(--brand-primary); color: #fff;
  border-radius: 8px; font-weight: 800; font-size: 1rem;
  display: flex; align-items: center; justify-content: center;
}
.brand-label { font-size: 1.1rem; font-weight: 600; color: var(--text-main); white-space: nowrap; }
.brand-label strong { color: var(--brand-primary); }

.collapse-btn {
  background: none; border: none; color: var(--text-muted); cursor: pointer;
  padding: 6px; border-radius: 6px; transition: background 0.2s, color 0.2s;
  flex-shrink: 0;
}
.collapse-btn:hover { background: var(--bg-hover); color: var(--brand-primary); }

/* Nav */
.sidebar-nav { flex: 1; padding: 16px 8px; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; gap: 4px; }
.nav-group { display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; }
.nav-group-label {
  font-size: 0.68rem; text-transform: uppercase; letter-spacing: 1.2px;
  color: var(--text-muted); font-weight: 700; padding: 0 8px; margin-bottom: 4px;
  white-space: nowrap; overflow: hidden;
}
.nav-divider { height: 1px; background: var(--border-color); margin: 8px 0; }

.nav-link {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px; border-radius: 8px;
  color: var(--text-secondary); text-decoration: none;
  font-size: 0.9rem; font-weight: 500;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap; overflow: hidden;
  position: relative;
}
.nav-link:hover { background: var(--bg-hover); color: var(--brand-primary); }
.nav-link.router-link-active {
  background: rgba(99,102,241,0.12); color: var(--brand-primary); font-weight: 700;
}
.nav-link.router-link-active::before {
  content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 3px; height: 60%; background: var(--brand-primary); border-radius: 0 3px 3px 0;
}
.nav-icon { flex-shrink: 0; display: flex; align-items: center; }
.nav-text { white-space: nowrap; }
.nav-external { opacity: 0.75; }
.nav-external:hover { opacity: 1; }

/* Footer */
.sidebar-footer {
  padding: 12px 8px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-surface, var(--bg-card));
  display: flex; flex-direction: column; gap: 10px;
}
.footer-divider { height: 1px; background: var(--border-color); }
.user-row { display: flex; align-items: center; gap: 8px; overflow: hidden; }
.user-avatar {
  width: 32px; height: 32px; flex-shrink: 0;
  background: var(--brand-primary); color: #fff;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.9rem;
}
.user-meta { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
.user-name { font-size: 0.85rem; font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-role { font-size: 0.72rem; color: var(--text-muted); }
.logout-btn {
  background: none; border: none; color: var(--text-muted); cursor: pointer;
  padding: 6px; border-radius: 6px; transition: color 0.2s, background 0.2s;
  flex-shrink: 0; display: flex;
}
.logout-btn:hover { color: #ef4444; background: rgba(239,68,68,0.08); }

/* ── Transitions ── */
.brand-text-enter-active, .brand-text-leave-active { transition: opacity 0.15s, width 0.25s; overflow: hidden; }
.brand-text-enter-from, .brand-text-leave-to { opacity: 0; width: 0; }

/* ── Main ── */
.admin-main {
  flex: 1; display: flex; flex-direction: column;
  min-height: 100vh; overflow: hidden;
}
.main-scroll { flex: 1; overflow-y: auto; }

/* Mobile topbar */
.mobile-topbar {
  display: none; height: 56px;
  align-items: center; justify-content: space-between;
  padding: 0 1rem;
  background: var(--bg-header);
  border-bottom: 1px solid var(--border-color);
  position: sticky; top: 0; z-index: 40;
}
.mobile-menu-btn {
  background: none; border: none; color: var(--text-main);
  cursor: pointer; padding: 6px; border-radius: 6px;
}
.mobile-brand { font-size: 1.1rem; font-weight: 600; color: var(--text-main); }
.mobile-brand strong { color: var(--brand-primary); }

/* Drawer */
.drawer-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200;
  backdrop-filter: blur(2px);
}
.mobile-drawer {
  position: fixed; top: 0; left: 0; bottom: 0; width: 260px;
  background: var(--bg-header); border-right: 1px solid var(--border-color);
  z-index: 201; display: flex; flex-direction: column; padding: 1rem;
}
.drawer-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
.drawer-header button { background: none; border: none; color: var(--text-main); cursor: pointer; }
.drawer-nav { display: flex; flex-direction: column; gap: 4px; }
.drawer-link {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 8px;
  color: var(--text-secondary); text-decoration: none;
  font-size: 0.9rem; transition: background 0.15s, color 0.15s;
  background: none; border: none; cursor: pointer; width: 100%; text-align: left;
}
.drawer-link:hover, .drawer-link.router-link-active { background: var(--bg-hover); color: var(--brand-primary); }
.drawer-logout { margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem; color: #ef4444; }

/* Bottom nav */
.bottom-nav {
  display: none; height: 60px;
  background: var(--bg-header); border-top: 1px solid var(--border-color);
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
  align-items: center; justify-content: space-around; padding: 0 1rem;
}
.bottom-item {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  text-decoration: none; color: var(--text-muted); font-size: 0.65rem;
  transition: color 0.2s;
}
.bottom-item.router-link-active { color: var(--brand-primary); }
.bottom-cta { position: relative; top: -16px; }
.cta-circle {
  width: 52px; height: 52px; border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover, #4f46e5));
  color: #fff; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(99,102,241,0.4);
  border: 3px solid var(--bg-body);
}

/* Transitions */
.page-fade-enter-active, .page-fade-leave-active { transition: opacity 0.18s ease; }
.page-fade-enter-from, .page-fade-leave-to { opacity: 0; }
.drawer-fade-enter-active, .drawer-fade-leave-active { transition: opacity 0.2s; }
.drawer-fade-enter-from, .drawer-fade-leave-to { opacity: 0; }
.drawer-slide-enter-active, .drawer-slide-leave-active { transition: transform 0.25s ease; }
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateX(-100%); }

/* ── Responsive ── */
@media (max-width: 768px) {
  .admin-sidebar { display: none; }
  .mobile-topbar { display: flex; }
  .bottom-nav { display: flex; }
  .admin-main { padding-bottom: 60px; }
}
</style>
