<template>
  <div>
    <DataVisualizationModal
        v-if="selectedFileForModal"
        :file="selectedFileForModal"
        @close="closeDataModal"
    />

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

    <section v-if="!isPreviewMode" class="content-section">
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
      
      <form v-if="editingAnalysis.id" @submit.prevent="updateAnalysis" class="form-container">
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
             <input type="date" id="lastUpdate" v-model="editingAnalysis.lastUpdate">
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
           <textarea id="content" ref="contentTextArea" v-model="editingAnalysis.content" rows="15" required></textarea>
         </div>
       </fieldset>

       <fieldset>
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

          <div class="form-group">
              <label>Documentos Originais (PDF/Word)</label>
              <label for="documentFiles" class="file-input-label">
                  <span class="file-input-button">Adicionar arquivos</span>
                  <span class="file-input-text">{{ documentFilesLabel }}</span>
              </label>
              <input type="file" id="documentFiles" @change="handleFileSelection($event, 'documentFiles')" accept=".pdf,.doc,.docx" multiple style="display: none;">
              <div v-if="editingAnalysis.documentFiles.length > 0" class="file-list">
                  <div v-for="(file, index) in editingAnalysis.documentFiles" :key="file.name + index" class="file-list-item">
                      <span>{{ file.name }}</span>
                      <button type="button" @click="removeFile(index, 'documentFiles')" class="btn-remove-file">×</button>
                  </div>
              </div>
          </div>

          <div class="form-group">
              <label>Ficheiros de Dados (CSV/Excel)</label>
              <label for="dataFiles" class="file-input-label">
                  <span class="file-input-button">Adicionar arquivos</span>
                  <span class="file-input-text">{{ dataFilesLabel }}</span>
              </label>
              <input type="file" id="dataFiles" @change="handleFileSelection($event, 'dataFiles')" accept=".csv,.xls,.xlsx" multiple style="display: none;">
              <div v-if="editingAnalysis.dataFiles.length > 0" class="file-list">
                  <div v-for="(file, index) in editingAnalysis.dataFiles" :key="file.name + index" class="file-list-item">
                      <span>{{ file.name }}</span>
                      <button type="button" @click="removeFile(index, 'dataFiles')" class="btn-remove-file">×</button>
                  </div>
              </div>
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

    <section v-else class="news-preview">
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
        <div v-if="editingAnalysis.referenceLinks || editingAnalysis.documentFiles.length > 0 || editingAnalysis.dataFiles.length > 0">
            <h3 class="preview-section-title">Referências e Anexos:</h3>
            
            <ul class="preview-links" v-if="editingAnalysis.referenceLinks">
                <li v-for="(link, idx) in (editingAnalysis.referenceLinks || '').split('\n').filter(l => l.trim() !== '')" :key="idx">
                <a :href="link.startsWith('http') ? link : `//${link}`" target="_blank" rel="noopener noreferrer">{{ link }}</a>
                </li>
            </ul>

            <div class="preview-attachments">
                <div v-if="editingAnalysis.documentFiles.length > 0" class="attachment-group">
                    <strong>Documentos Originais:</strong>
                    <ul>
                        <li v-for="doc in editingAnalysis.documentFiles" :key="doc.name">{{ doc.name }}</li>
                    </ul>
                </div>
                
                <div v-if="editingAnalysis.dataFiles.length > 0" class="attachment-group">
                    <strong>Ficheiros de Dados:</strong>
                    <ul>
                        <li v-for="file in editingAnalysis.dataFiles" :key="file.name" class="data-file-item">
                            <span>{{ file.name }}</span>
                            <button type="button" @click="openDataModal(file)" class="btn-visualizar">Visualizar Dados</button>
                        </li>
                    </ul>
                </div>
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { marked } from 'marked';
import axios from 'axios';
import DataVisualizationModal from '../../components/DataVisualizationModal.vue';

// --- CONFIGURAÇÕES ---
const API_BASE_URL = 'http://localhost:3000';

// --- ESTADO DA UI ---
const isPreviewMode = ref(false);
const isLoading = ref(false);
const isLoadingSearch = ref(false);
const feedback = ref({ message: '', type: '' });
const selectedFileForModal = ref(null);
const isDeleteModalVisible = ref(false);

