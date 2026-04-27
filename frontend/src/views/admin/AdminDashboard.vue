<template>
  <div class="dashboard-page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Visão Geral <span class="wave">👋</span></h1>
        <p class="page-subtitle">Bem-vindo de volta. Aqui está o resumo do observatório.</p>
      </div>
      <router-link :to="{ name: 'ContentManager' }" class="btn-primary">
        <Icon icon="mdi:plus" width="18" /> Nova Análise
      </router-link>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-screen">
      <div class="spinner"></div>
      <p>Sincronizando dados...</p>
    </div>

    <template v-else>

      <!-- KPI Cards -->
      <div class="kpi-row">
        <div class="kpi-card" v-for="kpi in kpiCards" :key="kpi.label">
          <div class="kpi-left">
            <span class="kpi-label">{{ kpi.label }}</span>
            <div class="kpi-value">{{ kpi.value }}</div>
            <span class="kpi-sub" :class="kpi.trendClass">
              <Icon :icon="kpi.trendIcon" width="13" /> {{ kpi.sub }}
            </span>
          </div>
          <div class="kpi-icon-wrap" :style="{ background: kpi.iconBg }">
            <Icon :icon="kpi.icon" width="22" :style="{ color: kpi.iconColor }" />
          </div>
        </div>
      </div>

      <!-- Main grid -->
      <div class="dash-grid">

        <!-- Chart -->
        <div class="panel chart-panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Publicações</h2>
              <p class="panel-sub">Últimos 6 meses</p>
            </div>
            <span class="badge-pill">{{ totalPublications }} total</span>
          </div>
          <div class="chart-wrap">
            <canvas ref="chartCanvas"></canvas>
          </div>
        </div>

        <!-- Recent + Actions -->
        <div class="side-stack">

          <!-- Quick actions -->
          <div class="panel actions-panel">
            <h2 class="panel-title">Ações Rápidas</h2>
            <div class="quick-actions">
              <router-link :to="{ name: 'ContentManager' }" class="qa-btn primary">
                <Icon icon="mdi:plus-circle-outline" width="20" />
                Nova Análise
              </router-link>
              <router-link :to="{ name: 'EditAnalysis' }" class="qa-btn secondary">
                <Icon icon="mdi:file-document-edit-outline" width="20" />
                Editar Existente
              </router-link>
              <a href="/" target="_blank" class="qa-btn ghost">
                <Icon icon="mdi:eye-outline" width="20" />
                Ver Site Público
              </a>
            </div>
          </div>

          <!-- Recent list -->
          <div class="panel recent-panel">
            <div class="panel-head">
              <h2 class="panel-title">Adicionados Recentemente</h2>
              <router-link :to="{ name: 'EditAnalysis' }" class="link-sm">Ver tudo</router-link>
            </div>

            <div v-if="error" class="alert-error">{{ error }}</div>

            <ul v-else class="recent-list">
              <li v-for="item in recentAnalyses" :key="item.id" class="recent-item">
                <div class="item-dot"></div>
                <div class="item-body">
                  <span class="item-title">{{ item.title }}</span>
                  <div class="item-meta">
                    <span class="item-cat">{{ item.category || '—' }}</span>
                    <span class="item-date">{{ item.created_date }}</span>
                  </div>
                </div>
                <router-link :to="{ name: 'EditAnalysis', query: { id: item.id } }" class="item-edit" title="Editar">
                  <Icon icon="mdi:pencil-outline" width="16" />
                </router-link>
              </li>
              <li v-if="recentAnalyses.length === 0" class="empty-list">
                Nenhuma análise publicada ainda.
              </li>
            </ul>
          </div>

        </div>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import axios from 'axios';
import Chart from 'chart.js/auto';

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';
const router  = useRouter();

const isLoading      = ref(true);
const error          = ref(null);
const recentAnalyses = ref([]);
const stats          = ref({ totalAnalyses: 0, newThisMonth: 0, uniqueTags: 0 });
const chartCanvas    = ref(null);
let chartInstance    = null;

const totalPublications = computed(() => stats.value.totalAnalyses || 0);

