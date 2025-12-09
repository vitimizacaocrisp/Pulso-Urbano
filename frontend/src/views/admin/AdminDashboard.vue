<template>
  <div class="dashboard-view">
    <header class="view-header">
      <div class="header-content">
        <div class="header-titles">
          <h1>Visão Geral</h1>
          <p class="subtitle">Bem-vindo ao painel de administração.</p>
        </div>
        <!-- Botão oculto no mobile (classe .desktop-only) -->
        <router-link :to="{ name: 'ContentManager' }" class="btn-primary desktop-only">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nova Análise
        </router-link>
      </div>
    </header>

    <main class="view-content">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>A carregar dados...</p>
      </div>

      <div v-else class="content-wrapper">
        <!-- Cards de Estatísticas -->
        <div class="stats-grid">
          <div class="stat-card primary-border">
            <div class="stat-icon bg-blue">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            <div class="stat-info">
              <h3>{{ stats.totalAnalyses }}</h3>
              <p>Publicadas</p>
            </div>
          </div>

          <div class="stat-card success-border">
            <div class="stat-icon bg-green">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
            <div class="stat-info">
              <h3>{{ stats.newThisMonth }}</h3>
              <p>Novas este Mês</p>
            </div>
          </div>

          <div class="stat-card purple-border">
            <div class="stat-icon bg-purple">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
            </div>
            <div class="stat-info">
              <h3>{{ stats.uniqueTags }}</h3>
              <p>Tags Únicas</p>
            </div>
          </div>
        </div>

        <!-- Grid de Gráfico e Tabela -->
        <div class="main-grid">
          
          <div class="content-card chart-section">
            <div class="card-header">
              <h2>Publicações (6 Meses)</h2>
            </div>
            <div class="chart-wrapper">
              <canvas id="monthlyPublicationsChart"></canvas>
            </div>
          </div>

          <div class="content-card table-section">
            <div class="card-header">
              <h2>Análises Recentes</h2>
              <router-link :to="{ name: 'CategoryView' }" class="text-link">Ver todas</router-link>
            </div>
            
            <div v-if="error" class="error-alert">{{ error }}</div>
            
            <div v-if="!error && recentAnalyses.length > 0" class="table-container">
              <table class="styled-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Tag</th>
                    <th>Data</th>
                    <th class="text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in recentAnalyses" :key="item.id">
                    <td class="title-cell" :title="item.title">{{ item.title }}</td>
                    <td>
                      <div class="tags-wrapper">
                        <span v-for="(tag, index) in splitTags(item.tag)" :key="index" class="tag-badge">
                          {{ tag }}
                        </span>
                      </div>
                    </td>
                    <td class="date-cell">{{ formatDate(item.created_date) }}</td>
                    <td class="text-right">
                      <router-link :to="{ name: 'EditAnalysis', query: { id: item.id } }" class="btn-icon" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </router-link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="!error && recentAnalyses.length === 0" class="empty-state">
              <p>Nenhuma análise encontrada.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
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
let chartInstance = null;

const stats = ref({
  totalAnalyses: 0,
  newThisMonth: 0,
  uniqueTags: 0
});

const splitTags = (tagString) => {
  if (!tagString) return [];
  return tagString.split(',').map(t => t.trim()).filter(t => t.length > 0);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const options = { day: '2-digit', month: '2-digit', year: '2-digit' };
  try {
      return new Date(dateString).toLocaleDateString('pt-PT', options);
  } catch (e) {
      return dateString;
  }
};

const fetchDashboardData = async () => {
  isLoading.value = true;
  error.value = null;
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    router.push({ name: 'AdminLogin' });
    return;
  }
  
  try {
    const response = await axios.get(API_URL + '/api/admin/dashboard-data', {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 15000
    });

    const data = response.data.data;
    recentAnalyses.value = data.recentAnalyses;
    stats.value = data.stats;
    // Pequeno delay para garantir que o DOM do canvas existe
    setTimeout(() => createChart(data.chartData), 100);

  } catch (err) {
    if (err.response?.data?.message?.includes('Token')) {
      error.value = 'Sessão expirada. Faça login novamente.';
      setTimeout(() => router.push({ name: 'AdminLogin' }), 2000);
    } else {
      console.error(err); // Log silencioso
      // Mock para não quebrar a UI se a API falhar (Opcional, pode remover em produção)
      stats.value = { totalAnalyses: '-', newThisMonth: '-', uniqueTags: '-' };
    }
  } finally {
    isLoading.value = false;
  }
};

