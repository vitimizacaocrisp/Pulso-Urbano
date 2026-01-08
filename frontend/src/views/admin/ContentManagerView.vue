<template>
  <div class="content-manager-wrapper">
    
    <!-- MODAL 1: MENU DE SELEÇÃO DE TIPO (GRADE DE ÍCONES) -->
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

    <!-- MODAL 2: INPUT DE URL OU UPLOAD -->
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
            <div v-if="selectedMediaFiles.length > 0" class="selected-files-list" style="margin-top: 5px; font-size: 0.85em; color: #666;">
                <div v-for="(f, i) in selectedMediaFiles" :key="i">📄 {{ f.name }}</div>
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
        <h1>Gestor de Conteúdo</h1>
        <p>Crie e publique novas páginas de análise.</p>
      </div>
      <div class="header-actions">
        <button type="button" @click="isPreviewMode = !isPreviewMode" class="btn-toggle-preview">
          {{ isPreviewMode ? '⬅️ Voltar a Editar' : '👁️ Visualizar Prévia' }}
        </button>
      </div>
    </header>

    <section v-show="!isPreviewMode" class="content-section">
      <form @submit.prevent="publishAnalysis" class="form-container">
       <fieldset>
         <legend>Metadados da Análise</legend>
         <div class="form-group">
           <label for="title">Título da Análise <span class="required">*</span></label>
           <input type="text" id="title" v-model="newAnalysis.title" required>
         </div>
         <div class="form-group">
           <label for="subtitle">Subtítulo</label>
           <input type="text" id="subtitle" v-model="newAnalysis.subtitle">
         </div>
         <div class="form-grid">
           <div class="form-group">
             <label for="tag">Tag (Ex: Vitimização) <span class="required">*</span></label>
             <input type="text" id="tag" v-model="newAnalysis.tag" required>
           </div>
           <div class="form-group">
             <label for="author">Autor(es) <span class="required">*</span></label>
             <input type="text" id="author" v-model="newAnalysis.author" required>
           </div>
           <div class="form-group">
             <label for="lastUpdate">Data da Última Atualização</label>
             <input type="date" id="lastUpdate" required v-model="newAnalysis.lastUpdate">
           </div>
           <div class="form-group">
             <label for="studyPeriod">Período de Estudo</label>
             <input type="text" id="studyPeriod" v-model="newAnalysis.studyPeriod" placeholder="Ex: 2022-2023">
           </div>
         </div>
         <div class="form-group">
           <label for="source">Fonte</label>
           <input type="text" id="source" v-model="newAnalysis.source" placeholder="Ex: IBGE, Datafolha, etc.">
         </div>
         <div class="form-group">
           <label for="category">Categoria <span class="required">*</span></label>
           <select id="category" v-model="newAnalysis.category" required>
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
           <textarea id="description" v-model="newAnalysis.description" rows="3" required></textarea>
         </div>
       </fieldset>

       <fieldset class="main-content">
         <legend>Conteúdo Principal</legend>
         <div class="form-group">
           <label for="content">Conteúdo Completo (suporta Markdown/HTML) <span class="required">*</span></label>
           
           <!-- TOOLBAR DO EDITOR -->
           <div class="content-toolbar single-button-toolbar">
             <button type="button" @click="openResourceMenu" class="toolbar-main-btn">
               <span class="plus-icon">➕</span> Adicionar Recurso
             </button>
             <span class="toolbar-hint">Clique para adicionar imagens, vídeos, notebooks, documentos, etc.</span>
             
             <!-- Botões de formatação -->
             <div class="editor-format-buttons">
               <button type="button" @click="applyFormat('bold')" title="Negrito (Ctrl+B)" class="format-btn">
                 <strong>B</strong>
               </button>
               <button type="button" @click="applyFormat('italic')" title="Itálico (Ctrl+I)" class="format-btn">
                 <em>I</em>
               </button>
               <button type="button" @click="applyFormat('heading')" title="Título" class="format-btn">
                 H
               </button>
               <button type="button" @click="applyFormat('list')" title="Lista" class="format-btn">
                 ••
               </button>
               <button type="button" @click="applyFormat('code')" title="Código" class="format-btn">
                 { }
               </button>
               <button type="button" @click="applyFormat('link')" title="Link" class="format-btn">
                 🔗
               </button>
               <button type="button" @click="applyFormat('image')" title="Imagem" class="format-btn">
                 🖼️
               </button>
               <button type="button" @click="applyFormat('quote')" title="Citação" class="format-btn">
                 "
               </button>
             </div>
           </div>

           <!-- Monaco Editor Container -->
           <div id="editor-container" ref="editorContainer" class="editor-container"></div>
           
           <!-- Textarea oculto para compatibilidade -->
           <textarea id="content" v-model="newAnalysis.content" style="display: none;"></textarea>
         </div>
       </fieldset>

       <fieldset>
         <legend>Configurações Finais</legend>
         <div class="form-group">
           <label for="coverImage">Imagem de Capa <span class="required">*</span></label>
           <input type="file" id="coverImage" @change="handleFileSelection($event, 'coverImage')" accept="image/*" required>
           <div v-if="newAnalysis.coverImage && newAnalysis.coverImage.name" class="file-name-preview">
             Arquivo: {{ newAnalysis.coverImage.name }}
           </div>
           <img v-if="imagePreviewUrl" :src="imagePreviewUrl" alt="Pré-visualização da imagem de capa" class="image-preview" />
         </div>
         
         <div class="form-group">
           <label for="referenceLinks">Links de Referência (Rodapé)</label>
           <textarea id="referenceLinks" v-model="newAnalysis.referenceLinks" rows="3" placeholder="Coloque um link por linha..."></textarea>
         </div>
       </fieldset>

        <div class="form-actions">
            <button type="button" @click="confirmAndClearForm" class="btn-clear">
                🗑️ Limpar Tudo
            </button>
            <button type="submit" class="btn-publish" :disabled="isFormInvalid || isLoading">
                <span v-if="isLoading">Publicando...</span>
                <span v-else>Publicar Análise</span>
            </button>
        </div>

      </form>
      <div v-if="feedback.message" :class="['feedback-message', feedback.type]">{{ feedback.message }}</div>
    </section>

    <!-- PRÉ-VISUALIZAÇÃO DA NOTÍCIA -->
    <section v-show="isPreviewMode" class="news-preview">
      <div class="preview-cover" v-if="imagePreviewUrl">
        <img :src="imagePreviewUrl" alt="Imagem de Capa" class="cover-image" />
      </div>
      <div class="preview-header">
        <h1 class="preview-title">{{ newAnalysis.title || 'Título da Análise' }}</h1>
        <h2 v-if="newAnalysis.subtitle" class="preview-subtitle">{{ newAnalysis.subtitle }}</h2>
        <div class="preview-meta">
          <span class="preview-category" v-if="newAnalysis.category">{{ newAnalysis.category }}</span>
          <span class="preview-date" v-if="newAnalysis.lastUpdate">Atualizado em: {{ newAnalysis.lastUpdate }}</span>
          <span class="preview-author" v-if="newAnalysis.author">Por {{ newAnalysis.author }}</span>
        </div>
      </div>
      <div class="preview-description">
        {{ newAnalysis.description || '' }}
      </div>
      
      <!-- Conteúdo Renderizado -->
      <div class="preview-content" v-html="renderedContent"></div>

      <div v-if="newAnalysis.referenceLinks">
        <h3 class="preview-section-title">Referências:</h3>
        <ul class="preview-links">
            <li v-for="(link, idx) in (newAnalysis.referenceLinks || '').split('\n').filter(l => l.trim() !== '')" :key="idx">
            <a :href="link.startsWith('http') ? link : `//${link}`" target="_blank" rel="noopener noreferrer">{{ link }}</a>
            </li>
        </ul>
    </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount, nextTick } from 'vue';
