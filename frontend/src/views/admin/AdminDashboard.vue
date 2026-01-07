<template>
  <div class="dashboard-view">
    <header class="view-header">
      <div class="header-titles">
        <h1 class="welcome-text">Olá, Administrador 👋</h1>
        <p class="subtitle">Aqui está o que está acontecendo no seu observatório hoje.</p>
      </div>
      <!-- Botão CTA Desktop -->
      <router-link :to="{ name: 'ContentManager' }" class="btn-create desktop-only">
        <span class="icon-plus">+</span> Nova Análise
      </router-link>
    </header>

    <main class="view-content">
      <div v-if="isLoading" class="loading-container">
        <div class="spinner"></div>
        <p>Sincronizando dados...</p>
      </div>

      <div v-else class="content-wrapper">
        <!-- Cards de Estatísticas (KPIs) -->
        <div class="kpi-grid">
          <div class="kpi-card blue">
            <div class="kpi-content">
              <span class="kpi-label">Total Publicado</span>
              <h3 class="kpi-value">{{ stats.totalAnalyses }}</h3>
            </div>
            <div class="kpi-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
          </div>

          <div class="kpi-card green">
            <div class="kpi-content">
              <span class="kpi-label">Novas (Mês)</span>
              <h3 class="kpi-value">{{ stats.newThisMonth }}</h3>
            </div>
            <div class="kpi-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
          </div>

          <div class="kpi-card purple">
            <div class="kpi-content">
              <span class="kpi-label">Tags Ativas</span>
              <h3 class="kpi-value">{{ stats.uniqueTags }}</h3>
            </div>
            <div class="kpi-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
            </div>
          </div>
        </div>

        <!-- Seção Principal: Gráfico e Lista -->
        <div class="dashboard-grid">
          
          <!-- Gráfico -->
          <div class="panel-card chart-panel">
            <div class="panel-header">
              <h2>Tendência de Publicações</h2>
              <span class="badge">Últimos 6 meses</span>
            </div>
            <div class="chart-container">
              <canvas id="monthlyPublicationsChart"></canvas>
            </div>
          </div>

          <!-- Tabela Recentes -->
          <div class="panel-card list-panel">
            <div class="panel-header">
              <h2>Adicionados Recentemente</h2>
              <router-link :to="{ name: 'EditAnalysis' }" class="link-action">Gerenciar tudo</router-link>
            </div>
            
            <div v-if="error" class="alert error">{{ error }}</div>
            
            <div v-if="!error && recentAnalyses.length > 0" class="table-responsive">
              <table class="modern-table">
                <thead>
                  <tr>
                    <th>Análise</th>
                    <th>Data</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in recentAnalyses" :key="item.id">
                    <td>
                      <div class="item-info">
                        <span class="item-title" :title="item.title">{{ item.title }}</span>
                        <div class="item-tags">
                            <span class="mini-tag">{{ item.category }}</span>
                        </div>
                      </div>
                    </td>
                    <td class="item-date">{{ formatDate(item.created_date) }}</td>
                    <td class="item-action">
                      <router-link :to="{ name: 'EditAnalysis', query: { id: item.id } }" class="action-btn" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
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

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const options = { day: '2-digit', month: 'short' }; // Ex: 10 Out
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
      console.error(err);
      // Mock para UI não quebrar
      stats.value = { totalAnalyses: '--', newThisMonth: '--', uniqueTags: '--' };
    }
  } finally {
    isLoading.value = false;
  }
};

const createChart = (chartData) => {
    const ctx = document.getElementById('monthlyPublicationsChart');
    if (!ctx) return;
    
    if (chartInstance) chartInstance.destroy();
    
    // Configuração visual do gráfico
    chartInstance = new Chart(ctx, {
        type: 'line', // Mudança para linha para mostrar tendência melhor
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Publicações',
                data: chartData.data,
                backgroundColor: 'rgba(99, 102, 241, 0.1)', // Indigo com transparência
                borderColor: '#6366f1',
                borderWidth: 2,
                tension: 0.4, // Curva suave
                fill: true,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#6366f1',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: { color: '#f1f5f9', borderDash: [5, 5] },
                    ticks: { stepSize: 1, font: { size: 11 } },
                    border: { display: false }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } },
                    border: { display: false }
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
.dashboard-view {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  animation: fadeIn 0.5s ease-out;
  color: var(--text-main);
}

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* HEADER */
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2.5rem;
}

.welcome-text {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
  letter-spacing: -0.5px;
}

.subtitle {
  color: var(--text-secondary);
  margin: 0.5rem 0 0 0;
  font-size: 0.95rem;
}

.btn-create {
  background-color: var(--brand-primary);
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}
.btn-create:hover { background-color: var(--brand-primary-hover); transform: translateY(-1px); }
.icon-plus { font-size: 1.2rem; line-height: 1; }

/* KPI CARDS */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.kpi-card {
  background: var(--bg-surface);
  padding: 1.5rem;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  transition: transform 0.2s, box-shadow 0.2s;
}
.kpi-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }

.kpi-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.kpi-value { font-size: 2rem; font-weight: 800; color: var(--text-main); margin: 0.5rem 0 0 0; line-height: 1; }

.kpi-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}

/* Cores dos KPIs (Essas podem manter cores fixas suaves ou adaptar) */
.kpi-card.blue .kpi-icon { background-color: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.kpi-card.green .kpi-icon { background-color: rgba(16, 185, 129, 0.1); color: #10b981; }
.kpi-card.purple .kpi-icon { background-color: rgba(139, 92, 246, 0.1); color: #8b5cf6; }

/* DASHBOARD GRID */
.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
}

.panel-card {
  background: var(--bg-surface);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  display: flex; flex-direction: column;
}

.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 1.5rem;
}
.panel-header h2 { font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin: 0; }

.badge { background: var(--bg-body); color: var(--text-secondary); padding: 0.25rem 0.6rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600; }
.link-action { color: var(--brand-primary); font-size: 0.85rem; font-weight: 600; text-decoration: none; }
.link-action:hover { text-decoration: underline; }

.chart-container { height: 300px; position: relative; width: 100%; }

/* TABELA MODERNA */
.table-responsive { overflow-x: auto; }
.modern-table { width: 100%; border-collapse: collapse; }
.modern-table th {
  text-align: left; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;
  font-weight: 700; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);
}
.modern-table td { padding: 1rem 0; border-bottom: 1px solid var(--bg-body); vertical-align: middle; color: var(--text-main); }
.modern-table tr:last-child td { border-bottom: none; }

.item-title { display: block; font-weight: 600; color: var(--text-main); font-size: 0.9rem; margin-bottom: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
.mini-tag { font-size: 0.7rem; background: var(--bg-body); color: var(--text-secondary); padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 500; }
.item-date { font-size: 0.85rem; color: var(--text-muted); white-space: nowrap; }
.action-btn { color: var(--text-muted); transition: color 0.2s; padding: 0.5rem; }
.action-btn:hover { color: var(--brand-primary); }

/* LOADING */
.loading-container {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 400px; color: var(--text-muted);
}
.spinner {
  width: 32px; height: 32px; border: 3px solid var(--border-color); border-top-color: var(--brand-primary);
  border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* RESPONSIVIDADE */
@media (max-width: 1024px) {
  .dashboard-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .dashboard-view { padding: 1.5rem; }
  .desktop-only { display: none !important; }
  .view-header { margin-bottom: 1.5rem; }
  .welcome-text { font-size: 1.5rem; }
  .kpi-grid { grid-template-columns: 1fr; }
}
</style>