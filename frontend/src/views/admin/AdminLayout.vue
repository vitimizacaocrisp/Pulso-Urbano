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
            <li><router-link :to="{ name: 'AdminDashboard' }">Visão Geral</router-link></li>
            <li><router-link :to="{ name: 'ContentManager' }">Nova Análise</router-link></li>
            <li><router-link :to="{ name: 'EditAnalysis' }">Editar / Excluir Análise</router-link></li>
            <li><router-link :to="{ name: 'SqlTerminal' }">Terminal SQL</router-link></li>
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
/* Estilo para o link ativo na barra lateral */
.sidebar-nav .router-link-exact-active {
  background-color: #0056b3;
  color: white;
  font-weight: bold;
}

/* Estilos gerais do layout */
.dashboard-body {
  display: flex;
  min-height: 100vh;
  font-family: Arial, sans-serif;
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
  flex-shrink: 0; /* Impede que a sidebar encolha */
}
.sidebar-header {
  padding: 1.5rem;
  text-align: center;
  border-bottom: 1px solid #34495e;
}
.sidebar-header h3 {
  margin: 0;
}
.sidebar-nav {
  margin-top: 1rem;
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
  border-left: 3px solid transparent;
}
.sidebar-nav a:hover {
  background-color: #34495e;
}
.sidebar-nav .router-link-exact-active {
  background-color: #1a2531;
  border-left-color: #3498db;
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
  transition: background-color 0.2s;
}
.btn-logout:hover {
    background-color: #c0392b;
}
.dashboard-main {
  flex-grow: 1;
  overflow-y: auto; /* Permite scroll apenas no conteúdo principal */
}
</style>