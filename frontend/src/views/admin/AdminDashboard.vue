<template>
  <div>
    <header class="main-header-bar">
      <h1>Visão Geral</h1>
      <p>Bem-vindo ao painel de administração do Pulso Urbano.</p>
    </header>

    <section class="content-section">
      <h2>Pesquisas Recentes</h2>
      
      <div v-if="isLoading" class="loading-message">Carregando dados...</div>
      <div v-if="error" class="error-message">{{ error }}</div>
      
      <div v-if="!isLoading && !error && adminData" class="data-table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Título da Pesquisa</th>
              <th>Ano</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in adminData" :key="item.id">
              <td>{{ item.id }}</td>
              <td>{{ item.pesquisa }}</td>
              <td>{{ item.ano }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const adminData = ref([]);
const isLoading = ref(true);
const error = ref(null);

const logout = () => {
  localStorage.removeItem('authToken');
  router.push({ name: 'AdminLogin' });
};

const fetchAdminData = async () => {
  isLoading.value = true;
  error.value = null;
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    logout();
    return;
  }
  
  try {
    const response = await axios.get('https://pulso-urbano-backend.onrender.com/api/admin/data', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    adminData.value = response.data.data;
  } catch (err) {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      error.value = 'Sua sessão expirou. Por favor, faça login novamente.';
      setTimeout(logout, 3000);
    } else {
      error.value = 'Não foi possível carregar os dados do painel.';
      console.error('Erro ao buscar dados do admin:', err);
    }
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchAdminData);
</script>

<style scoped>
/* Estilos específicos para esta página de conteúdo */
.main-header-bar {
  background-color: white;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #dee2e6;
}
.content-section {
  padding: 2rem;
}
.loading-message, .error-message {
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
}
.error-message {
  color: #dc3545;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}
.data-table-container table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.data-table-container th, .data-table-container td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}
.data-table-container th {
  background-color: #f2f2f2;
}
</style>