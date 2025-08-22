<template>
    <div class="container">
        <p class="home-link"><router-link to="/">← Voltar à Página Inicial</router-link></p>

        <h1>Evolução e Comparação dos Índices de Violência Urbana</h1>
        
        <div class="context-box">
            <h3>Contexto dos Dados</h3>
            <p>
                Esta análise se baseia em séries históricas de índices de violência, compilados a partir de fontes de dados públicos sobre segurança. Tais índices são frequentemente elaborados por instituições como o <strong>Fórum Brasileiro de Segurança Pública</strong> ou o <strong>Instituto de Pesquisa Econômica Aplicada (IPEA)</strong>. O objetivo é criar um indicador sintético que permita monitorizar a evolução da criminalidade (ex: crimes violentos letais intencionais, roubos) ao longo do tempo. A análise de tendências — picos, quedas ou períodos de estabilidade — é essencial para avaliar o impacto de políticas públicas de segurança e entender a dinâmica da violência em escala macro.
            </p>
        </div>

        <h2>Evolução dos Índices de Violência ao Longo do Tempo</h2>
        <div class="chart-container">
            <canvas id="violenciaIndicesTempoChart"></canvas>
        </div>

        <h2>Comparação de Ocorrências por Tipo de Crime</h2>
        <div class="chart-container">
            <canvas id="violenciaTiposCrimesChart"></canvas>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue';
import Chart from 'chart.js/auto';

onMounted(() => {
    const primaryColor = '#2c3e50';

    // Gráfico de Evolução
    new Chart(document.getElementById('violenciaIndicesTempoChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: ['2000', '2001', '2002', '2003', '2004', '2005'],
            datasets: [{
                label: 'Índice de Violência (Exemplo)',
                data: [100, 110, 95, 120, 115, 130],
                borderColor: primaryColor,
                backgroundColor: 'rgba(44, 62, 80, 0.2)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            plugins: { title: { display: true, text: 'Evolução dos Índices de Violência (Dados de Exemplo)' } }
        }
    });

    // Gráfico de Comparação
    new Chart(document.getElementById('violenciaTiposCrimesChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Agressão', 'Furto', 'Roubo'],
            datasets: [{
                label: 'Número de Ocorrências (Exemplo)',
                data: [500, 1200, 800],
                backgroundColor: ['#e74c3c', '#2980b9', '#f1c40f'],
            }]
        },
        options: {
            plugins: { title: { display: true, text: 'Comparação de Ocorrências por Tipo de Crime (Exemplo)' } }
        }
    });
});
</script>

<style scoped>
.container { max-width: 900px; margin: auto; padding: 2rem; }
.home-link { margin-bottom: 2rem; }
.chart-container { min-height: 450px; margin-bottom: 2rem; }
.context-box { background-color: #f8f9fa; border-left: 5px solid #2980b9; padding: 1.5rem; margin: 2rem 0; }
</style>