<template>
  <div>
    <header class="main-header-bar">
      <h1>Visão Geral</h1>
      <p>Bem-vindo ao painel de administração do Pulso Urbano.</p>
    </header>

    <section class="content-section">
      <div class="quick-actions">
        <router-link :to="{ name: 'ContentManager' }" class="action-btn">
          + Nova Análise
        </router-link>
        <router-link :to="{ name: 'SqlTerminal' }" class="action-btn">
          Terminal SQL
        </router-link>
      </div>

      <!-- Cards de Resumo (KPIs) com dados reais -->
      <div v-if="!isLoading" class="stats-cards">
        <div class="card">
          <h3>{{ stats.totalAnalyses }}</h3>
          <p>Análises Publicadas</p>
        </div>
        <div class="card">
          <h3>{{ stats.newThisMonth }}</h3>
          <p>Novas este Mês</p>
        </div>
        <div class="card">
          <h3>{{ stats.uniqueTags }}</h3>
          <p>Tags Únicas</p>
        </div>
      </div>
      
      <div class="dashboard-grid">
        <div class="grid-item">
            <h2>Publicações nos Últimos 6 Meses</h2>
            <div class="chart-container">
                <canvas id="monthlyPublicationsChart"></canvas>
            </div>
        </div>
        <div class="grid-item">
          <h2>Análises Recentes</h2>
          <div v-if="isLoading" class="loading-message">Carregando dados...</div>
          <div v-if="error" class="error-message">{{ error }}</div>
          
          <div v-if="!isLoading && !error && recentAnalyses.length > 0" class="data-table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título</th>
                  <th>Tag</th>
                  <th>Publicado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in recentAnalyses" :key="item.id">
                  <td>{{ item.id }}</td>
                  <td>{{ item.title }}</td>
                  <td><span class="tag-badge">{{ item.tag }}</span></td>
                  <td>{{ item.created_date }}</td>
                  <td>
                    <router-link :to="{ name: 'EditAnalysis', query: { id: item.id } }" class="btn-edit">
                      Editar
                    </router-link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
           <div v-if="!isLoading && !error && recentAnalyses.length === 0" class="no-data-message">
              Nenhuma análise encontrada. Comece por <router-link :to="{ name: 'ContentManager' }">criar uma nova</router-link>.
            </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import Chart from 'chart.js/auto';

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

const router = useRouter();
const recentAnalyses = ref([]);
const isLoading = ref(true);
const error = ref(null);
let chartInstance = null; // Para destruir o gráfico ao sair da página

const stats = ref({
  totalAnalyses: 0,
  newThisMonth: 0,
  uniqueTags: 0
});

const fetchDashboardData = async () => {
  isLoading.value = true;
  error.value = null;
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    router.push({ name: 'AdminLogin' });
    return;
  }
  
  try {
    // Chama a nova rota do backend usando axios
    const response = await axios.get(API_URL + '/api/admin/dashboard-data', {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 15000 // 15 segundos para aguardar a resposta
    });

    const data = response.data.data;

    // Preenche os refs com os dados reais do backend
    recentAnalyses.value = data.recentAnalyses;
    stats.value = data.stats;
    
    // Cria o gráfico com os dados do backend
    createChart(data.chartData);

  } catch (err) {
    if (err.response && err.response.data && err.response.data.message && err.response.data.message.includes('Token')) {
      error.value = 'A sua sessão expirou. Por favor, faça login novamente.';
      setTimeout(() => router.push({ name: 'AdminLogin' }), 3000);
    } else {
      error.value = 'Não foi possível carregar os dados do painel.';
      console.error('Erro ao buscar dados do dashboard:', err);
    }
  } finally {
    isLoading.value = false;
  }
};

const createChart = (chartData) => {
    const ctx = document.getElementById('monthlyPublicationsChart');
    if (!ctx) return;
    
    // Destrói o gráfico anterior se ele existir, para evitar bugs de renderização
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Nº de Publicações',
                data: chartData.data,
                backgroundColor: 'rgba(0, 123, 255, 0.7)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1 // Garante que o eixo Y só mostre números inteiros
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
};

onMounted(fetchDashboardData);

// Limpa o gráfico ao sair do componente para libertar memória
onBeforeUnmount(() => {
    if (chartInstance) {
        chartInstance.destroy();
    }
});
</script>

<style scoped>
/* Estilos existentes */
.main-header-bar { background-color: white; color: #212529; padding: 1.5rem 2rem; border-bottom: 1px solid #dee2e6; }
.content-section { padding: 2rem; }
.loading-message, .error-message { text-align: center; padding: 2rem; font-size: 1.2rem; }
.error-message { color: #dc3545; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; }
.data-table-container table { width: 100%; border-collapse: collapse; background-color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.data-table-container th, .data-table-container td { border: 1px solid #ddd; padding: 12px; text-align: left; }
.data-table-container th { background-color: #f2f2f2; }

.quick-actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
}
.action-btn {
    padding: 0.6rem 1.2rem;
    background-color: #007bff;
    color: white;
    text-decoration: none;
    border-radius: 5px;
    font-weight: 500;
    transition: background-color 0.2s;
}
.action-btn:hover {
    background-color: #0056b3;
}

.stats-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}
.card {
    background-color: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.card h3 {
    margin: 0;
    font-size: 2.5rem;
    color: #007bff;
}
.card p {
    margin: 0.5rem 0 0;
    color: #6c757d;
}

.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
}
.grid-item {
    background-color: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.chart-container {
    height: 300px;
}
.btn-edit {
    padding: 0.4rem 0.8rem;
    background-color: #ffc107;
    color: #212529;
    text-decoration: none;
    border-radius: 5px;
    font-size: 0.9em;
}
</style>