<template>
    <main class="page-content">
        <header class="page-header">
            <h2>Painel de Crimes Econômicos e Corrupção</h2>
            <p>Indicadores sobre corrupção, lavagem de dinheiro e outros crimes financeiros.</p>
        </header>

        <section class="kpi-container">
            <div class="kpi-card">
                <h4>Percepção da Corrupção</h4>
                <p>38/100</p>
                <span>no índice da Transparência Internacional.</span>
            </div>
            <div class="kpi-card">
                <h4>Processos por Lavagem de Dinheiro</h4>
                <p>1.250</p>
                <span>novos processos em 2023.</span>
            </div>
            <div class="kpi-card">
                <h4>Recuperação de Ativos</h4>
                <p>R$ 4 bi</p>
                <span>recuperados em operações federais.</span>
            </div>
            <div class="kpi-card">
                <h4>Empresas Punidas</h4>
                <p>78</p>
                <span>com base na Lei Anticorrupção.</span>
            </div>
        </section>

        <section class="visualizations-container">
            <div class="viz-item large">
                <h3>Tipos de Crime Econômico (Percentual)</h3>
                <canvas id="grafico-tipos-crime"></canvas>
            </div>
             <div class="viz-item medium">
                <h3>Variação Anual de Processos</h3>
                <canvas id="grafico-evolucao-processos"></canvas>
            </div>
        </section>
    </main>
</template>

<script>
export default {
  name: 'CrimesEconomicosView',
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