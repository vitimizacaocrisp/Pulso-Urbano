<template>
  <div class="dashboard-body">
    <div class="dashboard-container">
      <aside class="dashboard-sidebar">
        <div class="sidebar-header">
          <h3>Pulso Urbano</h3>
          <span>Painel Admin</span>
        </div>
        <nav class="sidebar-nav">
          <ul>
            <li><router-link :to="{ name: 'AdminDashboard' }">Dashboard</router-link></li>
            <li><router-link :to="{ name: 'SqlTerminal' }">Terminal SQL</router-link></li>
            <li><router-link :to="{ name: 'ContentManager' }">Gerir Conteúdo</router-link></li>
          </ul>
        </nav>
        <div class="sidebar-footer">
          <button @click="logout" class="btn-logout">Sair &rarr;</button>
        </div>
      </aside>

      <main class="dashboard-main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const logout = () => {
  localStorage.removeItem('authToken');
  router.push({ name: 'AdminLogin' });
};
</script>

<style scoped>
/* Adicione aqui os estilos do seu dashboard-body, container, sidebar, etc. */
/* Estilo para o link ativo na barra lateral */
.sidebar-nav .router-link-exact-active {
  background-color: #0056b3;
  color: white;
  font-weight: bold;
}

/* Os estilos do seu AdminDashboard.vue original vão aqui */
.dashboard-body {
  display: flex;
  min-height: 100vh;
  font-family: Arial, sans-serif;
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
}
.sidebar-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.sidebar-nav a {
  display: block;
  padding: 1rem 1.5rem;
  color: #ecf0f1;
  text-decoration: none;
  transition: background-color 0.2s;
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
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.dashboard-main {
  flex-grow: 1;
  background-color: #f4f6f8;
}
</style>