<template>
  <div>
    <div class="uploads">
      <label class="up-btn" :class="{ disabled: subindo }">
        <Icon icon="mdi:image-outline" /> Enviar capa
        <input type="file" accept="image/*" :disabled="subindo" @change="pick($event, 'cover')" hidden />
      </label>
      <label class="up-btn" :class="{ disabled: subindo }">
        <Icon icon="mdi:paperclip" /> Enviar anexo
        <input type="file" :disabled="subindo" @change="pick($event, 'anexo')" hidden />
      </label>
    </div>

    <UploadProgress v-if="subindo" :percent="progresso" :label="`Enviando ${nomeAtual || 'arquivo'}…`" sub="Não feche esta aba até concluir." class="mb" />
    <p class="hint">Aceita arquivos grandes (até 2 GB). O envio vai direto para o armazenamento.</p>

    <div v-if="anexos && anexos.length" class="anexo-list">
      <div v-for="ax in anexos" :key="ax.id" class="anexo-row">
        <span><Icon :icon="ax.tipo === 'cover' ? 'mdi:image' : 'mdi:paperclip'" /> {{ ax.nome || ax.url || ('anexo #' + ax.id) }} <em>({{ ax.tipo }})</em></span>
        <button class="del" :disabled="subindo" @click="$emit('remover', ax.id)"><Icon icon="mdi:trash-can-outline" /></button>
      </div>
    </div>
    <p v-else class="vazio">Nenhum anexo neste rascunho.</p>

    <label class="wz-check"><input type="checkbox" v-model="form.with_header" /> <span>Ocultar cabeçalho hero (conteúdo full-width)</span></label>
    <label class="wz-check"><input type="checkbox" v-model="form.with_footer" /> <span>Ocultar rodapé padrão</span></label>
  </div>
</template>

<script setup>
import { inject } from 'vue';
import { Icon } from '@iconify/vue';
import UploadProgress from '@/components/UploadProgress.vue';
defineProps({
  anexos: { type: Array, default: () => [] },
  subindo: Boolean,
  progresso: { type: Number, default: 0 },
  nomeAtual: { type: String, default: '' },
});
const emit = defineEmits(['remover', 'upload']);
const form = inject('wizForm');
function pick(e, tipo) {
  const file = e.target.files?.[0];
  if (file) emit('upload', { file, tipo });
  e.target.value = '';
}
</script>

<style scoped>
.uploads { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
.up-btn { display: inline-flex; align-items: center; gap: 6px; padding: 0.55rem 1rem; border: 1px solid var(--brand-primary); color: var(--brand-primary); border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; }
.up-btn:hover { background: var(--brand-primary); color: #fff; }
.up-btn.disabled { opacity: 0.5; pointer-events: none; }
.mb { margin-bottom: 1rem; }
.subindo { display: inline-flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 0.88rem; }
.spinner { width: 16px; height: 16px; border: 2px solid var(--brand-primary); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.anexo-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
.anexo-row { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-card); color: var(--text-main); font-size: 0.9rem; }
.anexo-row em { color: var(--text-muted); }
.del { background: none; border: none; color: var(--sys-danger); cursor: pointer; }
.vazio { color: var(--text-muted); margin-bottom: 1rem; }
.wz-check { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); margin: 0.5rem 0; cursor: pointer; }
</style>
