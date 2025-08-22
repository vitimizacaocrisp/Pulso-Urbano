<template>
    <div class="container">
        <p class="home-link"><router-link to="/">← Voltar à Página Inicial</router-link></p>

        <h1>Relatório de Análise de Criminalidade no Brasil - Datafolha (2010)</h1>
        <small>Estudo sobre demografia, vitimização e percepção de segurança</small>
        
        <div class="context-box">
            <h3>Contexto da Pesquisa</h3>
            <p>
                Este relatório é fruto da <strong>Pesquisa Nacional de Vitimização (PNV)</strong>, uma iniciativa de grande escala encomendada pela Secretaria Nacional de Segurança Pública (SENASP) e pelo Ministério da Justiça, com trabalho de campo realizado pelo instituto Datafolha entre 2010 e 2011. O seu principal objetivo foi medir a chamada <strong>"cifra oculta" da criminalidade</strong> — os crimes que não são formalmente registados pelas polícias — entrevistando diretamente a população sobre as suas experiências de vitimização.
            </p>
            <p>
                Diferente do suplemento de vitimização da PNAD (realizado pelo IBGE em 2009), a PNV de 2010 teve um foco exclusivo em segurança pública, o que permitiu uma investigação mais profunda sobre a subnotificação de crimes, a percepção de medo, a avaliação do desempenho policial e as dinâmicas da violência. Os dados demográficos coletados (escolaridade, raça, renda) são essenciais para entender como diferentes estratos sociais são afetados pela violência.
            </p>
        </div>

        <h2>1. Distribuição por Escolaridade</h2>
        <p class="chart-analysis">O perfil educacional da amostra revela que a maioria da população possui, no máximo, o ensino médio. O número de pessoas com "Ensino fundamental incompleto" (mais de 20.000) é quase cinco vezes maior que o de pessoas com "Superior completo", destacando a desigualdade no acesso à educação superior no país.</p>
        <div class="chart-container">
            <canvas id="escolaridadeChart"></canvas>
        </div>

        <h2>2. Distribuição por Estado Civil</h2>
        <p class="chart-analysis">A estrutura familiar predominante na amostra é a de pessoas casadas (aprox. 27.000), seguida por solteiros (aprox. 18.000). A união consensual, com mais de 10.000 respondentes, firma-se como um arranjo familiar significativo.</p>
        <div class="chart-container">
            <canvas id="estadoCivilChart"></canvas>
        </div>

        <h2>3. Distribuição por Raça/Cor</h2>
        <p class="chart-analysis">A autodeclaração de raça/cor mostra que a maioria da amostra se identifica como Branca (aprox. 29.000) e Parda (aprox. 23.000), refletindo a composição demográfica do Brasil. A população Preta representa o terceiro maior grupo.</p>
        <div class="chart-container">
            <canvas id="racaCorChart"></canvas>
        </div>

        <h2>4. Distribuição por Religião</h2>
        <p class="chart-analysis">A afiliação religiosa é majoritariamente Católica (quase 64%). O segmento evangélico, somando pentecostais e não pentecostais, representa cerca de 25% da amostra, consolidando-se como o segundo maior bloco de fé do país.</p>
        <div class="chart-container pie-container">
            <canvas id="religiaoChart"></canvas>
        </div>

        <h2>6. Distribuição de Renda Familiar</h2>
        <p class="chart-analysis">O histograma de renda familiar demonstra uma forte concentração de rendimentos nas faixas mais baixas. O pico ocorre na faixa de 2 salários mínimos, com quase 20.000 famílias, indicando que a maior parte da população vivia com até 4 salários mínimos mensais.</p>
        <div class="chart-container">
            <canvas id="rendaChart"></canvas>
        </div>

        <h2>8. Renda Familiar por Nível de Escolaridade</h2>
        <p class="chart-analysis">Este gráfico confirma a forte correlação positiva entre educação e renda. A renda familiar média de quem possui pós-graduação é mais de três vezes superior à de quem não tem instrução, evidenciando o papel da educação como fator de mobilidade socioeconómica.</p>
        <div class="chart-container">
            <canvas id="rendaEscolaridadeChart"></canvas>
        </div>

        <h2>9. Percepção da Criminalidade por Raça/Cor</h2>
        <p class="chart-analysis">A sensação de que a criminalidade "Aumentou" nos últimos 12 meses é largamente predominante em todos os grupos raciais. Este sentimento partilhado sugere uma perceção generalizada de insegurança, independentemente da identidade racial dos entrevistados.</p>
        <div class="chart-container">
            <canvas id="percepcaoCriminalidadeChart"></canvas>
        </div>

        <h2>10. Mapa de Calor de Correlação</h2>
        <p class="chart-analysis">A matriz revela uma forte correlação positiva (0.71) entre o número de adultos e de mulheres adultas no domicílio, o que é esperado. Curiosamente, há uma correlação negativa, embora fraca (-0.09), entre o número de menores no domicílio e a renda familiar, sugerindo que famílias com mais crianças tendem a ter uma renda ligeiramente menor nesta amostra.</p>
        <div class="chart-container">
             <table class="correlation-table">
                <thead>
                    <tr>
                        <th class="header-row">Variável</th>
                        <th class="header-row">adultos_no_domicilio</th>
                        <th class="header-row">mulheres_adultas</th>
                        <th class="header-row">menores_no_domicilio</th>
                        <th class="header-row">renda_familiar</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="header-col">adultos_no_domicilio</td>
                        <td class="corr-positive-strong">1.00</td>
                        <td class="corr-positive-strong">0.71</td>
                        <td class="corr-neutral">0.08</td>
                        <td class="corr-positive-med">0.17</td>
                    </tr>
                    <tr>
                        <td class="header-col">mulheres_adultas</td>
                        <td class="corr-positive-strong">0.71</td>
                        <td class="corr-positive-strong">1.00</td>
                        <td class="corr-neutral">0.11</td>
                        <td class="corr-neutral">0.10</td>
                    </tr>
                    <tr>
                        <td class="header-col">menores_no_domicilio</td>
                        <td class="corr-neutral">0.08</td>
                        <td class="corr-neutral">0.11</td>
                        <td class="corr-positive-strong">1.00</td>
                        <td class="corr-negative">-0.09</td>
                    </tr>
                    <tr>
                        <td class="header-col">renda_familiar</td>
                        <td class="corr-positive-med">0.17</td>
                        <td class="corr-neutral">0.10</td>
                        <td class="corr-negative">-0.09</td>
                        <td class="corr-positive-strong">1.00</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <h2>11. Medo de ser Assaltado(a) na Vizinhança</h2>
        <p class="chart-analysis">Embora a maioria (aprox. 38.000) afirme não ter medo de ser assaltada na vizinhança, uma parcela muito expressiva (aprox. 28.000) admite ter esse receio. Isto indica que a insegurança local é uma preocupação para mais de 40% da população.</p>
        <div class="chart-container">
            <canvas id="medoAssaltoChart"></canvas>
        </div>
        
        <h2>12. Nível de Confiança na Polícia Militar</h2>
        <p class="chart-analysis">A confiança na Polícia Militar é limitada. A maioria absoluta dos entrevistados (aprox. 38.000) afirma que "Confia um Pouco". O número dos que "Não Confia" (14.000) supera o dos que "Confia Muito" (13.500), revelando um ceticismo considerável em relação à instituição.</p>
        <div class="chart-container">
            <canvas id="confiancaPoliciaChart"></canvas>
        </div>
        
        <h2>13. Ranking de Vitimização</h2>
        <p class="chart-analysis">Crimes contra o património sem violência direta, como o "Furto de objeto" (42%), e agressões verbais, como "Insulto" (25%), são as formas de vitimização mais comuns. O "Roubo de objeto", que envolve violência ou ameaça, foi reportado por 20% dos entrevistados.</p>
        <div class="chart-container">
            <canvas id="vitimizacaoChart"></canvas>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue';
