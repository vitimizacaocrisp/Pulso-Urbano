<script setup lang="ts">
import MeuHeader from '@/components/MeuHeader.vue'
import MeuFooter from '@/components/MeuFooter.vue'
</script>

<template>
  <MeuHeader />
  <slot />
  <MeuFooter />
</template>
