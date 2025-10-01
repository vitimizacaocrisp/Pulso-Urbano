<template>
  <div>
    <DataVisualizationModal
        v-if="selectedFileForModal"
        :file="selectedFileForModal"
        @close="closeDataModal"
    />

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
           <div class="content-toolbar">
             <button type="button" @click="triggerImageUpload" class="toolbar-btn">+ Inserir Imagem</button>
             <button type="button" @click="triggerAudioUpload" class="toolbar-btn">+ Inserir Áudio</button>
             <button type="button" @click="triggerVideoUpload" class="toolbar-btn">+ Inserir Vídeo</button>
             <input type="file" ref="imageUploader" @change="uploadAndInsertImage" style="display: none;" accept="image/*" multiple>
             <input type="file" ref="audioUploader" @change="uploadAndInsertAudio" style="display: none;" accept="audio/*" multiple>
             <input type="file" ref="videoUploader" @change="uploadAndInsertVideo" style="display: none;" accept="video/*" multiple>
           </div>
           <textarea id="content" ref="contentTextArea" v-model="newAnalysis.content" rows="15" required></textarea>
         </div>
       </fieldset>

       <fieldset>
         <legend>Anexos e Ficheiros de Referência</legend>
         <div class="form-group">
           <label for="coverImage">Imagem de Capa <span class="required">*</span></label>
           <input type="file" id="coverImage" @change="handleFileSelection($event, 'coverImage')" accept="image/*" required>
           <div v-if="newAnalysis.coverImage && newAnalysis.coverImage.name" class="file-name-preview" style="margin-top:.5rem;font-size:.9rem;color:#333;">
             Arquivo: {{ newAnalysis.coverImage.name }}
           </div>
           <img v-if="imagePreviewUrl" :src="imagePreviewUrl" alt="Pré-visualização da imagem de capa" class="image-preview" />
         </div>
         <div class="form-group">
           <label for="documentFiles">Documentos Originais (PDF/Word)</label>
           <input type="file" id="documentFiles" @change="handleFileSelection($event, 'documentFiles')" accept=".pdf,.doc,.docx" multiple>
           <div v-if="newAnalysis.documentFiles.length > 0" class="file-list">
             <div v-for="(file, index) in newAnalysis.documentFiles" :key="index" class="file-list-item">
               <span>{{ file.name }}</span>
               <button type="button" @click="removeFile(index, 'documentFiles')" class="btn-remove-file">×</button>
             </div>
           </div>
         </div>
         <div class="form-group">
           <label for="dataFiles">Ficheiros de Dados (CSV/Excel)</label>
           <input type="file" id="dataFiles" @change="handleFileSelection($event, 'dataFiles')" accept=".csv,.xls,.xlsx" multiple>
           <div v-if="newAnalysis.dataFiles.length > 0" class="file-list">
             <div v-for="(file, index) in newAnalysis.dataFiles" :key="index" class="file-list-item">
               <span>{{ file.name }}</span>
               <button type="button" @click="removeFile(index, 'dataFiles')" class="btn-remove-file">×</button>
             </div>
           </div>
         </div>
         <div class="form-group">
           <label for="referenceLinks">Links de Referência</label>
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
      <div class="preview-content" v-html="renderedContent"></div>
      <div v-if="newAnalysis.referenceLinks || newAnalysis.documentFiles.length > 0 || newAnalysis.dataFiles.length > 0">
        <h3 class="preview-section-title">Referências e Anexos:</h3>
        
        <ul class="preview-links" v-if="newAnalysis.referenceLinks">
            <li v-for="(link, idx) in (newAnalysis.referenceLinks || '').split('\n').filter(l => l.trim() !== '')" :key="idx">
            <a :href="link.startsWith('http') ? link : `//${link}`" target="_blank" rel="noopener noreferrer">{{ link }}</a>
            </li>
        </ul>

        <div class="preview-attachments">
            <div v-if="newAnalysis.documentFiles.length > 0" class="attachment-group">
                <strong>Documentos Originais:</strong>
                <ul>
                    <li v-for="doc in newAnalysis.documentFiles" :key="doc.name">{{ doc.name }}</li>
                </ul>
            </div>
            
            <div v-if="newAnalysis.dataFiles.length > 0" class="attachment-group">
                <strong>Ficheiros de Dados:</strong>
                <ul>
                    <li v-for="file in newAnalysis.dataFiles" :key="file.name" class="data-file-item">
                        <span>{{ file.name }}</span>
                        <button type="button" @click="openDataModal(file)" class="btn-visualizar">Visualizar Dados</button>
                    </li>
                </ul>
            </div>
        </div>
    </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue';
