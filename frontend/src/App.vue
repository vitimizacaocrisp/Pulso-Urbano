<script setup>
import LoadComponent from '@/components/LoadComponent.vue';
import TopProgressBar from '@/components/TopProgressBar.vue';
import ToastContainer from '@/components/ToastContainer.vue';
import CookieConsent from '@/components/CookieConsent.vue';
import { isRouteLoading, appBooted } from '@/router';

</script>

<template>
  <div id="app">
    <!-- Splash de boot: só na 1ª navegação (verificação inicial de sessão). -->
    <LoadComponent v-if="!appBooted" />
    <template v-else>
      <!-- Demais navegações: barra de progresso fina, conteúdo permanece visível. -->
      <TopProgressBar :active="isRouteLoading" />
      <router-view />
    </template>
    <ToastContainer />
    <CookieConsent />
  </div>
</template>