<template>
  <main class="page-content">
    <header class="page-header">
      <h2>Painel de Vitimização</h2>
      <p>Análise de ocorrências de vitimização reportadas.</p>
    </header>

    <!-- Seção de Carregamento ou Erro -->
    <div v-if="isLoading" class="status-message">Carregando dados...</div>
    <div v-if="error" class="status-message error">{{ error }}</div>

    <!-- Conteúdo principal, exibido apenas após o carregamento bem-sucedido -->
    <template v-if="!isLoading && !error">
      <!-- 1. Filtros agora estão funcionais e ligados aos dados -->
      <section class="filters">
        <div class="filter-group">
          <label for="filter-ano">Ano:</label>
          <select id="filter-ano" v-model="filters.ano" @change="fetchData()">
            <option value="">Todos</option>
            <option v-for="ano in filterOptions.anos" :key="ano" :value="ano">{{ ano }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label for="filter-uf">UF:</label>
          <select id="filter-uf" v-model="filters.uf" @change="fetchData()">
            <option value="">Todas</option>
            <option v-for="uf in filterOptions.ufs" :key="uf" :value="uf">{{ uf }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label for="filter-crime">Crime:</label>
          <select id="filter-crime" v-model="filters.crime" @change="fetchData()">
            <option value="">Todos</option>
            <option v-for="crime in filterOptions.crimes" :key="crime" :value="crime">{{ crime }}</option>
          </select>
        </div>
      </section>

      <template v-if="dadosVitimizacao.length > 0">
        <section class="kpi-container">
          <div class="kpi-card">
            <h4>Total de Ocorrências</h4>
            <p>{{ formatNumber(kpis.totalOcorrencias) }}</p>
            <span>na seleção atual.</span>
          </div>
          <div class="kpi-card">
            <h4>Crime Mais Comum</h4>
            <p class="text-truncate">{{ kpis.crimeMaisComum }}</p>
            <span>na seleção atual.</span>
          </div>
          <div class="kpi-card">
            <h4>Estado com Mais Registros</h4>
            <p>{{ kpis.ufMaisRegistros }}</p>
            <span>na seleção atual.</span>
          </div>
          <div class="kpi-card">
            <h4>Ano Mais Recente</h4>
            <p>{{ kpis.anoRecente }}</p>
            <span>com dados na seleção.</span>
          </div>
        </section>

        <section class="visualizations-container">
          <div class="viz-item large">
            <h3>Ocorrências por Tipo de Crime</h3>
            <div class="chart-placeholder">
              <p>(Visualização de gráfico de barras ou pizza)</p>
            </div>
          </div>
          <div class="viz-item full-width">
            <h3>Dados Tabulares de Vitimização</h3>
            <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Ano</th>
                      <th>Mês</th>
                      <th>UF</th>
                      <th>Município</th>
                      <th>Tipo de Crime</th>
                      <th>Ocorrências</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(dado, index) in dadosVitimizacao" :key="index">
                      <td>{{ dado.ano }}</td>
                      <td>{{ dado.mes }}</td>
                      <td>{{ dado.uf }}</td>
                      <td>{{ dado.municipio }}</td>
                      <td>{{ dado.crime }}</td>
                      <td>{{ formatNumber(dado.ocorrencias) }}</td>
                    </tr>
                  </tbody>
                </table>
            </div>
          </div>
        </section>
      </template>

      <!-- Mensagem para quando não há dados -->
      <div v-if="dadosVitimizacao.length === 0" class="status-message">
        Nenhum dado de vitimização encontrado para os filtros selecionados.
      </div>
    </template>
  </main>
</template>

<script>
import axios from 'axios';

export default {
  name: 'VitimizacaoView',
  data() {
    return {
      dadosVitimizacao: [],
      kpis: {},
      isLoading: true,
      error: null,
      // 2. Estado para armazenar os valores dos filtros selecionados
      filters: {
        ano: '',
        uf: '',
        crime: '',
      },
      // 3. Estado para armazenar as opções disponíveis para cada filtro
      filterOptions: {
        anos: [],
        ufs: [],
        crimes: [],
      },
    };
  },
  methods: {
    // 4. fetchData agora envia os filtros para o backend
    async fetchData(repopulateFilters = false) {
      this.isLoading = true;
      this.error = null;
      try {
        const params = repopulateFilters ? {} : this.filters;
        const response = await axios.get('/api/paineis/vitimizacao', { params });
        
        const data = response.data.sort((a, b) => b.ano - a.ano || b.mes - a.mes);

        if (repopulateFilters) {
          this.dadosVitimizacao = data;
          this.populateFilterOptions(data); // Popula os filtros na primeira carga
        } else {
          this.dadosVitimizacao = data;
        }
        
        this.calculateKPIs();
      } catch (err) {
        this.error = 'Não foi possível carregar os dados. Tente novamente mais tarde.';
        console.error('Erro ao buscar dados de vitimização:', err);
      } finally {
        this.isLoading = false;
      }
    },
    // 5. Nova função para extrair opções únicas dos dados e popular os selects
    populateFilterOptions(data) {
        if (!data) return;
        const anos = new Set();
        const ufs = new Set();
        const crimes = new Set();

        data.forEach(item => {
            if(item.ano) anos.add(item.ano);
            if(item.uf) ufs.add(item.uf);
            if(item.crime) crimes.add(item.crime);
        });

        this.filterOptions.anos = Array.from(anos).sort((a, b) => b - a);
        this.filterOptions.ufs = Array.from(ufs).sort();
        this.filterOptions.crimes = Array.from(crimes).sort();
    },
    calculateKPIs() {
      if (this.dadosVitimizacao.length === 0) {
        this.kpis = {};
        return;
      }

      const totalOcorrencias = this.dadosVitimizacao.reduce((acc, item) => acc + (Number(item.ocorrencias) || 0), 0);

      const crimeCounts = this.dadosVitimizacao.reduce((acc, item) => {
        acc[item.crime] = (acc[item.crime] || 0) + (Number(item.ocorrencias) || 0);
        return acc;
      }, {});
      const crimeMaisComum = Object.keys(crimeCounts).reduce((a, b) => crimeCounts[a] > crimeCounts[b] ? a : b, 'N/A');

      const ufCounts = this.dadosVitimizacao.reduce((acc, item) => {
        acc[item.uf] = (acc[item.uf] || 0) + (Number(item.ocorrencias) || 0);
        return acc;
      }, {});
      const ufMaisRegistros = Object.keys(ufCounts).reduce((a, b) => ufCounts[a] > ufCounts[b] ? a : b, 'N/A');
      
      const anoMaisRecente = Math.max(...this.dadosVitimizacao.map(item => item.ano));

      this.kpis = {
        totalOcorrencias,
        crimeMaisComum,
        ufMaisRegistros,
        anoRecente: anoMaisRecente || 'N/A',
      };
    },
    formatNumber(num) {
      if (typeof num !== 'number') return num || '-';
      return num.toLocaleString('pt-BR');
    },
  },
  created() {
    // 6. Na primeira carga, busca todos os dados para popular os filtros
    this.fetchData(true);
  },
};
</script>

<style scoped>
/* Adicionando estilos para os filtros */
.filters {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
  background-color: #fff;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  flex-wrap: wrap;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.filter-group label {
  font-weight: 600;
  color: #343a40;
}
.filter-group select {
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background-color: #fff;
}
/* ... resto dos estilos ... */
.page-content {
  padding: 2rem;
}
.page-header h2 {
  margin-bottom: 0.5rem;
}
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
.kpi-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}
.kpi-card {
  background-color: #fff;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.kpi-card h4 {
  font-size: 1rem;
  color: #6c757d;
  margin-bottom: 0.5rem;
}
.kpi-card p {
  font-size: 2.2rem;
  font-weight: 600;
  margin: 0.5rem 0;
}
.kpi-card span {
  font-size: 0.9rem;
  color: #6c757d;
}
.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.visualizations-container {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
}
.viz-item {
  background-color: #fff;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  background-color: #f8f9fa;
  border: 1px dashed #ccc;
  border-radius: 8px;
  color: #6c757d;
}
.table-container {
  max-height: 400px;
  overflow-y: auto;
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
