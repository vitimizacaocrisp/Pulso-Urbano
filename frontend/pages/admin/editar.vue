<script setup lang="ts">
import PostagemEditor from '@/components/admin/postagem/PostagemEditor.vue';

definePageMeta({ name: 'EditarPostagem', layout: 'admin', requiresAdmin: true, middleware: 'auth' });
</script>

<template>
  <PostagemEditor />
</template>
