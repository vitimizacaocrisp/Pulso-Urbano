<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-window fade-in-up">
      <header class="modal-header">
        <div class="header-title">
             <i class="fas fa-chart-bar icon"></i>
             <h3>Visualização de Dados</h3>
        </div>
        <p class="file-name">{{ file.name }}</p>
        <button class="close-btn" @click="$emit('close')" aria-label="Fechar">
            <i class="fas fa-times"></i>
        </button>
      </header>

      <div class="modal-body">
        <!-- Seção de Gráfico -->
        <div class="viz-section">
            <h4 class="section-title"><i class="fas fa-chart-pie"></i> Análise Gráfica</h4>
            
            <div v-if="chartData" class="chart-container">
              <Bar :data="chartData" :options="chartOptions" />
            </div>
            
            <div v-else-if="!parsingError && isParsing" class="state-box loading">
              <div class="spinner"></div>
              <span>Processando visualização...</span>
            </div>
            
            <div v-else-if="parsingError" class="state-box error">
              <i class="fas fa-exclamation-triangle"></i>
              {{ parsingError }}
            </div>
        </div>

        <div class="divider"></div>

        <!-- Seção de Tabela -->
        <div class="viz-section">
            <h4 class="section-title"><i class="fas fa-table"></i> Dados Tabulares</h4>
            <div class="table-wrapper">
                <DataTableViewer :file="file" @data-parsed="onDataParsed" />
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import DataTableViewer from './DataTableViewer.vue';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

defineProps({
  file: { type: File, required: true },
});
defineEmits(['close']);

const isParsing = ref(true);
const parsingError = ref(null);
const chartData = ref(null);
const chartOptions = reactive({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
      legend: { position: 'top' },
      title: { display: false }
  },
  scales: {
      y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
      x: { grid: { display: false } }
  }
});

const onDataParsed = ({ headers, rows }) => {
  isParsing.value = false;
  parsingError.value = null;
  chartData.value = null;

  if (!headers || !rows || rows.length === 0) {
    parsingError.value = "Não foram encontrados dados suficientes.";
    return;
  }

  // Tenta encontrar labels (texto) e valores (números) automaticamente
  const labelHeader = headers[0];
  let dataHeader = null;

  for (const header of headers) {
    if (header !== labelHeader && rows.some(row => row[header] && !isNaN(parseFloat(row[header])))) {
      dataHeader = header;
      break;
    }
  }

  if (labelHeader && dataHeader) {
    chartData.value = {
      labels: rows.slice(0, 30).map(row => row[labelHeader] || "N/A"),
      datasets: [{
        label: dataHeader,
        backgroundColor: '#6366f1',
        borderRadius: 4,
        data: rows.slice(0, 30).map(row => parseFloat(row[dataHeader]) || 0),
      }],
    };
  } else {
    parsingError.value = "Não foi possível identificar colunas numéricas para o gráfico.";
  }
};
</script>

<style scoped>
.modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(4px);
    display: flex; justify-content: center; align-items: center;
    z-index: 2000; padding: 1rem;
}

.modal-window {
    background: #fff;
    width: 100%; max-width: 1100px; height: 90vh;
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    display: flex; flex-direction: column;
    overflow: hidden;
}

.modal-header {
    padding: 1.5rem 2rem;
    border-bottom: 1px solid #e2e8f0;
    display: flex; align-items: center; justify-content: space-between;
    background: #f8fafc;
}
.header-title { display: flex; align-items: center; gap: 0.75rem; }
.header-title h3 { margin: 0; font-size: 1.25rem; color: #0f172a; }
.header-title .icon { color: #6366f1; font-size: 1.2rem; }
.file-name { color: #64748b; font-size: 0.9rem; font-family: monospace; background: #e2e8f0; padding: 0.2rem 0.6rem; border-radius: 4px; }
.close-btn {
    background: none; border: none; font-size: 1.25rem; color: #94a3b8;
    cursor: pointer; transition: color 0.2s; padding: 0.5rem;
}
.close-btn:hover { color: #ef4444; }

.modal-body {
    flex: 1; overflow-y: auto; padding: 2rem;
    background: #fff;
}

.viz-section { margin-bottom: 2rem; }
.section-title {
    font-size: 1rem; color: #334155; margin-bottom: 1rem;
    display: flex; align-items: center; gap: 0.5rem;
    text-transform: uppercase; font-weight: 700; font-size: 0.85rem;
}

.chart-container { height: 350px; position: relative; }
.table-wrapper { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }

.state-box {
    padding: 3rem; text-align: center; background: #f8fafc;
    border-radius: 8px; border: 1px dashed #cbd5e1; color: #64748b;
}
.state-box.error { color: #ef4444; border-color: #fecaca; background: #fef2f2; }
.spinner {
    width: 24px; height: 24px; border: 2px solid #cbd5e1; border-top-color: #6366f1;
    border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 0.5rem;
}

.divider { height: 1px; background: #f1f5f9; margin: 2rem 0; }
.fade-in-up { animation: fadeInUp 0.3s ease-out; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
</style>