const kpiCards = computed(() => [
  {
    label: 'Total Publicado', value: stats.value.totalAnalyses ?? '—',
    sub: 'análises no acervo', trendClass: 'trend-blue', trendIcon: 'mdi:archive-outline',
    icon: 'mdi:file-document-multiple-outline', iconBg: 'rgba(59,130,246,0.1)', iconColor: '#3b82f6'
  },
  {
    label: 'Novas este Mês', value: stats.value.newThisMonth ?? '—',
    sub: 'publicadas no mês', trendClass: 'trend-green', trendIcon: 'mdi:trending-up',
    icon: 'mdi:calendar-plus-outline', iconBg: 'rgba(16,185,129,0.1)', iconColor: '#10b981'
  },
  {
    label: 'Tags Ativas', value: stats.value.uniqueTags ?? '—',
    sub: 'categorias distintas', trendClass: 'trend-purple', trendIcon: 'mdi:tag-multiple-outline',
    icon: 'mdi:tag-multiple-outline', iconBg: 'rgba(139,92,246,0.1)', iconColor: '#8b5cf6'
  }
]);

const fetchData = async () => {
  isLoading.value = true;
  error.value = null;
  const token = localStorage.getItem('authToken');
  if (!token) { router.push({ name: 'AdminLogin' }); return; }

  try {
    const { data } = await axios.get(`${API_URL}/api/admin/dashboard-data`, {
      headers: { Authorization: `Bearer ${token}` }, timeout: 15000
    });
    const d = data.data;
    stats.value          = d.stats;
    recentAnalyses.value = d.recentAnalyses;
    setTimeout(() => buildChart(d.chartData), 80);
  } catch (err) {
    if (err.response?.status === 401) {
      router.push({ name: 'AdminLogin' });
    } else {
      error.value = 'Não foi possível carregar os dados.';
      stats.value = { totalAnalyses: '--', newThisMonth: '--', uniqueTags: '--' };
    }
  } finally {
    isLoading.value = false;
  }
};

const buildChart = (chartData) => {
  const ctx = chartCanvas.value;
  if (!ctx) return;
  if (chartInstance) chartInstance.destroy();

  const isDark = document.documentElement.classList.contains('dark') ||
                 document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Publicações',
          data: chartData.data,
          backgroundColor: (ctx) => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 280);
            g.addColorStop(0, 'rgba(99,102,241,0.85)');
            g.addColorStop(1, 'rgba(99,102,241,0.15)');
            return g;
          },
          borderRadius: 6,
          borderSkipped: false,
          borderColor: 'rgba(99,102,241,0.9)',
          borderWidth: 0,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#0f172a',
          titleColor: '#fff', bodyColor: '#94a3b8',
          padding: 12, cornerRadius: 8, displayColors: false,
          callbacks: { label: (ctx) => ` ${ctx.parsed.y} publicação(ões)` }
        }
      },
      scales: {
        y: {
          beginAtZero: true, border: { display: false },
          grid: { color: gridColor },
          ticks: { stepSize: 1, color: textColor, font: { size: 11 } }
        },
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: { color: textColor, font: { size: 11 } }
        }
      },
      animation: { duration: 600, easing: 'easeOutQuart' }
    }
  });
};

onMounted(fetchData);
onBeforeUnmount(() => { if (chartInstance) chartInstance.destroy(); });
</script>

<style scoped>
.dashboard-page {
  padding: 2rem;
  max-width: 1360px;
  margin: 0 auto;
  animation: fadeUp 0.4s ease-out both;
}
@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

/* Header */
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
.page-title  { font-size: 1.8rem; font-weight: 800; color: var(--text-main); margin: 0; letter-spacing: -0.5px; }
.page-subtitle { color: var(--text-secondary); margin: 0.25rem 0 0; font-size: 0.9rem; }
.wave { display: inline-block; animation: wave 2s ease-in-out infinite; transform-origin: 70% 70%; }
@keyframes wave { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(20deg); } 75% { transform: rotate(-10deg); } }

.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--brand-primary); color: #fff;
  padding: 0.65rem 1.25rem; border-radius: 8px;
  font-weight: 600; font-size: 0.9rem; text-decoration: none;
  transition: all 0.2s; box-shadow: 0 2px 8px rgba(99,102,241,0.3);
}
.btn-primary:hover { filter: brightness(1.08); transform: translateY(-1px); }

