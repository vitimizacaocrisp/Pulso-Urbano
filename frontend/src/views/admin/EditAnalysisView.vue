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
            <!-- Mídia -->
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
            
            <!-- Código e Análise -->
            <button @click="selectResourceType('notebook')" class="resource-btn highlight-purple">
              <span class="icon">🐍</span>
              <span class="label">Notebook</span>
            </button>
            <button @click="selectResourceType('script')" class="resource-btn highlight-purple">
              <span class="icon">📜</span>
              <span class="label">Script</span>
            </button>

            <!-- Documentos e Dados -->
            <button @click="selectResourceType('document')" class="resource-btn highlight-blue">
              <span class="icon">📄</span>
              <span class="label">Documento</span>
            </button>
            <button @click="selectResourceType('data')" class="resource-btn highlight-green">
              <span class="icon">📊</span>
              <span class="label">Dados (CSV/XLS)</span>
            </button>
            
            <!-- Extra: Link Genérico -->
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
            <label>Selecione o arquivo:</label>
            <div class="file-upload-box">
              <input 
                type="file" 
                ref="mediaFileInputRef" 
                @change="handleModalFileChange" 
                :accept="getAcceptAttribute(activeMediaType)"
                class="file-input-hidden"
                id="modalFileUpload"
              >
              <label for="modalFileUpload" class="file-upload-label">
                <span v-if="selectedMediaFile">✅ {{ selectedMediaFile.name }}</span>
                <span v-else>Escolher Arquivo...</span>
              </label>
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
             <option>Educação</option>
             <option>Saúde</option>
             <option>Política</option>
             <option>Criminalidade</option>
             <option>Tecnologia e Inovação</option>
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
               <button type="button" @click="formatText('bold')" title="Negrito (Ctrl+B)" class="format-btn">
                 <strong>B</strong>
               </button>
               <button type="button" @click="formatText('italic')" title="Itálico (Ctrl+I)" class="format-btn">
                 <em>I</em>
               </button>
               <button type="button" @click="formatText('heading')" title="Título" class="format-btn">
                 H
               </button>
               <button type="button" @click="formatText('list')" title="Lista" class="format-btn">
                 ••
               </button>
               <button type="button" @click="formatText('code')" title="Código" class="format-btn">
                 { }
               </button>
               <button type="button" @click="formatText('link')" title="Link" class="format-btn">
                 🔗
               </button>
               <button type="button" @click="formatText('image')" title="Imagem" class="format-btn">
                 🖼️
               </button>
               <button type="button" @click="formatText('quote')" title="Citação" class="format-btn">
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
const selectedMediaFile = ref(null);

const mediaTypeLabels = {
    'image': 'Imagem',
    'audio': 'Áudio',
    'video': 'Vídeo',
    'notebook': 'Notebook Python',
    'script': 'Script',
    'document': 'Documento (PDF/Word)',
    'data': 'Base de Dados (CSV/Excel)',
    'link': 'Link Externo'
};

// --- RASTREAMENTO DE ARQUIVOS ---
const originalServerFiles = ref(new Set());
const filesToDelete = ref([]);

