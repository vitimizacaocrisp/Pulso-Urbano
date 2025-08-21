<template>
    <main class="page-content">
        <header class="page-header">
            <h2>Repositório de Pesquisas</h2>
            <p>Acesse o acervo de relatórios, artigos e notas técnicas produzidas pelo CRISP e parceiros.</p>
        </header>

        <section class="filters">
            <input type="text" placeholder="Buscar por palavra-chave...">
            <select>
                <option>Todos os Temas</option>
                <option>Homicídios</option>
                <option>Vitimiação</option>
            </select>
            <select>
                <option>Todos os Anos</option>
                <option>2023</option>
                <option>2022</option>
            </select>
            <button class="btn-secondary">Filtrar</button>
        </section>

        <section class="publications-list">
            <article class="publication-item">
                <div class="publication-info">
                    <h4>Global Study on Homicide 2023</h4>
                    <p class="publication-meta">Autores: UNODC | Ano: 2023</p>
                    <p class="publication-summary">Análise global sobre as tendências e padrões de
                        homicídios, destacando o impacto do crime organizado e as variações regionais.
                    </p>
                </div>
                <a href="#" class="btn-download">Baixar PDF</a>
            </article>

            <article class="publication-item">
                <div class="publication-info">
                    <h4>Gender-related Killings of Women and Girls (Femicide/Feminicide) 2022</h4>
                    <p class="publication-meta">Autores: UNODC, UN Women | Ano: 2023</p>
                    <p class="publication-summary">Estimativas globais sobre feminicídio, revelando que a
                        maioria das mulheres e meninas são mortas por parceiros íntimos ou familiares.</p>
                </div>
                <a href="#" class="btn-download">Baixar PDF</a>
            </article>

            <article class="publication-item">
                <div class="publication-info">
                    <h4>Manual on Victimization Surveys</h4>
                    <p class="publication-meta">Autores: UNODC/UNECE | Ano: 2010</p>
                    <p class="publication-summary">Diretrizes metodológicas internacionais para o desenho e
                        implementação de pesquisas de vitimização, garantindo a comparabilidade dos dados.
                    </p>
                </div>
                <a href="#" class="btn-download">Baixar PDF</a>
            </article>
        </section>
    </main>
</template>
<script>
export default {
  name: 'PublicacoesView',
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