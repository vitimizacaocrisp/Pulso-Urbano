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

            <!-- Documentos e Dados (Movidos para cá) -->
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

    <!-- MODAL 2: INPUT DE URL OU UPLOAD (JÁ EXISTENTE, ADAPTADO) -->
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
            <!-- Desabilita upload para Link genérico -->
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
        <h1>Gestor de Conteúdo</h1>
        <p>Crie e publique novas páginas de análise.</p>
      </div>
      <div class="header-actions">
        <button type="button" @click="isPreviewMode = !isPreviewMode" class="btn-toggle-preview">
          {{ isPreviewMode ? '⬅️ Voltar a Editar' : '👁️ Visualizar Prévia' }}
        </button>
      </div>
    </header>

    <section v-if="!isPreviewMode" class="content-section">
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
             <input type="date" id="lastUpdate" v-model="newAnalysis.lastUpdate">
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
             <option>Educação</option>
             <option>Saúde</option>
             <option>Política</option>
             <option>Criminalidade</option>
             <option>Tecnologia e Inovação</option>
           </select>
         </div>
         <div class="form-group">
           <label for="description">Descrição Curta (para o card) <span class="required">*</span></label>
           <textarea id="description" v-model="newAnalysis.description" rows="3" required></textarea>
         </div>
       </fieldset>

       <fieldset>
         <legend>Conteúdo Principal</legend>
         <div class="form-group">
           <label for="content">Conteúdo Completo (suporta Markdown) <span class="required">*</span></label>
           
           <!-- TOOLBAR SIMPLIFICADA COM BOTÃO ÚNICO -->
           <div class="content-toolbar single-button-toolbar">
             <button type="button" @click="openResourceMenu" class="toolbar-main-btn">
               <span class="plus-icon">➕</span> Adicionar Arquivo / Recurso
             </button>
             <span class="toolbar-hint">Clique para adicionar imagens, vídeos, notebooks, documentos, planilhas, etc.</span>
           </div>

           <textarea id="content" ref="contentTextArea" v-model="newAnalysis.content" rows="15" required class="main-textarea"></textarea>
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
    <section v-else class="news-preview">
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
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue';
import { marked } from 'marked';
import axios from 'axios';
import { openDB } from 'idb';

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

const activeMediaType = ref(''); // 'image', 'audio', 'video', 'notebook', 'script', 'document', 'data', 'link'
const mediaInputType = ref('url'); // 'url' ou 'file'
const mediaUrlInput = ref('');
const mediaFileInputRef = ref(null);
const selectedMediaFile = ref(null);

const contentTextArea = ref(null);
const contentImages = ref(new Map());
const imagePreviewUrl = ref('');

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
  // documentFiles e dataFiles foram integrados ao fluxo de conteúdo via contentImages
});

const newAnalysis = ref(getInitialAnalysisState());

function randomSuffix() {
  return Math.floor(Math.random() * 1e6).toString();
}

// --- CONTROLE DOS MENUS E MODAIS ---
const openResourceMenu = () => {
    showResourceTypeMenu.value = true;
};

const closeResourceMenu = () => {
    showResourceTypeMenu.value = false;
};

const selectResourceType = (type) => {
    activeMediaType.value = type;
    showResourceTypeMenu.value = false; // Fecha o menu
    
    // Reseta estado do modal de input
    mediaInputType.value = 'url'; 
    mediaUrlInput.value = '';
    selectedMediaFile.value = null;
    if (mediaFileInputRef.value) mediaFileInputRef.value.value = '';
    
    showMediaModal.value = true; // Abre modal de input
};

const returnToMenu = () => {
    showMediaModal.value = false;
    showResourceTypeMenu.value = true;
};

const closeMediaModal = () => {
    showMediaModal.value = false;
};

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

