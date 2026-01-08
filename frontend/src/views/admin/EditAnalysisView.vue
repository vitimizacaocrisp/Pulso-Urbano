<template>
  <div>
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
        <div class="search-wrapper">
          <input type="text"
                 v-model="searchQuery"
                 placeholder="Pesquisar por título, tag ou autor..."
                 @focus="loadAllAnalyses"
                 @blur="hideDropdown"
                 class="search-input" />
          <div v-if="isLoadingSearch" class="search-loader"></div>

          <div v-if="isDropdownVisible && filteredAnalyses.length > 0" class="search-dropdown">
            <ul>
              <li v-for="analysis in filteredAnalyses" :key="analysis.id" @mousedown.prevent="selectAnalysis(analysis)">
                <strong>{{ analysis.title }}</strong><br/><small>{{ analysis.author }} - {{ analysis.tag }}</small>
              </li>
            </ul>
          </div>
          <div v-if="isDropdownVisible && filteredAnalyses.length === 0 && searchQuery" class="search-dropdown no-results">
            Nenhum resultado encontrado.
          </div>
        </div>
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
           <input type="text" id="subtitle" v-model="editingAnalysis.subtitle">
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
             <input type="text" id="studyPeriod" v-model="editingAnalysis.studyPeriod" placeholder="Ex: 2022-2023">
           </div>
         </div>
         <div class="form-group">
           <label for="source">Fonte</label>
           <input type="text" id="source" v-model="editingAnalysis.source" placeholder="Ex: IBGE, Datafolha, etc.">
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
           <textarea id="content" v-model="editingAnalysis.content" style="display: none;"></textarea>
         </div>
       </fieldset>

       <fieldset class="fieldset-image">
          <legend>Anexos e Ficheiros de Referência</legend>
          
          <div class="form-group">
              <label>Imagem de Capa <span class="required">*</span></label>
              <label for="coverImage" class="file-input-label">
                  <span class="file-input-button">Escolher arquivo</span>
                  <span class="file-input-text">{{ coverImageLabel }}</span>
              </label>
              <input type="file" id="coverImage" @change="handleFileSelection($event, 'coverImage')" accept="image/*" style="display: none;">
              <img v-if="imagePreviewUrl" :src="imagePreviewUrl" alt="Pré-visualização da imagem de capa" class="image-preview" />
          </div>

          <!-- Listas apenas para exibir/remover arquivos ANTIGOS (Legacy) -->
          <div class="form-group" v-if="editingAnalysis.documentFiles.length > 0">
              <label>Documentos Anexados (Legado)</label>
              <div class="file-list">
                  <div v-for="(file, index) in editingAnalysis.documentFiles" :key="file.name + index" class="file-list-item">
                      <span>{{ file.name }}</span>
                      <button type="button" @click="removeFile(index, 'documentFiles')" class="btn-remove-file">×</button>
                  </div>
              </div>
              <small class="hint-text">Para adicionar novos documentos, use o botão "Adicionar Arquivo / Recurso" acima.</small>
          </div>

          <div class="form-group" v-if="editingAnalysis.dataFiles.length > 0">
              <label>Ficheiros de Dados Anexados (Legado)</label>
              <div class="file-list">
                  <div v-for="(file, index) in editingAnalysis.dataFiles" :key="file.name + index" class="file-list-item">
                      <span>{{ file.name }}</span>
                      <button type="button" @click="removeFile(index, 'dataFiles')" class="btn-remove-file">×</button>
                  </div>
              </div>
              <small class="hint-text">Para adicionar novos dados, use o botão "Adicionar Arquivo / Recurso" acima.</small>
          </div>
          
          <div class="form-group">
            <label for="referenceLinks">Links de Referência</label>
            <textarea id="referenceLinks" v-model="editingAnalysis.referenceLinks" rows="3" placeholder="Coloque um link por linha..."></textarea>
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
        <div class="preview-content" v-html="renderedContent"></div>
        <div v-if="editingAnalysis.referenceLinks">
            <h3 class="preview-section-title">Referências:</h3>
            <ul class="preview-links">
                <li v-for="(link, idx) in (editingAnalysis.referenceLinks || '').split('\n').filter(l => l.trim() !== '')" :key="idx">
                <a :href="link.startsWith('http') ? link : `//${link}`" target="_blank" rel="noopener noreferrer">{{ link }}</a>
                </li>
            </ul>
        </div>
        
        <!-- Exibição de arquivos legados, se houver -->
        <div v-if="editingAnalysis.documentFiles.length > 0 || editingAnalysis.dataFiles.length > 0" class="preview-attachments">
             <div v-if="editingAnalysis.documentFiles.length > 0" class="attachment-group">
                <strong>Documentos (Legado):</strong>
                <ul>
                    <li v-for="doc in editingAnalysis.documentFiles" :key="doc.name">{{ doc.name }}</li>
                </ul>
            </div>
            <div v-if="editingAnalysis.dataFiles.length > 0" class="attachment-group">
                <strong>Dados (Legado):</strong>
                <ul>
                    <li v-for="file in editingAnalysis.dataFiles" :key="file.name">{{ file.name }}</li>
                </ul>
            </div>
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