import Chart from 'chart.js/auto';

onMounted(() => {
    // 1. Escolaridade
    new Chart(document.getElementById('escolaridadeChart').getContext('2d'), {
        type: 'bar', data: { labels: ['Ens. fundamental incompleto', 'Ens. médio completo', 'Ens. médio incompleto', 'Ens. fundamental completo', 'Sem instrução', 'Superior completo', 'Superior incompleto', 'Pós-graduação'], datasets: [{ label: 'Contagem', data: [20974, 17171, 6980, 6604, 4672, 4595, 3788, 1672], backgroundColor: '#2e7d32' }] }, options: { indexAxis: 'y' }
    });

    // 2. Estado Civil
    new Chart(document.getElementById('estadoCivilChart').getContext('2d'), {
        type: 'bar', data: { labels: ['Casado(a)', 'Solteiro(a)', 'Amigado(a)/união consensual', 'Separado(a) judicialmente / Divorciado(a)', 'Separado(a) não oficialmente ou Viúvo(a)'], datasets: [{ label: 'Contagem', data: [27301, 17790, 10625, 3184, 2084], backgroundColor: '#43a047' }] }, options: { indexAxis: 'y' }
    });

    // 3. Raça/Cor
    new Chart(document.getElementById('racaCorChart').getContext('2d'), {
        type: 'bar', data: { labels: ['Branca', 'Parda', 'Preta', 'Outra', 'Amarela', 'Indígena'], datasets: [{ label: 'Contagem', data: [29411, 23326, 6655, 5131, 1199, 551], backgroundColor: '#66bb6a' }] }, options: { indexAxis: 'y' }
    });

    // 4. Religião
    new Chart(document.getElementById('religiaoChart').getContext('2d'), {
        type: 'pie', data: { labels: ['Católica', 'Evangélica Pentecostal', 'Não tem religião/nenhuma', 'Evangélica não Pentecostal', 'Outras'], datasets: [{ data: [63.8, 18.3, 6.6, 6.5, 4.8], backgroundColor: ['#303f9f', '#1976d2', '#0288d1', '#0097a7', '#00acc1'] }] }
    });

    // 6. Renda
    new Chart(document.getElementById('rendaChart').getContext('2d'), {
        type: 'bar', data: { labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8'], datasets: [{ label: 'Frequência', data: [3000, 14500, 20000, 12000, 9500, 4500, 1000, 500, 200], backgroundColor: 'rgba(92, 107, 192, 0.5)', borderColor: '#303f9f', borderWidth: 1 }] }
    });

    // 8. Renda x Escolaridade
    new Chart(document.getElementById('rendaEscolaridadeChart').getContext('2d'), {
        type: 'bar', data: { labels: ['Pós-graduação', 'Superior completo', 'Superior incompleto', 'Ensino médio completo', 'Ensino médio incompleto', 'Ensino fundamental completo', 'Ensino fundamental incompleto', 'Sem instrução'], datasets: [{ label: 'Renda Familiar Média (Salários Mínimos)', data: [5.5, 4.8, 3.5, 3.2, 2.8, 2.5, 2.0, 1.5], backgroundColor: '#c62828' }] }, options: { indexAxis: 'y' }
    });

    // 9. Percepção Criminalidade
    new Chart(document.getElementById('percepcaoCriminalidadeChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Aumentou', 'Permaneceu Igual', 'Diminuiu'],
            datasets: [
                { label: 'Branca', data: [14000, 2400, 6200], backgroundColor: '#7b1fa2' },
                { label: 'Parda', data: [17500, 2500, 8200], backgroundColor: '#d32f2f' },
                { label: 'Preta', data: [3900, 800, 1800], backgroundColor: '#ff7f0e' },
            ]
        },
        options: { scales: { x: { stacked: true }, y: { stacked: true } } }
    });

    // 11. Medo de Assalto
    new Chart(document.getElementById('medoAssaltoChart').getContext('2d'), {
        type: 'bar', data: { labels: ['Não', 'Sim', 'Não Respondeu'], datasets: [{ label: 'Número de Entrevistados', data: [38000, 28000, 500], backgroundColor: '#2e7d32' }] }, options: { indexAxis: 'y' }
    });

    // 12. Confiança na Polícia
    new Chart(document.getElementById('confiancaPoliciaChart').getContext('2d'), {
        type: 'bar', data: { labels: ['Confia um Pouco', 'Não Confia', 'Confia Muito', 'Não Respondeu'], datasets: [{ label: 'Número de Entrevistados', data: [38000, 14000, 13500, 200], backgroundColor: '#43a047' }] }, options: { indexAxis: 'y' }
    });

    // 13. Vitimização
    new Chart(document.getElementById('vitimizacaoChart').getContext('2d'), {
        type: 'bar', data: { labels: ['Furto de objeto', 'Insulto', 'Roubo de objeto', 'Perseguição', 'Furto de veículo'], datasets: [{ label: 'Percentual de Entrevistados (%)', data: [42, 25, 20, 7, 5], backgroundColor: '#d32f2f' }] }, options: { indexAxis: 'y' }
    });
});
</script>

