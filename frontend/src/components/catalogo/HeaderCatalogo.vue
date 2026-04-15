<template>
  <header class="catalog-header">
    <div class="bg-circle circle-right"></div>
    <div class="bg-circle circle-bottom"></div>

    <div class="header-inner">
      <div class="header-badge">
        <span class="badge-icon">📚</span> REPOSITÓRIO ACADÊMICO
      </div>
      
      <h1>Catálogo de Pesquisas</h1>
      
      <p class="subtitle">
        Acervo de estudos sobre segurança pública, vitimização e violência no Brasil.
      </p>

      <div class="stats-bar">
        <div class="stat-item">
          <span class="num">{{ stats.totalResearch || 0 }}</span>
          <span class="lbl">Pesquisas</span>
        </div>
        <div class="stat-item">
          <span class="num">{{ stats.totalSources || 0 }}</span>
          <span class="lbl">Fontes</span>
        </div>
        <div class="stat-item">
          <span class="num">{{ stats.yearsCovered || '0' }}+</span>
          <span class="lbl">Anos cobertos</span>
        </div>
        <div class="stat-item">
          <span class="num">{{ stats.totalCities || 0 }}</span>
          <span class="lbl">Cidades</span>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
import axios from 'axios';

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

export default {
  name: 'HeaderCatalogo',
  data() {
    return {
      stats: {
        totalResearch: 0,
        totalSources: 0,
        yearsCovered: 0,
        totalCities: 0
      },
      isLoading: true
    };
  },
  methods: {
    async fetchHeaderStats() {
      this.isLoading = true;
      try {
        const token = localStorage.getItem('authToken');
        
        // Chamada para buscar os dados (ajuste o endpoint conforme sua API)
        const response = await axios.get(`${API_BASE_URL}/api/admin/analyses-list`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { limit: 10000000000 },
          timeout: 10000
        });

        const data = response.data?.data?.analyses || [];

        console.log("Dados recebidos para stats do header:", data);

        // Lógica para extrair os números dos dados da API
        if (data.length > 0) {
          this.stats.totalResearch = data.length;
          
          // Exemplo de como calcular as fontes e cidades únicas
          const sources = new Set(data.map(item => item.source).filter(Boolean));
          this.stats.totalSources = sources.size > 0 ? sources.size : 8; // Fallback para 8 se vazio

          const cities = new Set(data.flatMap(item => item.cities || [])); 
          this.stats.totalCities = cities.size > 0 ? cities.size : 6;

          // Cálculo simples de anos cobertos (se houver campo de data)
          this.stats.yearsCovered = 20; // Geralmente fixo ou calculado pelo range de datas
        }
      } catch (err) {
        console.error("Erro ao carregar stats do header:", err);
      } finally {
        this.isLoading = false;
      }
    }
  },
  mounted() {
    this.fetchHeaderStats();
  }
}
</script>

<style scoped>
.catalog-header {
  position: relative;
  background-color: #0b1a35; /* Azul marinho escuro */
  padding: 80px 20px;
  color: white;
  text-align: left;
  overflow: hidden; /* Garante que os círculos não vazem */
  display: flex;
  justify-content: center;
}

.header-inner {
  position: relative;
  z-index: 2; /* Fica acima dos círculos */
  max-width: 1200px;
  width: 100%;
}

/* Badge Superior */
.header-badge {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 6px 16px;
  border-radius: 50px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1px;
  margin-bottom: 24px;
  color: #ccd6f6;
}

.badge-icon {
  margin-right: 8px;
}

/* Tipografia */
h1 {
  font-size: 3rem;
  font-weight: 800;
  margin: 0 0 16px 0;
  letter-spacing: -1px;
}

.subtitle {
  font-size: 1.1rem;
  color: #8892b0;
  max-width: 600px;
  margin-bottom: 48px;
  line-height: 1.5;
}

/* Barra de Estatísticas */
.stats-bar {
  display: flex;
  gap: 40px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.num {
  font-size: 2.2rem;
  font-weight: 800;
  color: #ff4d4d; /* Vermelho coral da imagem */
  line-height: 1;
}

.lbl {
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 600;
  color: #8892b0;
  margin-top: 8px;
  letter-spacing: 1px;
}

/* Elementos Decorativos de Fundo */
.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(28, 54, 105, 0.4) 0%, rgba(11, 26, 53, 0) 70%);
  z-index: 1;
}

.circle-right {
  width: 600px;
  height: 600px;
  top: -100px;
  right: -150px;
}

.circle-bottom {
  width: 400px;
  height: 400px;
  bottom: -150px;
  left: 15%;
}

/* Responsividade */
@media (max-width: 768px) {
  h1 { font-size: 2rem; }
  .stats-bar { gap: 20px; }
  .num { font-size: 1.8rem; }
}
</style>