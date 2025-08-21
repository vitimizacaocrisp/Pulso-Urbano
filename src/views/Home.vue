<template>
  <main>
    <section class="hero">
      <div class="hero-content">
        <h2>Democratizando dados e análises sobre segurança pública e justiça no Brasil.</h2>
        <p>O Pulso Urbano integra dados de vitimização e registros administrativos para revelar um panorama completo
          sobre a criminalidade e o acesso à justiça no país.</p>
        <a href="#paineis" class="btn-primary">Explorar os Painéis</a>
      </div>
    </section>

    <!-- 2. NOVA SEÇÃO DE DESTAQUE DO DIA -->
    <section class="highlight-section">
      <h2 class="section-title">Destaque do Dia</h2>
      <div v-if="dailyHighlight.isLoading" class="status-message">
        <div class="spinner-large"></div>
        <p>Gerando destaque...</p>
      </div>
      <div v-else-if="dailyHighlight.error" class="status-message error">
        {{ dailyHighlight.error }}
      </div>
      <article v-else class="card card-highlight">
        <h3>{{ dailyHighlight.title }}</h3>
        <p class="highlight-value">{{ dailyHighlight.value }}</p>
        <span class="highlight-unit">{{ dailyHighlight.unit }}</span>
        <span class="highlight-source">Fonte: {{ dailyHighlight.source }}</span>
      </article>
    </section>

    <section class="featured-section" id="paineis">
      <h2 class="section-title">Painéis de Dados</h2>
      <div class="card-container">
        <article class="card">
          <h3>Monitor do Homicídio</h3>
          <p>Análise detalhada das taxas de homicídios dolosos, perfil das vítimas e o impacto do crime organizado.</p>
          <div class="card-footer">
            <a href="/paineis/homicidios" class="card-link">Acessar Painel</a>
            <!-- 1. ÍCONE DE CARREGAMENTO NO BADGE -->
            <span v-if="apiStatus.homicides.isLoading" class="status-badge loading"><div class="spinner-badge"></div></span>
            <span v-else-if="apiStatus.homicides.error" class="status-badge error">Offline</span>
            <span v-else class="status-badge online">Online</span>
          </div>
        </article>

        <article class="card">
          <h3>Atlas da Vitimização</h3>
          <p>Explore dados sobre crimes reportados e não reportados à polícia, baseados em pesquisas de vitimização.</p>
           <div class="card-footer">
            <a href="/paineis/vitimizacao" class="card-link">Acessar Painel</a>
            <span v-if="apiStatus.victimization.isLoading" class="status-badge loading"><div class="spinner-badge"></div></span>
            <span v-else-if="apiStatus.victimization.error" class="status-badge error">Offline</span>
            <span v-else class="status-badge online">Online</span>
          </div>
        </article>
        
        <article class="card disabled">
          <h3>Observatório da Violência de Gênero</h3>
          <p>Dados sobre feminicídio e violência doméstica, revelando o lar como um dos espaços mais perigosos para mulheres.</p>
           <div class="card-footer">
            <a href="#" class="card-link">Em breve</a>
            <span class="status-badge neutral">Pendente</span>
          </div>
        </article>
      </div>
    </section>
    
    <section class="context-section">
      <h2 class="section-title">Contexto Nacional <span class="data-source">(IBGE, {{ population.ano || '...' }})</span></h2>
      
      <!-- 1. ÍCONE DE CARREGAMENTO NA SEÇÃO -->
      <div v-if="apiStatus.population.isLoading" class="status-message">
        <div class="spinner-large"></div>
        <p>Carregando dados populacionais...</p>
      </div>
      <div v-else-if="apiStatus.population.error" class="status-message error">{{ apiStatus.population.error }}</div>
      <div v-else class="card-container" id="ibge-data-container">
        <article class="card card-data-highlight">
            <h3>População Total do Brasil</h3>
            <p class="data-value">{{ formatNumber(population.total) }}</p>
        </article>
        <article class="card" v-for="state in population.top3States" :key="state.uf">
            <h3>{{ state.uf }}</h3>
            <p class="data-value">{{ formatNumber(state.populacao) }}</p>
        </article>
      </div>
    </section>

    <section class="api-status-section">
        <h2 class="section-title">Status das Fontes de Dados</h2>
        <div class="status-list">
            <div v-for="(status, key) in apiStatus" :key="key" class="status-item">
                <span class="status-name">{{ status.name }}</span>
                <span v-if="status.isLoading" class="status-badge loading"><div class="spinner-badge"></div> Carregando...</span>
                <span v-else-if="status.error" class="status-badge error">Erro</span>
                <span v-else class="status-badge online">Operacional</span>
            </div>
        </div>
    </section>
  </main>
</template>

<script>
import axios from 'axios';