// --- MONACO EDITOR ---
const initMonacoEditor = () => {
  // 1. Verifica se o container existe no DOM
  if (!editorContainer.value) return;

  // 2. Se já existir uma instância do editor, precisamos destruí-la 
  // antes de criar uma nova para evitar vazamento de memória e conflitos de DOM
  if (editor) {
    editor.dispose();
    editor = null;
  }

  try {
    // 3. Cria a nova instância do Monaco
    editor = monaco.editor.create(editorContainer.value, {
      value: editingAnalysis.value.content || '',
      language: 'markdown',
      theme: 'vs-dark',
      fontSize: 14,
      lineNumbers: 'on',
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      wrappingIndent: 'same',
      automaticLayout: true, // Importante para redimensionar sozinho
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

    // 4. Sincroniza as alterações do Editor de volta para o seu ref 'editingAnalysis'
    editor.onDidChangeModelContent(() => {
      editingAnalysis.value.content = editor.getValue();
    });

    // 5. Registra novamente os atalhos de teclado (shortcuts)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
      formatText('bold');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
      formatText('italic');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyH, () => {
      formatText('heading');
    });

    isEditorInitialized.value = true;
    
    // Pequeno ajuste de layout após a criação para garantir que ele preencha o container
    setTimeout(() => {
      editor.layout();
    }, 500);

  } catch (error) {
    console.error('Erro crítico ao inicializar Monaco Editor:', error);
    
    // Fallback caso o Monaco falhe (opcional)
    const fallbackTextarea = document.getElementById('content');
    if (fallbackTextarea) fallbackTextarea.style.display = 'block';
  }
};



// --- FUNÇÕES DE FORMATAÇÃO ---
const formatText = (type) => {
  if (!editor) return;

  const selection = editor.getSelection();
  const model = editor.getModel();
  const text = model.getValueInRange(selection);
  const position = selection.getStartPosition();

  let newText = '';
  let range = null;

  switch (type) {
    case 'bold':
      newText = text ? `**${text}**` : '**texto**';
      range = new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column + newText.length
      );
      break;
      
    case 'italic':
      newText = text ? `*${text}*` : '*texto*';
      range = new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column + newText.length
      );
      break;
      
    case 'heading':
      newText = text ? `# ${text}` : '# Título';
      range = new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column + newText.length
      );
      break;
      
    case 'list':
      newText = text ? `- ${text}` : '- Item da lista';
      range = new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column + newText.length
      );
      break;
      
    case 'code':
      if (text) {
        newText = `\`${text}\``;
        range = new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column + newText.length
        );
      } else {
        newText = '```\n\n```';
        range = new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber + 2,
          3
        );
      }
      break;
      
    case 'link':
      newText = text ? `[${text}](url)` : '[texto](url)';
      range = new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column + newText.length
      );
      break;
      
    case 'image':
      newText = text ? `![${text}](url)` : '![alt](url)';
      range = new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column + newText.length
      );
      break;
      
    case 'quote':
      newText = text ? `> ${text}` : '> Citação';
      range = new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column + newText.length
      );
      break;
  }

  if (text) {
    // Se há texto selecionado, substitua
    editor.executeEdits('', [
      {
        range: selection,
        text: newText,
        forceMoveMarkers: true
      }
    ]);
  } else {
    // Se não há texto selecionado, insira no cursor
    editor.executeEdits('', [
      {
        range: range,
        text: newText,
        forceMoveMarkers: true
      }
    ]);
    
    // Coloque o cursor dentro do texto inserido
    if (type === 'bold' || type === 'italic' || type === 'code' && !text) {
      setTimeout(() => {
        const newPosition = new monaco.Position(
          position.lineNumber,
          type === 'bold' || type === 'italic' ? position.column + 2 : 
          type === 'code' ? position.lineNumber + 1 : position.column + 1
        );
        editor.setPosition(newPosition);
        editor.focus();
      }, 10);
    }
  }
};

// --- CONTROLE DOS MENUS E MODAIS ---
const openResourceMenu = () => { showResourceTypeMenu.value = true; };
const closeResourceMenu = () => { showResourceTypeMenu.value = false; };

const selectResourceType = (type) => {
    activeMediaType.value = type;
    showResourceTypeMenu.value = false;
    mediaInputType.value = 'url';
    mediaUrlInput.value = '';
    selectedMediaFile.value = null;
    if (mediaFileInputRef.value) mediaFileInputRef.value.value = '';
    showMediaModal.value = true;
};

const returnToMenu = () => {
    showMediaModal.value = false;
    showResourceTypeMenu.value = true;
};

const closeMediaModal = () => { showMediaModal.value = false; };

const getAcceptAttribute = (type) => {
    switch(type) {
        case 'image': return 'image/*';
        case 'audio': return 'audio/*';
        case 'video': return 'video/*';
        case 'notebook': return '.ipynb,.html';
        case 'script': return '.py,.js,.r,.txt,.sh';
        case 'document': return '.pdf,.doc,.docx,.ppt,.pptx';
        case 'data': return '.csv,.xls,.xlsx,.json,.xml';
        default: return '*/*';
    }
};

const handleModalFileChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
        selectedMediaFile.value = files[0];
    }
};

const confirmMediaInsertion = () => {
    if (mediaInputType.value === 'url') {
        if (!mediaUrlInput.value) {
            alert("Por favor, insira uma URL válida.");
            return;
        }
        insertUrlMedia(mediaUrlInput.value, activeMediaType.value);
    } else {
        if (!selectedMediaFile.value && activeMediaType.value !== 'link') {
            alert("Por favor, selecione um arquivo.");
            return;
        }
        insertFileMedia(selectedMediaFile.value, activeMediaType.value);
    }
    closeMediaModal();
};

//function randomSuffix() { return Math.floor(Math.random() * 1e6).toString(); }

const processCodeContent = async (content, type, containerId) => {
    const escapeHTML = (str) => str.replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]));

    const cellStyle = "margin-bottom: 15px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; background: #fff;";
    const codeStyle = "background: #1e1e1e; color: #d4d4d4; padding: 12px; font-family: monospace; font-size: 13px; line-height: 1.5; white-space: pre; overflow-x: auto;";
    const outputStyle = "background: #f8f9fa; color: #333; padding: 12px; font-family: monospace; font-size: 12px; border-top: 1px solid #eee; white-space: pre-wrap;";

    if (type === 'notebook') {
        try {
            const data = typeof content === 'string' ? JSON.parse(content) : content;
            if (!data.cells) throw new Error();

            const cellsHtml = data.cells
                .filter(cell => cell.cell_type === 'code')
                .map((cell, index) => {
                    const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
                    let outputContent = '';
                    if (cell.outputs) {
                        outputContent = cell.outputs.map(out => {
                            if (out.text) return Array.isArray(out.text) ? out.text.join('') : out.text;
                            if (out.data && out.data['text/plain']) return Array.isArray(out.data['text/plain']) ? out.data['text/plain'].join('') : out.data['text/plain'];
                            return '';
                        }).join('\n').trim();
                    }

                    // Apenas a primeira célula (index 0) é visível por padrão
                    const display = index === 0 ? 'block' : 'none';
                    
                    return `
<div class="nb-cell-${containerId}" style="${cellStyle} display: ${display};" data-index="${index}">
    <div style="background:#333; color:#aaa; padding:5px 10px; font-size:10px;">CÉLULA ${index + 1}</div>
    <div style="${codeStyle}">${escapeHTML(source)}</div>
    ${outputContent ? `<div style="${outputStyle}"><strong style="font-size:10px; color:#999;">SAÍDA:</strong>\n${escapeHTML(outputContent)}</div>` : ''}
    <div class="btn-container" style="padding: 10px; text-align: center;"></div>
</div>`;
                }).join('');

            // Script para o botão "Mostrar Mais"
            const showMoreScript = `
                (function() {
                    const cells = document.querySelectorAll('.nb-cell-${containerId}');
                    const btn = document.createElement('button');
                    btn.innerText = 'MOSTRAR MAIS +';
                    btn.style = 'padding: 8px 16px; border-radius: 20px; border: 1px solid #0ea5e9; background: white; color: #0ea5e9; font-weight: bold; cursor: pointer; font-size: 11px;';
                    
                    let currentIndex = 0;
                    const moveButton = () => {
                        if (currentIndex < cells.length - 1) {
                            currentIndex++;
                            cells[currentIndex].style.display = 'block';
                            cells[currentIndex].querySelector('.btn-container').appendChild(btn);
                            if (currentIndex === cells.length - 1) btn.style.display = 'none';
                        }
                    };
                    btn.onclick = moveButton;
                    if (cells.length > 1) cells[0].querySelector('.btn-container').appendChild(btn);
                })()`;

            return `${cellsHtml}<img src="/" onerror="${showMoreScript}" style="display:none;">`;
        } catch (e) { return '<div style="color:red;">Erro ao processar Notebook.</div>'; }
    }
    return `<div style="${codeStyle}">${escapeHTML(content)}</div>`;
};