const insertUrlMedia = (url, type) => {
    let htmlToInsert = '';
    
    // Tratamento específico para URLs
    if (type === 'image') {
        htmlToInsert = `
<figure style="text-align: center;">
  <img src="${url}" alt="Imagem externa" style="width: 50%; height: auto;">
  <figcaption><em>Legenda da imagem</em></figcaption>
</figure>`;
    } else if (type === 'audio') {
        htmlToInsert = `
<figure class="audio-figure">
  <audio controls src="${url}"></audio>
  <figcaption><em>Áudio externo</em></figcaption>
</figure>`;
    } else if (type === 'video') {
        htmlToInsert = `
<figure class="video-figure">
  <video controls src="${url}"></video>
  <figcaption><em>Vídeo externo</em></figcaption>
</figure>`;
    } else if (type === 'notebook') {
        // Lógica de Notebook do GitHub (Raw -> NbViewer/Colab)
        const nbViewerUrl = `https://nbviewer.org/urls/${url.replace(/^https?:\/\//, '')}`;
        let colabUrl = '';
        if (url.includes('github') || url.includes('raw.githubusercontent.com')) {
             const parts = url.split('/');
             let userIndex = parts.findIndex(p => p === 'raw.githubusercontent.com' || p === 'github.com');
             if (userIndex !== -1 && parts.length >= userIndex + 3) {
                 const user = parts[userIndex + 1];
                 const repo = parts[userIndex + 2];
                 let rest = parts.slice(userIndex + 3).join('/');
                 if (rest.startsWith('refs/heads/')) rest = rest.replace('refs/heads/', '');
                 if (rest.startsWith('blob/')) rest = rest.replace('blob/', '');
                 colabUrl = `https://colab.research.google.com/github/${user}/${repo}/blob/${rest}`;
             }
        }

        htmlToInsert = `
<div class="resource-card notebook">
  <div class="resource-icon">🐍</div>
  <div class="resource-info">
    <strong>Notebook Python</strong>
    <div class="resource-links">
        <a href="${url}" target="_blank" rel="noopener noreferrer" class="resource-link raw" title="Baixar JSON">📄 JSON</a>
        ${colabUrl ? `<a href="${colabUrl}" target="_blank" rel="noopener noreferrer" class="resource-link colab" title="Executar no Colab">🚀 Colab</a>` : ''}
        <a href="${nbViewerUrl}" target="_blank" rel="noopener noreferrer" class="resource-link nbviewer" title="Visualizar NbViewer">👀 NbViewer</a>
    </div>
  </div>
</div>`;
    } else if (type === 'script') {
        htmlToInsert = `
<div class="resource-card script">
  <div class="resource-icon">📜</div>
  <div class="resource-info">
    <strong>Script</strong>
    <a href="${url}" target="_blank" rel="noopener noreferrer">Acessar Script</a>
  </div>
</div>`;
    } else if (type === 'document') {
        htmlToInsert = `
<div class="resource-card document">
  <div class="resource-icon">📄</div>
  <div class="resource-info">
    <strong>Documento de Referência</strong>
    <a href="${url}" target="_blank" rel="noopener noreferrer">Acessar Documento</a>
  </div>
</div>`;
    } else if (type === 'data') {
        htmlToInsert = `
<div class="resource-card data">
  <div class="resource-icon">📊</div>
  <div class="resource-info">
    <strong>Arquivo de Dados</strong>
    <a href="${url}" target="_blank" rel="noopener noreferrer">Baixar Base de Dados</a>
  </div>
</div>`;
    } else if (type === 'link') {
        htmlToInsert = `
<div class="resource-card link-card">
  <div class="resource-icon">🔗</div>
  <div class="resource-info">
    <strong>Link de Referência</strong>
    <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>
  </div>
</div>`;
    }

    insertMediaIntoTextarea(htmlToInsert);
};

