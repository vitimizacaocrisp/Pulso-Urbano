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
                    <router-link :to="{ name: 'AnalisePNAD2009' }" class="card-link">Ler Análise Completa</router-link>
                </div>
            </article>

            <article class="card card-analysis">
                <div class="card-content">
                    <span class="analysis-tag">Percepção Social</span>
                    <h4>Datafolha 2010: Confiança na Polícia e Medo do Crime</h4>
                    <p>Relatório sobre a percepção de segurança, confiança na Polícia Militar e o ranking de crimes mais temidos pela população em 2010.</p>
                    <router-link :to="{ name: 'AnaliseDatafolha2010' }" class="card-link">Ler Análise Completa</router-link>
                </div>
            </article>

            <article class="card card-analysis">
                <div class="card-content">
                    <span class="analysis-tag">Educação & Sociedade</span>
                    <h4>Cenário Escolar 2006: Um Retrato de Alunos e Professores</h4>
                    <p>Perfil detalhado do ambiente escolar no ano de 2006, com dados demográficos sobre estudantes e a experiência do corpo docente.</p>
                    <router-link :to="{ name: 'AnaliseEscolas2006' }" class="card-link">Ler Análise Completa</router-link>
                </div>
            </article>

            <article class="card card-analysis">
                <div class="card-content">
                    <span class="analysis-tag">Análise Regional</span>
                    <h4>O Medo em Minas Gerais: Risco por Bairro, Sexo e Idade</h4>
                    <p>Estudo focado na sensação de insegurança em Minas Gerais, correlacionando o medo de crimes como roubo e agressão com o perfil demográfico.</p>
                    <router-link :to="{ name: 'PercepcaoSocialMG' }" class="card-link">Ler Análise Completa</router-link>
                </div>
            </article>

            <article class="card card-analysis">
                <div class="card-content">
                    <span class="analysis-tag">Violência Letal</span>
                    <h4>Homicídios em Minas Gerais: Análise Geográfica do Crime</h4>
                    <p>Investigação sobre a distribuição de homicídios tentados e consumados em cidades-chave de Minas Gerais, como Juiz de Fora e Uberaba.</p>
                    <router-link :to="{ name: 'HomicidiosMG' }" class="card-link">Ler Análise Completa</router-link>
                </div>
            </article>

            <article class="card card-analysis">
                <div class="card-content">
                    <span class="analysis-tag">Tendências Criminais</span>
                    <h4>A Dinâmica da Violência Urbana no Brasil</h4>
                    <p>Um panorama sobre a evolução dos índices de criminalidade e a proporção entre diferentes tipos de crimes, como furtos, roubos e agressões.</p>
                    <router-link :to="{ name: 'ViolenciaUrbana' }" class="card-link">Ler Análise Completa</router-link>
                </div>
            </article>
            
            <article class="card card-analysis">
                <div class="card-content">
                    <span class="analysis-tag">Contexto Demográfico</span>
                    <h4>A Estrutura da População e sua Relação com a Vitimização</h4>
                    <p>Análise da distribuição populacional por sexo e idade, um fator essencial para o cálculo de taxas de criminalidade e a compreensão de perfis de vítimas.</p>
                    <router-link :to="{ name: 'DemografiaPopulacional' }" class="card-link">Ler Análise Completa</router-link>
                </div>
            </article>
        </section>
    </main>
</template>

<script>
export default {
  name: 'AnalisesView', // Renomeado para seguir a convenção
};
</script>

<style scoped>
.page-content {
    /* Este componente será renderizado dentro do AnalisesLayout, 
       pelo que o padding principal já virá do layout. 
       Podemos manter algum padding se quisermos mais espaço. */
}

.page-header {
    text-align: left; /* Alinhado à esquerda para diferenciar do header do layout */
    margin-bottom: 3rem;
}

.page-header h2 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    color: #2c3e50;
}

.page-header p {
    font-size: 1.1rem;
    color: #555;
    max-width: 600px;
    margin: 0;
}

.analysis-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 2rem;
}

.card-analysis {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #fff;
    box-shadow: 0 4px 8px rgba(0,0,0,0.05);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    display: flex;
}

.card-analysis:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}

.card-content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
}

.analysis-tag {
    display: inline-block;
    background-color: #e7eefc;
    color: #0056b3;
    padding: 0.25rem 0.75rem;
    border-radius: 15px;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 1rem;
    align-self: flex-start;
}

.card-content h4 {
    margin: 0 0 0.75rem 0;
    font-size: 1.25rem;
    color: #2c3e50;
}

.card-content p {
    margin: 0 0 1.5rem 0;
    color: #555;
    flex-grow: 1; /* Garante que o parágrafo ocupe o espaço disponível */
    line-height: 1.6;
}

.card-link {
    text-decoration: none;
    font-weight: 600;
    color: #007bff;
    align-self: flex-start; /* Alinha o link no final do card */
}

.card-link:hover {
    text-decoration: underline;
}
</style>