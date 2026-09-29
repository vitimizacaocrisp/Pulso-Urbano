<script setup lang="ts">
import { computed } from 'vue';
import TopProgressBar from '@/components/TopProgressBar.vue';
import ToastContainer from '@/components/ToastContainer.vue';
import CookieConsent from '@/components/CookieConsent.vue';
import BackToTop from '@/components/BackToTop.vue';
import { useTheme } from '@/composables/useTheme';
import { usePageLoading } from '@/composables/usePageLoading';

const isLoading = usePageLoading();

const { theme } = useTheme();
useHead({ htmlAttrs: { 'data-theme': computed(() => theme.value) } });
</script>

<template>
  <div id="app">
    <TopProgressBar :active="isLoading" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ToastContainer />
    <CookieConsent />
    <ClientOnly><BackToTop /></ClientOnly>
  </div>
</template>
