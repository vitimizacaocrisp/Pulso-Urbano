<template>
    <div class="container">
        <p class="home-link"><router-link to="/">← Voltar à Página Inicial</router-link></p>

        <h1>Relatório de Percepção Social sobre Segurança em Minas Gerais</h1>
        <small>Análise do medo e risco percebido de criminalidade</small>
        
        <div class="context-box">
            <h3>Contexto da Pesquisa</h3>
            <p>
                Esta análise explora a <strong>percepção subjetiva de segurança</strong> da população de Minas Gerais. Os dados provavelmente foram coletados por meio de inquéritos de vitimização regionais, possivelmente conduzidos por centros de pesquisa como o <strong>CRISP (Centro de Estudos de Criminalidade e Segurança Pública) da UFMG</strong>. O objetivo desses estudos é ir além dos registos criminais oficiais, medindo o "medo do crime". Compreender como diferentes grupos (divididos por sexo, idade e local de moradia) percebem o risco de serem vítimas de crimes como roubo e agressão é vital para o desenvolvimento de políticas de segurança comunitária que respondam não apenas à criminalidade real, mas também à sensação de insegurança da população.
            </p>
        </div>

        <h2>1. Percepção Média de Risco por Sexo</h2>
        <div class="chart-container">
            <canvas id="percepcaoSexoChart"></canvas>
        </div>

        <h2>2. Percepção Média de Risco por Tipo de Bairro</h2>
        <div class="chart-container">
            <canvas id="percepcaoBairroChart"></canvas>
        </div>

        <h2>3. Percepção Média de Risco por Faixa de Idade</h2>
        <div class="chart-container">
            <canvas id="percepcaoIdadeChart"></canvas>
        </div>

        <h2>4. Matriz de Correlação entre Percepções de Risco</h2>
         <div class="table-responsive">
            <table class="heatmap-table">
                <thead>
                    <tr>
                        <th></th>
                        <th>risco_roubo</th>
                        <th>risco_agressao</th>
                        <th>risco_sequestro</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th>risco_roubo</th>
                        <td style="background-color: #fde725;">1.00</td>
                        <td style="background-color: #3e4989; color: white;">0.48</td>
                        <td style="background-color: #440154; color: white;">0.29</td>
                    </tr>
                    <tr>
                        <th>risco_agressao</th>
                        <td style="background-color: #3e4989; color: white;">0.48</td>
                        <td style="background-color: #fde725;">1.00</td>
                        <td style="background-color: #482878; color: white;">0.41</td>
                    </tr>
                    <tr>
                        <th>risco_sequestro</th>
                        <td style="background-color: #440154; color: white;">0.29</td>
                        <td style="background-color: #482878; color: white;">0.41</td>
                        <td style="background-color: #fde725;">1.00</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue';
import Chart from 'chart.js/auto';

onMounted(() => {
    const primaryColor = '#2c3e50';
    const textColor = '#34495e';
    const primaryDarkColor = '#1a242f';

    const genderColors = ['#5a2b72', '#b34d4a'];
    const neighborhoodColors = ['#69a28c', '#528e83', '#3d6c70'];
    const ageColors = ['#5a2b72', '#8e44ad', '#c0392b', '#e74c3c'];

    function getChartOptions(titleText) {
        return {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: titleText,
                    color: primaryColor,
                    font: { size: 16 }
                },
                legend: {
                    labels: { color: textColor }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Percepção Média do Risco', color: textColor },
                    ticks: { color: textColor }
                },
                x: {
                    title: { display: true, text: 'Tipo de Crime', color: textColor },
                    ticks: { color: textColor }
                }
            }
        };
    }

    // Gráfico 1
    new Chart(document.getElementById('percepcaoSexoChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Roubo', 'Agressão', 'Sequestro'],
            datasets: [
                { label: 'Feminino', data: [1.05, 0.71, 0.41], backgroundColor: genderColors[0], borderColor: primaryDarkColor, borderWidth: 1 },
                { label: 'Masculino', data: [0.92, 0.59, 0.29], backgroundColor: genderColors[1], borderColor: primaryDarkColor, borderWidth: 1 }
            ]
        },
        options: getChartOptions('Percepção Média de Risco por Sexo')
    });

    // Gráfico 2
    new Chart(document.getElementById('percepcaoBairroChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Roubo', 'Agressão', 'Sequestro'],
            datasets: [
                { label: 'Bairro não violento', data: [1.00, 0.66, 0.37], backgroundColor: neighborhoodColors[0], borderColor: primaryDarkColor, borderWidth: 1 },
                { label: 'Favela não violenta', data: [1.00, 0.67, 0.33], backgroundColor: neighborhoodColors[1], borderColor: primaryDarkColor, borderWidth: 1 },
                { label: 'Favela violenta', data: [0.88, 0.62, 0.29], backgroundColor: neighborhoodColors[2], borderColor: primaryDarkColor, borderWidth: 1 }
            ]
        },
        options: getChartOptions('Percepção Média de Risco por Tipo de Bairro')
    });

    // Gráfico 3
    new Chart(document.getElementById('percepcaoIdadeChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Roubo', 'Agressão', 'Sequestro'],
            datasets: [
                { label: '41 anos ou mais', data: [1.02, 0.67, 0.36], backgroundColor: ageColors[0], borderColor: primaryDarkColor, borderWidth: 1 },
                { label: 'de 21 a 30 anos', data: [0.98, 0.68, 0.34], backgroundColor: ageColors[1], borderColor: primaryDarkColor, borderWidth: 1 },
                { label: 'de 31 a 40 anos', data: [1.00, 0.64, 0.33], backgroundColor: ageColors[2], borderColor: primaryDarkColor, borderWidth: 1 },
                { label: 'entre 15 e 20 anos', data: [0.91, 0.62, 0.41], backgroundColor: ageColors[3], borderColor: primaryDarkColor, borderWidth: 1 }
            ]
        },
        options: getChartOptions('Percepção Média de Risco por Faixa de Idade')
    });
});
</script>

<style scoped>
.container { max-width: 900px; margin: auto; padding: 2rem; }
.home-link { margin-bottom: 2rem; }
.chart-container { min-height: 450px; margin-bottom: 2rem; }
.context-box { background-color: #f8f9fa; border-left: 5px solid #5a2b72; padding: 1.5rem; margin: 2rem 0; }
.heatmap-table { width: 100%; border-collapse: collapse; }
.heatmap-table th, .heatmap-table td { border: 1px solid #ddd; padding: 0.8rem; text-align: center; }
</style>