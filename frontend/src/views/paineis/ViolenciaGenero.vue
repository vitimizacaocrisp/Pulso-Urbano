<template>
    <main class="page-content">
        <header class="page-header">
            <h2>Painel de Violência de Gênero</h2>
            <p>Dados e indicadores sobre feminicídio e violência contra a mulher.</p>
        </header>

        <section class="kpi-container">
            <div class="kpi-card">
                <h4>Mulheres Mortas em 2022</h4>
                <p>~89.000</p>
                <span>globalmente, o maior número em 20 anos.</span>
            </div>
            <div class="kpi-card">
                <h4>Mortas por Parceiro/Família</h4>
                <p>~48.800</p>
                <span>o que equivale a mais de 133 por dia.</span>
            </div>
            <div class="kpi-card">
                <h4>Vítimas de Homicídios no Lar</h4>
                <p>53%</p>
                <span>de todas as vítimas de mortes no ambiente doméstico são mulheres.</span>
            </div>
            <div class="kpi-card">
                <h4>Vítimas de Parceiro Íntimo</h4>
                <p>66%</p>
                <span>de todas as vítimas de parceiros íntimos são mulheres.</span>
            </div>
        </section>

        <section class="filters">
            <label>Ano:</label>
            <select>
                <option>2022</option>
                <option>2021</option>
            </select>
            <label>Região:</label>
            <select>
                <option>Todas</option>
                <option>Norte</option>
                <option>Nordeste</option>
                <option>Centro-Oeste</option>
                <option>Sudeste</option>
                <option>Sul</option>
            </select>
        </section>

            <section class="visualizations-container">
                <div class="viz-item large">
                    <h3>Distribuição de Vítimas por Perpetrador</h3>
                    <canvas id="grafico-perpetrador"></canvas>
                </div>
                <div class="viz-item medium">
                    <h3>Evolução Anual de Feminicídios</h3>
                    <canvas id="grafico-evolucao"></canvas>
                </div>
            </section>
    </main>
</template>
<script>
export default {
  name: 'ViolenciaGeneroView',
  data() {
    return {
      // Dados específicos da view podem ser adicionados aqui
    };
  },
  methods: {
    // Métodos específicos da view podem ser adicionados aqui
  }
}
</script>