const insertUrlMedia = async (url, type) => {
    let htmlToInsert = '';
    const containerId = `nb_${Date.now()}`;
    const cardBase = "border:1px solid #e0e0e0; border-radius:12px; padding:16px; background:#fff; margin:15px 0; font-family:sans-serif; box-shadow:0 4px 6px rgba(0,0,0,0.05); text-align: left;";
    const btnBase = "display:inline-block; margin-right:8px; padding:8px 14px; border-radius:8px; text-decoration:none; font-size:11px; font-weight:bold; color:#fff; text-transform: uppercase; cursor:pointer; border:none;";

    if (type === 'notebook' || type === 'script') {
        let rawUrl = url;
        let displayUrl = url;
        let colabUrl = '';
        let nbViewerUrl = '';

        if (url.includes('github')) {
            const path = url.replace(/^https?:\/\//, '');
            const parts = path.split('/');
            const user = parts[1];
            const repo = parts[2];

            if (path.startsWith('raw.githubusercontent.com')) {
                const branch = parts[3];
                const filePath = parts.slice(4).join('/');
                displayUrl = `https://github.com/${user}/${repo}/blob/${branch}/${filePath}`;
                rawUrl = url;
            } else {
                const branch = parts[4];
                const filePath = parts.slice(5).join('/');
                rawUrl = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
                displayUrl = url;
            }
            const ghSuffix = displayUrl.split('github.com/')[1];
            colabUrl = `https://colab.research.google.com/github/${ghSuffix.replace('/blob/', '/blob/')}`;
            nbViewerUrl = `https://nbviewer.org/github/${ghSuffix}`;
        } else {
            nbViewerUrl = `https://nbviewer.org/urls/${url.replace(/^https?:\/\//, '')}`;
        }

        const codeContent = await processCodeContent(await (await fetch(rawUrl)).text(), type, containerId);

        htmlToInsert = `
<div style="${cardBase}">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:15px;">
        <div style="display:flex; align-items:center;">
            <span style="font-size:28px; margin-right:12px;">${type === 'notebook' ? '🐍' : '📜'}</span>
            <strong>${type === 'notebook' ? 'Notebook Python' : 'Script'}</strong>
        </div>
    </div>
    <div style="margin-bottom:15px;">
        <a href="${displayUrl}" target="_blank" style="${btnBase} background:#24292e;">📂 GitHub</a>
        <button onclick="
            const el = document.getElementById('${containerId}');
            const isHidden = el.style.display === 'none';
            el.style.display = isHidden ? 'block' : 'none';
            this.innerHTML = isHidden ? '收 CODE' : '👁️ CODE';
            this.style.background = isHidden ? '#ef4444' : '#10b981';
        " style="${btnBase} background:#10b981;">👁️ CODE</button>
        ${colabUrl ? `<a href="${colabUrl}" target="_blank" style="${btnBase} background:#f9ab00;">🚀 Colab</a>` : ''}
        <a href="${nbViewerUrl}" target="_blank" style="${btnBase} background:#3f51b5;">👀 NBViewer</a>
    </div>
    <div id="${containerId}" style="display:none; margin-top:10px;">${codeContent}</div>
</div>`;
    } else if (type === 'image') {
        htmlToInsert = `<div style="text-align:center; margin:20px 0;"><img src="${url}" style="max-width:100%; border-radius:8px; border:1px solid #ddd;"><p style="color:#666; font-size:12px; margin-top:8px;">🖼️ Imagem Externa</p></div>`;
    } else if (type === 'audio') {
        htmlToInsert = `<div style="${cardBase} background:#f8fafc;"><div style="margin-bottom:8px;">🎵 <strong>Áudio Externo</strong></div><audio controls src="${url}" style="width:100%;"></audio></div>`;
    } else if (type === 'video') {
        htmlToInsert = `<div style="margin:20px 0; background:#000; border-radius:12px; overflow:hidden;"><video controls src="${url}" style="width:100%; display:block;"></video><div style="padding:8px; color:#fff; font-size:11px; text-align:center; background:#222;">🎥 VÍDEO EXTERNO</div></div>`;
    } else {
        htmlToInsert = `<div style="${cardBase} border-left:4px solid #2196F3;"><span style="margin-right:8px;">🔗</span><a href="${url}" target="_blank" style="color:#2196F3; font-weight:bold; text-decoration:none;">Acessar Link Externo</a></div>`;
    }
    insertMediaIntoTextarea(htmlToInsert);
};

const insertFileMedia = async (file, type) => {
    const placeholderId = `${type}_${Date.now()}`;
    const containerId = `file_${Date.now()}`;
    contentImages.value.set(placeholderId, { file, blobUrl: URL.createObjectURL(file) });
    
    const cardBase = "border:1px solid #e2e8f0; border-radius:12px; padding:16px; background:#f8fafc; margin:15px 0; font-family:sans-serif;";
    const dlBtn = "background:#0ea5e9; color:white; padding:8px 16px; border-radius:8px; text-decoration:none; font-size:11px; font-weight:bold;";

    let htmlToInsert = '';

    if (type === 'notebook' || type === 'script') {
        const codeContent = await processCodeContent(await file.text(), type, containerId);

        htmlToInsert = `
<div style="${cardBase}">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:15px;">
        <div style="display:flex; align-items:center;">
            <span style="font-size:28px; margin-right:12px;">${type === 'notebook' ? '🐍' : '📜'}</span>
            <strong>${file.name}</strong>
        </div>
        <div>
            <button onclick="
                const el = document.getElementById('${containerId}');
                const isHidden = el.style.display === 'none';
                el.style.display = isHidden ? 'block' : 'none';
                this.innerHTML = isHidden ? '收 FECHAR' : '👁️ VER CÓDIGO';
            " style="background:#6366f1; color:white; border:none; padding:8px 12px; border-radius:8px; font-size:11px; font-weight:bold; cursor:pointer; margin-right:8px;">👁️ VER CÓDIGO</button>
            <a href="${placeholderId}" download="${file.name}" style="${dlBtn}">⬇️ BAIXAR</a>
        </div>
    </div>
    <div id="${containerId}" style="display:none;">${codeContent}</div>
</div>`;
    } else if (type === 'image') {
        htmlToInsert = `<div style="text-align:center; margin:20px 0;"><img src="${placeholderId}" style="max-width:100%; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1);"><div style="margin-top:8px;"><a href="${placeholderId}" download="${file.name}" style="color:#0ea5e9; font-size:12px; text-decoration:none; font-weight:bold;">💾 Baixar Imagem</a></div></div>`;
    } else if (type === 'video') {
        htmlToInsert = `
<div style="margin:20px 0; background:#000; border-radius:12px; overflow:hidden;">
    <video controls src="${placeholderId}" style="width:100%; display:block;"></video>
    <div style="padding:10px; background:#1e293b; display:flex; justify-content:space-between; align-items:center;">
        <span style="color:#fff; font-size:12px;">🎥 ${file.name}</span>
        <a href="${placeholderId}" download="${file.name}" style="color:#38bdf8; font-size:12px; font-weight:bold; text-decoration:none;">Download</a>
    </div>
</div>`;
    } else if (type === 'audio') {
        htmlToInsert = `<div style="${cardBase} background:#fff7ed; border-color:#fdba74;"><div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>🎵 <strong>${file.name}</strong></span><a href="${placeholderId}" download="${file.name}" style="color:#ea580c; font-size:11px; font-weight:bold; text-decoration:none;">Download</a></div><audio controls src="${placeholderId}" style="width:100%;"></audio></div>`;
    } else {
        // Documentos (PDF, DOCX) ou Dados (CSV, JSON)
        const isData = type === 'data';
        const color = isData ? '#8b5cf6' : '#6366f1';
        htmlToInsert = `
<div style="${cardBase} border-left:5px solid ${color};">
    <div style="display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center;">
            <span style="font-size:24px; margin-right:12px;">${isData ? '📊' : '📄'}</span>
            <div><strong style="color:#333; display:block;">${file.name}</strong><span style="font-size:11px; color:#888;">Arquivo de ${type}</span></div>
        </div>
        <a href="${placeholderId}" download="${file.name}" style="background:${color}; color:white; padding:6px 12px; border-radius:6px; text-decoration:none; font-size:11px; font-weight:bold;">BAIXAR</a>
    </div>
</div>`;
    }
    
    insertMediaIntoTextarea(htmlToInsert);
};

const insertMediaIntoTextarea = (markdownToInsert) => {
  if (!editor) {
      editingAnalysis.value.content += '\n' + markdownToInsert;
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
  
  // Mova o cursor para o final do conteúdo inserido
  const newPosition = new monaco.Position(
    position.lineNumber + 1,
    markdownToInsert.length + 1
  );
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
  //editingAnalysis.value = getInitialAnalysisState();

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
    // Carrega arquivos legacy para as listas
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
  // Inicialize o editor após o próximo tick
  nextTick(() => {
    initMonacoEditor();
  });
  
  // Se houver um ID na URL, carregue a análise
  if (route.query.id) {
    // Dê tempo para o editor ser inicializado
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
    // Processa placeholders antes do envio
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
    // Arquivos Legacy
    editingAnalysis.value.documentFiles.forEach(file => { if(file instanceof File) formData.append('documentFiles', file) });
    editingAnalysis.value.dataFiles.forEach(file => { if(file instanceof File) formData.append('dataFiles', file) });
    
    // Novos Arquivos Incorporados
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
  if (!newVal) { // Quando volta para o modo de edição
    await nextTick();
    setTimeout(() => {
      // Verificamos se 'editor' ainda existe antes de pedir o layout
      if (editor) { 
        editor.layout();
        editor.focus();
      }
    }, 550);
  }
});
</script>

<style scoped>
/* ESTILOS DA UI GERAL */
.main-header-bar { background-color: #fff; padding: 1.5rem 2rem; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
.header-content h1 { margin: 0; }
.btn-toggle-preview { background-color: transparent; border: 1px solid #007bff; color: #007bff; padding: .5rem 1rem; border-radius: 5px; cursor: pointer; font-weight: 500; }
.btn-toggle-preview:hover { background-color: #007bff; color: #fff; }
.btn-toggle-preview:disabled { border-color: #ccc; color: #ccc; cursor: not-allowed; }

/* MODAIS E MENUS */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background-color: #fff; padding: 2rem; border-radius: 8px; width: 90%; max-width: 550px; text-align: center; }
.menu-content { max-width: 650px; }
.modal-header { background: #f8f9fa; padding: 1rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e0e0e0; }
.modal-body { padding: 1.5rem; }
.resource-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 1rem; }
.resource-btn { display: flex; flex-direction: column; align-items: center; padding: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; cursor: pointer; transition: all 0.2s; }
.resource-btn:hover { transform: translateY(-3px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-color: #007bff; }
.resource-btn .icon { font-size: 2rem; margin-bottom: 0.5rem; }
.resource-btn .label { font-size: 0.9rem; font-weight: 600; color: #444; }
.highlight-purple .icon { filter: drop-shadow(0 0 5px rgba(138,43,226,0.3)); }
.highlight-blue .icon { filter: drop-shadow(0 0 5px rgba(0,123,255,0.3)); }
.highlight-green .icon { filter: drop-shadow(0 0 5px rgba(40,167,69,0.3)); }
.modal-tabs { display: flex; gap: 1rem; margin-bottom: 1rem; border-bottom: 1px solid #eee; }
.tab-btn { background: none; border: none; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.95rem; color: #666; border-bottom: 2px solid transparent; }
.tab-btn.active { color: #007bff; border-bottom: 2px solid #007bff; font-weight: 600; }
.modal-input { width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
.file-upload-box { border: 2px dashed #ccc; padding: 2rem; text-align: center; border-radius: 4px; cursor: pointer; }
.file-upload-box:hover { background: #f9f9f9; }
.modal-footer { padding: 1rem; background: #f8f9fa; border-top: 1px solid #e0e0e0; display: flex; justify-content: flex-end; gap: 0.5rem; }
.btn-back, .btn-close-modal { border: none; background: transparent; cursor: pointer; }
.btn-confirm { padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
.btn-cancel, .btn-confirm-delete { padding: 0.6rem 1.5rem; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-cancel { background-color: #6c757d; color: white; }
.btn-confirm-delete { background-color: #dc3545; color: white; }

/* TOOLBAR DO EDITOR */
.single-button-toolbar { 
    background: #f8f9fa; 
    padding: 0.75rem 1rem; 
    border: 1px solid #ccc; 
    border-bottom: none; 
    border-radius: 4px 4px 0 0; 
    display: flex; 
    align-items: center; 
    gap: 1rem; 
    flex-wrap: wrap;
}
.toolbar-main-btn { 
    background: #007bff; 
    color: white; 
    border: none; 
    padding: 0.6rem 1.2rem; 
    border-radius: 30px; 
    font-weight: 600; 
    cursor: pointer; 
    display: flex; 
    align-items: center; 
    gap: 0.5rem; 
    transition: background 0.2s; 
}
.toolbar-main-btn:hover { background: #0056b3; }
.toolbar-hint { 
    color: #666; 
    font-size: 0.9rem; 
    font-style: italic;
    flex: 1;
    min-width: 200px;
}

/* Botões de formatação */
.editor-format-buttons {
    display: flex;
    gap: 4px;
    margin-left: auto;
    flex-wrap: wrap;
}

.format-btn {
    background: #2d2d2d;
    color: #fff;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 6px 10px;
    font-size: 13px;
    cursor: pointer;
    min-width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.format-btn:hover {
    background: #3d3d3d;
    border-color: #007bff;
}

.format-btn strong, .format-btn em {
    font-size: 13px;
}

/* Monaco Editor Container */
.editor-container {
    height: 600px;
    border: 1px solid #ccc;
    border-radius: 0 0 4px 4px;
    border-top: none;
    overflow: hidden;
}

/* Para tema claro do editor */
:deep(.vs) {
    --monaco-editor-background: #ffffff;
}

:deep(.vs-dark) {
    --monaco-editor-background: #1e1e1e;
}

/* FORMS */
.content-section { padding: 2rem; max-width: 1200px; margin: 0 auto; }
.form-container, .search-fieldset { background: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,.1); margin-bottom: 2rem; }
.search-input { width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
fieldset { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
legend { font-weight: 600; padding: 0 0.5rem; color: #333; }
.form-group { margin-bottom: 1.5rem; }
.form-group label { margin-bottom: 0.5rem; font-weight: 500; }
.form-group input, .form-group textarea, .form-group select { width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
.file-input-label { display: flex; align-items: center; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; overflow: hidden; }
.file-input-button { background: #e9ecef; border-right: 1px solid #ccc; padding: 0.5rem 1rem; }
.file-input-text { padding: 0 1rem; color: #495057; }
.file-list-item { display: flex; justify-content: space-between; padding: 0.5rem; background: #f8f9fa; margin-bottom: 0.5rem; border-radius: 4px; }
.hint-text { color: #888; font-style: italic; }

.form-actions { display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 1rem; }
.btn-publish { padding: .8rem 2rem; background-color: #28a745; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 700; }
.btn-publish:disabled { background-color: #a5d6a7; cursor: not-allowed; }
.btn-clear { padding: .8rem 1.5rem; background-color: #6c757d; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 500; }
.btn-clear:hover { background-color: #5a6268; }

/* PESQUISA */
.search-wrapper { position: relative; }
.search-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ccc; max-height: 250px; overflow-y: auto; z-index: 10; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
.search-dropdown ul { list-style: none; margin: 0; padding: 0; }
.search-dropdown li { padding: 0.8rem; cursor: pointer; border-bottom: 1px solid #f0f0f0; }
.search-dropdown li:hover { background: #f0f0f0; }

/* PREVIEW */
.news-preview { max-width: 1000px; margin: 2rem auto; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; padding-bottom: 2rem; }
.preview-header { padding: 2rem; }
.preview-title { font-size: 2.5rem; font-weight: 800; line-height: 1.1; margin-bottom: 0.5rem; }
.preview-subtitle { color: #009dc4; font-size: 1.2rem; }
.preview-meta { margin-top: 1rem; color: #888; display: flex; gap: 1rem; font-size: 0.9rem; }
.preview-content { padding: 0 2rem; font-size: 1.1rem; line-height: 1.6; }
.cover-image { width: 100%; max-height: 400px; object-fit: cover; }
.image-preview { max-width: 60%; height: auto; margin: 1rem auto; display: block; }
.fieldset-image {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}


/* CARDS NO PREVIEW */
:deep(.resource-card) { display: flex; align-items: center; background: #f8f9fa; border: 1px solid #e9ecef; border-left: 4px solid #007bff; padding: 1rem; margin: 1.5rem 0; border-radius: 4px; }
:deep(.resource-card.notebook) { border-left-color: #ffca28; background: #fffbf0; }
:deep(.resource-card.script) { border-left-color: #594099; background: #f6f4fa; }
:deep(.resource-card.document) { border-left-color: #17a2b8; background: #eef9fb; }
:deep(.resource-card.data) { border-left-color: #28a745; background: #f0fff4; }
:deep(.resource-card.link-card) { border-left-color: #6c757d; background: #fff; }
:deep(.resource-icon) { font-size: 2rem; margin-right: 1rem; }
:deep(.resource-info) { display: flex; flex-direction: column; width: 100%; }
:deep(.resource-links) { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
:deep(.resource-link) { font-size: 0.85rem; padding: 4px 8px; border-radius: 4px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; }
:deep(.resource-link.raw) { background: #eee; color: #333; }
:deep(.resource-link.colab) { background: #f9ab00; color: #fff; }
:deep(.resource-link.nbviewer) { background: #e67e22; color: #fff; }

/* ESTILOS DE MÍDIA INCORPORADA */
:deep(.preview-content figure) { margin: 2rem auto; text-align: center; }
:deep(.preview-content figcaption) { margin-top: 0.75rem; color: #6c757d; font-size: 0.9rem; font-style: italic; }
:deep(.preview-content img) { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
:deep(.preview-content video) { max-width: 800px; width: 80%; height: auto; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); background-color: #000; outline: none; }
:deep(.preview-content audio) { width: 100%; max-width: 600px; margin: 1em auto; display: block; accent-color: #007bff; }

/* ZONA DE PERIGO */
.danger-zone { margin-top: 2rem; border: 2px solid #dc3545; background: #fff8f8; padding: 1.5rem; border-radius: 8px; }
.danger-content { display: flex; justify-content: space-between; align-items: center; }
.btn-delete { background: #dc3545; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 4px; cursor: pointer; }

/* RESPONSIVO */
@media (max-width: 1000px) {
  .content-section { padding: .5rem; }
  .form-container { padding: .2rem; }
}
@media (max-width: 768px) {
  .content-section { padding: 0.1rem; }
  .form-container { padding: 0.2rem; }
  .form-grid { grid-template-columns: 1fr; }
  .resource-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
  .danger-content { flex-direction: column; gap: 1rem; text-align: center; }

  .image-preview { max-width: 40%; height: auto; margin: 1rem auto; display: block; }

  .single-button-toolbar { flex-direction: column; align-items: flex-start; }
  .toolbar-hint { margin-top: 10px; }
  .editor-format-buttons { margin-left: 0; margin-top: 10px; width: 100%; justify-content: flex-start; }
  .editor-container { height: 400px; }

  .form-actions { justify-content: center; }
  .form-actions button { width: 100%; max-width: 300px; }
}

@media (max-width: 480px) {
  .editor-container { height: 300px; }
  .image-preview { max-width: 100%; }
}
</style>