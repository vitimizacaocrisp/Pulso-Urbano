<script setup lang="ts">
import PostagemWizard from '@/components/admin/postagem/PostagemWizard.vue';

definePageMeta({ name: 'CriarPostagem', layout: 'admin', requiresAdmin: true, middleware: 'auth' });
</script>

<template>
  <PostagemWizard />
</template>
