<template>
  <main class="page-content">
    <header class="page-header">
      <h2>Painel de Homicídios</h2>
      <p>Dados sobre a taxa de homicídios dolosos no Brasil (por 100.000 habitantes).</p>
    </header>

    <!-- Seção de Carregamento ou Erro -->
    <div v-if="isLoading" class="status-message">Carregando dados...</div>
    <div v-if="error" class="status-message error">{{ error }}</div>

    <!-- Conteúdo principal, exibido apenas após o carregamento bem-sucedido -->
    <template v-if="!isLoading && !error && kpis.anoRecente">
      <section class="kpi-container">
        <div class="kpi-card">
          <h4>Taxa no Brasil ({{ kpis.anoRecente }})</h4>
          <p>{{ formatNumber(kpis.taxaRecente) }}</p>
          <span>por 100.000 habitantes.</span>
        </div>
        <div class="kpi-card">
          <h4>Variação Anual</h4>
          <p :class="getVariationClass(kpis.variacaoAnual)">
            {{ formatNumber(kpis.variacaoAnual, true) }}%
          </p>
          <span>em relação a {{ kpis.anoAnterior }}.</span>
        </div>
        <div class="kpi-card">
          <h4>Maior Taxa Registrada</h4>
          <p>{{ formatNumber(kpis.maiorTaxa.taxa) }}</p>
          <span>no ano de {{ kpis.maiorTaxa.ano }}.</span>
        </div>
        <div class="kpi-card">
          <h4>Menor Taxa Registrada</h4>
          <p>{{ formatNumber(kpis.menorTaxa.taxa) }}</p>
          <span>no ano de {{ kpis.menorTaxa.ano }}.</span>
        </div>
      </section>

      <section class="filters">
        <!-- Filtros podem ser implementados no futuro -->
        <label>Ano:</label>
        <select disabled><option>{{ kpis.anoRecente }}</option></select>
        <label>Região:</label>
        <select disabled><option>Brasil</option></select>
      </section>

      <section class="visualizations-container">
        <div class="viz-item large">
          <h3>Evolução da Taxa de Homicídios no Brasil</h3>
          <!-- A integração de gráficos (ex: Chart.js) pode ser feita aqui -->
          <div class="chart-placeholder">
            <p>(Visualização de gráfico de linhas)</p>
          </div>
        </div>
        <div class="viz-item medium">
          <h3>Comparativo Anual</h3>
           <div class="chart-placeholder">
            <p>(Visualização de gráfico de barras)</p>
          </div>
        </div>
         <div class="viz-item medium">
          <h3>Dados Tabulares</h3>
           <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Ano</th>
                    <th>Taxa / 100k</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="dado in dadosHomicidios" :key="dado.ano">
                    <td>{{ dado.ano }}</td>
                    <td>{{ formatNumber(dado.taxa_por_100k) }}</td>
                  </tr>
                </tbody>
              </table>
           </div>
        </div>
      </section>
    </template>
  </main>
</template>

<script>
import axios from 'axios';

export default {
  name: 'HomicidiosView',
  data() {
    return {
      dadosHomicidios: [], // Armazena a lista de dados da API
      kpis: {},            // Armazena os indicadores calculados para os cards
      isLoading: true,     // Controla a exibição da mensagem de carregamento
      error: null,         // Armazena mensagens de erro
    };
  },
  methods: {
    // Método principal para buscar os dados da nossa API
    async fetchData() {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await axios.get('/api/paineis/homicidios');
        // Ordena os dados por ano, do mais antigo para o mais recente
        this.dadosHomicidios = response.data.sort((a, b) => a.ano - b.ano);
        this.calculateKPIs(); // Calcula os indicadores após receber os dados
      } catch (err) {
        this.error = 'Não foi possível carregar os dados. Tente novamente mais tarde.';
        console.error('Erro ao buscar dados de homicídios:', err);
      } finally {
        this.isLoading = false;
      }
    },
    // Calcula os principais indicadores para os cards
    calculateKPIs() {
      if (this.dadosHomicidios.length < 2) {
        this.kpis = { anoRecente: 'N/A', taxaRecente: 0 };
        return;
      }
      
      const dadosMaisRecentes = this.dadosHomicidios[this.dadosHomicidios.length - 1];
      const dadosAnteriores = this.dadosHomicidios[this.dadosHomicidios.length - 2];

      const variacao = ((dadosMaisRecentes.taxa_por_100k - dadosAnteriores.taxa_por_100k) / dadosAnteriores.taxa_por_100k) * 100;

      const maiorTaxa = [...this.dadosHomicidios].sort((a, b) => b.taxa_por_100k - a.taxa_por_100k)[0];
      const menorTaxa = [...this.dadosHomicidios].sort((a, b) => a.taxa_por_100k - b.taxa_por_100k)[0];

      this.kpis = {
        anoRecente: dadosMaisRecentes.ano,
        taxaRecente: dadosMaisRecentes.taxa_por_100k,
        anoAnterior: dadosAnteriores.ano,
        variacaoAnual: variacao,
        maiorTaxa: { taxa: maiorTaxa.taxa_por_100k, ano: maiorTaxa.ano },
        menorTaxa: { taxa: menorTaxa.taxa_por_100k, ano: menorTaxa.ano },
      };
    },
    // Formata números para exibição
    formatNumber(num, showSign = false) {
      if (typeof num !== 'number') return '-';
      const formattedNum = num.toFixed(1).replace('.', ',');
      if (showSign && num > 0) return `+${formattedNum}`;
      return formattedNum;
    },
    // Retorna uma classe CSS com base na variação (positiva/negativa)
    getVariationClass(variation) {
      if (variation > 0) return 'variation-up';   // Vermelho para aumento
      if (variation < 0) return 'variation-down'; // Verde para queda
      return '';
    }
  },
  // O hook created() é chamado quando o componente é criado na memória
  created() {
    this.fetchData();
  },
};
</script>

<style scoped>
/* Adicione estes estilos para as mensagens e indicadores dinâmicos */
.status-message {
  text-align: center;
  padding: 3rem;
  font-size: 1.2rem;
  color: #555;
}
.status-message.error {
  color: #dc3545;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
}

.kpi-card p {
  font-size: 2.2rem; /* Aumenta o tamanho do número principal */
  margin: 0.5rem 0;
}

.variation-up {
  color: #dc3545; /* Vermelho para aumento (negativo em homicídios) */
}

.variation-down {
  color: #28a745; /* Verde para queda (positivo em homicídios) */
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  background-color: #f8f9fa;
  border: 1px dashed #ccc;
  border-radius: 8px;
  color: #6c757d;
}

.table-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f2f2f2;
  position: sticky;
  top: 0;
}
</style>
