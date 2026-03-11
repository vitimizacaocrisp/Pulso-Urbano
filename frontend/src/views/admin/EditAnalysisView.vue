<template>
  <div>
    <div v-if="showResourceTypeMenu" class="modal-overlay" @click.self="closeResourceMenu">
      <div class="modal-content menu-content">
        <div class="modal-header">
          <h3>Adicionar ao Conteúdo</h3>
          <button @click="closeResourceMenu" class="btn-close-modal">×</button>
        </div>
        <div class="modal-body">
          <p class="menu-instruction">Escolha o tipo de recurso que deseja inserir:</p>
          <div class="resource-grid">
            <button @click="selectResourceType('image')" class="resource-btn">
              <span class="icon">🖼️</span>
              <span class="label">Imagem</span>
            </button>
            <button @click="selectResourceType('audio')" class="resource-btn">
              <span class="icon">🎵</span>
              <span class="label">Áudio</span>
            </button>
            <button @click="selectResourceType('video')" class="resource-btn">
              <span class="icon">🎥</span>
              <span class="label">Vídeo</span>
            </button>
            
            <button @click="selectResourceType('notebook')" class="resource-btn highlight-purple">
              <span class="icon">🐍</span>
              <span class="label">Notebook</span>
            </button>
            <button @click="selectResourceType('script')" class="resource-btn highlight-purple">
              <span class="icon">📜</span>
              <span class="label">Script</span>
            </button>

            <button @click="selectResourceType('document')" class="resource-btn highlight-blue">
              <span class="icon">📄</span>
              <span class="label">Documento</span>
            </button>
            <button @click="selectResourceType('data')" class="resource-btn highlight-green">
              <span class="icon">📊</span>
              <span class="label">Dados (CSV/XLS)</span>
            </button>
            
            <button @click="selectResourceType('link')" class="resource-btn">
              <span class="icon">🔗</span>
              <span class="label">Link Card</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showMediaModal" class="modal-overlay" @click.self="closeMediaModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Inserir {{ mediaTypeLabels[activeMediaType] }}</h3>
          <button @click="closeMediaModal" class="btn-close-modal">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-tabs">
            <button 
              :class="['tab-btn', { active: mediaInputType === 'url' }]" 
              @click="mediaInputType = 'url'"
            >
              🔗 Via URL
            </button>
            <button 
              v-if="activeMediaType !== 'link'"
              :class="['tab-btn', { active: mediaInputType === 'file' }]" 
              @click="mediaInputType = 'file'"
            >
              📂 Upload do Computador
            </button>
          </div>

          <div v-if="mediaInputType === 'url'" class="input-section">
            <label>Cole o link aqui:</label>
            <input 
              type="text" 
              v-model="mediaUrlInput" 
              placeholder="https://..." 
              class="modal-input"
            >
          </div>

          <div v-if="mediaInputType === 'file' && activeMediaType !== 'link'" class="input-section">
            <label>Selecione os arquivos:</label>
            <div class="file-upload-box">
              <input 
                type="file" 
                multiple
                ref="mediaFileInputRef" 
                @change="handleModalFileChange" 
                :accept="getAcceptAttribute(activeMediaType)"
                class="file-input-hidden"
                id="modalFileUpload"
              >
              <label for="modalFileUpload" class="file-upload-label">
                <span v-if="selectedMediaFiles.length > 0">
                    ✅ {{ selectedMediaFiles.length }} arquivo(s) selecionado(s)
                </span>
                <span v-else>Escolher Arquivos...</span>
              </label>
            </div>
             <div v-if="selectedMediaFiles.length > 0" class="selected-files-list">
                <small v-for="(f, i) in selectedMediaFiles" :key="i" style="display:block; color:#666;">
                    • {{ f.name }}
                </small>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="returnToMenu" class="btn-back">⬅ Voltar</button>
          <button @click="confirmMediaInsertion" class="btn-confirm">Inserir</button>
        </div>
      </div>
    </div>

    <header class="main-header-bar">
      <div class="header-content">
        <h1>Editar Análise</h1>
        <p>Pesquise por uma análise existente para modificar ou remover.</p>
      </div>
      <div class="header-actions">
        <button type="button"
                @click="isPreviewMode = !isPreviewMode"
                class="btn-toggle-preview"
                :disabled="!editingAnalysis.id"
                title="Selecione uma análise para ativar a pré-visualização">
          {{ isPreviewMode ? '⬅️ Voltar a Editar' : '👁️ Visualizar Prévia' }}
        </button>
      </div>
    </header>

    <section v-show="!isPreviewMode" class="content-section">
      <fieldset class="search-fieldset">
        <legend>Pesquisar Análise</legend>
        
        <BaseSearch 
          :navigate-to-detail="false" 
          @select="selectAnalysis" 
          v-slot="{ query, updateQuery, results, isLoading: isSearchLoading, isOpen, handleFocus, handleEnter, selectItem }"
        >
          <div class="search-wrapper">
            <input type="text"
                   :value="query"
                   @input="updateQuery($event.target.value)"
                   placeholder="Pesquisar por título, tag ou autor..."
                   @focus="handleFocus"
                   class="search-input" 
                   @keyup.enter="handleEnter" />
            
            <div v-if="isSearchLoading" class="search-loader"></div>

            <div v-if="isOpen && results.length > 0" class="search-dropdown">
              <ul>
                <li v-for="analysis in results" :key="analysis.id" @mousedown.prevent="selectItem(analysis)">
                  <strong>{{ analysis.title }}</strong><br/><small>{{ analysis.author }} - {{ analysis.category || analysis.tag }}</small>
                </li>
              </ul>
            </div>
            
            <div v-if="isOpen && results.length === 0 && query && !isSearchLoading" class="search-dropdown no-results">
              Nenhum resultado encontrado.
            </div>
          </div>
        </BaseSearch>
      </fieldset>

      <div v-if="feedback.message" :class="['feedback-message', feedback.type]">{{ feedback.message }}</div>
      
      <form v-show="editingAnalysis.id" @submit.prevent="updateAnalysis" class="form-container">
        <h3 class="editing-title">Editando: {{ editingAnalysis.title }}</h3>
        
        <fieldset>
         <legend>Metadados da Análise</legend>
          <div class="form-group">
           <label for="title">Título da Análise <span class="required">*</span></label>
           <input type="text" id="title" v-model="editingAnalysis.title" required>
         </div>
         <div class="form-group">
           <label for="subtitle">Subtítulo</label>
           <input type="text" id="subtitle" v-model="editingAnalysis.subtitle" required>
         </div>
         <div class="form-grid">
           <div class="form-group">
             <label for="tag">Tag (Ex: Vitimização) <span class="required">*</span></label>
             <input type="text" id="tag" v-model="editingAnalysis.tag" required>
           </div>
           <div class="form-group">
             <label for="author">Autor(es) <span class="required">*</span></label>
             <input type="text" id="author" v-model="editingAnalysis.author" required>
           </div>
           <div class="form-group">
             <label for="lastUpdate">Data da Última Atualização</label>
             <input type="date" id="lastUpdate" required v-model="editingAnalysis.lastUpdate">
           </div>
           <div class="form-group">
             <label for="studyPeriod">Período de Estudo</label>
             <input type="text" id="studyPeriod" v-model="editingAnalysis.studyPeriod" placeholder="Ex: 2022-2023" required>
           </div>
         </div>
         <div class="form-group">
           <label for="source">Fonte</label>
           <input type="text" id="source" v-model="editingAnalysis.source" placeholder="Ex: IBGE, Datafolha, etc." required>
         </div>
         <div class="form-group">
           <label for="category">Categoria <span class="required">*</span></label>
           <select id="category" v-model="editingAnalysis.category" required>
              <option value="" disabled>Selecione uma categoria</option>
              <option>Metodologia e Amostra</option>
              <option>Crimes Contra o Patrimônio</option>
              <option>Crimes Contra a Pessoa</option>
              <option>Sensação de Segurança</option>
              <option>Subnotificação (Cifras Ocultas)</option>
              <option>Perfil das Vítimas</option>
              <option>Violência Doméstica e Gênero</option>
              <option>Outras Categorias</option>
           </select>
         </div>
         <div class="form-group">
           <label for="description">Descrição Curta (para o card) <span class="required">*</span></label>
           <textarea id="description" v-model="editingAnalysis.description" rows="3" required></textarea>
         </div>
       </fieldset>

       <fieldset class="main-content">
         <legend>Conteúdo Principal</legend>
         <div class="form-group">
           <label for="content">Conteúdo Completo (suporta Markdown/HTML) <span class="required">*</span></label>
           
           <div class="content-toolbar single-button-toolbar">
             <button type="button" @click="openResourceMenu" class="toolbar-main-btn">
               <span class="plus-icon">➕</span> Adicionar Recurso
             </button>
             <span class="toolbar-hint">Clique para adicionar imagens, vídeos, notebooks, documentos, etc.</span>
             
             <div class="editor-format-buttons">
               <button type="button" @click="applyFormat('bold')" title="Negrito (Ctrl+B)" class="format-btn"><strong>B</strong></button>
               <button type="button" @click="applyFormat('italic')" title="Itálico (Ctrl+I)" class="format-btn"><em>I</em></button>
               <button type="button" @click="applyFormat('heading')" title="Título" class="format-btn">H</button>
               <button type="button" @click="applyFormat('list')" title="Lista" class="format-btn">••</button>
               <button type="button" @click="applyFormat('code')" title="Código" class="format-btn">{ }</button>
               <button type="button" @click="applyFormat('link')" title="Link" class="format-btn">🔗</button>
               <button type="button" @click="applyFormat('image')" title="Imagem" class="format-btn">🖼️</button>
               <button type="button" @click="applyFormat('quote')" title="Citação" class="format-btn">"</button>
             </div>
           </div>

           <div id="editor-container" ref="editorContainer" class="editor-container"></div>
           
           <textarea id="content" v-model="editingAnalysis.content" style="display: none;"></textarea>
         </div>
       </fieldset>

       <fieldset class="fieldset-image">
          <legend>Anexos</legend>
          
          <div class="form-group">
              <label>Imagem de Capa <span class="required">*</span></label>
              <label for="coverImage" class="file-input-label">
                  <span class="file-input-button">Escolher arquivo</span>
                  <span class="file-input-text">{{ coverImageLabel }}</span>
              </label>
              <input type="file" id="coverImage" @change="handleFileSelection($event, 'coverImage')"  accept="image/*" style="display: none;">
              <img v-if="imagePreviewUrl" :src="imagePreviewUrl" alt="Pré-visualização da imagem de capa" class="image-preview" />
          </div>
          
          <div class="form-group">
            <label for="referenceLinks">Links de Referência</label>
            <textarea id="referenceLinks" v-model="editingAnalysis.referenceLinks" rows="3" placeholder="Coloque um link por linha..." required></textarea>
          </div>
       </fieldset>

        <div class="form-actions">
            <button type="button" @click="confirmAndResetForm" class="btn-clear">
                🔄 Resetar Alterações
            </button>
            <button type="submit" class="btn-publish" :disabled="isFormInvalid || isLoading">
                <span v-if="isLoading">Salvando...</span>
                <span v-else>Salvar Alterações</span>
            </button>
        </div>
      </form>

       <div v-if="editingAnalysis.id" class="danger-zone">
         <h4>Zona de Perigo</h4>
         <div class="danger-content">
           <p>Excluir esta análise é uma ação permanente.</p>
           <button @click="isDeleteModalVisible = true" class="btn-delete">Excluir Análise</button>
         </div>
       </div>

    </section>

    <section v-show="isPreviewMode" class="news-preview">
        <div class="preview-cover" v-if="imagePreviewUrl">
            <img :src="imagePreviewUrl" alt="Imagem de Capa" class="cover-image" />
        </div>
        <div class="preview-header">
            <h1 class="preview-title">{{ editingAnalysis.title || 'Título da Análise' }}</h1>
            <h2 v-if="editingAnalysis.subtitle" class="preview-subtitle">{{ editingAnalysis.subtitle }}</h2>
            <div class="preview-meta">
            <span class="preview-category" v-if="editingAnalysis.category">{{ editingAnalysis.category }}</span>
            <span class="preview-date" v-if="editingAnalysis.lastUpdate">Atualizado em: {{ editingAnalysis.lastUpdate }}</span>
            <span class="preview-author" v-if="editingAnalysis.author">Por {{ editingAnalysis.author }}</span>
            </div>
        </div>
        <div class="preview-description">
            {{ editingAnalysis.description || '' }}
        </div>

        <IsolatedRenderer :content="renderedContent" />

        <div v-if="editingAnalysis.referenceLinks">
            <h3 class="preview-section-title">Referências:</h3>
            <ul class="preview-links">
                <li v-for="(link, idx) in (editingAnalysis.referenceLinks || '').split('\n').filter(l => l.trim() !== '')" :key="idx">
                <a :href="link.startsWith('http') ? link : `//${link}`" target="_blank" rel="noopener noreferrer">{{ link }}</a>
                </li>
            </ul>
        </div>
    </section>

    <div v-if="isDeleteModalVisible" class="modal-overlay" @click.stop="isDeleteModalVisible = false">
        <div class="modal-content" @click.stop>
            <h4>Confirmar Exclusão</h4>
            <p>Tem a certeza de que deseja excluir permanentemente a análise <strong>"{{ editingAnalysis?.title }}"</strong>?</p>
            <p class="warning-text">Esta ação não pode ser desfeita e irá apagar todos os ficheiros associados.</p>
            <div class="modal-actions">
            <button class="btn-cancel" @click="isDeleteModalVisible = false">Cancelar</button>
            <button class="btn-confirm-delete" @click="confirmDelete">Sim, Excluir</button>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { marked } from 'marked';
