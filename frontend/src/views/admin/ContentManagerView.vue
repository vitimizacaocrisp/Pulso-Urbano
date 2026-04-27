<template>
  <div class="manager-page">

    <!-- Modais de mídia (componente compartilhado) -->
    <AnalysisMediaModal
      :show-resource-menu="showResourceMenu"
      :show-media-input="showMediaInput"
      :active-type="activeMediaType"
      file-input-id="cmFileInput"
      @close-menu="showResourceMenu = false"
      @close-media="showMediaInput = false"
      @select-type="onSelectType"
      @back-to-menu="showMediaInput = false; showResourceMenu = true"
      @confirm="onMediaConfirm"
    />

    <!-- Barra superior -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Nova Análise</h1>
        <p class="page-subtitle">Crie e publique uma nova página de análise.</p>
      </div>
      <div class="header-actions">
        <div class="autosave-indicator" v-if="lastSaved">
          <Icon icon="mdi:cloud-check-outline" width="16" />
          Salvo às {{ lastSaved }}
        </div>
        <button type="button" class="btn-ghost" @click="isPreview = !isPreview">
          <Icon :icon="isPreview ? 'mdi:pencil-outline' : 'mdi:eye-outline'" width="17" />
          {{ isPreview ? 'Editar' : 'Prévia' }}
        </button>
        <button type="button" class="btn-primary" :disabled="isFormInvalid || isLoading" @click="publish">
          <Icon v-if="isLoading" icon="mdi:loading" width="17" class="spin" />
          <Icon v-else icon="mdi:publish" width="17" />
          {{ isLoading ? 'Publicando...' : 'Publicar' }}
        </button>
      </div>
    </div>

    <!-- Feedback -->
    <transition name="slide-down">
      <div v-if="feedback.message" class="feedback-bar" :class="feedback.type">
        <Icon :icon="feedbackIcon" width="18" />
        {{ feedback.message }}
        <button @click="feedback.message = ''" type="button" class="fb-close">×</button>
      </div>
    </transition>

    <!-- Editor / Preview -->
    <div v-if="!isPreview" class="editor-layout">

      <!-- LEFT: Form fields -->
      <div class="editor-left">
        <div class="panel">
          <AnalysisFormFields
            v-model="form"
            :image-preview-url="imagePreviewUrl"
            cover-input-id="cmCoverInput"
            @cover-change="handleCoverChange"
          />
        </div>
      </div>

      <!-- RIGHT: Monaco editor -->
      <div class="editor-right">
        <div class="panel editor-panel">
          <div class="editor-toolbar">
            <span class="toolbar-label">Conteúdo</span>
            <div class="toolbar-actions">
              <button type="button" class="tbr-btn" @click="showResourceMenu = true" title="Adicionar recurso">
                <Icon icon="mdi:plus-circle-outline" width="16" /> Recurso
              </button>
              <button v-for="fmt in formats" :key="fmt.type" type="button"
                class="tbr-btn icon-only" :title="fmt.label" @click="applyFmt(fmt.type)">
                <span v-html="fmt.html"></span>
              </button>
            </div>
          </div>
          <div ref="editorEl" class="monaco-wrap"></div>
        </div>
      </div>

    </div>

    <!-- Preview -->
    <div v-else class="preview-wrap">
      <div class="preview-inner">
        <img v-if="imagePreviewUrl" :src="imagePreviewUrl" class="preview-cover" alt="Capa" />
        <div class="preview-header">
          <span class="preview-cat">{{ form.category }}</span>
          <h1 class="preview-title">{{ form.title || 'Título da Análise' }}</h1>
          <h2 v-if="form.subtitle" class="preview-subtitle">{{ form.subtitle }}</h2>
          <div class="preview-meta">
            <span v-if="form.author">Por <strong>{{ form.author }}</strong></span>
            <span v-if="form.nationality" class="preview-badge">{{ form.nationality }}</span>
          </div>
        </div>
        <p class="preview-desc">{{ form.description }}</p>
        <IsolatedRenderer :content="renderedContent" />
        <div v-if="form.referenceLinks" class="preview-refs">
          <h3>Referências</h3>
          <ul>
            <li v-for="(l, i) in form.referenceLinks.split('\n').filter(x => x.trim())" :key="i">
              <a :href="l.startsWith('http') ? l : `//${l}`" target="_blank">{{ l }}</a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Bottom bar (mobile) -->
    <div class="bottom-action-bar">
      <button type="button" class="btn-ghost" @click="confirmClear">
        <Icon icon="mdi:delete-outline" width="17" /> Limpar
      </button>
      <button type="button" class="btn-primary" :disabled="isFormInvalid || isLoading" @click="publish">
        <Icon v-if="isLoading" icon="mdi:loading" width="17" class="spin" />
        {{ isLoading ? 'Publicando...' : 'Publicar Análise' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { marked } from 'marked';
import axios from 'axios';
import { openDB } from 'idb';
import * as monaco from 'monaco-editor';
import { Icon } from '@iconify/vue';
import { formatText, generateUrlMediaHtml, generateFileMediaHtml } from '@/assets/js/analysisUtils.js';
import IsolatedRenderer from '@/components/IsolatedRenderer.vue';
import AnalysisFormFields from '@/components/admin/AnalysisFormFields.vue';
import AnalysisMediaModal from '@/components/admin/AnalysisMediaModal.vue';
import { useTheme } from '@/composables/useTheme';
const { isDark } = useTheme();

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

// ── State ──────────────────────────────────────────────────────────────
const isPreview  = ref(false);
const isLoading  = ref(false);
const lastSaved  = ref('');
const feedback   = ref({ message: '', type: '' });
const editorEl   = ref(null);
let   monacoEditor = null;

const showResourceMenu = ref(false);
const showMediaInput   = ref(false);
const activeMediaType  = ref('');
const contentMediaMap  = ref(new Map());

const imagePreviewUrl  = ref('');

const getInitial = () => ({
  title: '', subtitle: '', tag: '', author: '', nationality: '',
  studyPeriod: '', source: '', category: '', description: '', content: '',
  referenceLinks: '', with_header: false, with_footer: false,
  states: [], cities: [], coverImage: null
});

const form = ref(getInitial());

const feedbackIcon = computed(() => ({
  success: 'mdi:check-circle-outline',
  error:   'mdi:alert-circle-outline',
  info:    'mdi:information-outline'
}[feedback.value.type] || 'mdi:information-outline'));

const isFormInvalid = computed(() =>
  !form.value.title || !form.value.tag || !form.value.author ||
  !form.value.category || !form.value.description || !form.value.content ||
  !form.value.nationality || !form.value.coverImage
);

// ── Toolbar formats ───────────────────────────────────────────────────
const formats = [
  { type: 'bold',   label: 'Negrito',  html: '<strong>B</strong>' },
  { type: 'italic', label: 'Itálico',  html: '<em>I</em>' },
  { type: 'heading',label: 'Título',   html: 'H' },
  { type: 'list',   label: 'Lista',    html: '≡' },
  { type: 'code',   label: 'Código',   html: '&lt;/&gt;' },
  { type: 'quote',  label: 'Citação',  html: '"' },
];
const applyFmt = (type) => { if (monacoEditor) formatText(monacoEditor, type); };

// ── Media modal handlers ──────────────────────────────────────────────
const onSelectType = (type) => {
  activeMediaType.value = type;
  showResourceMenu.value = false;
  showMediaInput.value   = true;
};

const onMediaConfirm = async ({ mode, url, files, type }) => {
  showMediaInput.value = false;
  if (mode === 'url') {
    const html = await generateUrlMediaHtml(url, type);
    insertIntoEditor(html);
  } else {
    for (const file of files) {
      const { html, placeholderId, blobUrl } = await generateFileMediaHtml(file, type);
      contentMediaMap.value.set(placeholderId, { file, blobUrl, type });
      insertIntoEditor(html);
    }
  }
};

const insertIntoEditor = (text) => {
  if (!monacoEditor) { form.value.content += '\n' + text; return; }
  const pos = monacoEditor.getPosition();
  monacoEditor.executeEdits('', [{
    range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
    text: '\n' + text + '\n', forceMoveMarkers: true
  }]);
  monacoEditor.focus();
};

// ── Cover image ───────────────────────────────────────────────────────
const handleCoverChange = (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value);
  form.value.coverImage = f;
  imagePreviewUrl.value = URL.createObjectURL(f);
};

// ── Monaco ────────────────────────────────────────────────────────────
const initEditor = () => {
  if (!editorEl.value || monacoEditor) return;
  monacoEditor = monaco.editor.create(editorEl.value, {
    value: form.value.content,
    language: 'markdown',
    theme: isDark.value ? 'vs-dark' : 'vs',
    fontSize: 14, lineNumbers: 'on', wordWrap: 'on',
    minimap: { enabled: false }, scrollBeyondLastLine: false,
    automaticLayout: true, tabSize: 2, insertSpaces: true,
    renderLineHighlight: 'line',
  });
  monacoEditor.onDidChangeModelContent(() => {
    form.value.content = monacoEditor.getValue();
  });
  monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => applyFmt('bold'));
  monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => applyFmt('italic'));
};