// --- CONFIGURAÇÕES ---
const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

// --- ESTADO DA UI ---
const isPreviewMode = ref(false);
const isLoading = ref(false);
const isLoadingSearch = ref(false);
const feedback = ref({ message: '', type: '' });
const isDeleteModalVisible = ref(false);

// --- ESTADO DA PESQUISA ---
const allAnalyses = ref([]);
const isDropdownVisible = ref(false);
const searchQuery = ref('');
let hasLoadedOnce = false;

// --- MONACO EDITOR ---
const editorContainer = ref(null);
let editor = null;
let isEditorInitialized = ref(false);

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
const selectedMediaFiles = ref([]); // MUDANÇA: Array de arquivos

// --- RASTREAMENTO DE ARQUIVOS ---
const originalServerFiles = ref(new Set());
const filesToDelete = ref([]);

// --- MONACO EDITOR ---
const initMonacoEditor = () => {
  if (!editorContainer.value) return;

  if (editor) {
    editor.dispose();
    editor = null;
  }

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
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        useShadows: false
      },
      tabSize: 2,
      insertSpaces: true,
    });

    editor.onDidChangeModelContent(() => {
      editingAnalysis.value.content = editor.getValue();
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

    isEditorInitialized.value = true;
    
    setTimeout(() => {
      editor.layout();
    }, 500);

  } catch (error) {
    console.error('Erro crítico ao inicializar Monaco Editor:', error);
    const fallbackTextarea = document.getElementById('content');
    if (fallbackTextarea) fallbackTextarea.style.display = 'block';
  }
};

const applyFormat = (type) => {
    formatText(editor, type);
};

// --- CONTROLE DOS MENUS E MODAIS ---
const openResourceMenu = () => { showResourceTypeMenu.value = true; };
const closeResourceMenu = () => { showResourceTypeMenu.value = false; };

const selectResourceType = (type) => {
    activeMediaType.value = type;
    showResourceTypeMenu.value = false;
    mediaInputType.value = 'url';
    mediaUrlInput.value = '';
    selectedMediaFiles.value = []; // Resetando para array vazio
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
        // Converte FileList para Array
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
                const { html, placeholderId, blobUrl } = await generateFileMediaHtml(file, activeMediaType.value);
                
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
      editingAnalysis.value.content += '\n' + markdownToInsert;
      return;
  }
  
  const position = editor.getPosition();
  const range = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
  
  editor.executeEdits('', [{ range: range, text: '\n' + markdownToInsert + '\n', forceMoveMarkers: true }]);
  
  const lines = markdownToInsert.split('\n').length + 2;
  const newPosition = new monaco.Position(position.lineNumber + lines, 1);
  editor.setPosition(newPosition);
  editor.focus();
};

