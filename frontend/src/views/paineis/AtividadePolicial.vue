<template>
    <main class="page-content">
        <header class="page-header">
            <h2>Painel de Atividade Policial</h2>
            <p>Indicadores sobre a atuação das forças de segurança no Brasil.</p>
        </header>

        <section class="kpi-container">
            <div class="kpi-card">
                <h4>Efetivo Policial</h4>
                <p>245</p>
                <span>por 100 mil habitantes (média nacional).</span>
            </div>
            <div class="kpi-card">
                <h4>Letalidade Policial</h4>
                <p>3,1</p>
                <span>mortes por 100 mil habitantes.</span>
            </div>
            <div class="kpi-card">
                <h4>Apreensões de Cocaína (2022)</h4>
                <p>104 ton.</p>
                <span>aumento de 5% em relação ao ano anterior.</span>
            </div>
            <div class="kpi-card">
                <h4>Confiança na Polícia</h4>
                <p>48%</p>
                <span>da população confia na instituição policial.</span>
            </div>
        </section>

        <section class="visualizations-container">
            <div class="viz-item large">
                <h3>Efetivo Policial por Estado</h3>
                <canvas id="grafico-efetivo-estado"></canvas>
            </div>
            <div class="viz-item medium">
                <h3>Evolução da Letalidade Policial (2018-2023)</h3>
                <canvas id="grafico-evolucao-letalidade"></canvas>
            </div>
        </section>
    </main>
 </template>
<script>
export default {
  name: 'AtividadePolicialView',
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