const createChart = (chartData) => {
    const ctx = document.getElementById('monthlyPublicationsChart');
    if (!ctx) return;
    
    if (chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Publicações',
                data: chartData.data,
                backgroundColor: '#3B82F6',
                borderRadius: 4,
                barPercentage: 0.6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: { stepSize: 1 }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
};

onMounted(fetchDashboardData);

onBeforeUnmount(() => {
    if (chartInstance) chartInstance.destroy();
});
</script>

<style scoped>
/* Container Principal da View (Classe renomeada para evitar conflito) */
.dashboard-view {
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

/* Header */
.view-header {
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-titles h1 {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.5px;
}

.subtitle {
  color: #64748b;
  margin: 0.25rem 0 0 0;
  font-size: 0.95rem;
}

/* Botão Primário */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #2563eb;
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
}

.btn-primary:hover {
  background-color: #1d4ed8;
  transform: translateY(-1px);
}

/* Grid de Estatísticas */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border-left: 4px solid transparent;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}

.primary-border { border-left-color: #3b82f6; }
.success-border { border-left-color: #10b981; }
.purple-border { border-left-color: #8b5cf6; }

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.bg-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.bg-green { background: linear-gradient(135deg, #10b981, #059669); }
.bg-purple { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }

.stat-info h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
}

.stat-info p {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}

/* Grid Principal (Gráfico e Tabela) */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.content-card {
  background: white;
  border-radius: 12px;
  max-height: 600px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.card-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: #1e293b;
}

.chart-wrapper {
  flex: 1;
  min-height: 300px;
  position: relative;
}

/* Tabela */
.table-container {
  overflow-x: auto;
  border-radius: 6px;
  border: 1px solid #f1f5f9;
}

.styled-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  min-width: 500px; /* Força scroll horizontal se muito pequeno */
}

.styled-table th {
  text-align: left;
  padding: 1rem;
  color: #64748b;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.styled-table td {
  padding: 1rem;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  vertical-align: middle;
}

.title-cell {
  font-weight: 500;
  color: #0f172a;
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tags-wrapper {
  display: flex;
  flex-wrap: wrap; 
  gap: 4px; 
}

.tag-badge {
  background-color: #f1f5f9;
  color: #475569;
  padding: 0.25rem 0.6rem;
  border-radius: 99px;
  font-size: 0.7rem;
  font-weight: 600;
  border: 1px solid #e2e8f0;
}

.date-cell {
  white-space: nowrap;
  color: #64748b;
}

.text-link {
  color: #2563eb;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
}

.btn-icon {
  color: #94a3b8;
  padding: 0.5rem;
  border-radius: 6px;
  display: inline-flex;
  transition: all 0.2s;
}

.btn-icon:hover {
  background-color: #eff6ff;
  color: #2563eb;
}

.text-right { text-align: right; }

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #94a3b8;
}

.spinner {
  border: 3px solid #e2e8f0;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* ============ RESPONSIVIDADE ============ */

/* Tablets e Telas Menores */
@media (max-width: 1024px) {
  .main-grid {
    grid-template-columns: 1fr; /* Um card por linha */
  }
}

/* Mobile */
@media (max-width: 640px) {
  .dashboard-view {
    padding: 1rem;
  }
  
  /* Oculta botão duplicado no mobile */
  .desktop-only {
    display: none !important;
  }

  .header-titles h1 {
    font-size: 1.5rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr; /* Um card por linha no mobile */
  }

  .content-card {
    padding: 1rem;
  }
}
</style>