<style scoped>
.container { max-width: 900px; margin: auto; padding: 2rem 1.5rem; }
.home-link { margin-bottom: 2rem; }
.chart-container { min-height: 450px; margin-bottom: 1rem; display: flex; justify-content: center; align-items: center; }
.pie-container { min-height: 450px; max-width: 500px; margin-left: auto; margin-right: auto; }
.context-box { background-color: #f8f9fa; border-left: 5px solid #c62828; padding: 1.5rem; margin: 2rem 0; }
.chart-analysis { font-style: italic; color: #555; margin-bottom: 2.5rem; text-align: center; max-width: 80%; margin-left: auto; margin-right: auto;}
h2 { border-bottom: 2px solid #eee; padding-bottom: 0.5rem; margin-top: 3rem; }

/* Estilos para a tabela de correlação */
.correlation-table { border-collapse: collapse; width: 100%; max-width: 700px; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.correlation-table th, .correlation-table td { border: 1px solid #ddd; padding: 12px; text-align: center; }
.correlation-table th { background-color: #f4f4f4; font-weight: bold; }
.header-col { text-align: left; font-weight: bold; background-color: #e9ecef; }
.corr-positive-strong { background-color: #d32f2f; color: white; }
.corr-positive-med { background-color: #ff7f0e; color: white; }
.corr-neutral { background-color: #f0f0f0; color: #333; }
.corr-negative { background-color: #1976d2; color: white; }
</style>