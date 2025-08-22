<template>
    <div class="container">
        <p class="home-link"><router-link to="/">← Voltar à Página Inicial</router-link></p>

        <h1>Relatório de Análise de Criminalidade no Brasil (PNAD 2009)</h1>
        <small>Estudo da variabilidade nas estimativas de vitimização</small>

        <div class="context-box">
            <h3>Contexto da Pesquisa</h3>
            <p>
                Esta análise é baseada nos microdados do suplemento sobre vitimização da <strong>Pesquisa Nacional por Amostra de Domicílios (PNAD) de 2009</strong>, realizada pelo IBGE. Este suplemento foi uma das mais importantes iniciativas para medir a criminalidade "oculta" no Brasil – aquela que não chega ao conhecimento das autoridades policiais. A pesquisa investigou a percepção de segurança e a ocorrência de crimes como roubo, furto e agressão, coletando dados diretamente da população. O <strong>Coeficiente de Variação (CV)</strong>, foco desta análise, é uma medida estatística que indica o grau de imprecisão de uma estimativa, sendo crucial para avaliar a confiabilidade dos dados de vitimização em diferentes recortes demográficos.
            </p>
        </div>

        <h2>Gráfico 1A: Perfil por Sexo (Barras)</h2>
        <div class="chart-container">
            <canvas id="grafico1aCanvas"></canvas>
        </div>

        <h2>Gráfico 1B: Perfil por Cor/Raça (Barras)</h2>
        <div class="chart-container">
            <canvas id="grafico1bCanvas"></canvas>
        </div>
        
        <h2>Gráfico 7C: Radar Comparativo por Sexo + Cor/Raça</h2>
        <div class="chart-container" style="max-width: 70%;">
            <canvas id="grafico7Canvas"></canvas>
        </div>
        
        <h2>Gráfico 3: Motivos para Não Registrar Ocorrência (Barras Empilhadas)</h2>
         <div class="chart-container">
            <canvas id="grafico3Canvas"></canvas>
        </div>

        </div>
</template>

<script setup>
import { onMounted } from 'vue';
import Chart from 'chart.js/auto';

onMounted(() => {
    const chartColors = ['#4e73df', '#1cc88a', '#f6c23e', '#e74a3b', '#6f42c1', '#fd7e14'];

    new Chart(document.getElementById('grafico1aCanvas').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Agressão', 'Furto', 'Roubo'],
            datasets: [
                { label: 'Homens', data: [10.3, 8.9, 9.3], backgroundColor: chartColors[0] },
                { label: 'Mulheres', data: [11.8, 7.0, 9.8], backgroundColor: chartColors[1] }
            ]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Perfil por Sexo (CV Médio)', font: { size: 16 } } },
            scales: { y: { title: { display: true, text: 'Coeficiente de Variação Médio' } } }
        }
    });

    new Chart(document.getElementById('grafico1bCanvas').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Agressão', 'Furto', 'Roubo'],
            datasets: [
                { label: 'Branca', data: [7.5, 7.0, 10.1], backgroundColor: chartColors[2] },
                { label: 'Preta/Parda', data: [9.4, 14.8, 7.8], backgroundColor: chartColors[3] }
            ]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Perfil por Cor/Raça (CV Médio)', font: { size: 16 } } },
            scales: { y: { title: { display: true, text: 'Coeficiente de Variação Médio' } } }
        }
    });

    new Chart(document.getElementById('grafico7Canvas').getContext('2d'), {
        type: 'radar',
        data: {
            labels: ['Agressão', 'Roubo', 'Furto'],
            datasets: [
                { label: 'Homem Branco', data: [8.5, 11.5, 13.0], borderColor: chartColors[0], backgroundColor: 'rgba(78, 115, 223, 0.2)' },
                { label: 'Homem Preto/Pardo', data: [13.0, 13.0, 14.0], borderColor: chartColors[5], backgroundColor: 'rgba(253, 126, 20, 0.2)' },
                { label: 'Mulher Branca', data: [11.0, 9.0, 7.5], borderColor: chartColors[2], backgroundColor: 'rgba(246, 194, 62, 0.2)' },
                { label: 'Mulher Preta/Parda', data: [14.0, 9.0, 9.0], borderColor: chartColors[3], backgroundColor: 'rgba(231, 74, 59, 0.2)' }
            ]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Comparativo Interseccional de Perfis de Vítimas', font: { size: 16 } } }
        }
    });

    new Chart(document.getElementById('grafico3Canvas').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Roubo', 'Agressão', 'Furto'],
            datasets: [
                { label: 'Falta de provas', data: [22.9, 20.5, 18.3], backgroundColor: chartColors[0] },
                { label: 'Não era importante', data: [22.1, 22.4, 18.3], backgroundColor: chartColors[1] },
                { label: 'Não acreditavam na polícia', data: [18.1, 15.7, 22.5], backgroundColor: chartColors[2] },
                { label: 'Não queriam envolver a polícia ou medo de represálias', data: [18.6, 19.1, 15.6], backgroundColor: chartColors[3] },
                { label: 'Outro', data: [8.3, 22.3, 25.3], backgroundColor: chartColors[4] }
            ]
        },
        options: {
            indexAxis: 'y', responsive: true,
            plugins: {
                title: { display: true, text: 'Motivos para Não Registrar Ocorrência (%)', font: { size: 16 } },
                tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${context.raw}%` } }
            },
            scales: { x: { stacked: true, title: { display: true, text: 'Percentual (%)' } }, y: { stacked: true } }
        }
    });
});
</script>

<style scoped>
.container { max-width: 900px; margin: auto; padding: 2rem; }
.home-link { margin-bottom: 2rem; }
.chart-container { min-height: 450px; margin-bottom: 2rem; }
.context-box { background-color: #f8f9fa; border-left: 5px solid #007bff; padding: 1.5rem; margin: 2rem 0; }
</style>