import { marked } from 'marked';
import axios from 'axios';
import { openDB } from 'idb';
import DataVisualizationModal from '../../components/DataVisualizationModal.vue';

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
const selectedFileForModal = ref(null);

const imageUploader = ref(null);
const audioUploader = ref(null);
const videoUploader = ref(null);
const contentTextArea = ref(null);

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
  coverImage: null,
  documentFiles: [],
  dataFiles: []
});

const newAnalysis = ref(getInitialAnalysisState());

function randomSuffix() {
  return Math.floor(Math.random() * 1e6).toString();
}

const renderedContent = computed(() => {
  let processedContent = newAnalysis.value.content;
  if (contentImages.value.size > 0) {
    for (const [placeholderId, mediaData] of contentImages.value.entries()) {
      if (mediaData.blobUrl) {
        const placeholderRegex = new RegExp(placeholderId.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
        processedContent = processedContent.replace(placeholderRegex, mediaData.blobUrl);
      }
    }
  }
  return processedContent ? marked(processedContent) : '<p><em>Comece a escrever para ver a pré-visualização...</em></p>';
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

  draftData.documentFiles = await Promise.all(draftData.documentFiles.map((file, i) => processFile(file, `doc_${i}`)));
  draftData.dataFiles = await Promise.all(draftData.dataFiles.map((file, i) => processFile(file, `data_${i}`)));

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

  draftData.documentFiles = (await Promise.all(draftData.documentFiles.map(reconstructFile))).filter(Boolean);
  draftData.dataFiles = (await Promise.all(draftData.dataFiles.map(reconstructFile))).filter(Boolean);

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

// ---- UPLOAD DE ARQUIVOS ----
const handleFileSelection = (event, fieldName) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  // Lógica para a imagem de capa (substitui a atual)
  if (fieldName === 'coverImage') {
    if (imagePreviewUrl.value) {
        URL.revokeObjectURL(imagePreviewUrl.value);
    }
    // A variável correta depende do componente, use a que corresponde:
    // Para o componente de EDIÇÃO:
    // editingAnalysis.value.coverImage = files[0];
    
    // Para o componente de CRIAÇÃO:
    newAnalysis.value.coverImage = files[0];

    imagePreviewUrl.value = URL.createObjectURL(files[0]);

  } else {
    // Lógica para múltiplos arquivos (adiciona à lista existente)
    // Para o componente de EDIÇÃO:
    // editingAnalysis.value[fieldName] = [...editingAnalysis.value[fieldName], ...Array.from(files)];

    // Para o componente de CRIAÇÃO:
    newAnalysis.value[fieldName] = [...newAnalysis.value[fieldName], ...Array.from(files)];
  }
  // A linha 'event.target.value = null;' foi removida daqui para corrigir o bug visual.
};


const removeFile = (index, fieldName) => {
  newAnalysis.value[fieldName].splice(index, 1);
};

const triggerImageUpload = () => imageUploader.value.click();
const triggerAudioUpload = () => audioUploader.value.click();
const triggerVideoUpload = () => videoUploader.value.click();

// ---- INSERIR MÍDIA NO TEXTO ----
const insertMediaIntoTextarea = (htmlToInsert) => {
  const textarea = contentTextArea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  newAnalysis.value.content = newAnalysis.value.content.substring(0, start) + htmlToInsert + newAnalysis.value.content.substring(end);
};

const uploadAndInsertImage = (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  let htmlToInsert = '';
  for (const file of files) {
    const placeholderId = `placeholder_${Date.now()}_${randomSuffix()}`;
    contentImages.value.set(placeholderId, { file, blobUrl: URL.createObjectURL(file) });
    htmlToInsert += `
<figure style="text-align: center;">
  <img src="${placeholderId}" alt="${file.name}" style="width: 50%; height: auto;">
  <figcaption><em>espaço para legenda</em></figcaption>
</figure>
`;
  }
  insertMediaIntoTextarea(htmlToInsert);
  event.target.value = null;
};

const uploadAndInsertAudio = (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  let htmlToInsert = '';
  for (const file of files) {
    const placeholderId = `audio_placeholder_${Date.now()}_${randomSuffix()}`;
    contentImages.value.set(placeholderId, { file, blobUrl: URL.createObjectURL(file) });
    htmlToInsert += `
<figure class="audio-figure">
  <audio controls src="${placeholderId}"></audio>
  <figcaption><em>espaço para legenda</em></figcaption>
</figure>
`;
  }
  insertMediaIntoTextarea(htmlToInsert);
  event.target.value = null;
};

const uploadAndInsertVideo = (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  let htmlToInsert = '';
  for (const file of files) {
    const placeholderId = `video_placeholder_${Date.now()}_${randomSuffix()}`;
    contentImages.value.set(placeholderId, { file, blobUrl: URL.createObjectURL(file) });
    htmlToInsert += `
<figure class="video-figure">
  <video controls src="${placeholderId}"></video>
  <figcaption><em>espaço para legenda</em></figcaption>
</figure>
`;
  }
  insertMediaIntoTextarea(htmlToInsert);
  event.target.value = null;
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
  if(document.getElementById('documentFiles')) document.getElementById('documentFiles').value = null;
  if(document.getElementById('dataFiles')) document.getElementById('dataFiles').value = null;
};

// ---- NOVA FUNÇÃO: CONFIRMAR E LIMPAR ----
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
  for (const [placeholder, data] of contentImages.value.entries()) {
    if (data.blobUrl) {
      const regex = new RegExp(data.blobUrl.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
      finalContent = finalContent.replace(regex, placeholder);
    }
  }

  const dataToSend = { ...newAnalysis.value, content: finalContent };
  Object.entries(dataToSend).forEach(([key, value]) => {
    if (!['coverImage', 'documentFiles', 'dataFiles'].includes(key)) {
      formData.append(key, value);
    }
  });

  if (dataToSend.coverImage) formData.append('coverImage', dataToSend.coverImage);
  dataToSend.documentFiles.forEach(file => formData.append('documentFiles', file));
  dataToSend.dataFiles.forEach(file => formData.append('dataFiles', file));
  contentImages.value.forEach((mediaData, placeholder) => formData.append(placeholder, mediaData.file));
  
  try {
    const token = localStorage.getItem('authToken');
    const apiUrl = 'http://localhost:3000' || process.env.VUE_APP_API_URL;
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

const openDataModal = (file) => { selectedFileForModal.value = file; };
const closeDataModal = () => { selectedFileForModal.value = null; };

</script>

<style scoped>
/* ESTILOS GERAIS DO FORMULÁRIO */
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
.content-toolbar { background-color: #f8f9fa; padding: .5rem; border: 1px solid #ccc; border-bottom: none; border-top-left-radius: 4px; border-top-right-radius: 4px; }
.toolbar-btn { background-color: #6c757d; color: #fff; border: none; padding: .4rem .8rem; border-radius: 4px; cursor: pointer; margin-right: 0.5rem; }
#content { border-top-left-radius: 0; border-top-right-radius: 0; }

/* --- ESTILOS PARA OS BOTÕES DE AÇÃO --- */
.form-actions { display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 1rem; }
.btn-publish { padding: .8rem 2rem; background-color: #28a745; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 700; }
.btn-publish:disabled { background-color: #a5d6a7; cursor: not-allowed; }
.btn-clear { padding: .8rem 1.5rem; background-color: #6c757d; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 500; }
.btn-clear:hover { background-color: #5a6268; }

.image-preview { max-width: 200px; margin-top: 1rem; border-radius: 4px; border: 1px solid #ddd; }
.feedback-message { margin-top: 1.5rem; padding: 1rem; border-radius: 4px; font-weight: 500; }
.feedback-message.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.feedback-message.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
.file-list { margin-top: 1rem; border: 1px solid #e0e0e0; border-radius: 4px; padding: .5rem; }
.file-list-item { display: flex; justify-content: space-between; align-items: center; padding: .5rem; background-color: #f8f9fa; border-radius: 4px; margin-bottom: .5rem; }
.file-list-item:last-child { margin-bottom: 0; }
.btn-remove-file { background: 0 0; border: none; color: #dc3545; font-size: 1.5rem; line-height: 1; cursor: pointer; padding: 0 .5rem; }

/* ESTILOS DA PRÉ-VISUALIZAÇÃO */
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

/* --- NOVOS ESTILOS PARA ANEXOS NA PRÉ-VISUALIZAÇÃO --- */
.preview-attachments { padding: 0 2rem 2rem 2rem; }
.preview-attachments ul { padding-left: 20px; list-style: disc; }
.preview-attachments strong { font-weight: 600; }
.attachment-group { margin-top: 1.5rem; }
.data-file-item { 
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-left: -20px; /* Alinha com o texto acima, compensando o padding da lista */
  padding: 0.25rem 0;
}
.btn-visualizar {
  margin-left: 1rem;
  padding: 0.25rem 0.75rem;
  font-size: 0.85rem;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap; /* Impede que o texto do botão quebre linha */
}
.btn-visualizar:hover {
  background-color: #e0e0e0;
}

/* --- ESTILOS PARA MÍDIA E LEGENDAS --- */
:deep(.preview-content figure) { margin: 2rem auto; text-align: center; }
:deep(.preview-content figcaption) { margin-top: 0.75rem; color: #6c757d; font-size: 0.9rem; font-style: italic; }
:deep(.preview-content img) { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
:deep(.preview-content video) { max-width: 800px; width: 80%; height: auto; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); background-color: #000; outline: none; }
:deep(.preview-content audio) { width: 100%; max-width: 600px; margin: 1em auto; display: block; accent-color: #007bff; }


/* --- ESTILOS DE RESPONSIVIDADE --- */
@media (max-width: 768px) {
    main{
    padding: 0rem !important;
  }
  .dashboard-container {
    padding: 0rem !important;
  }
  .dashboard-main{
    padding: 0rem !important;
  }
  .main-header-bar {
    justify-content: center;
    text-align: center;
    padding: 0.8rem !important;
  }
  /* ALTERAÇÃO: Padding removido para mais espaço */
  .content-section {
    padding: 0;
  }
  .form-container, fieldset {
    padding: 1.5rem;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .form-actions {
    justify-content: center;
  }
  .form-actions button {
    width: 100%;
    max-width: 300px;
  }
}

@media (max-width: 800px) {
  .news-preview { max-width: 100%; border-radius: 0; }
  .cover-image { max-height: 200px; }
  .preview-header, .preview-description, .preview-content, .preview-section-title, .preview-links, .preview-attachments { padding-left: 1rem; padding-right: 1rem; }
  .preview-title { font-size: 2rem; }
}

@media (max-width: 500px) {
    .form-container, fieldset {
        padding: 1rem;
    }
    .news-preview { box-shadow: none; padding-bottom: 0.7rem; }
    .preview-title { font-size: 1.35rem; }
    .cover-image { max-height: 140px; }
    .preview-header, .preview-description, .preview-content, .preview-section-title, .preview-links, .preview-attachments { padding-left: 1rem; padding-right: 1rem; }
    .preview-description { font-size: 1rem; }
    .preview-content { font-size: 0.95rem; }
}
</style>