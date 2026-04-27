<template>
  <div class="edit-page">

    <!-- Modais de mídia (componente compartilhado) -->
    <AnalysisMediaModal
      :show-resource-menu="showResourceMenu"
      :show-media-input="showMediaInput"
      :active-type="activeMediaType"
      file-input-id="eaFileInput"
      @close-menu="showResourceMenu = false"
      @close-media="showMediaInput = false"
      @select-type="onSelectType"
      @back-to-menu="showMediaInput = false; showResourceMenu = true"
      @confirm="onMediaConfirm"
    />

    <!-- Confirmação de deleção -->
    <teleport to="body">
      <transition name="modal-fade">
        <div v-if="showDeleteConfirm" class="modal-backdrop" @click.self="showDeleteConfirm = false">
          <div class="delete-modal">
            <div class="dm-icon"><Icon icon="mdi:delete-alert-outline" width="32" /></div>
            <h3>Deletar análise?</h3>
            <p>Essa ação é irreversível. Todos os arquivos de mídia associados também serão removidos.</p>
            <div class="dm-title-preview">{{ form.title }}</div>
            <div class="dm-actions">
              <button class="btn-ghost" @click="showDeleteConfirm = false">Cancelar</button>
              <button class="btn-danger" :disabled="isDeleting" @click="confirmDelete">
                <Icon v-if="isDeleting" icon="mdi:loading" class="spin" width="16" />
                {{ isDeleting ? 'Deletando...' : 'Sim, deletar' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- Barra superior -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Gerenciar Análises</h1>
        <p class="page-subtitle">Busque, edite e organize o conteúdo do acervo.</p>
      </div>
      <div class="header-actions" v-if="activeAnalysisId">
        <span class="id-badge">ID: {{ activeAnalysisId }}</span>
        <button type="button" class="btn-danger-ghost" @click="showDeleteConfirm = true">
          <Icon icon="mdi:delete-outline" width="16" /> Deletar
        </button>
        <button type="button" class="btn-ghost" @click="isPreview = !isPreview">
          <Icon :icon="isPreview ? 'mdi:pencil-outline' : 'mdi:eye-outline'" width="16" />
          {{ isPreview ? 'Editar' : 'Prévia' }}
        </button>
        <button type="button" class="btn-primary" :disabled="isFormInvalid || isSaving" @click="save">
          <Icon v-if="isSaving" icon="mdi:loading" width="16" class="spin" />
          <Icon v-else icon="mdi:content-save-outline" width="16" />
          {{ isSaving ? 'Salvando...' : 'Salvar Alterações' }}
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

    <!-- SEARCH SECTION — sempre visível, com destaque especial -->
    <div class="search-section">
      <div class="search-section-header">
        <Icon icon="mdi:text-search" width="20" />
        <span>Buscar análise para editar</span>
        <span v-if="activeAnalysisId" class="change-hint">Selecione outra análise para trocar</span>
      </div>
      <AdminAnalysisSearch
        v-model="selectedAnalysis"
        @select="onAnalysisSelect"
      />
    </div>

    <!-- Loading state -->
    <!-- Loading state -->
    <div v-if="isLoadingAnalysis" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando análise...</p>
    </div>

    <!-- Empty state - nada selecionado -->
    <div v-if="!isLoadingAnalysis && !activeAnalysisId" class="empty-state">
      <div class="empty-illustration">
        <Icon icon="mdi:file-search-outline" width="56" />
      </div>
      <h3>Selecione uma análise</h3>
      <p>Use a busca acima para encontrar a análise que deseja editar. Você pode pesquisar por título, ID, autor, tag ou categoria.</p>
      <div class="empty-tips">
        <div class="tip"><Icon icon="mdi:lightbulb-outline" width="14" /> Digite parte do título para encontrar rapidamente</div>
        <div class="tip"><Icon icon="mdi:pound" width="14" /> Use o ID exato para localizar diretamente</div>
        <div class="tip"><Icon icon="mdi:tag-outline" width="14" /> Busque por tag para ver análises relacionadas</div>
      </div>
    </div>

    <!-- EDITOR / PREVIEW — sempre no DOM para Monaco funcionar, visibilidade via v-show -->
    <div v-show="!isLoadingAnalysis && activeAnalysisId">

      <!-- Preview mode -->
      <div v-if="isPreview" class="preview-wrap">
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

      <!-- Edit mode — Monaco container sempre no DOM via v-show -->
      <div v-show="!isPreview" class="editor-layout">
        <!-- LEFT: Form fields -->
        <div class="editor-left">
          <div class="panel">
            <AnalysisFormFields
              v-model="form"
              :image-preview-url="imagePreviewUrl"
              cover-input-id="eaCoverInput"
              @cover-change="handleCoverChange"
            />
          </div>
        </div>

        <!-- RIGHT: Monaco editor — div ref sempre presente no DOM -->
        <div class="editor-right">
          <div class="panel editor-panel">
            <div class="editor-toolbar">
              <span class="toolbar-label">Conteúdo HTML</span>
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

      <!-- Mobile bottom bar -->
      <div class="bottom-action-bar">
        <button type="button" class="btn-danger-ghost" @click="showDeleteConfirm = true">
          <Icon icon="mdi:delete-outline" width="16" />
        </button>
        <button type="button" class="btn-primary" :disabled="isFormInvalid || isSaving" @click="save">
          <Icon v-if="isSaving" icon="mdi:loading" width="16" class="spin" />
          {{ isSaving ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { marked } from 'marked';
import * as monaco from 'monaco-editor';
import { Icon } from '@iconify/vue';
import { formatText, generateUrlMediaHtml, generateFileMediaHtml } from '@/assets/js/analysisUtils.js';
import { cacheInvalidate } from '@/utils/apiCache.js';
import IsolatedRenderer from '@/components/IsolatedRenderer.vue';
import AnalysisFormFields from '@/components/admin/AnalysisFormFields.vue';
import AnalysisMediaModal from '@/components/admin/AnalysisMediaModal.vue';
import AdminAnalysisSearch from '@/components/admin/AdminAnalysisSearch.vue';
import { useTheme } from '@/composables/useTheme';
const { isDark } = useTheme();

const route  = useRoute();
const router = useRouter();
const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

// ── Core state ─────────────────────────────────────────────────────────
const selectedAnalysis   = ref(null);
const activeAnalysisId   = ref(null);
const isLoadingAnalysis  = ref(false);
const isSaving           = ref(false);
const isDeleting         = ref(false);
const isPreview          = ref(false);
const showDeleteConfirm  = ref(false);
const feedback           = ref({ message: '', type: '' });
const imagePreviewUrl    = ref('');
const editorEl           = ref(null);
let   monacoEditor       = null;

// Media
const showResourceMenu  = ref(false);
const showMediaInput    = ref(false);
const activeMediaType   = ref('');
const contentMediaMap   = ref(new Map());

// Form — matches fields in AnalysisFormFields
const getEmpty = () => ({
  title: '', subtitle: '', tag: '', author: '', nationality: '',
  studyPeriod: '', source: '', category: '', description: '',
  content: '', referenceLinks: '', with_header: false, with_footer: false,
  states: [], cities: [], coverImage: null,
  // internal tracking
  originalCoverPath: ''
});

const form = ref(getEmpty());

// ── Computed ───────────────────────────────────────────────────────────
const feedbackIcon = computed(() => ({
  success: 'mdi:check-circle-outline',
  error:   'mdi:alert-circle-outline',
  info:    'mdi:information-outline'
}[feedback.value.type] || 'mdi:information-outline'));

const isFormInvalid = computed(() =>
  !form.value.title || !form.value.tag || !form.value.author ||
  !form.value.category || !form.value.description || !form.value.content ||
  !form.value.nationality
);

// ── Toolbar formats ────────────────────────────────────────────────────
const formats = [
  { type: 'bold',   label: 'Negrito', html: '<strong>B</strong>' },
  { type: 'italic', label: 'Itálico', html: '<em>I</em>' },
  { type: 'heading',label: 'Título',  html: 'H' },
  { type: 'list',   label: 'Lista',   html: '≡' },
  { type: 'code',   label: 'Código',  html: '&lt;/&gt;' },
  { type: 'quote',  label: 'Citação', html: '"' },
];
const applyFmt = (type) => { if (monacoEditor) formatText(monacoEditor, type); };

// ── On analysis selected via search ───────────────────────────────────
const onAnalysisSelect = async (item) => {
  if (!item?.id) return;
  await loadAnalysis(item.id);
};

// ── Load analysis from API ────────────────────────────────────────────
const loadAnalysis = async (id) => {
  isLoadingAnalysis.value = true;
  isPreview.value = false;
  feedback.value = { message: '', type: '' };

  try {
    const token = localStorage.getItem('authToken');
    const { data } = await axios.get(`${API_BASE_URL}/api/admin/analyses/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const a = data.data;
    activeAnalysisId.value = a.id;

    // Parse JSONB fields
    const parseJsonField = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
      return [];
    };

    form.value = {
      title:           a.title          || '',
      subtitle:        a.subtitle       || '',
      tag:             a.tag            || '',
      author:          a.author         || '',
      nationality:     a.nationality    || '',
      studyPeriod:     a.study_period   || '',
      source:          a.source         || '',
      category:        a.category       || '',
      description:     a.description   || '',
      content:         a.content        || '',
      referenceLinks:  a.reference_links || '',
      with_header:     a.with_header    ?? false,
      with_footer:     a.with_footer    ?? false,
      states:          parseJsonField(a.states),
      cities:          parseJsonField(a.cities),
      coverImage:      a.cover_image_path
        ? { serverPath: a.cover_image_path, type: 'existing' }
        : null,
      originalCoverPath: a.cover_image_path || ''
    };

    imagePreviewUrl.value = a.cover_image_path || '';

    // Sync URL query
    router.replace({ query: { id } });

    // Editor já está inicializado desde o onMounted (v-show garante DOM sempre presente)
    // Apenas atualiza o valor — sem recriar o editor
    if (monacoEditor) {
      monacoEditor.setValue(a.content || '');
      monacoEditor.setScrollPosition({ scrollTop: 0 });
      monacoEditor.layout();
    } else {
      // Fallback: se por algum motivo o editor não existir ainda, cria agora
      await nextTick();
      await nextTick();
      initEditor();
    }

    feedback.value = { message: `Análise "${a.title}" carregada.`, type: 'success' };
    setTimeout(() => { feedback.value.message = ''; }, 4000);

  } catch (err) {
    feedback.value = {
      message: err.response?.data?.message || 'Falha ao carregar análise.',
      type: 'error'
    };
    activeAnalysisId.value = null;
  } finally {
    isLoadingAnalysis.value = false;
  }
};

// ── Cover change ──────────────────────────────────────────────────────
const handleCoverChange = (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  if (imagePreviewUrl.value && imagePreviewUrl.value.startsWith('blob:'))
    URL.revokeObjectURL(imagePreviewUrl.value);
  form.value.coverImage = f;
  imagePreviewUrl.value = URL.createObjectURL(f);
};

// ── Media modals ──────────────────────────────────────────────────────
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

// ── Monaco editor ─────────────────────────────────────────────────────
const initEditor = () => {
  if (!editorEl.value) return;
  // Destroi instância anterior se existir (ao trocar análise via reinit)
  if (monacoEditor) {
    monacoEditor.dispose();
    monacoEditor = null;
  }
  monacoEditor = monaco.editor.create(editorEl.value, {
    value: form.value.content || '',
    language: 'html',
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
  if (!c) return '<p><em>Sem conteúdo ainda.</em></p>';
  for (const [id, { blobUrl }] of contentMediaMap.value.entries()) {
    if (blobUrl) c = c.replace(new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), blobUrl);
  }
  c = c.split('/uploads/').map((part, i) => i === 0 ? part : API_BASE_URL + '/uploads/' + part).join('');
  if (c.startsWith('```html')) c = c.replace(/^```html\s*/i, '').replace(/\s*```$/, '').trim();
  return /^</.test(c) ? c : marked.parse(c, { headerIds: false, mangle: false });
});

// ── Save ───────────────────────────────────────────────────────────────
const save = async () => {
  if (!activeAnalysisId.value || isFormInvalid.value) return;
  isSaving.value = true;
  feedback.value = { message: 'Salvando...', type: 'info' };
  const token = localStorage.getItem('authToken');

  try {
    const filesToUpload = [];
    const isNewCover = form.value.coverImage instanceof File;
    if (isNewCover)
      filesToUpload.push({ file: form.value.coverImage, category: 'cover', tempId: 'cover' });

    for (const [id, { file, type }] of contentMediaMap.value.entries()) {
      if (file instanceof File) filesToUpload.push({ file, category: type || 'image', tempId: id });
    }

    const uploaded = {};

    if (filesToUpload.length > 0) {
      feedback.value = { message: `Enviando ${filesToUpload.length} arquivo(s)...`, type: 'info' };

      // 1. Preparamos os metadados garantindo que nenhum campo seja enviado como string vazia
      const metaData = filesToUpload.map(f => ({
        fileName: f.file.name,
        // Se o navegador não detectar o tipo, enviamos um tipo binário genérico
        fileType: f.file.type || 'application/octet-stream', 
        // Garante que a categoria não vá vazia (usa 'image' como padrão se f.category falhar)
        category: f.category || 'image', 
        tempId: f.tempId
      }));

      try {
        // 2. Solicitamos as URLs assinadas
        const response = await axios.post(`${API_BASE_URL}/api/admin/generate-upload-urls`,
          { files: metaData },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // O backend retorna { success: true, data: [...] }, então usamos response.data.data
        const uploadPlans = response.data.data;

        // 3. Executamos os uploads simultâneos para o R2/S3
        await Promise.all(uploadPlans.map(async (plan) => {
          const fo = filesToUpload.find(f => f.tempId === plan.tempId);
          if (!fo) return;

          await axios.put(plan.uploadUrl, fo.file, { 
            headers: { 'Content-Type': fo.file.type || 'application/octet-stream' } 
          });

          uploaded[plan.tempId] = plan.publicUrl;
        }));
        
      } catch (err) {
        console.error("Erro no processo de upload:", err);
        throw err; // Repassa para o catch principal da função updateAnalysis
      }
    }

    let finalContent = form.value.content;
    for (const [id, url] of Object.entries(uploaded)) {
      if (id !== 'cover')
        finalContent = finalContent.replace(
          new RegExp(id.replace(/[-\\^$*+?.()|[\]\\{}]/g, '\\$&'), 'g'), url
        );
    }

    const coverImagePath = uploaded['cover'] || form.value.originalCoverPath;

    const payload = {
      title:          form.value.title,
      subtitle:       form.value.subtitle,
      lastUpdate:     new Date().toISOString(),
      studyPeriod:    form.value.studyPeriod,
      source:         form.value.source,
      category:       form.value.category,
      tag:            form.value.tag,
      author:         form.value.author,
      description:    form.value.description,
      content:        finalContent,
      referenceLinks: form.value.referenceLinks,
      coverImagePath,
      nationality:    form.value.nationality,
      states:         form.value.states,
      cities:         form.value.cities,
      with_header:    form.value.with_header,
      with_footer:    form.value.with_footer,
    };

    const { data } = await axios.put(
      `${API_BASE_URL}/api/admin/analyses/${activeAnalysisId.value}`,
      payload,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    // Invalida caches relevantes
    cacheInvalidate(`analysis:${activeAnalysisId.value}`);
    cacheInvalidate('analyses:list');
    cacheInvalidate('public:analysis:' + activeAnalysisId.value);

    // Atualiza originalCoverPath após salvar
    form.value.originalCoverPath = coverImagePath;
    if (isNewCover) form.value.coverImage = { serverPath: coverImagePath, type: 'existing' };

    feedback.value = { message: data.message || 'Análise salva com sucesso!', type: 'success' };
    contentMediaMap.value.clear();
    setTimeout(() => { feedback.value.message = ''; }, 5000);

  } catch (err) {
    feedback.value = {
      message: err.response?.data?.message || err.message || 'Erro ao salvar.',
      type: 'error'
    };
  } finally {
    isSaving.value = false;
  }
};

// ── Delete ─────────────────────────────────────────────────────────────
const confirmDelete = async () => {
  if (!activeAnalysisId.value) return;
  isDeleting.value = true;
  const token = localStorage.getItem('authToken');
  try {
    await axios.delete(`${API_BASE_URL}/api/admin/analyses/${activeAnalysisId.value}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    cacheInvalidate(`analysis:${activeAnalysisId.value}`);
    cacheInvalidate('analyses:list');
    cacheInvalidate('autocomplete');
    cacheInvalidate('filter:meta');

    showDeleteConfirm.value = false;
    activeAnalysisId.value  = null;
    selectedAnalysis.value  = null;
    form.value = getEmpty();
    imagePreviewUrl.value = '';
    if (monacoEditor) monacoEditor.setValue('');
    router.replace({ query: {} });

    feedback.value = { message: 'Análise deletada com sucesso.', type: 'success' };
    setTimeout(() => { feedback.value.message = ''; }, 4000);
  } catch (err) {
    feedback.value = {
      message: err.response?.data?.message || 'Erro ao deletar.',
      type: 'error'
    };
  } finally {
    isDeleting.value = false;
  }
};

// ── URL query param: auto-load if ?id= present ────────────────────────
onMounted(async () => {
  // Inicializa o editor vazio assim que o componente monta
  // O editorEl está sempre no DOM (v-show, não v-if)
  await nextTick();
  await nextTick();
  initEditor();

  // Se há ?id= na URL, carrega a análise automaticamente
  const id = route.query.id;
  if (id) await loadAnalysis(id);
});

onBeforeUnmount(() => {
  if (imagePreviewUrl.value?.startsWith('blob:'))
    URL.revokeObjectURL(imagePreviewUrl.value);
  for (const { blobUrl } of contentMediaMap.value.values())
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  if (monacoEditor) { monacoEditor.dispose(); monacoEditor = null; }
});
</script>

<style scoped>
.edit-page { padding: 1.75rem 2rem; max-width: 1500px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
.page-title  { font-size: 1.6rem; font-weight: 800; color: var(--text-main); margin: 0; letter-spacing: -0.5px; }
.page-subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 0.875rem; }
.header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.id-badge { font-size: 0.75rem; font-family: monospace; background: var(--bg-hover); color: var(--text-muted); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-color); }

/* Search section — visually distinct */
.search-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 1.5rem;
  border-left: 4px solid var(--brand-primary);
}
.search-section-header {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 1rem;
  font-size: 0.85rem; font-weight: 700;
  color: var(--text-main);
  text-transform: uppercase; letter-spacing: 0.6px;
}
.search-section-header svg { color: var(--brand-primary); }
.change-hint { margin-left: auto; font-size: 0.75rem; font-weight: 500; color: var(--text-muted); text-transform: none; letter-spacing: 0; }

/* Empty state */
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; gap: 1rem; color: var(--text-muted); }
.spinner { width: 36px; height: 36px; border: 3px solid var(--border-color); border-top-color: var(--brand-primary); border-radius: 50%; animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state {
  background: var(--bg-card); border: 1px dashed var(--border-color);
  border-radius: 14px; padding: 4rem 2rem;
  display: flex; flex-direction: column; align-items: center; gap: 1rem;
  text-align: center;
}
.empty-illustration { color: var(--text-muted); opacity: 0.4; }
.empty-state h3 { font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin: 0; }
.empty-state p  { color: var(--text-secondary); font-size: 0.9rem; max-width: 420px; line-height: 1.5; margin: 0; }
.empty-tips { display: flex; flex-direction: column; gap: 6px; margin-top: 0.5rem; }
.tip { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-muted); }

/* Editor layout */
.editor-layout { display: grid; grid-template-columns: 420px 1fr; gap: 1.25rem; align-items: start; }
.editor-left, .editor-right { display: flex; flex-direction: column; }
.panel {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 12px; padding: 1.5rem;
}
.editor-panel { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
.editor-toolbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; border-bottom: 1px solid var(--border-color);
  background: var(--bg-hover); flex-wrap: wrap; gap: 6px;
}
.toolbar-label { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); }
.toolbar-actions { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.tbr-btn {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--bg-card); border: 1px solid var(--border-color);
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

/* Delete modal */
.modal-backdrop { position: fixed; inset: 0; z-index: 9000; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 1rem; }
.delete-modal { background: var(--bg-card); border-radius: 16px; padding: 2.5rem; width: 100%; max-width: 440px; text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,0.2); }
.dm-icon { color: #ef4444; margin-bottom: 1rem; }
.delete-modal h3 { font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin: 0 0 0.5rem; }
.delete-modal p  { color: var(--text-secondary); font-size: 0.875rem; line-height: 1.5; margin: 0 0 1rem; }
.dm-title-preview { background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 14px; font-weight: 600; color: var(--text-main); font-size: 0.9rem; margin-bottom: 1.5rem; }
.dm-actions { display: flex; gap: 10px; justify-content: center; }

/* Buttons */
.btn-primary { display: inline-flex; align-items: center; gap: 6px; background: var(--brand-primary); color: #fff; border: none; border-radius: 8px; padding: 9px 18px; font-size: 0.875rem; font-weight: 700; cursor: pointer; transition: all 0.15s; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }
.btn-primary:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 16px; font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
.btn-ghost:hover { border-color: var(--text-main); color: var(--text-main); }
.btn-danger { display: inline-flex; align-items: center; gap: 6px; background: #ef4444; color: #fff; border: none; border-radius: 8px; padding: 9px 18px; font-size: 0.875rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
.btn-danger:hover:not(:disabled) { background: #dc2626; }
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-danger-ghost { display: inline-flex; align-items: center; gap: 6px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; padding: 8px 14px; font-size: 0.875rem; font-weight: 600; color: #ef4444; cursor: pointer; transition: all 0.15s; }
.btn-danger-ghost:hover { background: rgba(239,68,68,0.15); }

/* Feedback */
.feedback-bar { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 10px; font-size: 0.875rem; font-weight: 600; border: 1px solid transparent; }
.feedback-bar.success { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.25); color: #059669; }
.feedback-bar.error   { background: rgba(239,68,68,0.1);  border-color: rgba(239,68,68,0.25);  color: #dc2626; }
.feedback-bar.info    { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.25); color: var(--brand-primary); }
.fb-close { margin-left: auto; background: none; border: none; cursor: pointer; font-size: 1.2rem; line-height: 1; color: inherit; opacity: 0.7; }
.fb-close:hover { opacity: 1; }

/* Bottom bar */
.bottom-action-bar { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: var(--bg-header); border-top: 1px solid var(--border-color); padding: 0.75rem 1rem; z-index: 100; justify-content: space-between; align-items: center; }

.spin { animation: spin 0.8s linear infinite; }
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.25s; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-10px); }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

@media (max-width: 1100px) { .editor-layout { grid-template-columns: 1fr; } }
@media (max-width: 768px) {
  .edit-page { padding: 1rem; padding-bottom: 80px; }
  .bottom-action-bar { display: flex; }
  .header-actions .btn-primary, .header-actions .btn-ghost, .header-actions .btn-danger-ghost { display: none; }
  .monaco-wrap { height: 400px; }
}
</style>