import { marked } from 'marked';
import axios from 'axios';
import { openDB } from 'idb';
import * as monaco from 'monaco-editor';
// Importação do arquivo compartilhado
import { 
    mediaTypeLabels, 
    getAcceptAttribute, 
    formatText, 
    generateUrlMediaHtml, 
    generateFileMediaHtml 
} from '@/assets/js/analysisUtils.js';

import { useTheme } from '@/composables/useTheme';
const { isDark } = useTheme();

const monacoEditorTheme = computed(() => isDark.value ? 'vs-dark' : 'vs-light');

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

// --- LÓGICA DO BANCO DE DADOS (INDEXEDDB) ---
const DB_NAME = 'analysis-draft-db';
const STORE_NAME = 'files-store';
const DB_VERSION = 1;
let dbPromise = null;

const initDb = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
};
const saveFileToDb = async (file, key) => {
  const db = await initDb();
  await db.put(STORE_NAME, file, key);
};
const getFileFromDb = async (key) => {
  const db = await initDb();
  return await db.get(STORE_NAME, key);
};
const clearAllDraftFiles = async () => {
  const db = await initDb();
  await db.clear(STORE_NAME);
  console.log("Rascunho de arquivos limpo do IndexedDB.");
};
// --- FIM DA LÓGICA DO BANCO DE DADOS ---

