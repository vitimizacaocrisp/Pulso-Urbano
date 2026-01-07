<template>
  <MeuHeader />
  <div class="not-found-simple">
    <h1>404</h1>
    <h2>Página Não Encontrada</h2>
    <p>Desculpe, a página que você está procurando não existe.</p>
    <router-link to="/">Voltar para Home</router-link>
  </div>
  <MeuFooter />
</template>

<script>
import MeuHeader from '@/components/MeuHeader.vue';
import MeuFooter from '@/components/MeuFooter.vue';

export default {
  name: 'NotFound',
  components: {
    MeuHeader,
    MeuFooter
  }
}
</script>

<style scoped>
.not-found-simple {
  text-align: center;
  padding: 100px 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #f8f9fa;
}

.not-found-simple h1 {
  font-size: 120px;
  color: #dc3545;
  margin: 0;
  font-weight: bold;
}

.not-found-simple h2 {
  font-size: 24px;
  color: #495057;
  margin: 10px 0;
}

.not-found-simple p {
  color: #6c757d;
  margin-bottom: 30px;
}

.not-found-simple a {
  color: #007bff;
  text-decoration: none;
  font-weight: 500;
}

.not-found-simple a:hover {
  text-decoration: underline;
}
</style>