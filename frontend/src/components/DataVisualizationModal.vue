<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-content">
      <button class="modal-close-btn" @click="$emit('close')">×</button>
      
      <header class="modal-header">
        <h3>Visualização de Dados: {{ file.name }}</h3>
      </header>

      <div class="modal-body">
        <div class="data-section">
          <h4>Dados Tabulares</h4>
          <DataTableViewer :file="file" @data-parsed="onDataParsed" />
        </div>

        <div v-if="chartData" class="chart-section">
          <h4>Visualização Gráfica</h4>
          <p class="chart-description">Gráfico de barras gerado a partir da primeira coluna de texto e da primeira coluna numérica encontradas.</p>
          <Bar :data="chartData" :options="chartOptions" />
        </div>
        <div v-else-if="!parsingError && isParsing" class="loading-chart">
          A gerar visualização gráfica...
        </div>
         <div v-else-if="parsingError" class="feedback-error">
          {{ parsingError }}
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
});

const onDataParsed = ({ headers, rows }) => {
  isParsing.value = false;
  parsingError.value = null;
  chartData.value = null;

  if (!headers || !rows || rows.length === 0) {
    parsingError.value = "Não foram encontrados dados para gerar um gráfico.";
    return;
  }

  const labelHeader = headers[0];
  let dataHeader = null;

  for (const header of headers) {
    if (header !== labelHeader && rows.every(row => row[header] && !isNaN(parseFloat(row[header])))) {
      dataHeader = header;
      break;
    }
  }

  if (labelHeader && dataHeader) {
    chartData.value = {
      labels: rows.slice(0, 50).map(row => row[labelHeader] || "N/A"), // Limita a 50 rótulos por performance
      datasets: [{
        label: `Valores de ${dataHeader}`,
        backgroundColor: '#42A5F5',
        data: rows.slice(0, 50).map(row => parseFloat(row[dataHeader]) || 0),
      }],
    };
  } else {
    parsingError.value = "Não foi encontrada uma coluna puramente numérica para servir de dados para o gráfico.";
  }
};
</script>

<style scoped>
.modal-backdrop{position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;z-index:1000}.modal-content{background-color:#fff;border-radius:8px;box-shadow:0 5px 15px rgba(0,0,0,.3);width:90%;max-width:1000px;height:85vh;display:flex;flex-direction:column;position:relative}.modal-close-btn{position:absolute;top:10px;right:15px;background:0 0;border:none;font-size:2rem;color:#666;cursor:pointer;line-height:1}.modal-header{padding:1.5rem;border-bottom:1px solid #dee2e6}.modal-header h3{margin:0}.modal-body{padding:1.5rem;overflow-y:auto;flex-grow:1}.data-section,.chart-section{margin-bottom:2rem}.chart-section{height:400px}.chart-description{font-size:.9rem;color:#6c757d;margin-bottom:1rem}.feedback-error,.loading-chart{padding:1rem;border-radius:4px;text-align:center;background-color:#e9ecef;margin-top:1rem}.feedback-error{background-color:#f8d7da;color:#721c24}
</style>