import axios from 'axios';
import * as monaco from 'monaco-editor';
import { 
    mediaTypeLabels, 
    getAcceptAttribute, 
    formatText, 
    generateUrlMediaHtml, 
    generateFileMediaHtml 
} from '@/assets/js/analysisUtils.js';
import IsolatedRenderer from '@/components/IsolatedRenderer.vue';
import BaseSearch from '@/components/BaseSearch.vue'; // IMPORTANDO O NOVO COMPONENTE

import { useTheme } from '@/composables/useTheme';
const { isDark } = useTheme();

const monacoEditorTheme = computed(() => isDark.value ? 'vs-dark' : 'vs-light');
const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

// --- ESTADO DA UI ---
const isPreviewMode = ref(false);
const isLoading = ref(false);
const feedback = ref({ message: '', type: '' });
const isDeleteModalVisible = ref(false);

// --- MONACO EDITOR ---
const editorContainer = ref(null);
let editor = null;

// --- ESTADO DO FORMULÁRIO DE EDIÇÃO ---
const getInitialAnalysisState = () => ({
  id: null, title: '', subtitle: '', tag: '', author: '', lastUpdate: '',
  studyPeriod: '', source: '', category: '', description: '', content: '', 
  referenceLinks: '', coverImage: null, documentFiles: [], dataFiles: []
});
const editingAnalysis = ref(getInitialAnalysisState());
const contentImages = ref(new Map());
const imagePreviewUrl = ref('');

