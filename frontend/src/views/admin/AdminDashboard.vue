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
      </div>

      <!-- Cards de Resumo (KPIs) -->
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
        <!-- Gráfico -->
        <div class="grid-item">
          <h2>Publicações nos Últimos 6 Meses</h2>
          <div class="chart-container">
            <canvas id="monthlyPublicationsChart"></canvas>
          </div>
        </div>

        <!-- Tabela -->
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
            Nenhuma análise encontrada. Comece por 
            <router-link :to="{ name: 'ContentManager' }">criar uma nova</router-link>.
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

/* --- Responsividade --- */
@media (max-width: 1024px) {
  .dashboard-main {
    padding: 1rem !important;
  }
  main {
    padding: 0.5rem !important;
  }
  .content-section {
    padding: 1rem !important;
  }
  .chart-container {
    height: 250px;
  }
}

@media (max-width: 768px) {
  .grid-item {
    width: 70%;
    min-width: 250px;
    max-width: 500px;
    margin: 0 auto;
    padding: 1rem;
  }
  .dashboard-main {
    padding: 0.5rem !important;
  }
  main {
    padding: 0 !important;
  }
  .main-header-bar {
    padding: 1rem;
    text-align: center;
  }
  .content-section {
    padding: 0rem !important;
  }
  .dashboard-grid {
    grid-template-columns: 1fr; /* Grids em 1 coluna */
  }
  .quick-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .action-btn {
    text-align: center;
  }
  .stats-cards {
    grid-template-columns: 1fr;
  }
  .card h3 {
    font-size: 1.8rem;
  }
}

@media (max-width: 480px) {
  .main-header-bar h1 {
    font-size: 1.5rem;
  }
  .main-header-bar p {
    font-size: 0.9rem;
  }
  .card {
    padding: 1rem;
  }
  .btn-edit {
    font-size: 0.8em;
    padding: 0.3rem 0.6rem;
  }
}
</style>