// --- LÓGICA DE CARREGAMENTO ---
const fetchFile = async (url, defaultName) => {
    try {
        const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
        const response = await fetch(fullUrl);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const blob = await response.blob();
        const file = new File([blob], defaultName, { type: blob.type });
        file.serverPath = url; 
        return file;
    } catch (error) {
        console.error(`Erro ao carregar ${url}:`, error);
        return null;
    }
};

const selectAnalysis = async (analysisStub) => {
  isDropdownVisible.value = false;
  searchQuery.value = analysisStub.title;
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
    
    if (serverData.cover_image_path) {
        const file = await fetchFile(serverData.cover_image_path, serverData.cover_image_path.split('/').pop());
        if (file) {
          analysisState.coverImage = file;
          imagePreviewUrl.value = URL.createObjectURL(file);
          originalServerFiles.value.add(file.serverPath);
        }
    }
    if (serverData.document_file_path && Array.isArray(serverData.document_file_path)) {
        const files = (await Promise.all(serverData.document_file_path.map(f => fetchFile(f.path, f.originalName)))).filter(Boolean);
        analysisState.documentFiles = files;
        files.forEach(f => originalServerFiles.value.add(f.serverPath));
    }
    if (serverData.data_file_path && Array.isArray(serverData.data_file_path)) {
        const files = (await Promise.all(serverData.data_file_path.map(f => fetchFile(f.path, f.originalName)))).filter(Boolean);
        analysisState.dataFiles = files;
        files.forEach(f => originalServerFiles.value.add(f.serverPath));
    }

    editingAnalysis.value = analysisState;
    
    if (editor) {
      editor.setValue(analysisState.content || '');
    } else {
      nextTick(() => initMonacoEditor());
    }
    
    feedback.value = { message: 'Análise carregada.', type: 'success' };
  } catch (err) {
    feedback.value = { message: 'Erro ao carregar análise.', type: 'error' };
  } finally {
    isLoading.value = false;
  }
};

const filteredAnalyses = computed(() => {
  if (!searchQuery.value) return allAnalyses.value;
  const q = searchQuery.value.toLowerCase();
  return allAnalyses.value.filter(a =>
    (a.title || '').toLowerCase().includes(q) || (a.tag || '').toLowerCase().includes(q) || (a.author || '').toLowerCase().includes(q)
  );
});

const loadAllAnalyses = async () => {
  if (hasLoadedOnce) { isDropdownVisible.value = true; return; }
  isLoadingSearch.value = true;
  try {
    const token = localStorage.getItem('authToken');
    const res = await axios.get(`${API_BASE_URL}/api/admin/analyses-list`, { headers: { Authorization: `Bearer ${token}` } });
    allAnalyses.value = res.data.data?.analyses || [];
    hasLoadedOnce = true;
    isDropdownVisible.value = true;
  } catch (err) {
    feedback.value = { message: 'Falha ao buscar análises.', type: 'error' };
  } finally {
    isLoadingSearch.value = false;
  }
};

const hideDropdown = () => setTimeout(() => { isDropdownVisible.value = false; }, 200);

// --- LIFECYCLE ---
const route = useRoute();
const router = useRouter();

onMounted(() => { 
  nextTick(() => {
    initMonacoEditor();
  });
  
  if (route.query.id) {
    setTimeout(() => {
      selectAnalysis({ id: route.query.id, title: `Análise #${route.query.id}` });
    }, 500);
  } 
});

onBeforeUnmount(() => {
  cleanupBlobUrls();
  if (editor) {
    editor.dispose();
    editor = null;
  }
});