const insertFileMedia = (file, type) => {
    const placeholderId = `${type}_${Date.now()}_${randomSuffix()}`;
    contentImages.value.set(placeholderId, { file, blobUrl: URL.createObjectURL(file) });
    
    let htmlToInsert = '';

    if (type === 'image') {
        htmlToInsert = `
<figure style="text-align: center;">
  <img src="${placeholderId}" alt="${file.name}" style="width: 50%; height: auto;">
  <figcaption><em>Legenda: ${file.name}</em></figcaption>
</figure>`;
    } else if (type === 'audio') {
        htmlToInsert = `
<figure class="audio-figure">
  <audio controls src="${placeholderId}"></audio>
  <figcaption><em>Áudio: ${file.name}</em></figcaption>
</figure>`;
    } else if (type === 'video') {
        htmlToInsert = `
<figure class="video-figure">
  <video controls src="${placeholderId}"></video>
  <figcaption><em>Vídeo: ${file.name}</em></figcaption>
</figure>`;
    } else if (type === 'notebook') {
        htmlToInsert = `
<div class="resource-card notebook">
  <div class="resource-icon">🐍</div>
  <div class="resource-info">
    <strong>Notebook: ${file.name}</strong>
    <a href="${placeholderId}" download="${file.name}">⬇️ Baixar Notebook</a>
  </div>
</div>`;
    } else if (type === 'script') {
        htmlToInsert = `
<div class="resource-card script">
  <div class="resource-icon">📜</div>
  <div class="resource-info">
    <strong>Script: ${file.name}</strong>
    <a href="${placeholderId}" download="${file.name}">⬇️ Baixar Script</a>
  </div>
</div>`;
    } else if (type === 'document') {
        htmlToInsert = `
<div class="resource-card document">
  <div class="resource-icon">📄</div>
  <div class="resource-info">
    <strong>Documento: ${file.name}</strong>
    <a href="${placeholderId}" download="${file.name}">⬇️ Baixar Documento</a>
  </div>
</div>`;
    } else if (type === 'data') {
        htmlToInsert = `
<div class="resource-card data">
  <div class="resource-icon">📊</div>
  <div class="resource-info">
    <strong>Dados: ${file.name}</strong>
    <div class="resource-links">
        <a href="${placeholderId}" download="${file.name}" class="resource-link raw">⬇️ Baixar Arquivo</a>
        <button onclick="alert('Funcionalidade de visualização requer implementação específica')" class="resource-link nbviewer">👀 Visualizar</button>
    </div>
  </div>
</div>`;
    }

    insertMediaIntoTextarea(htmlToInsert);
};

const insertMediaIntoTextarea = (htmlToInsert) => {
  const textarea = contentTextArea.value;
  // Fallback se o ref não estiver pronto
  if (!textarea) {
      newAnalysis.value.content += '\n' + htmlToInsert;
      return;
  }
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = newAnalysis.value.content;
  
  newAnalysis.value.content = text.substring(0, start) + htmlToInsert + text.substring(end);
  
  // Recalibrar foco (opcional, mas bom para UX)
  setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + htmlToInsert.length, start + htmlToInsert.length);
  }, 10);
};

// --- LÓGICA DE RENDERIZAÇÃO DE CONTEÚDO ---
const renderedContent = computed(() => {
  if (!newAnalysis.value.content) return '<p><em>Comece a escrever para ver a pré-visualização...</em></p>';
  
  let processedContent = newAnalysis.value.content.trim();

  // Processa placeholders de mídia (Imagens, Audio, Video, Files)
  for (const [placeholderId, mediaData] of contentImages.value.entries()) {
    if (mediaData.blobUrl) {
      // Regex global para substituir todas as ocorrências do ID
      const placeholderRegex = new RegExp(placeholderId.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
      processedContent = processedContent.replace(placeholderRegex, mediaData.blobUrl);
    }
  }

  // Blocos HTML especiais
  if (processedContent.startsWith('```html') && processedContent.endsWith('```')) {
    return processedContent.replace(/^```html\s*/i, '').replace(/\s*```$/, '').trim();
  }
  
  const hasHTMLTags = /<[a-z][\s\S]*>/i.test(processedContent);
  const hasMarkdownSyntax = /^# |\*\*.*\*\*|__.*__|\[.*\]\(.*\)|\* .*|```/.test(processedContent);
  
  if (hasHTMLTags && !hasMarkdownSyntax) {
    return processedContent;
  }
  
  return marked(processedContent);
});

// ---- SALVAR RASCUNHO ----
const saveDraft = async () => {
  console.log("Salvando rascunho...");
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

  // Documentos e Dados agora são salvos via contentMediaMap
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
  console.log("Rascunho carregado.");
};

// ---- WATCH COM DEBOUNCE ----
let debounceTimer = null;
watch(newAnalysis, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(saveDraft, 2000);
}, { deep: true });