watch(isDark, (v) => { if (monacoEditor) monaco.editor.setTheme(v ? 'vs-dark' : 'vs'); });
watch(isPreview, async (v) => {
  if (!v) { await nextTick(); setTimeout(() => monacoEditor?.layout(), 350); }
});

// ── Rendered preview ──────────────────────────────────────────────────
const renderedContent = computed(() => {
  let c = form.value.content?.trim() || '';
  if (!c) return '<p><em>Comece a escrever...</em></p>';
  for (const [id, { blobUrl }] of contentMediaMap.value.entries()) {
    if (blobUrl) c = c.replace(new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), blobUrl);
  }
  c = c.split('/uploads/').map((part, i) => i === 0 ? part : API_BASE_URL + '/uploads/' + part).join('');
  if (c.startsWith('```html')) c = c.replace(/^```html\s*/i, '').replace(/\s*```$/, '').trim();
  return /^</.test(c) ? c : marked.parse(c, { headerIds: false, mangle: false });
});

// ── Draft (IndexedDB + localStorage) ──────────────────────────────────
const DB_NAME = 'pu-draft-db', STORE = 'files', DRAFT_KEY = 'pu-new-draft';
let dbPromise = null;
const getDb = () => {
  if (!dbPromise) dbPromise = openDB(DB_NAME, 1, { upgrade(db) { db.createObjectStore(STORE); } });
  return dbPromise;
};
const dbPut = async (k, v) => { const db = await getDb(); await db.put(STORE, v, k); };
const dbGet = async (k) => { const db = await getDb(); return db.get(STORE, k); };
const dbClear = async () => { const db = await getDb(); await db.clear(STORE); };

