<template>
  <div class="page-wrapper">
    <MeuHeader />
    <HeaderCatalogo />

    <main class="content-container">
      <CardAnalisesCatalogo />
    </main>

    <MeuFooter />
  </div>
</template>

<script>
import HeaderCatalogo from '@/components/catalogo/HeaderCatalogo.vue';
import CardAnalisesCatalogo from '@/components/catalogo/CardAnalisesCatalogo.vue';
import MeuHeader from '@/components/MeuHeader.vue';
import MeuFooter from '@/components/MeuFooter.vue';

export default {
  name: 'CatalogoView',
  components: {
    HeaderCatalogo,
    CardAnalisesCatalogo,
    MeuHeader,
    MeuFooter
  }
}
</script>

<style>
/* Estilos Globais Essenciais */
body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', sans-serif;
  background-color: #f8f9fa; /* Fundo cinza claro como na imagem */
}

.page-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.content-container {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 40px 20px; /* Espaçamento interno sem sobreposição */
}

.page-footer {
  text-align: center;
  padding: 40px;
  color: #adb5bd;
  font-size: 0.85rem;
}
</style>