onMounted(() => {
  loadDraft();
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
onBeforeUnmount(cleanupBlobUrls);

// ---- VALIDAR FORM ----
const isFormInvalid = computed(() =>
  !newAnalysis.value.title ||
  !newAnalysis.value.tag ||
  !newAnalysis.value.description ||
  !newAnalysis.value.content ||
  !newAnalysis.value.author ||
  !newAnalysis.value.category ||
  !newAnalysis.value.coverImage
);

// ---- UPLOAD DE ARQUIVOS (Apenas Capa agora) ----
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

// ---- RESETAR FORM ----
const resetForm = async () => {
  await clearAllDraftFiles();
  localStorage.removeItem(DRAFT_KEY);
  cleanupBlobUrls();
  newAnalysis.value = getInitialAnalysisState();
  imagePreviewUrl.value = '';
  contentImages.value.clear();
  if(document.getElementById('coverImage')) document.getElementById('coverImage').value = null;
};

const confirmAndClearForm = async () => {
  if (window.confirm('Tem certeza que deseja limpar todo o formulário e os dados salvos? Esta ação não pode ser desfeita.')) {
    await resetForm();
    feedback.value = { message: 'Formulário e rascunho limpos com sucesso.', type: 'success' };
    setTimeout(() => { feedback.value = { message: '', type: '' }; }, 5000);
  }
};

// ---- PUBLICAR ----
const publishAnalysis = async () => {
  if (isFormInvalid.value) {
    feedback.value = { message: 'Por favor, preencha todos os campos obrigatórios.', type: 'error' };
    return;
  }
  isLoading.value = true;
  feedback.value = { message: '', type: '' };
  const formData = new FormData();

  let finalContent = newAnalysis.value.content;
  // Substitui blobs por placeholders antes do envio
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
  
  // Anexa todos os arquivos do mapa de mídia
  contentImages.value.forEach((mediaData, placeholder) => formData.append(placeholder, mediaData.file));
  
  try {
    const token = localStorage.getItem('authToken');
    const apiUrl = process.env.VUE_APP_API_URL || 'http://localhost:3000';
    const response = await axios.post(`${apiUrl}/api/admin/analyses`, formData, {
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

</script> 

<style scoped>
/* ESTILOS GERAIS */
.content-manager-wrapper {
    position: relative;
}

/* --- ESTILOS DO MODAL DE MENU (GRADE) --- */
.menu-content {
    max-width: 650px; /* Mais largo para a grade */
}
.menu-instruction {
    text-align: center;
    color: #666;
    margin-bottom: 1.5rem;
}
.resource-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 1rem; }
.resource-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 0.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
    height: 100%;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}
.resource-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    border-color: #007bff;
}
.resource-btn .icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
}
.resource-btn .label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #444;
    text-align: center;
}
/* Destaques opcionais para grupos de ícones */
.highlight-purple .icon { filter: drop-shadow(0 0 5px rgba(138, 43, 226, 0.2)); }
.highlight-blue .icon { filter: drop-shadow(0 0 5px rgba(0, 123, 255, 0.2)); }
.highlight-green .icon { filter: drop-shadow(0 0 5px rgba(40, 167, 69, 0.2)); }

.btn-back {
    padding: 0.5rem 1rem; border: none; background: transparent; color: #666; cursor: pointer; font-weight: 500;
}
.btn-back:hover { color: #333; text-decoration: underline; }

/* --- ESTILOS DO MODAL DE MÍDIA (JÁ EXISTENTES) --- */
.modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(0,0,0,0.5);
    display: flex; justify-content: center; align-items: center; z-index: 2000;
}
.modal-content { background: white; width: 90%; max-width: 500px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); overflow: hidden; }