const DRAFT_KEY = 'analysisFormDraft';

const isPreviewMode = ref(false);
const isLoading = ref(false);
const feedback = ref({ message: '', type: '' });

// Referências para os Modais
const showResourceTypeMenu = ref(false);
const showMediaModal = ref(false);

const activeMediaType = ref('');
const mediaInputType = ref('url');
const mediaUrlInput = ref('');
const mediaFileInputRef = ref(null);
const selectedMediaFiles = ref([]); // MUDANÇA: Array de arquivos

// Monaco Editor
const editorContainer = ref(null);
let editor = null;

const contentImages = ref(new Map());
const imagePreviewUrl = ref('');

const getInitialAnalysisState = () => ({
  title: '',
  subtitle: '',
  tag: '',
  author: '',
  lastUpdate: '',
  studyPeriod: '',
  source: '',
  category: '',
  description: '',
  content: '',
  referenceLinks: '',
  coverImage: null
});

const newAnalysis = ref(getInitialAnalysisState());

// --- MONACO EDITOR ---
const initMonacoEditor = () => {
  if (!editorContainer.value) return;

  if (typeof window !== 'undefined' && window.monaco) {
    createEditor();
    return;
  }
  try {
    createEditor();
  } catch (error) {
    console.error('Erro ao inicializar Monaco Editor:', error);
    const textarea = document.createElement('textarea');
    textarea.id = 'content';
    textarea.vModel = 'newAnalysis.content';
    textarea.rows = 15;
    textarea.className = 'main-textarea';
    textarea.required = true;
    editorContainer.value.innerHTML = '';
    editorContainer.value.appendChild(textarea);
  }
};

const createEditor = () => {
  if (!editorContainer.value || editor) return;

  editor = monaco.editor.create(editorContainer.value, {
    value: newAnalysis.value.content,
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
    scrollbar: {
      vertical: 'visible',
      horizontal: 'visible',
      useShadows: false
    },
    lineDecorationsWidth: 10,
    lineNumbersMinChars: 3,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    glyphMargin: false,
    fixedOverflowWidgets: true,
    renderWhitespace: 'selection',
    tabSize: 2,
    insertSpaces: true,
  });

  editor.onDidChangeModelContent(() => {
    newAnalysis.value.content = editor.getValue();
  });

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
    applyFormat('bold');
  });

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
    applyFormat('italic');
  });

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyH, () => {
    applyFormat('heading');
  });
};

const applyFormat = (type) => {
    formatText(editor, type);
};

// --- CONTROLE DOS MENUS E MODAIS ---
const openResourceMenu = () => {
    showResourceTypeMenu.value = true;
};

const closeResourceMenu = () => {
    showResourceTypeMenu.value = false;
};

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

const closeMediaModal = () => {
    showMediaModal.value = false;
};

const handleModalFileChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
        selectedMediaFiles.value = Array.from(files);
    }
};