/* Loading */
.loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 40vh; color: var(--text-muted); gap: 1rem; }
.spinner { width: 36px; height: 36px; border: 3px solid var(--border-color); border-top-color: var(--brand-primary); border-radius: 50%; animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* KPI */
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem; }
.kpi-card {
  background: var(--bg-card, var(--bg-surface));
  border: 1px solid var(--border-color);
  border-radius: 14px; padding: 1.25rem 1.5rem;
  display: flex; justify-content: space-between; align-items: flex-start;
  transition: transform 0.2s, box-shadow 0.2s;
}
.kpi-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.kpi-left { display: flex; flex-direction: column; gap: 4px; }
.kpi-label { font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-muted); }
.kpi-value { font-size: 2.2rem; font-weight: 800; color: var(--text-main); line-height: 1; margin: 4px 0; }
.kpi-sub   { font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
.trend-blue   { color: #3b82f6; }
.trend-green  { color: #10b981; }
.trend-purple { color: #8b5cf6; }
.kpi-icon-wrap { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

/* Grid */
.dash-grid { display: grid; grid-template-columns: 1fr 380px; gap: 1.5rem; }

/* Panels */
.panel {
  background: var(--bg-card, var(--bg-surface));
  border: 1px solid var(--border-color);
  border-radius: 14px; padding: 1.5rem;
}
.panel-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; }
.panel-title { font-size: 1rem; font-weight: 700; color: var(--text-main); margin: 0; }
.panel-sub   { font-size: 0.78rem; color: var(--text-muted); margin: 2px 0 0; }
.badge-pill  { background: var(--bg-hover); color: var(--text-secondary); font-size: 0.75rem; font-weight: 600; padding: 3px 10px; border-radius: 99px; }
.link-sm     { font-size: 0.82rem; font-weight: 600; color: var(--brand-primary); text-decoration: none; }
.link-sm:hover { text-decoration: underline; }

.chart-wrap  { height: 260px; position: relative; }

/* Side stack */
.side-stack  { display: flex; flex-direction: column; gap: 1.5rem; }

/* Quick actions */
.actions-panel { padding: 1.25rem 1.5rem; }
.quick-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 1rem; }
.qa-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 0.65rem 1rem; border-radius: 8px;
  font-size: 0.88rem; font-weight: 600;
  text-decoration: none; cursor: pointer;
  transition: all 0.15s; border: none;
}
.qa-btn.primary  { background: var(--brand-primary); color: #fff; }
.qa-btn.primary:hover { filter: brightness(1.08); }
.qa-btn.secondary { background: rgba(99,102,241,0.1); color: var(--brand-primary); }
.qa-btn.secondary:hover { background: rgba(99,102,241,0.18); }
.qa-btn.ghost    { background: var(--bg-hover); color: var(--text-secondary); }
.qa-btn.ghost:hover { color: var(--text-main); }

/* Recent */
.recent-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0; }
.recent-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 0; border-bottom: 1px solid var(--border-color);
}
.recent-item:last-child { border-bottom: none; }
.item-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brand-primary); flex-shrink: 0; }
.item-body { flex: 1; min-width: 0; }
.item-title { font-size: 0.875rem; font-weight: 600; color: var(--text-main); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-meta  { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.item-cat   { font-size: 0.7rem; background: var(--bg-hover); color: var(--text-secondary); padding: 1px 7px; border-radius: 4px; }
.item-date  { font-size: 0.72rem; color: var(--text-muted); }
.item-edit  { color: var(--text-muted); transition: color 0.15s; padding: 4px; flex-shrink: 0; }
.item-edit:hover { color: var(--brand-primary); }
.empty-list { color: var(--text-muted); font-size: 0.875rem; padding: 1rem 0; text-align: center; }
.alert-error { color: #ef4444; font-size: 0.875rem; }

/* Responsive */
@media (max-width: 1100px) { .dash-grid { grid-template-columns: 1fr; } .side-stack { display: grid; grid-template-columns: 1fr 1fr; } }
@media (max-width: 768px) { .dashboard-page { padding: 1.25rem; } .kpi-row { grid-template-columns: 1fr; } .side-stack { display: flex; flex-direction: column; } }
</style>