// --- Refs para Modais e Mídia ---
const showResourceTypeMenu = ref(false);
const showMediaModal = ref(false);
const activeMediaType = ref('');
const mediaInputType = ref('url');
const mediaUrlInput = ref('');
const mediaFileInputRef = ref(null);
const selectedMediaFiles = ref([]);

// --- RASTREAMENTO DE ARQUIVOS ---
const originalServerFiles = ref(new Set());
const filesToDelete = ref([]);

// --- MONACO EDITOR ---
const initMonacoEditor = () => {
  if (!editorContainer.value) return;
  if (editor) { editor.dispose(); editor = null; }

  try {
    editor = monaco.editor.create(editorContainer.value, {
      value: editingAnalysis.value.content || '',
      language: 'markdown',
      theme: monacoEditorTheme.value,
      fontSize: 14,
      lineNumbers: 'on',
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      wrappingIndent: 'same',
      automaticLayout: true,
      formatOnPaste: true,
      formatOnType: true,
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      folding: true,
      renderLineHighlight: 'all',
      scrollbar: { vertical: 'visible', horizontal: 'visible', useShadows: false },
      tabSize: 2,
      insertSpaces: true,
    });
    editor.onDidChangeModelContent(() => { editingAnalysis.value.content = editor.getValue(); });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => applyFormat('bold'));
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => applyFormat('italic'));
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyH, () => applyFormat('heading'));
    
    setTimeout(() => { editor.layout(); }, 500);
  } catch (error) {
    console.error('Erro crítico ao inicializar Monaco Editor:', error);
    const fallbackTextarea = document.getElementById('content');
    if (fallbackTextarea) fallbackTextarea.style.display = 'block';
  }
};