const confirmMediaInsertion = async () => {
    if (mediaInputType.value === 'url') {
        if (!mediaUrlInput.value) {
            alert("Por favor, insira uma URL válida.");
            return;
        }
        const html = await generateUrlMediaHtml(mediaUrlInput.value, activeMediaType.value);
        insertMediaIntoTextarea(html);
    } else {
        if (selectedMediaFiles.value.length === 0 && activeMediaType.value !== 'link') {
            alert("Por favor, selecione pelo menos um arquivo.");
            return;
        }

        // --- LÓGICA DE LOTE (Múltiplos Arquivos) ---
        let batchHtml = '';
        const loadingBtn = document.querySelector('.btn-confirm');
        const originalText = loadingBtn ? loadingBtn.innerText : 'Inserir';
        if(loadingBtn) loadingBtn.innerText = 'Processando...';

        for (const file of selectedMediaFiles.value) {
            try {
                // Usa a função compartilhada para gerar o HTML e os metadados
                const { html, placeholderId, blobUrl } = await generateFileMediaHtml(file, activeMediaType.value);
                
                // Armazena no mapa local para o upload posterior
                contentImages.value.set(placeholderId, { file, blobUrl });
                
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
  if (!editor) {
      newAnalysis.value.content += '\n' + markdownToInsert;
      return;
  }
  
  const position = editor.getPosition();
  const range = new monaco.Range(
    position.lineNumber,
    position.column,
    position.lineNumber,
    position.column
  );
  
  editor.executeEdits('', [
    {
      range: range,
      text: '\n' + markdownToInsert + '\n',
      forceMoveMarkers: true
    }
  ]);
  
  const newPosition = new monaco.Position(
    position.lineNumber + 1,
    markdownToInsert.length + 1
  );
  editor.setPosition(newPosition);
  editor.focus();
};

// --- LÓGICA DE RENDERIZAÇÃO DE CONTEÚDO ---
const renderedContent = computed(() => {
  if (!newAnalysis.value.content) return '<p><em>Comece a escrever...</em></p>';
  
  let processedContent = newAnalysis.value.content.trim();

  for (const [placeholderId, mediaData] of contentImages.value.entries()) {
    if (mediaData.blobUrl) {
      const placeholderRegex = new RegExp(placeholderId.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
      processedContent = processedContent.replace(placeholderRegex, mediaData.blobUrl);
    }
  }

  const relativePathRegex = /(src=["']|href=["']|url\()(\/uploads\/.*?)(["')])/g;
  processedContent = processedContent.replace(relativePathRegex, `$1${API_BASE_URL}$2$3`);

  if (processedContent.startsWith('```html') && processedContent.endsWith('```')) {
    return processedContent.replace(/^```html\s*/i, '').replace(/\s*```$/, '').trim();
  }
  
  const hasHTMLTags = /<[a-z][\s\S]*>/i.test(processedContent);
  const hasMarkdownSyntax = /^# |\*\*.*\*\*|__.*__|\[.*\]\(.*\)|\* .*|```/.test(processedContent);
  
  if (hasHTMLTags && !hasMarkdownSyntax) return processedContent;
  return marked(processedContent);
});

// ---- SALVAR RASCUNHO ----
const saveDraft = async () => {
  const draftData = JSON.parse(JSON.stringify(newAnalysis.value)); 

  const processFile = async (file, fieldPath) => {
    if (file instanceof File) {
      const key = `draft_${fieldPath}_${Date.now()}`;
      await saveFileToDb(file, key);
      return { indexedDbKey: key, name: file.name, type: file.type };
    }
    return file;
  };

  if (draftData.coverImage) {
    draftData.coverImage = await processFile(draftData.coverImage, 'coverImage');
  }

  draftData.contentMediaMap = {};
  const contentMapPromises = [];
  for (const [placeholderId, mediaData] of contentImages.value.entries()) {
    if (mediaData.file instanceof File) {
      const key = `draft_${placeholderId}`;
      contentMapPromises.push(saveFileToDb(mediaData.file, key).then(() => {
        draftData.contentMediaMap[placeholderId] = { indexedDbKey: key, name: mediaData.file.name, type: mediaData.file.type };
      }));
    } else if (mediaData.indexedDbKey) {
      draftData.contentMediaMap[placeholderId] = mediaData;
    }
  }
  await Promise.all(contentMapPromises);

  const draftToStore = {
    data: draftData,
    expires: Date.now() + (60 * 60 * 1000)
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draftToStore));
  console.log("Rascunho salvo com sucesso.");
};

// ---- CARREGAR RASCUNHO ----
const loadDraft = async () => {
  await initDb();
  const savedDraft = localStorage.getItem(DRAFT_KEY);
  if (!savedDraft) return;

  const draft = JSON.parse(savedDraft);
  if (draft.expires < Date.now()) {
    console.log("Rascunho expirado. Removendo...");
    await clearAllDraftFiles();
    localStorage.removeItem(DRAFT_KEY);
    return;
  }

  console.log("Carregando rascunho...");
  const draftData = draft.data;

  const reconstructFile = async (stub) => {
    if (stub && stub.indexedDbKey) {
      const file = await getFileFromDb(stub.indexedDbKey);
      if(file) return file;
    }
    return null;
  };

  if (draftData.coverImage) {
    draftData.coverImage = await reconstructFile(draftData.coverImage);
    if(draftData.coverImage) imagePreviewUrl.value = URL.createObjectURL(draftData.coverImage);
  }

  if(draftData.contentMediaMap) {
    for (const placeholderId in draftData.contentMediaMap) {
      const file = await reconstructFile(draftData.contentMediaMap[placeholderId]);
      if(file) {
        contentImages.value.set(placeholderId, { file, blobUrl: URL.createObjectURL(file), indexedDbKey: draftData.contentMediaMap[placeholderId].indexedDbKey });
      }
    }
    delete draftData.contentMediaMap;
  }

  Object.assign(newAnalysis.value, draftData);
  
  if (editor && newAnalysis.value.content) {
    editor.setValue(newAnalysis.value.content);
  }
  
  console.log("Rascunho carregado.");
};

let debounceTimer = null;
watch(newAnalysis, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(saveDraft, 2000);
}, { deep: true });

onMounted(async () => {
  await loadDraft();
  
  nextTick(() => {
    initMonacoEditor();
  });
  
  watch(() => newAnalysis.value.content, (newContent) => {
    if (editor && editor.getValue() !== newContent) {
      editor.setValue(newContent);
    }
  }, { immediate: true });
  
  setInterval(async () => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (!savedDraft) return;
    const draft = JSON.parse(savedDraft);
    if (draft.expires < Date.now()) {
      console.log("Rascunho expirado automaticamente. Limpando IndexedDB...");
      await clearAllDraftFiles();
      localStorage.removeItem(DRAFT_KEY);
      resetForm();
    }
  }, 60 * 1000);
});