const saveDraft = async () => {
  const d = JSON.parse(JSON.stringify({ ...form.value, coverImage: null }));
  if (form.value.coverImage instanceof File) {
    const k = `draft_cover_${Date.now()}`;
    await dbPut(k, form.value.coverImage);
    d.coverImage = { key: k, name: form.value.coverImage.name };
  }
  d.mediaMap = {};
  for (const [id, { file, type }] of contentMediaMap.value.entries()) {
    if (file instanceof File) {
      const k = `draft_media_${id}`;
      await dbPut(k, file);
      d.mediaMap[id] = { key: k, type };
    }
  }
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ d, exp: Date.now() + 3600_000 }));
  lastSaved.value = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const loadDraft = async () => {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return;
  const saved = JSON.parse(raw);
  if (saved.exp < Date.now()) { await dbClear(); localStorage.removeItem(DRAFT_KEY); return; }
  const d = saved.d;
  if (d.coverImage?.key) {
    const f = await dbGet(d.coverImage.key);
    if (f) { d.coverImage = f; imagePreviewUrl.value = URL.createObjectURL(f); }
    else d.coverImage = null;
  }
  if (d.mediaMap) {
    for (const [id, { key, type }] of Object.entries(d.mediaMap)) {
      const f = await dbGet(key);
      if (f) contentMediaMap.value.set(id, { file: f, blobUrl: URL.createObjectURL(f), type });
    }
    delete d.mediaMap;
  }
  Object.assign(form.value, d);
  if (monacoEditor && d.content) monacoEditor.setValue(d.content);
};

let draftTimer = null;
watch(form, () => {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 2000);
}, { deep: true });