const applyFormat = (type) => { formatText(editor, type); };

// --- CONTROLE DOS MENUS E MODAIS ---
const openResourceMenu = () => { showResourceTypeMenu.value = true; };
const closeResourceMenu = () => { showResourceTypeMenu.value = false; };

const selectResourceType = (type) => {
    activeMediaType.value = type;
    showResourceTypeMenu.value = false;
    mediaInputType.value = 'url';
    mediaUrlInput.value = '';
    selectedMediaFiles.value = [];
    if (mediaFileInputRef.value) mediaFileInputRef.value.value = '';
    showMediaModal.value = true;
};

const returnToMenu = () => {
    showMediaModal.value = false;
    showResourceTypeMenu.value = true;
};

const closeMediaModal = () => { showMediaModal.value = false; };

const handleModalFileChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
        selectedMediaFiles.value = Array.from(files);
    }
};

const confirmMediaInsertion = async () => {
    if (mediaInputType.value === 'url') {
        if (!mediaUrlInput.value) { alert("Por favor, insira uma URL válida."); return; }
        const html = await generateUrlMediaHtml(mediaUrlInput.value, activeMediaType.value);
        insertMediaIntoTextarea(html);
    } else {
        if (selectedMediaFiles.value.length === 0 && activeMediaType.value !== 'link') {
            alert("Por favor, selecione pelo menos um arquivo.");
            return;
        }

        let batchHtml = '';
        const loadingBtn = document.querySelector('.btn-confirm');
        const originalText = loadingBtn ? loadingBtn.innerText : 'Inserir';
        if(loadingBtn) loadingBtn.innerText = 'Processando...';

        for (const file of selectedMediaFiles.value) {
            try {
                const { html, placeholderId, blobUrl } = await generateFileMediaHtml(file, activeMediaType.value);
                
                contentImages.value.set(placeholderId, { 
                    file, 
                    blobUrl,
                    type: activeMediaType.value 
                });
                
                batchHtml += html + '\n';
            } catch (error) {
                console.error(`Erro ao processar arquivo ${file.name}`, error);
            }
        }

        insertMediaIntoTextarea(batchHtml);
        if(loadingBtn) loadingBtn.innerText = originalText;
    }
    closeMediaModal();
};

