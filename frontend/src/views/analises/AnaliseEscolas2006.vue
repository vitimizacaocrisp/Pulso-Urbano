<template>
    <div class="container">
        <p class="home-link"><router-link to="/">← Voltar à Página Inicial</router-link></p>

        <h1>Relatório Consolidado - Análise de Escolas 2006</h1>

        <div class="context-box">
            <h3>Contexto da Pesquisa</h3>
            <p>
                Os dados desta análise refletem o cenário educacional de 2006, um período importante para a consolidação de políticas públicas de educação no Brasil. A pesquisa, provavelmente associada a sistemas de avaliação como o <strong>SAEB (Sistema de Avaliação da Educação Básica)</strong> ou a <strong>Prova Brasil</strong>, buscava traçar um perfil detalhado de alunos e professores. Analisar informações como raça, idade, gênero e satisfação dos estudantes, juntamente com a experiência e a área de atuação dos docentes, era fundamental para o Ministério da Educação (MEC) e as secretarias estaduais avaliarem a eficácia de programas, identificarem desigualdades e planejarem investimentos em formação de professores e infraestrutura escolar.
            </p>
        </div>

        <h2>Análise de Alunos: Gênero (2006)</h2>
        <div class="chart-container">
            <canvas id="alunosSexoChart"></canvas>
        </div>

        <h2>Análise de Alunos: Raça/Cor (2006)</h2>
        <div class="chart-container" style="min-height: 600px;">
            <canvas id="alunosRacaCorChart"></canvas>
        </div>

        <h2>Análise de Professores: Disciplinas (2006)</h2>
        <div class="chart-container" style="min-height: 500px;">
            <canvas id="professoresDisciplinasChart"></canvas>
        </div>
        
        <h2>Distribuição de Alunos por Idade (Extensão)</h2>
        <div class="chart-container">
            <canvas id="alunosIdadePDFChart"></canvas>
        </div>
        
        <h2>Satisfação dos Alunos com o Aprendizado (Extensão)</h2>
        <div class="chart-container">
            <canvas id="alunosSatisfacaoPDFChart"></canvas>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue';
import Chart from 'chart.js/auto';

onMounted(() => {

    function getChartColors(count) {
        const colors = ['#8e44ad', '#c0392b', '#f39c12', '#27ae60', '#3498db', '#9b59b6', '#e67e22', '#2ecc71', '#1abc9c', '#f1c40f'];
        return colors.slice(0, count);
    }

    // Gênero 2006
    new Chart(document.getElementById('alunosSexoChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['feminino', 'masculino', 'nr'],
            datasets: [{
                label: 'Quantidade de Alunos',
                data: [1018, 816, 30],
                backgroundColor: ['#8e44ad', '#c0392b', '#f39c12'],
            }]
        }
    });

    // Raça/Cor 2006
    const racaLabels = ['pardo', 'branco', 'negra', 'indigena', 'amarelo', 'nr', 'outra mistura', 'morena', 'moreno', 'morena clara'];
    const racaData = [854, 527, 287, 50, 40, 20, 20, 10, 10, 5];
    new Chart(document.getElementById('alunosRacaCorChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: racaLabels,
            datasets: [{
                label: 'Quantidade de Alunos',
                data: racaData,
                backgroundColor: getChartColors(racaLabels.length),
            }]
        },
        options: { indexAxis: 'y' }
    });

    // Disciplinas 2006
    const disciplinasLabels = ['matematica', 'geografia', 'lingua portuguesa', 'lingua inglesa', 'quimica', 'historia', 'ciencias'];
    const disciplinasData = [11, 10.5, 4, 4, 2, 2, 2];
    new Chart(document.getElementById('professoresDisciplinasChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: disciplinasLabels,
            datasets: [{
                label: 'Quantidade de Professores',
                data: disciplinasData,
                backgroundColor: getChartColors(disciplinasLabels.length),
            }]
        },
        options: { indexAxis: 'y' }
    });

    // Idade (Extensão)
    new Chart(document.getElementById('alunosIdadePDFChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
            datasets: [
                {
                    type: 'bar',
                    label: 'Contagem de Alunos',
                    data: [0, 0, 100, 195, 225, 290, 290, 200, 240, 98, 40, 20, 100, 245, 200],
                    backgroundColor: '#2980b9'
                },
                {
                    type: 'line',
                    label: 'Picos de Matrículas',
                    data: [0, 0, 0, 0, 0, 290, 290, 200, 240, 98, 40, 20, 100, 245, 200],
                    borderColor: 'black',
                    tension: 0.1
                }
            ]
        },
        options: { plugins: { title: { display: true, text: 'Distribuição de Alunos por Idade' } } }
    });

    // Satisfação (Extensão)
    new Chart(document.getElementById('alunosSatisfacaoPDFChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['estou satisfeito', 'estou pouco satisfeito', 'estou insatisfeito'],
            datasets: [{
                label: 'Contagem',
                data: [1000, 550, 100],
                backgroundColor: ['#8e44ad', '#c0392b', '#f39c12'],
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: { title: { display: true, text: 'Satisfação dos Alunos com o Aprendizado' } }
        }
    });
});
</script>

<style scoped>
.container { max-width: 900px; margin: auto; padding: 2rem; }
.home-link { margin-bottom: 2rem; }
.chart-container { min-height: 450px; margin-bottom: 2rem; }
.context-box { background-color: #f8f9fa; border-left: 5px solid #8e44ad; padding: 1.5rem; margin: 2rem 0; }
</style>