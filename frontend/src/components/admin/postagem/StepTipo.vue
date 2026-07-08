<template>
  <div class="step-tipo">
    <h2>Que tipo de publicação?</h2>
    <p class="hint">A escolha define os campos do restante do formulário. Ao continuar, um rascunho é criado.</p>
    <div class="tipo-grid">
      <button v-for="t in tipos" :key="t.tipo" class="tipo-card" :disabled="criando" @click="escolher(t.tipo)">
        <Icon :icon="t.icon" width="30" />
        <span class="tipo-nome">{{ t.label }}</span>
        <span class="tipo-desc">{{ t.desc }}</span>
      </button>
    </div>
    <p v-if="criando" class="criando"><span class="spinner"></span> Criando rascunho…</p>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue';
defineProps({ criando: Boolean });
const emit = defineEmits(['escolher']);
const tipos = [
  { tipo: 'analise', label: 'Análise', icon: 'mdi:chart-box-outline', desc: 'Panorama/indicadores' },
  { tipo: 'academico', label: 'Produção Científica', icon: 'mdi:school-outline', desc: 'Artigo, tese, relatório' },
  { tipo: 'dado', label: 'Dados', icon: 'mdi:database-outline', desc: 'Microdados, questionário' },
  { tipo: 'podcast', label: 'Podcast', icon: 'mdi:podcast', desc: 'Áudio ou vídeo' },
  { tipo: 'livro', label: 'Livro', icon: 'mdi:book-open-page-variant-outline', desc: 'Publicação/obra' },
  { tipo: 'video', label: 'Vídeo', icon: 'mdi:video-outline', desc: 'Vídeo/aula' },
];
const escolher = (tipo) => emit('escolher', tipo);
</script>

<style scoped>
.step-tipo h2 { font-size: 1.4rem; font-weight: 800; color: var(--text-main); margin: 0 0 0.25rem; }
.hint { color: var(--text-secondary); margin: 0 0 1.5rem; }
.tipo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
.tipo-card { display: flex; flex-direction: column; align-items: flex-start; gap: 0.4rem; padding: 1.25rem; border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-card); color: var(--brand-primary); cursor: pointer; text-align: left; transition: border-color 0.15s, transform 0.15s; }
.tipo-card:hover:not(:disabled) { border-color: var(--brand-primary); transform: translateY(-2px); }
.tipo-card:disabled { opacity: 0.5; cursor: wait; }
.tipo-nome { font-size: 1.05rem; font-weight: 700; color: var(--text-main); }
.tipo-desc { font-size: 0.82rem; color: var(--text-muted); }
.criando { margin-top: 1.25rem; color: var(--text-secondary); display: flex; align-items: center; gap: 8px; }
.spinner { width: 18px; height: 18px; border: 2px solid var(--brand-primary); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