const insertMediaIntoTextarea = (markdownToInsert) => {
  if (!editor) { editingAnalysis.value.content += '\n' + markdownToInsert; return; }
  const position = editor.getPosition();
  const range = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
  editor.executeEdits('', [{ range: range, text: '\n' + markdownToInsert + '\n', forceMoveMarkers: true }]);
  const lines = markdownToInsert.split('\n').length + 2;
  const newPosition = new monaco.Position(position.lineNumber + lines, 1);
  editor.setPosition(newPosition);
  editor.focus();
};

// --- LÓGICA DE CARREGAMENTO (AJUSTADA PARA R2 E BASESEARCH) ---
const selectAnalysis = async (analysisStub) => {
  isLoading.value = true;
  
  cleanupBlobUrls();
  filesToDelete.value = [];
  originalServerFiles.value.clear();
  contentImages.value.clear();

  try {
    const token = localStorage.getItem('authToken');
    const res = await axios.get(`${API_BASE_URL}/api/admin/analyses/${analysisStub.id}`, { headers: { Authorization: `Bearer ${token}` }});
    const serverData = res.data.data || {};
    
    const analysisState = {
        id: serverData.id, title: serverData.title || '', subtitle: serverData.subtitle || '', tag: serverData.tag || '',
        author: serverData.author || '', lastUpdate: serverData.last_update?.split('T')[0] || '', studyPeriod: serverData.study_period || '',
        source: serverData.source || '', category: serverData.category || '', description: serverData.description || '',
        content: serverData.content || '', referenceLinks: serverData.reference_links || '',
        coverImage: null, documentFiles: [], dataFiles: []
    };
    
    // Tratamento de imagem de capa: Agora é uma URL completa
    if (serverData.cover_image_path) {
        analysisState.coverImage = { name: 'Imagem Atual', serverPath: serverData.cover_image_path, isRemote: true };
        imagePreviewUrl.value = serverData.cover_image_path; 
        originalServerFiles.value.add(serverData.cover_image_path);
    }
    
    editingAnalysis.value = analysisState;
    
    if (editor) { editor.setValue(analysisState.content || ''); } else { nextTick(() => initMonacoEditor()); }
    
    feedback.value = { message: 'Análise carregada com sucesso.', type: 'success' };
  } catch (err) {
    feedback.value = { message: 'Erro ao carregar análise.', type: 'error' };
  } finally {
    isLoading.value = false;
  }
};