export default {
  name: 'HomeView',
  data() {
    return {
      apiStatus: {
        population:   { name: 'População (IBGE)', isLoading: true, error: null },
        victimization:{ name: 'Vitimização (API Demo)', isLoading: true, error: null },
        homicides:    { name: 'Homicídios (Banco Mundial)', isLoading: true, error: null },
        spending:     { name: 'Gastos em Segurança (IPEA)', isLoading: true, error: null },
        legislation:  { name: 'Legislação (Câmara)', isLoading: true, error: null },
      },
      population: {
        total: 0,
        top3States: [],
        ano: null,
      },
      // 2. NOVO ESTADO PARA O DESTAQUE DO DIA
      dailyHighlight: {
        isLoading: true,
        error: null,
        title: '',
        value: '',
        unit: '',
        source: '',
      },
    };
  },
  methods: {
    async fetchAllData() {
      const requests = {
        population: axios.get('/api/contexto/populacao'),
        victimization: axios.get('/api/paineis/vitimizacao'),
        homicides: axios.get('/api/paineis/homicidios'),
        spending: axios.get('/api/contexto/gastos-seguranca'),
        legislation: axios.get('/api/contexto/legislacao-seguranca'),
      };

      const results = await Promise.allSettled(Object.values(requests));
      const keys = Object.keys(requests);
      const successfulData = {};

      results.forEach((result, index) => {
        const key = keys[index];
        this.apiStatus[key].isLoading = false;
        
        if (result.status === 'fulfilled' && result.value.data) {
          const data = result.value.data;
          successfulData[key] = data; // Guarda dados para o Destaque do Dia

          if (key === 'population' && data.length > 0) {
            this.processPopulationData(data);
          }
        } else {
          this.apiStatus[key].error = 'Falha ao carregar os dados.';
          console.error(`Erro ao buscar dados para ${key}:`, result.reason);
        }
      });

      // 2. CHAMA A FUNÇÃO PARA GERAR O DESTAQUE
      this.generateDailyHighlight(successfulData);
    },
    processPopulationData(data) {
      this.population.total = data.reduce((sum, state) => sum + state.populacao, 0);
      this.population.top3States = data.sort((a, b) => b.populacao - a.populacao).slice(0, 3);
      this.population.ano = data[0]?.ano || new Date().getFullYear() - 2;
    },
    // 2. NOVA FUNÇÃO PARA GERAR O DESTAQUE DO DIA
    generateDailyHighlight(allData) {
      const highlightPool = [];

      // Adiciona destaques de Homicídios, se disponíveis
      if (allData.homicides && allData.homicides.length > 0) {
        const latest = [...allData.homicides].sort((a, b) => b.ano - a.ano)[0];
        highlightPool.push({
          title: `Taxa de Homicídios (${latest.ano})`,
          value: this.formatNumber(latest.taxa_por_100k),
          unit: 'por 100.000 habitantes',
          source: 'Banco Mundial / UNODC'
        });
      }
      // Adiciona destaques de Vitimização, se disponíveis
      if (allData.victimization && allData.victimization.length > 0) {
        const total = allData.victimization.reduce((sum, item) => sum + (item.ocorrencias || 0), 0);
        highlightPool.push({
          title: 'Total de Ocorrências de Vitimização',
          value: this.formatNumber(total),
          unit: 'registros na amostra de dados',
          source: 'API Vitimização (Demo)'
        });
      }
      // Adiciona destaques de Legislação, se disponíveis
      if (allData.legislation && allData.legislation.length > 0) {
        const latest = allData.legislation[0];
        highlightPool.push({
          title: 'Última Proposição Legislativa Relevante',
          value: `${latest.sigla} ${latest.numero}/${latest.ano}`,
          unit: 'relacionada à segurança pública',
          source: 'Câmara dos Deputados'
        });
      }

      if (highlightPool.length === 0) {
        this.dailyHighlight = { isLoading: false, error: 'Não foi possível gerar um destaque hoje.' };
        return;
      }

      // Seleciona um destaque aleatório do pool
      const randomIndex = Math.floor(Math.random() * highlightPool.length);
      this.dailyHighlight = { ...highlightPool[randomIndex], isLoading: false, error: null };
    },
    formatNumber(num) {
      if (typeof num !== 'number') return '...';
      return num.toLocaleString('pt-BR');
    },
  },
  created() {
    this.fetchAllData();
  },
};
</script>

<style scoped>
/* 1. ESTILOS PARA O SPINNER DE CARREGAMENTO */
@keyframes spin {
  to { transform: rotate(360deg); }
}
.spinner-badge {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(0,0,0,0.2);
  border-top-color: #333;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
  vertical-align: middle;
}
.spinner-large {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0,0,0,0.1);
  border-top-color: #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem auto;
}
.status-badge.loading {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.status-item .status-badge.loading {
  background-color: transparent;
  color: #495057;
}

/* 2. ESTILOS PARA A NOVA SEÇÃO DE DESTAQUE */
.highlight-section {
  padding: 2rem 0;
  text-align: center;
}
.card-highlight {
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 800px;
  margin: 0 auto;
}
.card-highlight h3 {
  font-size: 1.2rem;
  opacity: 0.8;
  margin-bottom: 0.5rem;
}
.highlight-value {
  font-size: 3rem;
  font-weight: 700;
  margin: 0;
}
.highlight-unit {
  display: block;
  font-size: 1rem;
  opacity: 0.9;
}
.highlight-source {
  display: block;
  margin-top: 1.5rem;
  font-size: 0.8rem;
  opacity: 0.7;
}

/* ... Estilos anteriores ... */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}
.status-badge {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
}
.status-badge.online {
  background-color: #d4edda;
  color: #155724;
}
.status-badge.error {
  background-color: #f8d7da;
  color: #721c24;
}
.status-badge.neutral {
  background-color: #f0f0f0;
  color: #555;
}
.card.disabled {
  opacity: 0.6;
  background-color: #f8f9fa;
}
.card.disabled .card-link {
 pointer-events: none;
}
.status-message {
  text-align: center;
  padding: 2rem;
  font-size: 1.1rem;
  color: #555;
  width: 100%;
}
.status-message.error {
  color: #721c24;
  background-color: #f8d7da;
  border-radius: 8px;
}
.api-status-section {
  background-color: #f8f9fa;
  padding: 2rem;
  border-radius: 8px;
}
.status-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  background-color: #fff;
  padding: 1.5rem;
  border-radius: 8px;
}
.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #eee;
}
.status-item:last-child {
  border-bottom: none;
}
.status-name {
  font-weight: 500;
  color: #333;
}
</style>
