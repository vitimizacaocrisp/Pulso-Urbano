<template>
  <div>
    <h3 class="rev-title">Revisão</h3>
    <dl class="rev-grid">
      <div><dt>Tipo</dt><dd>{{ tipo }}</dd></div>
      <div><dt>Título</dt><dd>{{ form.titulo || '—' }}</dd></div>
      <div><dt>Resumo</dt><dd>{{ form.resumo ? 'ok' : 'faltando' }}</dd></div>
      <div><dt>Conteúdo</dt><dd>{{ form.conteudo ? 'ok' : 'faltando' }}</dd></div>
      <div><dt>Categorias</dt><dd>{{ (form.categorias || []).join(', ') || '—' }}</dd></div>
    </dl>

    <label class="wz-check"><input type="checkbox" v-model="form.destaque" /> <span>Marcar como destaque</span></label>
    <label class="wz-check"><input type="checkbox" v-model="form.is_crisp" /> <span>Produção do CRISP/UFMG</span></label>
  </div>
</template>

<script setup>
import { inject } from 'vue';
defineProps({ tipo: { type: String, required: true } });
const form = inject('wizForm');
</script>

<style scoped>
.rev-title { font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin: 0 0 1rem; }
.rev-grid { display: grid; gap: 0.6rem; margin: 0 0 1.25rem; }
.rev-grid dt { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 700; }
.rev-grid dd { margin: 0; color: var(--text-main); }
.wz-check { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); margin: 0.5rem 0; cursor: pointer; }
</style>
