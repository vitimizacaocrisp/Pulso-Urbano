<template>
  <main>
    <section class="hero">
      <div class="hero-content">
        <h2>Democratizando dados e análises sobre segurança pública e justiça no Brasil.</h2>
        <p>O Pulso Urbano integra dados de vitimização e registros administrativos para revelar um panorama completo
          sobre a criminalidade e o acesso à justiça no país.</p>
        <a href="#paineis" class="btn-primary">Explorar os Painéis</a>
      </div>
    </section>

    <section class="featured-section" id="paineis">
      <h2 class="section-title">Painéis em Destaque</h2>
      <div class="card-container">
        <article class="card">
          <h3>Monitor do Homicídio</h3>
          <p>Análise detalhada das taxas de homicídios dolosos, perfil das vítimas e o impacto do crime organizado.</p>
          <a href="/paineis/homicidios" class="card-link">Acessar Painel</a>
        </article>

        <article class="card">
          <h3>Observatório da Violência de Gênero</h3>
          <p>Dados sobre feminicídio e violência doméstica, revelando o lar como um dos espaços mais perigosos para
            mulheres.</p>
          <a href="/paineis/violencia-genero" class="card-link">Acessar Painel</a>
        </article>

        <article class="card">
          <h3>Atlas da Vitimização</h3>
          <p>Explore dados sobre crimes reportados e não reportados à polícia, baseados em pesquisas de vitimização.</p>
          <a href="/paineis/vitimizacao" class="card-link">Acessar Painel</a>
        </article>
      </div>
    </section>
    
    <section class="context-section">
      <h2 class="section-title">Contexto Nacional <span class="data-source">(IBGE, 2022)</span></h2>
      <div class="card-container" id="ibge-data-container">
        <article class="card card-data-highlight">
            <h3 id="total-population-title">População Total do Brasil</h3>
            <p id="total-population-value" class="data-value">Carregando...</p>
        </article>

        <article class="card">
            <h3 id="top-state-1-name">Carregando...</h3>
            <p id="top-state-1-value" class="data-value">&nbsp;</p>
        </article>
        <article class="card">
            <h3 id="top-state-2-name">Carregando...</h3>
            <p id="top-state-2-value" class="data-value">&nbsp;</p>
        </article>
        <article class="card">
            <h3 id="top-state-3-name">Carregando...</h3>
            <p id="top-state-3-value" class="data-value">&nbsp;</p>
        </article>
      </div>
    </section>
    <section class="analysis-section">
      <h2 class="section-title">Últimas Análises</h2>
      <div class="card-container">
        <article class="card card-analysis">
          <div class="card-content">
            <span class="analysis-tag">Prospecção de Cenários</span>
            <h4>O impacto das mudanças climáticas na violência urbana</h4>
            <p>Um estudo sobre como eventos climáticos extremos podem remodelar os padrões de criminalidade nas grandes
              cidades brasileiras na próxima década.</p>
            <a href="/analises/artigo1" class="card-link">Ler mais</a>
          </div>
        </article>

        <article class="card card-analysis">
          <div class="card-content">
            <span class="analysis-tag">Sistema de Justiça</span>
            <h4>A superlotação carcerária e seus efeitos na reincidência</h4>
            <p>Uma análise baseada em dados do sistema prisional sobre a correlação entre a superlotação e as taxas de
              reincidência criminal.</p>
            <a href="/analises/artigo2" class="card-link">Ler mais</a>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<script>
document.addEventListener('DOMContentLoaded', async () => {
        try {
            // 1. Busca os dados da nossa API de população
            const response = await fetch('http://localhost:3000/api/contexto/populacao');
            if (!response.ok) throw new Error('Falha ao carregar dados');
            
            const data = await response.json();

            // 2. Calcula a população total somando os valores de cada estado
            const totalPopulation = data.reduce((sum, state) => sum + state.populacao, 0);

            // 3. Ordena os estados pela população (do maior para o menor) e pega os 3 primeiros
            const top3States = data.sort((a, b) => b.populacao - a.populacao).slice(0, 3);
            
            // 4. Atualiza o card da população total
            document.getElementById('total-population-value').textContent = totalPopulation.toLocaleString('pt-BR');

            // 5. Atualiza os cards dos 3 estados mais populosos
            top3States.forEach((state, index) => {
                document.getElementById(`top-state-${index + 1}-name`).textContent = state.uf;
                document.getElementById(`top-state-${index + 1}-value`).textContent = state.populacao.toLocaleString('pt-BR');
            });

        } catch (error) {
            console.error("Erro ao carregar dados do IBGE para a página inicial:", error);
            // Em caso de erro, exibe uma mensagem no card principal
            const errorElement = document.getElementById('total-population-value');
            if(errorElement) {
                errorElement.textContent = 'Não foi possível carregar';
                errorElement.style.color = '#c55';
            }
        }
    });
</script>