// --- ESTADO DA PESQUISA ---
const allAnalyses = ref([]);
const isDropdownVisible = ref(false);
const searchQuery = ref('');
let hasLoadedOnce = false;

// --- ESTADO DO FORMULÁRIO DE EDIÇÃO ---
const getInitialAnalysisState = () => ({
  id: null, title: '', subtitle: '', tag: '', author: '', lastUpdate: '',
  studyPeriod: '', source: '', category: '', description: '', content: '', 
  referenceLinks: '', coverImage: null, documentFiles: [], dataFiles: []
});
const editingAnalysis = ref(getInitialAnalysisState());
const contentImages = ref(new Map());
const imagePreviewUrl = ref('');

// --- RASTREAMENTO DE ARQUIVOS ---
const originalServerFiles = ref(new Set()); // Guarda os caminhos dos arquivos originais do servidor
const filesToDelete = ref([]); // Guarda os caminhos dos arquivos a serem excluídos

// --- Refs de elementos do DOM ---
const imageUploader = ref(null);
const audioUploader = ref(null);
const videoUploader = ref(null);
const contentTextArea = ref(null);

// --- LÓGICA DE SELEÇÃO E CARREGAMENTO DE ANÁLISE ---
const fetchFile = async (url, defaultName) => {
    try {
        const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
        const response = await fetch(fullUrl);
        if (!response.ok) throw new Error(`Resposta de rede não foi OK para ${fullUrl}`);
        const blob = await response.blob();
        const file = new File([blob], defaultName, { type: blob.type });
        file.serverPath = url; // Adiciona o caminho original para rastreamento
        return file;
    } catch (error) {
        console.error(`Falha ao buscar arquivo de ${url}:`, error);
        feedback.value = { message: `Não foi possível carregar o anexo: ${defaultName}`, type: 'error'};
        return null;
    }
};

const selectAnalysis = async (analysisStub) => {
  isDropdownVisible.value = false;
  searchQuery.value = analysisStub.title;
  isLoading.value = true;
  cleanupBlobUrls();
  editingAnalysis.value = getInitialAnalysisState();
  filesToDelete.value = [];
  originalServerFiles.value.clear();

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
    feedback.value = { message: 'Análise carregada com sucesso.', type: 'success' };

  } catch (err) {
    feedback.value = { message: err.response?.data?.message || 'Falha ao carregar a análise do servidor.', type: 'error' };
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
    feedback.value = { message: 'Falha ao carregar lista de análises.', type: 'error' };
  } finally {
    isLoadingSearch.value = false;
  }
};

const hideDropdown = () => setTimeout(() => { isDropdownVisible.value = false; }, 200);

// --- LIFECYCLE ---
const route = useRoute();
const router = useRouter();
onMounted(() => { if (route.query.id) selectAnalysis({ id: route.query.id, title: `Análise #${route.query.id}` }); });
onBeforeUnmount(() => cleanupBlobUrls());

