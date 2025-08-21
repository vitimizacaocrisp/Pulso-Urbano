<template>
    <main class="page-content">
        <header class="page-header">
            <h2>Painel do Sistema de Justiça e Prisional</h2>
            <p>Indicadores sobre acesso à justiça, população carcerária e o sistema prisional.</p>
        </header>

        <section class="kpi-container">
            <div class="kpi-card">
                <h4>População Carcerária</h4>
                <p>832.295</p>
                <span>pessoas privadas de liberdade.</span>
            </div>
            <div class="kpi-card">
                <h4>Taxa de Superlotação</h4>
                <p>130%</p>
                <span>relação entre o número de presos e o de vagas.</span>
            </div>
            <div class="kpi-card">
                <h4>Presos Provisórios</h4>
                <p>28,7%</p>
                <span>aguardam julgamento na prisão.</span>
            </div>
            <div class="kpi-card">
                <h4>Taxa de Encarceramento</h4>
                <p>389</p>
                <span>presos por 100 mil habitantes.</span>
            </div>
        </section>

        <section class="visualizations-container">
            <div class="viz-item large">
                <h3>População Carcerária por Estado</h3>
                <canvas id="grafico-pop-carceraria-estado"></canvas>
            </div>
             <div class="viz-item medium">
                <h3>Evolução da Taxa de Encarceramento</h3>
                <canvas id="grafico-evolucao-encarceramento"></canvas>
            </div>
        </section>
    </main>
</template>
<script>
export default {
  name: 'SistemaJusticaView',
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