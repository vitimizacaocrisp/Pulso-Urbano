<script setup lang="ts">
// Catch-all: restaura o comportamento do antigo :pathMatch(.*)* do vue-router
// — sem isso, links pra rotas inexistentes (ex.: /categoria/* no rodapé)
// não resolvem e o vue-router avisa [VUE_ROUTER_R0004] no console/log.
definePageMeta({ name: 'NotFound' });

throw createError({ statusCode: 404, statusMessage: 'Página não encontrada', fatal: true });
</script>

<template>
  <div />
</template>