// --- LIFECYCLE ---
const route = useRoute();
const router = useRouter();

onMounted(() => { 
  nextTick(() => { initMonacoEditor(); });
  if (route.query.id) { setTimeout(() => { selectAnalysis({ id: route.query.id, title: `Análise #${route.query.id}` }); }, 500); } 
});

onBeforeUnmount(() => { cleanupBlobUrls(); if (editor) { editor.dispose(); editor = null; } });

// --- UPDATE OTIMIZADO PARA R2 COM LIMPEZA INTELIGENTE ---
const updateAnalysis = async () => {
    if (!editingAnalysis.value.id || isFormInvalid.value) {
        feedback.value = { message: 'Preencha os campos obrigatórios.', type: 'error' };
        return;
    }

    isLoading.value = true;
    feedback.value = { message: 'Processando atualizações...', type: 'info' };
    const token = localStorage.getItem('authToken');

    try {
        const filesToUpload = [];
        const filesMarkedForDeletion = [...filesToDelete.value];
        
        if (editingAnalysis.value.coverImage instanceof File) {
            filesToUpload.push({ file: editingAnalysis.value.coverImage, category: 'cover', tempId: 'cover' });
        }

        const currentContentUrls = new Set();
        const r2UrlRegex = /https?:\/\/[^\s"']+\.r2\.dev[^\s"']*/g;
        const contentMatches = editingAnalysis.value.content.match(r2UrlRegex) || [];
        contentMatches.forEach(url => currentContentUrls.add(url));

        const newPlaceholderIds = new Set();
        for (const [placeholderId, mediaData] of contentImages.value.entries()) {
            if (mediaData.file instanceof File) {
                filesToUpload.push({ file: mediaData.file, category: mediaData.type || 'image', tempId: placeholderId });
                newPlaceholderIds.add(placeholderId);
            }
        }

        const uploadedUrls = {};

        if (filesToUpload.length > 0) {
             feedback.value = { message: `Enviando ${filesToUpload.length} novos arquivo(s)...`, type: 'info' };
             const metaData = filesToUpload.map(f => ({ fileName: f.file.name, fileType: f.file.type, category: f.category, tempId: f.tempId }));

            const urlRes = await axios.post(`${API_BASE_URL}/api/admin/generate-upload-urls`, 
                { files: metaData }, { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const uploadPlans = urlRes.data.data;

            await Promise.all(uploadPlans.map(async (plan) => {
                const fileObj = filesToUpload.find(f => f.tempId === plan.tempId);
                if (!fileObj) return;

                await axios.put(plan.uploadUrl, fileObj.file, { headers: { 'Content-Type': fileObj.file.type } });
                uploadedUrls[plan.tempId] = plan.publicUrl;
            }));
        }
        
        let finalContent = editingAnalysis.value.content || '';
        for (const [placeholderId, publicUrl] of Object.entries(uploadedUrls)) {
            if (placeholderId !== 'cover') {
                const regex = new RegExp(placeholderId.replace(/[-\\^$*+?.()|[\]\\{}]/g, '\\$&'), 'g');
                finalContent = finalContent.replace(regex, publicUrl);
            }
        }
        
        let finalCoverPath = editingAnalysis.value.coverImage?.serverPath; 
        if (uploadedUrls['cover']) finalCoverPath = uploadedUrls['cover'];

        const finalData = {
            ...editingAnalysis.value,
            content: finalContent,
            coverImagePath: finalCoverPath,
            filesToDelete: filesMarkedForDeletion,
            documentFiles: [], dataFiles: []
        };
        
        delete finalData.coverImage;

        await axios.put(`${API_BASE_URL}/api/admin/analyses/${editingAnalysis.value.id}`, finalData, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        feedback.value = { message: 'Análise atualizada com sucesso!', type: 'success' };
        filesToDelete.value = [];
        contentImages.value.clear();
        await selectAnalysis({ id: editingAnalysis.value.id, title: editingAnalysis.value.title });

    } catch (err) {
        console.error("Erro no upload:", err);
        feedback.value = { message: 'Erro ao salvar: ' + (err.response?.data?.message || err.message), type: 'error' };
    } finally {
        isLoading.value = false;
    }
};

const confirmAndResetForm = async () => {
  if (window.confirm('Resetar alterações? Dados não salvos serão perdidos.')) {
    if (!editingAnalysis.value.id) return;
    await selectAnalysis({ id: editingAnalysis.value.id, title: editingAnalysis.value.title });
  }
};

const confirmDelete = async () => {
    if (!editingAnalysis.value.id) return;
    isLoading.value = true;
    isDeleteModalVisible.value = false;
    try {
        const token = localStorage.getItem('authToken');
        await axios.delete(`${API_BASE_URL}/api/admin/analyses/${editingAnalysis.value.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        feedback.value = { message: 'Análise excluída.', type: 'success' };
        editingAnalysis.value = getInitialAnalysisState();
        router.push({ path: '/admin/edit-analysis' });
    } catch (err) {
        feedback.value = { message: 'Erro ao excluir.', type: 'error' };
    } finally {
        isLoading.value = false;
    }
};

const isFormInvalid = computed(() => !editingAnalysis.value.title || !editingAnalysis.value.tag || !editingAnalysis.value.description || !editingAnalysis.value.content || !editingAnalysis.value.category);

const cleanupBlobUrls = () => {
  if (imagePreviewUrl.value && imagePreviewUrl.value.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl.value);
  for (const mediaData of contentImages.value.values()) {
    if (mediaData.blobUrl) URL.revokeObjectURL(mediaData.blobUrl);
  }
};

const handleFileSelection = (event, fieldName) => {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  if (fieldName === 'coverImage') {
    const oldFile = editingAnalysis.value.coverImage;
    if (oldFile && oldFile.serverPath && originalServerFiles.value.has(oldFile.serverPath)) {
        filesToDelete.value.push(oldFile.serverPath);
    }
    
    if (imagePreviewUrl.value && imagePreviewUrl.value.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl.value);

    editingAnalysis.value.coverImage = files[0];
    imagePreviewUrl.value = URL.createObjectURL(files[0]);
  }
  event.target.value = null; 
};

const coverImageLabel = computed(() => {
    if (editingAnalysis.value.coverImage instanceof File) return `Nova Capa: ${editingAnalysis.value.coverImage.name}`;
    else if (editingAnalysis.value.coverImage && editingAnalysis.value.coverImage.serverPath) return `Capa Atual: (Mantida)`;
    return 'Nenhum arquivo escolhido';
});

// --- RENDERIZAÇÃO ---
const renderedContent = computed(() => {
  if (!editingAnalysis.value.content) return '<p><em>Comece a escrever...</em></p>';
  let content = editingAnalysis.value.content.trim();

  if (content.includes('&lt;') && content.includes('&gt;')) {
    const txt = document.createElement('textarea');
    txt.innerHTML = content;
    content = txt.value;
  }

  for (const [id, data] of contentImages.value.entries()) {
    if (data.blobUrl) {
      const regex = new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      content = content.replace(regex, data.blobUrl);
    }
  }

  content = content.replace(/(src=["']|href=["']|url\()(\/uploads\/.*?)(["')])/g, `$1${API_BASE_URL}$2$3`);
  if (content.startsWith('```html')) content = content.replace(/^```html\s*/i, '').replace(/\s*```$/, '').trim();

  const isHTML = /^</.test(content.trim());
  return isHTML ? content : marked.parse(content, { headerIds: false, mangle: false });
});

watch(() => editingAnalysis.value.content, (newContent, oldContent) => {
  if (!oldContent || !newContent) return;
  const r2UrlRegex = /https?:\/\/[^\s"']+\.r2\.dev[^\s"']*/g;
  const oldUrls = oldContent.match(r2UrlRegex) || [];
  const newUrls = newContent.match(r2UrlRegex) || [];
  
  const removedUrls = oldUrls.filter(url => !newUrls.includes(url));
  
  if (removedUrls.length > 0) {
    removedUrls.forEach(url => {
      if (!filesToDelete.value.includes(url)) filesToDelete.value.push(url);
    });
  }
}, { immediate: false });

watch(isPreviewMode, async (newVal) => {
  if (!newVal) {
    await nextTick();
    setTimeout(() => { if (editor) { editor.layout(); editor.focus(); } }, 550);
  }
});

watch(isDark, (newValue) => { if (editor) { monaco.editor.setTheme(newValue ? 'vs-dark' : 'vs'); } });
</script>

<style src="@/assets/css/admin/addAndEditAnalisys.css"></style>