<template>
    <div class="container">
        <p class="home-link"><router-link to="/">← Voltar à Página Inicial</router-link></p>

        <h1>Análise de Homicídios (Tentados e Consumados) em Minas Gerais</h1>
        
        <div class="context-box">
            <h3>Contexto dos Dados</h3>
            <p>
                Este relatório analisa dados de homicídios tentados e consumados, provavelmente extraídos dos <strong>Registos de Eventos de Defesa Social (REDS)</strong> de Minas Gerais, o sistema oficial que integra informações das polícias Militar e Civil. Tais dados são cruciais para a Secretaria de Estado de Justiça e Segurança Pública (SEJUSP) mapear a incidência de crimes violentos letais. Análises geográficas, como as focadas em cidades como Uberaba, Pouso Alegre e Juiz de Fora, permitem identificar "manchas criminais" (hotspots) e direcionar operações de policiamento ostensivo e investigativo, além de subsidiar políticas de prevenção à violência.
            </p>
        </div>

        <h2>Comparação de Homicídios Tentados vs. Consumados</h2>
        <div class="chart-container">
            <canvas id="homicidiosTiposChart"></canvas>
        </div>

        <h2>Distribuição Geográfica de Homicídios</h2>
        <div class="chart-container">
            <canvas id="homicidiosGeografiaChart"></canvas>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue';
import Chart from 'chart.js/auto';

onMounted(() => {
    const primaryColor = '#2c3e50';
    const textColor = '#34495e';

    // Gráfico de Tipos
    new Chart(document.getElementById('homicidiosTiposChart').getContext('2d'), {
        type: 'pie',
        data: {
            labels: ['Homicídios Consumados', 'Homicídios Tentados'],
            datasets: [{
                label: 'Número de Ocorrências (Exemplo)',
                data: [70, 30],
                backgroundColor: ['#e74c3c', '#f1c40f'],
                borderColor: primaryColor,
                borderWidth: 1,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { 
                    display: true, 
                    text: 'Proporção de Homicídios Consumados vs. Tentados (Exemplo)',
                    color: primaryColor,
                    font: { size: 16 }
                },
                legend: {
                    labels: { color: textColor }
                }
            }
        }
    });

    // Gráfico de Geografia
    new Chart(document.getElementById('homicidiosGeografiaChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Uberaba', 'Pouso Alegre', 'Juiz de Fora', 'Outras Cidades (Exemplo)'],
            datasets: [{
                label: 'Total de Homicídios (Exemplo)',
                data: [150, 80, 200, 300],
                backgroundColor: ['#3498db', '#2ecc71', '#9b59b6', '#e67e22'],
                borderColor: primaryColor,
                borderWidth: 1,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { 
                    display: true, 
                    text: 'Distribuição Geográfica de Homicídios (Exemplo)',
                    color: primaryColor,
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Número de Homicídios', color: textColor },
                    ticks: { color: textColor }
                },
                x: {
                    title: { display: true, text: 'Cidade', color: textColor },
                    ticks: { color: textColor }
                }
            }
        }
    });
});
</script>

<style scoped>
.container { max-width: 900px; margin: auto; padding: 2rem; }
.home-link { margin-bottom: 2rem; }
.chart-container { min-height: 450px; margin-bottom: 2rem; }
.context-box { background-color: #f8f9fa; border-left: 5px solid #e74c3c; padding: 1.5rem; margin: 2rem 0; }
</style>