// ── Reset ─────────────────────────────────────────────────────────────
const reset = async () => {
  await dbClear(); localStorage.removeItem(DRAFT_KEY);
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value);
  for (const { blobUrl } of contentMediaMap.value.values()) URL.revokeObjectURL(blobUrl);
  contentMediaMap.value.clear();
  imagePreviewUrl.value = '';
  form.value = getInitial();
  if (monacoEditor) monacoEditor.setValue('');
};

const confirmClear = async () => {
  if (confirm('Limpar todo o formulário? O rascunho será apagado.')) {
    await reset();
    feedback.value = { message: 'Formulário limpo.', type: 'success' };
    setTimeout(() => { feedback.value.message = ''; }, 3000);
  }
};

// ── Publish ───────────────────────────────────────────────────────────
const publish = async () => {
  if (isFormInvalid.value) {
    feedback.value = { message: 'Preencha todos os campos obrigatórios (*).', type: 'error' }; return;
  }
  isLoading.value = true;
  feedback.value = { message: 'Preparando arquivos...', type: 'info' };
  const token = localStorage.getItem('authToken');

  try {
    const filesToUpload = [];
    if (form.value.coverImage instanceof File) filesToUpload.push({ file: form.value.coverImage, category: 'cover', tempId: 'cover' });
    for (const [id, { file, type }] of contentMediaMap.value.entries()) {
      if (file instanceof File) filesToUpload.push({ file, category: type || 'image', tempId: id });
    }

    const uploaded = {};
    if (filesToUpload.length > 0) {
      feedback.value = { message: `Enviando ${filesToUpload.length} arquivo(s)...`, type: 'info' };
      const { data: urlRes } = await axios.post(`${API_BASE_URL}/api/admin/generate-upload-urls`,
        { files: filesToUpload.map(f => ({ fileName: f.file.name, fileType: f.file.type, category: f.category, tempId: f.tempId })) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await Promise.all(urlRes.data.map(async (plan) => {
        const fo = filesToUpload.find(f => f.tempId === plan.tempId);
        if (!fo) return;
        await axios.put(plan.uploadUrl, fo.file, { headers: { 'Content-Type': fo.file.type } });
        uploaded[plan.tempId] = plan.publicUrl;
      }));
    }

    let finalContent = form.value.content;
    for (const [id, url] of Object.entries(uploaded)) {
      if (id !== 'cover') finalContent = finalContent.replace(new RegExp(id.replace(/[-\\^$*+?.()|[\]\\{}]/g, '\\$&'), 'g'), url);
    }

    const payload = {
      ...form.value, lastUpdate: new Date().toISOString(),
      content: finalContent, coverImagePath: uploaded['cover'] || null,
    };
    delete payload.coverImage;

    const { data } = await axios.post(`${API_BASE_URL}/api/admin/analyses`, payload, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });

    feedback.value = { message: data.message || 'Análise publicada com sucesso!', type: 'success' };
    await reset(); isPreview.value = false;
  } catch (err) {
    feedback.value = { message: err.response?.data?.message || err.message || 'Falha ao publicar.', type: 'error' };
  } finally {
    isLoading.value = false;
    setTimeout(() => { if (feedback.value.type !== 'error') feedback.value.message = ''; }, 6000);
  }
};

// ── Lifecycle ─────────────────────────────────────────────────────────
onMounted(async () => {
  await loadDraft();
  await nextTick();
  initEditor();
});
onBeforeUnmount(() => {
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value);
  for (const { blobUrl } of contentMediaMap.value.values()) URL.revokeObjectURL(blobUrl);
  if (monacoEditor) { monacoEditor.dispose(); monacoEditor = null; }
  clearTimeout(draftTimer);
});
</script>