// --- AÇÕES DO FORMULÁRIO ---
const updateAnalysis = async () => {
    if (!editingAnalysis.value.id || isFormInvalid.value) {
      feedback.value = { message: 'Preencha os campos obrigatórios.', type: 'error' };
      return;
    }
    isLoading.value = true;
    feedback.value = { message: 'Salvando...', type: 'info' };

    let finalContent = editingAnalysis.value.content;
    for (const [placeholder, data] of contentImages.value.entries()) {
        if (data.blobUrl) {
            const regex = new RegExp(data.blobUrl.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
            finalContent = finalContent.replace(regex, placeholder);
        }
    }

    const formData = new FormData();
    Object.entries(editingAnalysis.value).forEach(([key, value]) => {
        if (!['coverImage', 'documentFiles', 'dataFiles', 'id', 'content'].includes(key)) {
            formData.append(key, value ?? '');
        }
    });
    formData.append('content', finalContent);

    if (editingAnalysis.value.coverImage instanceof File) formData.append('coverImage', editingAnalysis.value.coverImage);
    editingAnalysis.value.documentFiles.forEach(file => { if(file instanceof File) formData.append('documentFiles', file) });
    editingAnalysis.value.dataFiles.forEach(file => { if(file instanceof File) formData.append('dataFiles', file) });
    
    contentImages.value.forEach((mediaData, placeholder) => { if(mediaData.file instanceof File) formData.append(placeholder, mediaData.file) });
    
    formData.append('filesToDelete', JSON.stringify(filesToDelete.value));

    try {
        const token = localStorage.getItem('authToken');
        await axios.put(`${API_BASE_URL}/api/admin/analyses/${editingAnalysis.value.id}`, formData, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
        feedback.value = { message: 'Análise atualizada com sucesso!', type: 'success' };
        await selectAnalysis({ id: editingAnalysis.value.id, title: editingAnalysis.value.title });
    } catch (err) {
        feedback.value = { message: 'Erro ao salvar.', type: 'error' };
    } finally {
        isLoading.value = false;
    }
};

const confirmAndResetForm = async () => {
  if (window.confirm('Resetar alterações? Dados não salvos serão perdidos.')) {
    if (!editingAnalysis.value.id) return;
    await selectAnalysis({ id: editingAnalysis.value.id, title: searchQuery.value });
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
        searchQuery.value = '';
        allAnalyses.value = [];
        router.push({ path: '/admin/edit-analysis' });
    } catch (err) {
        feedback.value = { message: 'Erro ao excluir.', type: 'error' };
    } finally {
        isLoading.value = false;
    }
};

const isFormInvalid = computed(() => !editingAnalysis.value.title || !editingAnalysis.value.tag || !editingAnalysis.value.description || !editingAnalysis.value.content || !editingAnalysis.value.category);

const cleanupBlobUrls = () => {
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value);
  for (const mediaData of contentImages.value.values()) {
    if (mediaData.blobUrl) URL.revokeObjectURL(mediaData.blobUrl);
  }
};

const handleFileSelection = (event, fieldName) => {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  if (fieldName === 'coverImage') {
    const oldFile = editingAnalysis.value.coverImage;
    if (oldFile && originalServerFiles.value.has(oldFile.serverPath)) {
        filesToDelete.value.push(oldFile.serverPath);
    }
    if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value);
    editingAnalysis.value.coverImage = files[0];
    imagePreviewUrl.value = URL.createObjectURL(files[0]);
  }
  event.target.value = null; 
};

const removeFile = (index, fieldName) => {
  const fileToRemove = editingAnalysis.value[fieldName][index];
  if (fileToRemove.serverPath && originalServerFiles.value.has(fileToRemove.serverPath)) {
      filesToDelete.value.push(fileToRemove.serverPath);
  }
  editingAnalysis.value[fieldName].splice(index, 1);
};

const coverImageLabel = computed(() => editingAnalysis.value.coverImage ? `Capa: ${editingAnalysis.value.coverImage.name}` : 'Nenhum arquivo escolhido');

// --- RENDERIZAÇÃO ---
const renderedContent = computed(() => {
  if (!editingAnalysis.value.content) return '<p><em>Comece a escrever...</em></p>';
  
  let processedContent = editingAnalysis.value.content.trim();

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