const cleanupBlobUrls = () => {
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value);
  for (const mediaData of contentImages.value.values()) {
    if (mediaData.blobUrl) URL.revokeObjectURL(mediaData.blobUrl);
  }
};

onBeforeUnmount(() => {
  cleanupBlobUrls();
  if (editor) {
    editor.dispose();
    editor = null;
  }
});

const isFormInvalid = computed(() =>
  !newAnalysis.value.title ||
  !newAnalysis.value.tag ||
  !newAnalysis.value.description ||
  !newAnalysis.value.content ||
  !newAnalysis.value.author ||
  !newAnalysis.value.category ||
  !newAnalysis.value.coverImage
);

const handleFileSelection = (event, fieldName) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  if (fieldName === 'coverImage') {
    if (imagePreviewUrl.value) {
        URL.revokeObjectURL(imagePreviewUrl.value);
    }
    newAnalysis.value.coverImage = files[0];
    imagePreviewUrl.value = URL.createObjectURL(files[0]);
  }
};

const resetForm = async () => {
  await clearAllDraftFiles();
  localStorage.removeItem(DRAFT_KEY);
  cleanupBlobUrls();
  newAnalysis.value = getInitialAnalysisState();
  imagePreviewUrl.value = '';
  contentImages.value.clear();
  if (editor) {
    editor.setValue('');
  }
  if(document.getElementById('coverImage')) document.getElementById('coverImage').value = null;
};

const confirmAndClearForm = async () => {
  if (window.confirm('Tem certeza que deseja limpar todo o formulário e os dados salvos? Esta ação não pode ser desfeita.')) {
    await resetForm();
    feedback.value = { message: 'Formulário e rascunho limpos com sucesso.', type: 'success' };
    setTimeout(() => { feedback.value = { message: '', type: '' }; }, 5000);
  }
};

const publishAnalysis = async () => {
  if (isFormInvalid.value) {
    feedback.value = { message: 'Por favor, preencha todos os campos obrigatórios.', type: 'error' };
    return;
  }
  isLoading.value = true;
  feedback.value = { message: '', type: '' };
  const formData = new FormData();

  let finalContent = newAnalysis.value.content;
  for (const [placeholder, data] of contentImages.value.entries()) {
    if (data.blobUrl) {
      const regex = new RegExp(data.blobUrl.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
      finalContent = finalContent.replace(regex, placeholder);
    }
  }

  const dataToSend = { ...newAnalysis.value, content: finalContent };
  Object.entries(dataToSend).forEach(([key, value]) => {
    if (key !== 'coverImage') {
      formData.append(key, value);
    }
  });

  if (dataToSend.coverImage) formData.append('coverImage', dataToSend.coverImage);
  
  contentImages.value.forEach((mediaData, placeholder) => formData.append(placeholder, mediaData.file));
  
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.post(`${API_BASE_URL}/api/admin/analyses`, formData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    feedback.value = { message: response.data.message || 'Análise publicada com sucesso!', type: 'success' };
    await resetForm();
    isPreviewMode.value = false;
  } catch (err) {
    feedback.value = { message: err.response?.data?.message || 'Falha ao publicar a análise.', type: 'error' };
  } finally {
    isLoading.value = false;
    setTimeout(() => { feedback.value = { message: '', type: '' }; }, 7000);
  }
};
watch(isPreviewMode, async (newVal) => {
  if (!newVal) {
    await nextTick();
    setTimeout(() => {
      if (editor) { 
        editor.layout();
        editor.focus();
      }
    }, 550);
  }
});

watch(isDark, (newValue) => {
  if (editor) {
    monaco.editor.setTheme(newValue ? 'vs-dark' : 'vs');
  }
});
</script>

<style src="@/assets/css/admin/addAndEditAnalisys.css"></style>