<style scoped>
.manager-page { padding: 1.75rem 2rem; max-width: 1500px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
.page-title  { font-size: 1.6rem; font-weight: 800; color: var(--text-main); margin: 0; letter-spacing: -0.5px; }
.page-subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 0.875rem; }
.header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.autosave-indicator { display: flex; align-items: center; gap: 5px; font-size: 0.78rem; color: #10b981; }

.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--brand-primary); color: #fff;
  border: none; border-radius: 8px; padding: 9px 18px;
  font-size: 0.875rem; font-weight: 700; cursor: pointer;
  transition: all 0.15s; box-shadow: 0 2px 8px rgba(99,102,241,0.3);
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--bg-hover); border: 1px solid var(--border-color);
  border-radius: 8px; padding: 8px 16px;
  font-size: 0.875rem; font-weight: 600; color: var(--text-secondary);
  cursor: pointer; transition: all 0.15s;
}
.btn-ghost:hover { border-color: var(--text-main); color: var(--text-main); }

/* Feedback */
.feedback-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 10px; font-size: 0.875rem; font-weight: 600;
  border: 1px solid transparent;
}
.feedback-bar.success { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.25); color: #059669; }
.feedback-bar.error   { background: rgba(239,68,68,0.1);  border-color: rgba(239,68,68,0.25);  color: #dc2626; }
.feedback-bar.info    { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.25); color: var(--brand-primary); }
.fb-close { margin-left: auto; background: none; border: none; cursor: pointer; font-size: 1.2rem; line-height: 1; color: inherit; opacity: 0.7; }
.fb-close:hover { opacity: 1; }

/* Editor layout */
.editor-layout { display: grid; grid-template-columns: 420px 1fr; gap: 1.25rem; align-items: start; }
.editor-left, .editor-right { display: flex; flex-direction: column; gap: 0; }
.panel {
  background: var(--bg-card, var(--bg-surface));
  border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem;
}
.editor-panel { padding: 0; overflow: hidden; display: flex; flex-direction: column; }

/* Toolbar */
.editor-toolbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; border-bottom: 1px solid var(--border-color);
  background: var(--bg-hover); flex-wrap: wrap; gap: 6px;
}
.toolbar-label { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); }
.toolbar-actions { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.tbr-btn {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--bg-card, #fff); border: 1px solid var(--border-color);
  border-radius: 6px; padding: 5px 10px;
  font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);
  cursor: pointer; transition: all 0.12s;
}
.tbr-btn:hover { border-color: var(--brand-primary); color: var(--brand-primary); }
.tbr-btn.icon-only { padding: 5px 8px; min-width: 30px; justify-content: center; }

.monaco-wrap { height: 580px; }

/* Preview */
.preview-wrap { background: #fff; border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; }
.preview-inner { max-width: 780px; margin: 0 auto; padding: 3rem 2rem; }
.preview-cover { width: 100%; height: 280px; object-fit: cover; border-radius: 10px; margin-bottom: 2rem; }
.preview-cat { display: inline-block; background: rgba(99,102,241,0.1); color: var(--brand-primary); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 3px 10px; border-radius: 4px; margin-bottom: 1rem; }
.preview-title { font-size: 2.5rem; font-weight: 900; color: #0f172a; line-height: 1.1; margin: 0 0 0.5rem; }
.preview-subtitle { font-size: 1.25rem; font-weight: 300; color: #475569; margin: 0 0 1rem; }
.preview-meta { display: flex; align-items: center; gap: 10px; font-size: 0.875rem; color: #64748b; flex-wrap: wrap; }
.preview-badge { background: #fff3e0; color: #e65100; padding: 2px 10px; border-radius: 4px; font-size: 0.8em; }
.preview-desc { font-size: 1.1rem; color: #475569; line-height: 1.6; margin: 1.5rem 0; }
.preview-refs h3 { font-size: 1rem; color: #0f172a; margin-bottom: 0.5rem; }
.preview-refs ul { list-style: none; padding: 0; }
.preview-refs li a { color: var(--brand-primary); text-decoration: none; font-size: 0.875rem; }

/* Bottom bar */
.bottom-action-bar { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: var(--bg-header); border-top: 1px solid var(--border-color); padding: 0.75rem 1rem; z-index: 100; justify-content: space-between; align-items: center; }

.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.25s; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-10px); }

@media (max-width: 1100px) { .editor-layout { grid-template-columns: 1fr; } }
@media (max-width: 768px) {
  .manager-page { padding: 1rem; padding-bottom: 80px; }
  .bottom-action-bar { display: flex; }
  .header-actions .btn-primary { display: none; }
  .monaco-wrap { height: 400px; }
}
</style>
