<template>
    <main class="page-content">
        <header class="page-header">
            <h2>Educação e Letramento em Dados</h2>
            <p>Aprenda a interpretar dados de segurança pública de forma crítica e informada.</p>
        </header>

        <section class="education-section">
            <h3>Glossário de Conceitos</h3>
            <div class="card-container">
                <article class="card">
                    <h4>Cifra Oculta (ou Dark Figure of Crime)</h4>
                    <p>Refere-se à diferença entre o número de crimes que realmente ocorrem e o número de crimes que são oficialmente registrados pela polícia. Pesquisas de vitimização são a principal ferramenta para estimar essa cifra.</p>
                </article>
                <article class="card">
                    <h4>Taxa vs. Número Absoluto</h4>
                    <p>O número absoluto é a contagem total de um evento (ex: 1.000 homicídios). A taxa (ex: 10 homicídios por 100 mil habitantes) padroniza esse número pela população, permitindo comparar locais com tamanhos diferentes de forma justa.</p>
                </article>
                <article class="card">
                    <h4>Feminicídio vs. Homicídio de Mulheres</h4>
                    <p>Todo feminicídio é um homicídio de uma mulher, mas nem todo homicídio de uma mulher é um feminicídio. O feminicídio é o assassinato motivado pela condição de ser mulher (misoginia, menosprezo ou violência doméstica).</p>
                </article>
            </div>
        </section>

         <section class="education-section">
            <h3>Tutoriais</h3>
            <div class="card-container">
                 <article class="card">
                    <h4>Como Usar Nossos Painéis</h4>
                    <p>Um guia passo a passo para aplicar filtros, interpretar gráficos e exportar dados de nossas visualizações interativas.</p>
                    <a href="#" class="card-link">Ver Tutorial</a>
                </article>
            </div>
        </section>
    </main>
</template>
<script>
export default {
  name: 'EducacaoView',
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