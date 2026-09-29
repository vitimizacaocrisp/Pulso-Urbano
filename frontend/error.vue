<script setup lang="ts">
import MeuHeader from '@/components/MeuHeader.vue';
import MeuFooter from '@/components/MeuFooter.vue';

const props = defineProps<{ error?: { statusCode?: number; [key: string]: unknown } }>();

const is404 = props.error?.statusCode === 404;
</script>

<template>
  <MeuHeader />
  <div class="not-found-simple">
    <h1>{{ is404 ? '404' : (error?.statusCode || 500) }}</h1>
    <h2>{{ is404 ? 'Página Não Encontrada' : 'Algo deu errado' }}</h2>
    <p>{{ is404 ? 'Desculpe, a página que você está procurando não existe.' : 'Tente novamente em instantes.' }}</p>
    <NuxtLink to="/" @click="clearError({ redirect: '/' })">Voltar para Home</NuxtLink>
  </div>
  <MeuFooter />
</template>

<style scoped>
.not-found-simple {
  text-align: center;
  padding: 100px 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: var(--bg-body);
}

.not-found-simple h1 {
  font-size: 120px;
  color: var(--sys-danger);
  margin: 0;
  font-weight: bold;
}

.not-found-simple h2 {
  font-size: 24px;
  color: var(--text-main);
  margin: 10px 0;
}

.not-found-simple p {
  color: var(--text-secondary);
  margin-bottom: 30px;
}

.not-found-simple a {
  color: var(--brand-primary);
  text-decoration: none;
  font-weight: 500;
}

.not-found-simple a:hover {
  text-decoration: underline;
}
</style>
