<template>
  <div class="document-reader" :aria-busy="loading">
    <div v-if="loading" class="viewer-state"><Icon icon="mdi:loading" class="spin" /> Abrindo documento…</div>
    <div v-else-if="error" class="viewer-state error"><Icon icon="mdi:alert-circle-outline" /> {{ error }}</div>
    <iframe v-else-if="mode === 'pdf'" :src="url" :title="`Leitor de ${file.nome || 'PDF'}`"></iframe>
    <iframe v-else-if="mode === 'office'" :src="officeEmbed" :title="`Leitor de ${file.nome || 'documento'}`"></iframe>
    <article v-else-if="mode === 'html'" class="docx-content" v-html="html"></article>
    <pre v-else-if="mode === 'text'">{{ text }}</pre>
    <div v-else class="viewer-state">Selecione um documento para abrir.</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { canPreviewInMemory, fileExtension, type AttachmentFile } from '@/utils/attachmentResources'

const props = withDefaults(defineProps<{
  url?: string
  file?: AttachmentFile
}>(), {
  url: '',
  file: () => ({}),
})

const loading = ref(false)
const error = ref('')
const mode = ref('')
const html = ref('')
const text = ref('')
const officeEmbed = computed(() => props.url
  ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(props.url)}` : '')

async function load() {
  error.value = ''
  html.value = ''
  text.value = ''
  mode.value = ''
  if (!props.url) return
  const ext = fileExtension(props.file)
  if (ext === 'pdf') { mode.value = 'pdf'; return }
  if (ext === 'doc') { mode.value = 'office'; return }
  if (!canPreviewInMemory(props.file)) {
    error.value = 'Arquivo grande demais para o mini leitor. Use "Abrir externamente" ou baixe o documento.'
    return
  }
  loading.value = true
  try {
    const response = await fetch(props.url)
    if (!response.ok) throw new Error('Documento indisponível.')
    if (ext === 'docx') {
      const { default: mammoth } = await import('mammoth')
      const converted = await mammoth.convertToHtml({ arrayBuffer: await response.arrayBuffer() })
      html.value = DOMPurify.sanitize(converted.value)
      mode.value = 'html'
    } else if (ext === 'md') {
      html.value = DOMPurify.sanitize(marked.parse(await response.text()) as string)
      mode.value = 'html'
    } else if (['txt', 'rtf'].includes(ext)) {
      text.value = (await response.text()).slice(0, 500_000)
      mode.value = 'text'
    } else {
      mode.value = 'office'
    }
  } catch (err: any) {
    error.value = err.message || 'Não foi possível abrir o documento.'
  } finally {
    loading.value = false
  }
}

watch(() => [props.url, props.file?.id], load, { immediate: true })
</script>

<style scoped>
.document-reader { min-height: 260px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--border-color)); border-radius: 14px; background: #fff; }
.document-reader iframe { display: block; width: 100%; min-height: 560px; border: 0; background: #fff; }
.viewer-state { min-height: 260px; display: flex; align-items: center; justify-content: center; gap: .5rem; padding: 1.5rem; color: #657089; text-align: center; }
.viewer-state.error { color: #b42318; }
.docx-content { max-height: 580px; overflow: auto; padding: 2rem clamp(1rem, 5vw, 3.5rem); color: #222; font: 1rem/1.7 Georgia, serif; }
.docx-content :deep(h1), .docx-content :deep(h2), .docx-content :deep(h3) { color: #111827; }
.docx-content :deep(img) { max-width: 100%; height: auto; }
.document-reader pre { max-height: 560px; margin: 0; overflow: auto; padding: 1.25rem; white-space: pre-wrap; color: #1f2937; font: .86rem/1.65 "Cascadia Code", Consolas, monospace; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 640px) { .document-reader iframe { min-height: 420px; } }
</style>