.modal-header {
    background: #f8f9fa; padding: 1rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e0e0e0;
}
.modal-header h3 { margin: 0; font-size: 1.1rem; color: #333; }
.btn-close-modal { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666; }
.modal-body { padding: 1.5rem; }
.modal-tabs { display: flex; gap: 1rem; margin-bottom: 1.5rem; border-bottom: 1px solid #eee; }
.tab-btn {
    background: none; border: none; padding: 0.5rem 1rem; cursor: pointer;
    font-size: 0.95rem; color: #666; border-bottom: 2px solid transparent;
}
.tab-btn.active { color: #007bff; border-bottom: 2px solid #007bff; font-weight: 600; }
.input-section { margin-top: 1rem; }
.input-section label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
.modal-input { width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
.file-upload-box {
    border: 2px dashed #ccc; padding: 2rem; text-align: center; border-radius: 4px;
    cursor: pointer; transition: background 0.2s;
}
.file-upload-box:hover { background: #f9f9f9; }
.file-input-hidden { display: none; }
.file-upload-label { cursor: pointer; display: block; width: 100%; height: 100%; font-weight: 600; color: #007bff; }
.modal-footer {
    padding: 1rem; background: #f8f9fa; border-top: 1px solid #e0e0e0; display: flex; justify-content: flex-end; gap: 0.5rem;
}
.btn-cancel { padding: 0.5rem 1rem; border: 1px solid #ccc; background: #fff; border-radius: 4px; cursor: pointer; }
.btn-confirm { padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
.btn-confirm:hover { background: #0056b3; }


/* TOOLBAR SIMPLIFICADA */
.single-button-toolbar {
    background-color: #f8f9fa; 
    padding: 0.75rem 1rem; 
    border: 1px solid #ccc; 
    border-bottom: none; 
    border-top-left-radius: 4px; 
    border-top-right-radius: 4px;
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}
.toolbar-main-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: #007bff;
    color: white;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 30px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: background 0.2s;
}
.toolbar-main-btn:hover { background-color: #0056b3; }
.plus-icon { font-size: 1.1rem; }
.toolbar-hint { color: #666; font-size: 0.9rem; font-style: italic; }

.main-textarea { border-top-left-radius: 0; border-top-right-radius: 0; }

/* DEMAIS ESTILOS MANTIDOS */
.main-header-bar { background-color: #fff; padding: 1.5rem 2rem; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.header-content h1 { margin: 0; }
.header-content p { margin: 0; color: #6c757d; }
.btn-toggle-preview { background-color: transparent; border: 1px solid #007bff; color: #007bff; padding: .5rem 1rem; border-radius: 5px; cursor: pointer; font-weight: 500; }
.btn-toggle-preview:hover { background-color: #007bff; color: #fff; }
.content-section { padding: 2rem; max-width: 1200px; margin: 0 auto; }
.form-container { background-color: #fff; padding: 2.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,.1); }
fieldset { border: 1px solid #e0e0e0; border-radius: 8px; padding: 2rem; margin-bottom: 2rem; }
legend { font-size: 1.2rem; font-weight: 600; padding: 0 .5rem; color: #333; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(250px,1fr)); gap: 1.5rem; }
.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; margin-bottom: .5rem; font-weight: 500; color: #555; }
.form-group input, .form-group textarea, .form-group select { width: 100%; padding: .75rem; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; box-sizing: border-box; }
.required { color: #dc3545; }

.form-actions { display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 1rem; }
.btn-publish { padding: .8rem 2rem; background-color: #28a745; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 700; }
.btn-publish:disabled { background-color: #a5d6a7; cursor: not-allowed; }
.btn-clear { padding: .8rem 1.5rem; background-color: #6c757d; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 500; }
.btn-clear:hover { background-color: #5a6268; }

.image-preview { max-width: 200px; margin-top: 1rem; border-radius: 4px; border: 1px solid #ddd; }
.feedback-message { margin-top: 1.5rem; padding: 1rem; border-radius: 4px; font-weight: 500; }
.feedback-message.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.feedback-message.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }

/* PRÉ-VISUALIZAÇÃO */
.news-preview { max-width: 1000px; margin: 1rem auto 3rem; background: #fff; border-radius: 10px; box-shadow: 0 6px 24px rgba(0,0,0,0.07); overflow: hidden; padding-bottom: 2rem; }
.preview-cover { width: 100%; }
.cover-image { width: 100%; max-height: 320px; object-fit: cover; display: block; }
.preview-header { padding: 1.5rem 2rem 0.5rem 2rem; text-align: left; }
.preview-title { font-size: 2.5rem; color: #222; margin-bottom: 0.25rem; line-height: 1.1; font-weight: 900; letter-spacing: -1px; }
.preview-subtitle { font-size: 1.25rem; color: #009dc4; font-weight: 500; margin-bottom: 0.25rem; }
.preview-meta { font-size: 0.92rem; color: #888; margin-bottom: 0.7rem; display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; }
.preview-category { background: #009dc4; color: #fff; font-weight: 600; padding: 0.1em 0.75em; border-radius: 36px; font-size: 0.9em; }
.preview-description { overflow-wrap: anywhere; padding: 0 2rem 1rem 2rem; font-size: 1.22rem; color: #333; font-weight: 400; }
.preview-content { padding: 1rem 2rem 0 2rem; font-size: 1.08rem; color: #212121; word-break: break-word; }
.preview-section-title { padding: 1.5rem 2rem 0.5rem 2rem; color: #009dc4; font-weight: bold; font-size: 1.1rem; }
.preview-links { padding: 0 2rem 1rem 2rem; list-style: disc inside; margin-bottom: 1rem; }
.preview-links a { color: #0079ba; text-decoration: underline; }

/* MÍDIA INCORPORADA */
:deep(.preview-content figure) { margin: 2rem auto; text-align: center; }
:deep(.preview-content figcaption) { margin-top: 0.75rem; color: #6c757d; font-size: 0.9rem; font-style: italic; }
:deep(.preview-content img) { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
:deep(.preview-content video) { max-width: 800px; width: 80%; height: auto; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); background-color: #000; outline: none; }
:deep(.preview-content audio) { width: 100%; max-width: 600px; margin: 1em auto; display: block; accent-color: #007bff; }

/* RECURSOS (NOTEBOOK/SCRIPT/DOC/DADOS) */
:deep(.resource-card) {
  display: flex; align-items: center; background-color: #f8f9fa; border: 1px solid #e9ecef;
  border-left: 4px solid #007bff; padding: 1rem; margin: 1.5rem 0; border-radius: 4px;
}
:deep(.resource-card.notebook) { border-left-color: #ffca28; background-color: #fffbf0; }
:deep(.resource-card.script) { border-left-color: #594099; background-color: #f6f4fa; }
:deep(.resource-card.document) { border-left-color: #17a2b8; background-color: #eef9fb; }
:deep(.resource-card.data) { border-left-color: #28a745; background-color: #f0fff4; }
:deep(.resource-card.link-card) { border-left-color: #6c757d; background-color: #f8f9fa; }

:deep(.resource-icon) { font-size: 2rem; margin-right: 1rem; }
:deep(.resource-info) { display: flex; flex-direction: column; width: 100%; }
:deep(.resource-info strong) { font-size: 1rem; margin-bottom: 0.5rem; }

/* Links de Recursos */
:deep(.resource-links) { display: flex; gap: 10px; flex-wrap: wrap; }
:deep(.resource-link) {
  font-size: 0.85rem; padding: 6px 12px; border-radius: 4px; text-decoration: none !important;
  font-weight: 600; transition: all 0.2s; display: inline-flex; align-items: center; cursor: pointer;
}
:deep(.resource-link:hover) { opacity: 0.9; transform: translateY(-1px); }
:deep(.resource-link.raw) { background-color: #f0f0f0; color: #444; border: 1px solid #ccc; }
:deep(.resource-link.colab) { background-color: #f9ab00; color: #fff; border: 1px solid #e39b00; }
:deep(.resource-link.nbviewer) { background-color: #e67e22; color: #fff; border: 1px solid #d35400; }

/* RESPONSIVIDADE */
@media (max-width: 768px) {
  .main-header-bar { justify-content: center; text-align: center; padding: 0.8rem !important; }
  .content-section { padding: 0; }
  .form-container, fieldset { padding: 1.5rem; }
  .form-grid { grid-template-columns: 1fr; }
  .form-actions { justify-content: center; }
  .form-actions button { width: 100%; max-width: 300px; }
  .content-toolbar { justify-content: center; }
  .resource-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 1rem; }
  .resource-btn { padding: 1rem 0.2rem; }
}

@media (max-width: 800px) {
  .news-preview { max-width: 100%; border-radius: 0; }
  .cover-image { max-height: 200px; }
  .preview-header, .preview-description, .preview-content, .preview-section-title, .preview-links { padding-left: 1rem; padding-right: 1rem; }
  .preview-title { font-size: 2rem; }
}

@media (max-width: 500px) {
    .form-container, fieldset { padding: 1rem; }
    .news-preview { box-shadow: none; padding-bottom: 0.7rem; }
    .preview-title { font-size: 1.35rem; }
    .cover-image { max-height: 140px; }
    .preview-header, .preview-description, .preview-content, .preview-section-title, .preview-links { padding-left: 1rem; padding-right: 1rem; }
    .preview-description { font-size: 1rem; }
    .preview-content { font-size: 0.95rem; }
}
</style>