// --- AÇÕES DO FORMULÁRIO ---
const updateAnalysis = async () => {
    if (!editingAnalysis.value.id || isFormInvalid.value) {
      feedback.value = { message: 'Por favor, preencha todos os campos obrigatórios.', type: 'error' };
      return;
    }
    isLoading.value = true;
    feedback.value = { message: 'Salvando alterações...', type: 'info' };

    const formData = new FormData();
    Object.entries(editingAnalysis.value).forEach(([key, value]) => {
        if (!['coverImage', 'documentFiles', 'dataFiles', 'id'].includes(key)) {
            formData.append(key, value ?? '');
        }
    });

    if (editingAnalysis.value.coverImage instanceof File) formData.append('coverImage', editingAnalysis.value.coverImage);
    editingAnalysis.value.documentFiles.forEach(file => { if(file instanceof File) formData.append('documentFiles', file) });
    editingAnalysis.value.dataFiles.forEach(file => { if(file instanceof File) formData.append('dataFiles', file) });
    contentImages.value.forEach((mediaData, placeholder) => { if(mediaData.file instanceof File) formData.append(placeholder, mediaData.file) });
    
    // Envia a lista de arquivos para exclusão
    formData.append('filesToDelete', JSON.stringify(filesToDelete.value));

    try {
        const token = localStorage.getItem('authToken');
        const response = await axios.put(`${API_BASE_URL}/api/admin/analyses/${editingAnalysis.value.id}`, formData, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
        feedback.value = { message: response.data.message, type: 'success' };
        
        // Recarrega do servidor para ter os dados mais recentes
        await selectAnalysis({ id: editingAnalysis.value.id, title: editingAnalysis.value.title });

    } catch (err) {
        feedback.value = { message: err.response?.data?.message || 'Falha ao atualizar.', type: 'error' };
    } finally {
        isLoading.value = false;
    }
};

const confirmAndResetForm = async () => {
  if (window.confirm('Tem certeza que deseja resetar todas as alterações? Os dados originais da análise serão recarregados do servidor.')) {
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
        const response = await axios.delete(`${API_BASE_URL}/api/admin/analyses/${editingAnalysis.value.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        feedback.value = { message: response.data.message, type: 'success' };
        editingAnalysis.value = getInitialAnalysisState();
        searchQuery.value = '';
        hasLoadedOnce = false;
        allAnalyses.value = [];
        router.push({ path: '/admin/edit-analysis' });

    } catch (err) {
        feedback.value = { message: err.response?.data?.message || 'Falha ao excluir.', type: 'error' };
    } finally {
        isLoading.value = false;
    }
};

// --- FUNÇÕES HELPER ---
const isFormInvalid = computed(() => !editingAnalysis.value.title || !editingAnalysis.value.tag || !editingAnalysis.value.description || !editingAnalysis.value.content || !editingAnalysis.value.author || !editingAnalysis.value.category || !editingAnalysis.value.coverImage);

const renderedContent = computed(() => {
  let processedContent = editingAnalysis.value.content || '';
  for (const [placeholderId, mediaData] of contentImages.value.entries()) {
    if (mediaData.blobUrl) {
      const placeholderRegex = new RegExp(placeholderId.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
      processedContent = processedContent.replace(placeholderRegex, mediaData.blobUrl);
    }
  }
  const relativeImagePathRegex = /(!\[.*?\]\()(\/uploads\/.*?)\)/g;
  processedContent = processedContent.replace(relativeImagePathRegex, `$1${API_BASE_URL}$2)`);
  
  return processedContent ? marked(processedContent) : '<p><em>Comece a escrever para ver a pré-visualização...</em></p>';
});

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
  } else {
    editingAnalysis.value[fieldName].push(...files);
  }
  event.target.value = null; // Limpa para permitir selecionar o mesmo arquivo novamente
};

const removeFile = (index, fieldName) => {
  const fileToRemove = editingAnalysis.value[fieldName][index];
  
  if (fileToRemove.serverPath && originalServerFiles.value.has(fileToRemove.serverPath)) {
      filesToDelete.value.push(fileToRemove.serverPath);
  }

  if (fieldName === 'coverImage') {
      URL.revokeObjectURL(imagePreviewUrl.value);
      imagePreviewUrl.value = '';
      editingAnalysis.value.coverImage = null;
  } else {
      editingAnalysis.value[fieldName].splice(index, 1);
  }
};

const coverImageLabel = computed(() => editingAnalysis.value.coverImage ? `Capa: ${editingAnalysis.value.coverImage.name}` : 'Nenhum arquivo escolhido');
const documentFilesLabel = computed(() => editingAnalysis.value.documentFiles.length > 0 ? `${editingAnalysis.value.documentFiles.length} documento(s) na lista` : 'Nenhum arquivo escolhido');
const dataFilesLabel = computed(() => editingAnalysis.value.dataFiles.length > 0 ? `${editingAnalysis.value.dataFiles.length} ficheiro(s) na lista` : 'Nenhum arquivo escolhido');


function randomSuffix() { return Math.floor(Math.random() * 1e6).toString(); }
const triggerImageUpload = () => imageUploader.value.click();
const triggerAudioUpload = () => audioUploader.value.click();
const triggerVideoUpload = () => videoUploader.value.click();

const insertMediaIntoTextarea = (htmlToInsert) => {
  const textarea = contentTextArea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  editingAnalysis.value.content = editingAnalysis.value.content.substring(0, start) + htmlToInsert + editingAnalysis.value.content.substring(end);
};

const uploadAndInsertImage = (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  let htmlToInsert = '';
  for (const file of files) {
    const placeholderId = `placeholder_${Date.now()}_${randomSuffix()}`;
    contentImages.value.set(placeholderId, { file, blobUrl: URL.createObjectURL(file) });
    htmlToInsert += `\n<figure style="text-align: center;"><img src="${placeholderId}" alt="${file.name}" style="width: 50%; height: auto;"><figcaption><em>espaço para legenda</em></figcaption></figure>\n`;
  }
  insertMediaIntoTextarea(htmlToInsert);
  event.target.value = null;
};
const uploadAndInsertAudio = (event) => {
  const files = event.target.files; if (!files || files.length === 0) return; let htmlToInsert = '';
  for (const file of files) { const placeholderId = `audio_placeholder_${Date.now()}_${randomSuffix()}`; contentImages.value.set(placeholderId, { file, blobUrl: URL.createObjectURL(file) }); htmlToInsert += `\n<figure class="audio-figure"><audio controls src="${placeholderId}"></audio><figcaption><em>espaço para legenda</em></figcaption></figure>\n`; }
  insertMediaIntoTextarea(htmlToInsert); event.target.value = null;
};
const uploadAndInsertVideo = (event) => {
  const files = event.target.files; if (!files || files.length === 0) return; let htmlToInsert = '';
  for (const file of files) { const placeholderId = `video_placeholder_${Date.now()}_${randomSuffix()}`; contentImages.value.set(placeholderId, { file, blobUrl: URL.createObjectURL(file) }); htmlToInsert += `\n<figure class="video-figure"><video controls src="${placeholderId}"></video><figcaption><em>espaço para legenda</em></figcaption></figure>\n`; }
  insertMediaIntoTextarea(htmlToInsert); event.target.value = null;
};

const openDataModal = (file) => { selectedFileForModal.value = file; };
const closeDataModal = () => { selectedFileForModal.value = null; };

</script>

<style scoped>
/* ESTILOS GERAIS UNIFICADOS */
.main-header-bar { background-color: #fff; padding: 1.5rem 2rem; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.header-content h1 { margin: 0; }
.header-content p { margin: 0; color: #6c757d; }
.btn-toggle-preview { background-color: transparent; border: 1px solid #007bff; color: #007bff; padding: .5rem 1rem; border-radius: 5px; cursor: pointer; font-weight: 500; }
.btn-toggle-preview:hover { background-color: #007bff; color: #fff; }
.btn-toggle-preview:disabled { border-color: #adb5bd; color: #adb5bd; cursor: not-allowed; }
.content-section { padding: 2rem; max-width: 1200px; margin: 0 auto; }
.form-container, .search-fieldset { background-color: #fff; padding: 2.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,.1); }
.search-fieldset { margin-bottom: 2rem; }
.form-container { margin-top: 0; }
.editing-title { margin-bottom: 2rem; border-bottom: 1px solid #eee; padding-bottom: 1rem; font-size: 1.5rem; }
fieldset { display: contents; border: 1px solid #e0e0e0; border-radius: 8px; padding: 2rem; margin-bottom: 2rem; }
legend { font-size: 1.2rem; font-weight: 600; padding: 0 .5rem; color: #333; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(250px,1fr)); gap: 1.5rem; }
.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; margin-bottom: .5rem; font-weight: 500; color: #555; }
.form-group input, .form-group textarea, .form-group select { width: 100%; padding: .75rem; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; box-sizing: border-box; }
.required { color: #dc3545; }
.content-toolbar { background-color: #f8f9fa; padding: .5rem; border: 1px solid #ccc; border-bottom: none; border-top-left-radius: 4px; border-top-right-radius: 4px; }
.toolbar-btn { background-color: #6c757d; color: #fff; border: none; padding: .4rem .8rem; border-radius: 4px; cursor: pointer; margin-right: 0.5rem; }
#content { border-top-left-radius: 0; border-top-right-radius: 0; }
.form-actions { display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 1rem; }
.btn-publish { padding: .8rem 2rem; background-color: #28a745; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 700; }
.btn-publish:disabled { background-color: #a5d6a7; cursor: not-allowed; }
.btn-clear { padding: .8rem 1.5rem; background-color: #6c757d; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 500; }
.btn-clear:hover { background-color: #5a6268; }
.image-preview { max-width: 200px; margin-top: 1rem; border-radius: 4px; border: 1px solid #ddd; }
.feedback-message { margin: 1rem 0; padding: 1rem; border-radius: 4px; font-weight: 500; }
.feedback-message.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.feedback-message.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
.file-list { margin-top: 1rem; border: 1px solid #e0e0e0; border-radius: 4px; padding: .5rem; }
.file-list-item { display: flex; justify-content: space-between; align-items: center; padding: .5rem; background-color: #f8f9fa; border-radius: 4px; margin-bottom: .5rem; }
.file-list-item:last-child { margin-bottom: 0; }
.btn-remove-file { background: 0 0; border: none; color: #dc3545; font-size: 1.5rem; line-height: 1; cursor: pointer; padding: 0 .5rem; }

/* --- SEÇÃO CORRIGIDA --- */
/* Estilos para o container do input de arquivo personalizado */
.file-input-label {
  display: flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: .25rem;
  cursor: pointer;
  overflow: hidden; /* Força o conteúdo a ficar dentro dos limites */
}
.file-input-label:hover .file-input-button {
  background-color: #d2d8de;
}

/* Estilos para o botão falso */
.file-input-button {
  background-color: #e9ecef;
  border-right: 1px solid #ccc;
  padding: .5rem 1rem;
  white-space: nowrap;
  flex-shrink: 0; /* Impede que o botão seja espremido */
}

/* Estilos para o texto do nome do arquivo */
.file-input-text {
  padding: 0 1rem;
  color: #495057;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;   /* Faz o texto ocupar todo o espaço restante */
  min-width: 0;   /* Essencial para permitir que o elemento encolha e aplique a elipse */
}
/* --- FIM DA SEÇÃO CORRIGIDA --- */

/* ESTILOS DA PESQUISA */
.search-wrapper { position: relative; }
.search-input { width: 100%; }
.search-loader { position: absolute; right: 10px; top: 50%; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; transform: translateY(-50%); }
@keyframes spin { 0% { transform: translateY(-50%) rotate(0deg); } 100% { transform: translateY(-50%) rotate(360deg); } }
.search-dropdown { position: absolute; top: 100%; left: 0; right: 0; background-color: white; border: 1px solid #ccc; border-top: none; border-radius: 0 0 8px 8px; max-height: 300px; overflow-y: auto; z-index: 10; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
.search-dropdown ul { list-style: none; margin: 0; padding: 0; }
.search-dropdown li { padding: 0.8rem 1rem; cursor: pointer; border-bottom: 1px solid #f0f0f0; }
.search-dropdown li:last-child { border-bottom: none; }
.search-dropdown li:hover { background-color: #f0f0f0; }
.search-dropdown li small { color: #6c757d; }
.search-dropdown.no-results { padding: 1rem; color: #6c757d; }

/* ESTILOS DA ZONA DE PERIGO E MODAL */
.danger-zone { margin-top: 2rem; border: 2px solid #dc3545; border-radius: 8px; padding: 1.5rem; background-color: #fff8f8; }
.danger-zone h4 { color: #dc3545; margin-top: 0; }
.danger-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.btn-delete { background-color: #dc3545; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 4px; cursor: pointer; font-weight: 500; }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background-color: #fff; padding: 2rem; border-radius: 8px; width: 90%; max-width: 550px; text-align: center; }
.warning-text { color: #721c24; font-weight: 500; }
.modal-actions { margin-top: 1.5rem; display: flex; justify-content: center; gap: 1rem; }
.btn-cancel, .btn-confirm-delete { padding: 0.6rem 1.5rem; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-cancel { background-color: #6c757d; color: white; }
.btn-confirm-delete { background-color: #dc3545; color: white; }

/* ESTILOS DA PRÉ-VISUALIZAÇÃO */
.news-preview { max-width: 1000px; margin: 1rem auto 3rem; background: #fff; border-radius: 10px; box-shadow: 0 6px 24px rgba(0,0,0,0.07); overflow: hidden; padding-bottom: 2rem; }
.preview-cover { width: 100%; }
.cover-image { width: 100%; max-height: 320px; object-fit: cover; display: block; }
.preview-header { padding: 1.5rem 2rem 0.5rem 2rem; text-align: left; }
.preview-title { font-size: 2.5rem; color: #222; margin-bottom: 0.25rem; line-height: 1.1; font-weight: 900; letter-spacing: -1px; }
.preview-subtitle { font-size: 1.25rem; color: #009dc4; font-weight: 500; margin-bottom: 0.25rem; }
.preview-meta { font-size: 0.92rem; color: #888; margin-bottom: 0.7rem; display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; }
.preview-category { background: #009dc4; color: #fff; font-weight: 600; padding: 0.1em 0.75em; border-radius: 36px; font-size: 0.9em; }
.preview-description { padding: 0 2rem 1rem 2rem; font-size: 1.22rem; color: #333; font-weight: 400; }
.preview-content { padding: 1rem 2rem 0 2rem; font-size: 1.08rem; color: #212121; word-break: break-word; }
.preview-section-title { padding: 1.5rem 2rem 0.5rem 2rem; color: #009dc4; font-weight: bold; font-size: 1.1rem; }
.preview-links { padding: 0 2rem 1rem 2rem; list-style: disc inside; margin-bottom: 1rem; }
.preview-links a { color: #0079ba; text-decoration: underline; }
.preview-attachments { padding: 0 2rem 2rem 2rem; }
.preview-attachments ul { padding-left: 20px; list-style: disc; }
.preview-attachments strong { font-weight: 600; }
.attachment-group { margin-top: 1.5rem; }
.data-file-item { display: flex; justify-content: space-between; align-items: center; margin-left: -20px; padding: 0.25rem 0; }
.btn-visualizar { margin-left: 1rem; padding: 0.25rem 0.75rem; font-size: 0.85rem; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; white-space: nowrap; }
.btn-visualizar:hover { background-color: #e0e0e0; }
:deep(.preview-content figure) { margin: 2rem auto; text-align: center; }
:deep(.preview-content figcaption) { margin-top: 0.75rem; color: #6c757d; font-size: 0.9rem; font-style: italic; }
:deep(.preview-content img) { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
:deep(.preview-content video) { max-width: 800px; width: 80%; height: auto; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); background-color: #000; outline: none; }
:deep(.preview-content audio) { width: 100%; max-width: 600px; margin: 1em auto; display: block; accent-color: #007bff; }

/* ESTILOS DE RESPONSIVIDADE */
@media (max-width: 768px) {
  .content-section { padding: 0; }
  .form-container, .search-fieldset, fieldset { padding: 1.5rem; }
  .main-header-bar { justify-content: center; text-align: center; }
  .form-grid { grid-template-columns: 1fr; }
  .form-actions { justify-content: center; }
  .form-actions button { width: 100%; max-width: 300px; }
}
@media (max-width: 800px) {
  .news-preview { max-width: 100%; border-radius: 0; }
  .cover-image { max-height: 200px; }
  .preview-header, .preview-description, .preview-content, .preview-section-title, .preview-links, .preview-attachments { padding-left: 1rem; padding-right: 1rem; }
  .preview-title { font-size: 2rem; }
}
@media (max-width: 500px) {
  .form-container, .search-fieldset, fieldset { padding: 1rem; }
  .news-preview { box-shadow: none; padding-bottom: 0.7rem; }
  .preview-title { font-size: 1.35rem; }
  .cover-image { max-height: 140px; }
  .preview-header, .preview-description, .preview-content, .preview-section-title, .preview-links, .preview-attachments { padding-left: 1rem; padding-right: 1rem; }
  .preview-description { font-size: 1rem; }
  .preview-content { font-size: 0.95rem; }
}
</style>