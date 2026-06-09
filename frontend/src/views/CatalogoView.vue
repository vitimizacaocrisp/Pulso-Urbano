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

<style scoped>
.page-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.content-container {
  width: 100%;
  max-width: var(--container-width);
  margin: 0 auto;
  padding: 40px 20px;
}
</style>