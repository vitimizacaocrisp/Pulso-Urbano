<template>
    <main class="page-content">
        <header class="page-header">
            <h2>Análises & Cenários</h2>
            <p>Artigos que interpretam dados e exploram as tendências da segurança pública no Brasil.</p>
        </header>

        <section class="analysis-list">
            <article class="card card-analysis">
                <div class="card-content">
                    <span class="analysis-tag">Vitimiação</span>
                    <h4>PNAD 2009: A Confiabilidade das Estatísticas de Vitimização</h4>
                    <p>Análise sobre a variabilidade e precisão dos dados de criminalidade no Brasil, explorando perfis de sexo, raça e os motivos para não registrar ocorrências.</p>
                    <router-link to="/analises/pnad-2009" class="card-link">Ler Análise Completa</router-link>
                </div>
            </article>

            <article class="card card-analysis">
                <div class="card-content">
                    <span class="analysis-tag">Percepção Social</span>
                    <h4>Datafolha 2010: Confiança na Polícia e Medo do Crime</h4>
                    <p>Relatório sobre a percepção de segurança, confiança na Polícia Militar e o ranking de crimes mais temidos pela população em 2010.</p>
                    <router-link to="/analises/datafolha-2010" class="card-link">Ler Análise Completa</router-link>
                </div>
            </article>

            <article class="card card-analysis">
                <div class="card-content">
                    <span class="analysis-tag">Educação & Sociedade</span>
                    <h4>Cenário Escolar 2006: Um Retrato de Alunos e Professores</h4>
                    <p>Perfil detalhado do ambiente escolar no ano de 2006, com dados demográficos sobre estudantes e a experiência do corpo docente.</p>
                    <router-link to="/analises/escolas-2006" class="card-link">Ler Análise Completa</router-link>
                </div>
            </article>

            <article class="card card-analysis">
                <div class="card-content">
                    <span class="analysis-tag">Análise Regional</span>
                    <h4>O Medo em Minas Gerais: Risco por Bairro, Sexo e Idade</h4>
                    <p>Estudo focado na sensação de insegurança em Minas Gerais, correlacionando o medo de crimes como roubo e agressão com o perfil demográfico.</p>
                    <router-link to="/analises/percepcao-social-mg" class="card-link">Ler Análise Completa</router-link>
                </div>
            </article>

            <article class="card card-analysis">
                <div class="card-content">
                    <span class="analysis-tag">Violência Letal</span>
                    <h4>Homicídios em Minas Gerais: Análise Geográfica do Crime</h4>
                    <p>Investigação sobre a distribuição de homicídios tentados e consumados em cidades-chave de Minas Gerais, como Juiz de Fora e Uberaba.</p>
                    <router-link to="/analises/homicidios-mg" class="card-link">Ler Análise Completa</router-link>
                </div>
            </article>

            <article class="card card-analysis">
                <div class="card-content">
                    <span class="analysis-tag">Tendências Criminais</span>
                    <h4>A Dinâmica da Violência Urbana no Brasil</h4>
                    <p>Um panorama sobre a evolução dos índices de criminalidade e a proporção entre diferentes tipos de crimes, como furtos, roubos e agressões.</p>
                    <router-link to="/analises/violencia-urbana" class="card-link">Ler Análise Completa</router-link>
                </div>
            </article>
            
            <article class="card card-analysis">
                <div class="card-content">
                    <span class="analysis-tag">Contexto Demográfico</span>
                    <h4>A Estrutura da População e sua Relação com a Vitimização</h4>
                    <p>Análise da distribuição populacional por sexo e idade, um fator essencial para o cálculo de taxas de criminalidade e a compreensão de perfis de vítimas.</p>
                    <router-link to="/analises/demografia-populacional" class="card-link">Ler Análise Completa</router-link>
                </div>
            </article>

        </section>
    </main>
</template>

<script>
export default {
  name: 'AnalisesView',
};
</script>

<style scoped>

</style>