<template>
  <div class="doc-editor">
    <div class="doc-toolbar">
      <button type="button" class="dt-btn" title="Negrito" @mousedown.prevent="exec('bold')"><strong>B</strong></button>
      <button type="button" class="dt-btn" title="Itálico" @mousedown.prevent="exec('italic')"><em>I</em></button>
      <button type="button" class="dt-btn" title="Título" @mousedown.prevent="formatBlock('H2')">H</button>
      <button type="button" class="dt-btn" title="Subtítulo" @mousedown.prevent="formatBlock('H3')">h</button>
      <button type="button" class="dt-btn" title="Parágrafo" @mousedown.prevent="formatBlock('P')">¶</button>
      <button type="button" class="dt-btn" title="Lista" @mousedown.prevent="exec('insertUnorderedList')">≡</button>
      <button type="button" class="dt-btn" title="Lista numerada" @mousedown.prevent="exec('insertOrderedList')">1.</button>
      <button type="button" class="dt-btn" title="Citação" @mousedown.prevent="formatBlock('BLOCKQUOTE')">"</button>
      <button type="button" class="dt-btn" title="Link" @mousedown.prevent="makeLink">🔗</button>
      <button type="button" class="dt-btn" title="Limpar formatação" @mousedown.prevent="exec('removeFormat')">⌫</button>
      <span class="dt-sep"></span>
      <button type="button" class="dt-btn dt-resource" title="Adicionar recurso (PDF, imagem, dados...)"
        @mousedown.prevent="$emit('add-resource')">
        <Icon icon="mdi:plus-circle-outline" width="15" /> Recurso
      </button>
    </div>
    <div
      ref="editable"
      class="doc-surface"
      contenteditable="true"
      spellcheck="true"
      :data-placeholder="placeholder"
      @input="onInput"
      @blur="onInput"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: {
    type: String,
    default: 'Cole aqui o documento/projeto existente (Word, PDF, texto) e continue editando…'
  }
});
const emit = defineEmits(['update:modelValue', 'add-resource']);

const editable = ref(null);

onMounted(() => { if (editable.value) editable.value.innerHTML = props.modelValue || ''; });

// Só sobrescreve quando o conteúdo vem de fora (ex.: carregar análise) e o
// editor não está focado — evita que o cursor pule enquanto se digita.
watch(() => props.modelValue, (v) => {
  if (editable.value && document.activeElement !== editable.value && v !== editable.value.innerHTML) {
    editable.value.innerHTML = v || '';
  }
});

const onInput = () => emit('update:modelValue', editable.value?.innerHTML || '');

const exec = (cmd) => { document.execCommand(cmd, false); editable.value?.focus(); onInput(); };
const formatBlock = (tag) => { editable.value?.focus(); document.execCommand('formatBlock', false, tag); onInput(); };
const makeLink = () => {
  const url = window.prompt('URL do link:');
  if (url) { editable.value?.focus(); document.execCommand('createLink', false, url); onInput(); }
};

// Inserção de mídia/recurso no ponto do cursor.
const insertHtml = (html) => {
  editable.value?.focus();
  document.execCommand('insertHTML', false, html);
  onInput();
};

defineExpose({ insertHtml, focus: () => editable.value?.focus() });
</script>

<style scoped>
.doc-editor { display: flex; flex-direction: column; height: 100%; }
.doc-toolbar {
  display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
  padding: 8px 12px; border-bottom: 1px solid var(--border-color);
  background: var(--bg-hover);
}
.dt-btn {
  min-width: 30px; height: 30px; padding: 0 8px;
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  background: var(--bg-card, #fff); border: 1px solid var(--border-color);
  border-radius: 6px; color: var(--text-secondary);
  font-size: 0.85rem; cursor: pointer; transition: all 0.12s;
}
.dt-btn:hover { border-color: var(--brand-primary); color: var(--brand-primary); }
.dt-resource { font-weight: 600; font-size: 0.78rem; }
.dt-sep { width: 1px; height: 20px; background: var(--border-color); margin: 0 4px; }

.doc-surface {
  flex: 1; min-height: 460px; overflow-y: auto;
  padding: 1.5rem 1.75rem; outline: none;
  background: var(--bg-input-form, var(--bg-body)); color: var(--text-main);
  font-family: Georgia, 'Times New Roman', serif; font-size: 1rem; line-height: 1.7;
}
.doc-surface:empty::before {
  content: attr(data-placeholder);
  color: var(--text-muted); font-family: inherit; pointer-events: none;
}
.doc-surface:focus { box-shadow: inset 0 0 0 2px rgba(47, 84, 235, 0.15); }
.doc-surface :deep(h2) { font-size: 1.5rem; font-weight: 700; margin: 1.2rem 0 0.6rem; }
.doc-surface :deep(h3) { font-size: 1.2rem; font-weight: 700; margin: 1rem 0 0.5rem; }
.doc-surface :deep(p) { margin: 0 0 0.9rem; }
.doc-surface :deep(ul), .doc-surface :deep(ol) { margin: 0 0 0.9rem 1.5rem; }
.doc-surface :deep(blockquote) {
  margin: 0 0 0.9rem; padding: 0.5rem 1rem;
  border-left: 3px solid var(--brand-primary); color: var(--text-secondary); font-style: italic;
}
.doc-surface :deep(a) { color: var(--brand-primary); }
.doc-surface :deep(img) { max-width: 100%; border-radius: 8px; }
</style>
