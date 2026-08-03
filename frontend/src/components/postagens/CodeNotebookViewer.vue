<template>
  <div class="code-viewer" :aria-busy="loading">
    <div v-if="loading" class="viewer-state"><Icon icon="mdi:loading" class="spin" /> Preparando visualização…</div>
    <div v-else-if="error" class="viewer-state error"><Icon icon="mdi:alert-circle-outline" /> {{ error }}</div>

    <div v-else-if="notebookCells.length" class="notebook-cells">
      <article v-for="(cell, index) in notebookCells" :key="index" class="notebook-cell" :class="cell.kind">
        <span class="cell-index">{{ cell.kind === 'code' ? `In [${cell.execution ?? ' '}]` : 'Texto' }}</span>
        <div v-if="cell.kind === 'markdown'" class="markdown" v-html="cell.html"></div>
        <template v-else>
          <pre><code>{{ cell.source }}</code></pre>
          <div v-if="cell.output" class="cell-output"><span>Saída</span><pre>{{ cell.output }}</pre></div>
        </template>
      </article>
      <p v-if="hiddenCells" class="viewer-note">Prévia limitada: {{ hiddenCells }} células adicionais estão disponíveis no arquivo.</p>
    </div>

    <pre v-else-if="source" class="source-code"><code>{{ source }}</code></pre>
    <div v-else class="viewer-state">O arquivo não contém texto para exibir.</div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const props = defineProps({
  url: { type: String, default: '' },
  kind: { type: String, default: 'code' },
});

const loading = ref(false);
const error = ref('');
const source = ref('');
const notebook = ref(null);
const MAX_CELLS = 40;

const textOf = (value) => Array.isArray(value) ? value.join('') : String(value || '');

const notebookCells = computed(() => {
  if (!notebook.value?.cells) return [];
  return notebook.value.cells.slice(0, MAX_CELLS).map((cell) => {
    const kind = cell.cell_type === 'markdown' ? 'markdown' : 'code';
    const raw = textOf(cell.source);
    if (kind === 'markdown') {
      return { kind, html: DOMPurify.sanitize(marked.parse(raw)) };
    }
    const output = (cell.outputs || []).map((item) =>
      textOf(item.text || item.data?.['text/plain'] || item.ename || '')).filter(Boolean).join('\n');
    return { kind, source: raw, output, execution: cell.execution_count };
  });
});
const hiddenCells = computed(() => Math.max(0, (notebook.value?.cells?.length || 0) - MAX_CELLS));

async function load() {
  source.value = '';
  notebook.value = null;
  error.value = '';
  if (!props.url) return;
  loading.value = true;
  try {
    const response = await fetch(props.url);
    if (!response.ok) throw new Error('Não foi possível abrir a prévia.');
    const text = await response.text();
    if (props.kind === 'notebook') notebook.value = JSON.parse(text);
    else source.value = text.slice(0, 500_000);
  } catch (err) {
    error.value = props.kind === 'notebook'
      ? 'Notebook inválido ou indisponível.'
      : (err.message || 'Código indisponível.');
  } finally {
    loading.value = false;
  }
}

watch(() => [props.url, props.kind], load, { immediate: true });
</script>

<style scoped>
.code-viewer { min-height: 180px; border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border-color)); border-radius: 14px; overflow: hidden; background: #0b1020; color: #dbe7ff; }
.viewer-state { min-height: 180px; display: flex; align-items: center; justify-content: center; gap: .5rem; color: #9fb0cf; }
.viewer-state.error { color: #ffb4b4; }
.source-code, .notebook-cell pre { margin: 0; padding: 1rem 1.15rem; overflow: auto; white-space: pre; font: .82rem/1.65 "Cascadia Code", "IBM Plex Mono", Consolas, monospace; }
.notebook-cells { padding: .8rem; display: grid; gap: .75rem; }
.notebook-cell { border: 1px solid rgba(255,255,255,.1); border-radius: 10px; background: rgba(255,255,255,.035); overflow: hidden; }
.cell-index { display: block; padding: .45rem .75rem; border-bottom: 1px solid rgba(255,255,255,.08); color: #7795c9; font: .68rem/1.2 "Cascadia Code", monospace; }
.markdown { padding: .8rem 1rem; color: #e8eefb; line-height: 1.65; }
.markdown :deep(p:first-child) { margin-top: 0; }
.markdown :deep(p:last-child) { margin-bottom: 0; }
.cell-output { border-top: 1px dashed rgba(255,255,255,.14); background: #111827; }
.cell-output > span { display: block; padding: .4rem .75rem 0; color: #7dd3a7; font-size: .68rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
.cell-output pre { color: #bce5ce; white-space: pre-wrap; }
.viewer-note { margin: 0; padding: .75rem; color: #9fb0cf; font-size: .76rem; text-align: center; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
