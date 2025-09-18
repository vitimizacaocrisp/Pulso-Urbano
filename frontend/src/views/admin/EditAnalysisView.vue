<template>
  <div>
    <div v-if="isDeleteModalVisible" class="modal-overlay" @click="cancelDelete">
      <div class="modal-content" @click.stop>
        <h4>Confirmar Exclusão</h4>
        <p>Tem a certeza de que deseja excluir permanentemente a análise <strong>"{{ currentAnalysis.title }}"</strong>?</p>
        <p class="warning-text">Esta ação não pode ser desfeita e irá apagar todos os ficheiros associados.</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="cancelDelete">Cancelar</button>
          <button class="btn-confirm-delete" @click="confirmDelete">Sim, Excluir</button>
        </div>
      </div>
    </div>

    <header class="main-header-bar">
      <div class="header-content"><h1>Editar ou Excluir Análise</h1><p>Pesquise por uma análise existente para modificar ou remover.</p></div>
      <div class="header-actions">
        <button type="button" @click="isPreviewMode = !isPreviewMode" class="btn-toggle-preview" :disabled="!currentAnalysis" title="Selecione uma análise para ativar a pré-visualização">
          {{ isPreviewMode ? '⬅️ Voltar a Editar' : '👁️ Visualizar Prévia' }}
        </button>
      </div>
    </header>

    <Transition name="fade" mode="out-in">
      <section v-if="!isPreviewMode" class="content-section">
        <fieldset class="search-fieldset">
          <legend>Pesquisar Análise</legend>
          <div class="search-wrapper">
            <input type="text" v-model="searchQuery" placeholder="Pesquisar por título, tag ou autor..." @focus="loadAllAnalyses" @blur="hideDropdown" class="search-input">
            <div v-if="isLoading && !currentAnalysis" class="search-loader"></div>
            <div v-if="isDropdownVisible && filteredAnalyses.length > 0" class="search-dropdown">
              <ul><li v-for="analysis in filteredAnalyses" :key="analysis.id" @mousedown.prevent="selectAnalysis(analysis)">
                <strong>{{ analysis.title }}</strong><br><small>{{ analysis.author }} - {{ analysis.tag }}</small>
              </li></ul>
            </div>
             <div v-if="isDropdownVisible && filteredAnalyses.length === 0 && searchQuery" class="search-dropdown no-results">
               Nenhum resultado encontrado.
            </div>
          </div>
        </fieldset>

        <div v-if="feedback.message" :class="['feedback-message', feedback.type]" style="margin-top: 1rem;">{{ feedback.message }}</div>
        
        <form v-if="currentAnalysis" @submit.prevent="updateAnalysis" class="form-container">
          <h3 class="editing-title">Editando: {{ currentAnalysis.title }}</h3>
          
          <fieldset><legend>Metadados da Análise</legend>
            <div class="form-group"><label for="edit-title">Título <span class="required">*</span></label><input type="text" id="edit-title" v-model="currentAnalysis.title" required></div>
            <div class="form-grid">
              <div class="form-group"><label for="edit-tag">Tag <span class="required">*</span></label><input type="text" id="edit-tag" v-model="currentAnalysis.tag" required></div>
              <div class="form-group"><label for="edit-author">Autor(es) <span class="required">*</span></label><input type="text" id="edit-author" v-model="currentAnalysis.author" required></div>
              <div class="form-group"><label for="edit-researchDate">Data da Pesquisa <span class="required">*</span></label><input type="text" id="edit-researchDate" v-model="currentAnalysis.research_date" required></div>
            </div>
            <div class="form-group"><label for="edit-description">Descrição Curta <span class="required">*</span></label><textarea id="edit-description" v-model="currentAnalysis.description" rows="3" required></textarea></div>
          </fieldset>
          
          <fieldset><legend>Conteúdo Principal</legend>
             <div class="form-group"><label for="edit-content">Conteúdo (Markdown) <span class="required">*</span></label>
                <div class="content-toolbar"><button type="button" @click="triggerImageUpload" class="toolbar-btn">+ Inserir Nova Imagem</button><input type="file" ref="imageUploader" @change="uploadAndInsertImage" style="display: none;" accept="image/*"></div>
                <textarea id="edit-content" ref="contentTextArea" v-model="currentAnalysis.content" rows="15" required></textarea>
             </div>
          </fieldset>

          <fieldset><legend>Anexos e Ficheiros</legend>
            <div class="form-group"><label>Imagem de Capa</label>
                <div v-if="keptCoverImagePath" class="file-list-item">
                    <a :href="keptCoverImagePath" target="_blank">{{ keptCoverImagePath.split('/').pop() }}</a>
                    <button type="button" @click="keptCoverImagePath = null" class="btn-remove-file" title="Remover imagem de capa existente">×</button>
                </div>
                <label class="replace-label">{{ keptCoverImagePath ? 'Substituir por:' : 'Adicionar Imagem:' }}</label>
                <input type="file" @change="handleFileSelection($event, 'newCoverImage')" accept="image/*">
                <img v-if="imagePreviewUrl" :src="imagePreviewUrl" class="image-preview" alt="Pré-visualização da nova imagem">
            </div>
            <div class="form-group"><label>Documentos Originais (PDF/Word)</label>
                <div v-if="keptDocumentFiles.length > 0" class="file-list">
                    <div v-for="(file, index) in keptDocumentFiles" :key="file.path" class="file-list-item">
                        <a :href="file.path" target="_blank">{{ file.originalName }}</a>
                        <button type="button" @click="removeKeptFile(index, 'document')" class="btn-remove-file">×</button>
                    </div>
                </div>
                <label class="replace-label">Adicionar novos documentos:</label>
                <input type="file" @change="handleFileSelection($event, 'newDocumentFiles')" accept=".pdf,.doc,.docx" multiple>
                <div v-if="newDocumentFiles.length > 0" class="file-list new-files">
                    <div v-for="(file, index) in newDocumentFiles" :key="file.name" class="file-list-item">
                        <span>{{ file.name }}</span>
                        <button type="button" @click="removeNewFile(index, 'document')" class="btn-remove-file">×</button>
                    </div>
                </div>
            </div>
            <div class="form-group"><label>Ficheiros de Dados (CSV/Excel)</label>
                <div v-if="keptDataFiles.length > 0" class="file-list">
                    <div v-for="(file, index) in keptDataFiles" :key="file.path" class="file-list-item">
                        <a :href="file.path" target="_blank">{{ file.originalName }}</a>
                        <button type="button" @click="removeKeptFile(index, 'data')" class="btn-remove-file">×</button>
                    </div>
                </div>
                <label class="replace-label">Adicionar novos ficheiros de dados:</label>
                <input type="file" @change="handleFileSelection($event, 'newDataFiles')" accept=".csv,.xls,.xlsx" multiple>
                 <div v-if="newDataFiles.length > 0" class="file-list new-files">
                    <div v-for="(file, index) in newDataFiles" :key="file.name" class="file-list-item">
                        <span>{{ file.name }}</span>
                        <button type="button" @click="removeNewFile(index, 'data')" class="btn-remove-file">×</button>
                    </div>
                </div>
            </div>
            <div class="form-group"><label for="edit-referenceLinks">Links de Referência</label><textarea id="edit-referenceLinks" v-model="currentAnalysis.reference_links" rows="3"></textarea></div>
          </fieldset>

          <div class="form-actions"><button type="submit" class="btn-publish" :disabled="isLoading"><span v-if="isLoading">Salvando...</span><span v-else>Salvar Alterações</span></button></div>
        </form>
        
        <div v-if="currentAnalysis" class="danger-zone"><h4>Zona de Perigo</h4><div class="danger-content"><p>Excluir esta análise é uma ação permanente.</p><button @click="triggerDelete" class="btn-delete">Excluir Análise</button></div></div>
      </section>

      <AnalysisPreview v-else-if="currentAnalysis" 
          :analysis="previewData" 
          :coverImagePreviewUrl="imagePreviewUrl || keptCoverImagePath"
          @view-data="openDataModal" 
      />
      <div v-else class="placeholder-container"><p>Pesquise e selecione uma análise para visualizar a prévia.</p></div>
    </Transition>

     <DataVisualizationModal
        v-if="selectedFileForModal"
        :file="selectedFileForModal"
        @close="closeDataModal"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import AnalysisPreview from '../../components/AnalysisPreview.vue';
import DataVisualizationModal from '../../components/DataVisualizationModal.vue';

// --- Estado da UI ---
const isPreviewMode = ref(false);
const isLoading = ref(false);
const feedback = ref({ message: '', type: '' });
const isDeleteModalVisible = ref(false);
const selectedFileForModal = ref(null);

// --- Estado da Pesquisa ---
const allAnalyses = ref([]);
const isDropdownVisible = ref(false);
const searchQuery = ref('');
let hasLoadedOnce = false;

// --- Estado do Formulário ---
const currentAnalysis = ref(null);
const imageUploader = ref(null);
const contentTextArea = ref(null);

// --- Lógica de Ficheiros ---
const newCoverImage = ref(null);
const newDocumentFiles = ref([]);
const newDataFiles = ref([]);
const keptCoverImagePath = ref(null);
const keptDocumentFiles = ref([]);
const keptDataFiles = ref([]);
const contentImages = ref(new Map());
const imagePreviewUrl = ref('');

const API_BASE_URL = 'http://localhost:3000';
const route = useRoute();

// --- Computed Property para o Preview ---
const previewData = computed(() => {
    if (!currentAnalysis.value) return null;

    let processedContent = currentAnalysis.value.content;

    // ETAPA A: Corrige caminhos antigos (se houver algum salvo incorretamente)
    const badPathRegex = /(\/src\/uploads\/)/g;
    processedContent = processedContent.replace(badPathRegex, '/uploads/');

    // ETAPA B: Substitui placeholders de NOVAS imagens por URLs de pré-visualização locais (blob:)
    for (const [placeholderId, imageData] of contentImages.value.entries()) {
        const placeholderRegex = new RegExp(placeholderId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
        processedContent = processedContent.replace(placeholderRegex, imageData.blobUrl);
    }

    // ETAPA C: Garante que imagens com caminho relativo (legado) tenham o URL completo
    const relativeImagePathRegex = /(!\[.*?\]\()(\/uploads\/.*?)\)/g;
    processedContent = processedContent.replace(relativeImagePathRegex, `$1${API_BASE_URL}$2)`);

    const combinedDocuments = [...keptDocumentFiles.value, ...newDocumentFiles.value.map(f => ({ path: '', originalName: f.name }))];
    const combinedData = [...keptDataFiles.value, ...newDataFiles.value.map(f => ({ path: '', originalName: f.name }))];
    
    return {
        ...currentAnalysis.value,
        researchDate: currentAnalysis.value.research_date,
        referenceLinks: currentAnalysis.value.reference_links,
        content: processedContent,
        coverImage: newCoverImage.value || keptCoverImagePath.value,
        documentFiles: combinedDocuments,
        dataFiles: combinedData,
    };
});


// --- Funções de Pesquisa e Seleção ---
const filteredAnalyses = computed(() => {
  if (!searchQuery.value) return allAnalyses.value;
  const q = searchQuery.value.toLowerCase();
  return allAnalyses.value.filter(a => a.title?.toLowerCase().includes(q) || a.tag?.toLowerCase().includes(q) || a.author?.toLowerCase().includes(q));
});

const loadAllAnalyses = async () => {
    if (hasLoadedOnce) {
        isDropdownVisible.value = true;
        return;
    }
    isLoading.value = true;
    try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/api/admin/analyses-list`, { headers: { 'Authorization': `Bearer ${token}` } });
        allAnalyses.value = response.data.data?.analyses || [];
        hasLoadedOnce = true;
        isDropdownVisible.value = true;
    } catch (err) {
        feedback.value = { message: 'Falha ao carregar lista de análises.', type: 'error' };
    } finally {
        isLoading.value = false;
    }
};
const hideDropdown = () => setTimeout(() => { isDropdownVisible.value = false; }, 200);

const cleanupBlobUrls = () => {
    if (imagePreviewUrl.value) {
        URL.revokeObjectURL(imagePreviewUrl.value);
    }
    for (const imageData of contentImages.value.values()) {
        URL.revokeObjectURL(imageData.blobUrl);
    }
};

const selectAnalysis = async (analysis) => {
  isDropdownVisible.value = false;
  searchQuery.value = analysis.title;
  isLoading.value = true;
  cleanupBlobUrls();

  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_BASE_URL}/api/admin/analyses/${analysis.id}`, { headers: { 'Authorization': `Bearer ${token}` }});
    currentAnalysis.value = response.data.data;

    keptCoverImagePath.value = currentAnalysis.value.cover_image_path || null;
    keptDocumentFiles.value = currentAnalysis.value.document_file_path || [];
    keptDataFiles.value = currentAnalysis.value.data_file_path || [];
    
    newCoverImage.value = null;
    newDocumentFiles.value = [];
    newDataFiles.value = [];
    contentImages.value.clear();
    imagePreviewUrl.value = '';

  } catch (err) {
    feedback.value = { message: err.response?.data?.message || 'Falha ao carregar a análise.', type: 'error' };
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => { if(route.query.id) selectAnalysis({ id: route.query.id, title: `Análise #${route.query.id}`}); });

onBeforeUnmount(() => {
    cleanupBlobUrls();
});

// --- Funções de Manipulação de Ficheiros ---
const handleFileSelection = (event, fileType) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (fileType === 'newCoverImage') {
        if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value);
        newCoverImage.value = files[0];
        imagePreviewUrl.value = URL.createObjectURL(files[0]);
        keptCoverImagePath.value = null;
    } else if (fileType === 'newDocumentFiles') {
        newDocumentFiles.value.push(...files);
    } else if (fileType === 'newDataFiles') {
        newDataFiles.value.push(...files);
    }
    event.target.value = null;
};
const removeKeptFile = (index, type) => {
    if (type === 'document') keptDocumentFiles.value.splice(index, 1);
    if (type === 'data') keptDataFiles.value.splice(index, 1);
};
const removeNewFile = (index, type) => {
    if (type === 'document') newDocumentFiles.value.splice(index, 1);
    if (type === 'data') newDataFiles.value.splice(index, 1);
};

const triggerImageUpload = () => imageUploader.value.click();
const uploadAndInsertImage = (event) => {
  const file = event.target.files[0];
  if (!file || !currentAnalysis.value) return;
  const placeholderId = `contentImage_${Date.now()}_${file.name}`;
  const blobUrl = URL.createObjectURL(file);
  contentImages.value.set(placeholderId, { file, blobUrl });
  const imageMarkdown = `\n![${file.name}](${placeholderId})\n`;
  const textarea = contentTextArea.value;
  const start = textarea.selectionStart;
  currentAnalysis.value.content = currentAnalysis.value.content.substring(0, start) + imageMarkdown + currentAnalysis.value.content.substring(start);
  event.target.value = null;
};

// --- Funções de Ação ---
const updateAnalysis = async () => {
    if (!currentAnalysis.value) return;
    isLoading.value = true;
    feedback.value = { message: 'Salvando alterações...', type: 'info' };

    const formData = new FormData();
    formData.append('title', currentAnalysis.value.title);
    formData.append('tag', currentAnalysis.value.tag);
    formData.append('author', currentAnalysis.value.author);
    formData.append('researchDate', currentAnalysis.value.research_date);
    formData.append('description', currentAnalysis.value.description);
    formData.append('content', currentAnalysis.value.content);
    formData.append('reference_links', currentAnalysis.value.reference_links || '');

    if (newCoverImage.value) formData.append('newCoverImage', newCoverImage.value);
    newDocumentFiles.value.forEach(file => formData.append('newDocumentFiles', file));
    newDataFiles.value.forEach(file => formData.append('newDataFiles', file));
    contentImages.value.forEach((imageData, placeholder) => formData.append(placeholder, imageData.file));

    formData.append('keptCoverImagePath', keptCoverImagePath.value || '');
    formData.append('keptDocumentFiles', JSON.stringify(keptDocumentFiles.value));
    formData.append('keptDataFiles', JSON.stringify(keptDataFiles.value));

    try {
        const token = localStorage.getItem('authToken');
        const response = await axios.put(
            `${API_BASE_URL}/api/admin/analyses/${currentAnalysis.value.id}`,
            formData,
            { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }}
        );
        feedback.value = { message: response.data.message, type: 'success' };
        await selectAnalysis({ id: currentAnalysis.value.id, title: currentAnalysis.value.title });
    } catch (err) {
        feedback.value = { message: err.response?.data?.message || 'Falha ao atualizar.', type: 'error' };
    } finally {
        isLoading.value = false;
    }
};

const triggerDelete = () => { isDeleteModalVisible.value = true; };
const cancelDelete = () => { isDeleteModalVisible.value = false; };
const confirmDelete = async () => {
    isLoading.value = true;
    isDeleteModalVisible.value = false;
    try {
        const token = localStorage.getItem('authToken');
        const response = await axios.delete(
            `${API_BASE_URL}/api/admin/analyses/${currentAnalysis.value.id}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        feedback.value = { message: response.data.message, type: 'success' };
        currentAnalysis.value = null;
        searchQuery.value = '';
        hasLoadedOnce = false;
        allAnalyses.value = [];
    } catch (err) {
        feedback.value = { message: err.response?.data?.message || 'Falha ao excluir.', type: 'error' };
    } finally {
        isLoading.value = false;
    }
};

const openDataModal = (file) => {
    let actualFile;
    if (file instanceof File) {
        actualFile = file;
    } else {
        const newFileMatch = [...newDataFiles.value, ...newDocumentFiles.value].find(f => f.name === file.originalName);
        if(newFileMatch) {
            actualFile = newFileMatch;
        } else {
            alert("A pré-visualização interativa de dados só está disponível para ficheiros recém-adicionados na tela de edição.");
            return;
        }
    }
    selectedFileForModal.value = actualFile;
};
const closeDataModal = () => { selectedFileForModal.value = null; };
</script>

<style scoped>
/* Seus estilos .scoped completos aqui */
.btn-toggle-preview:disabled { border-color: #adb5bd; color: #adb5bd; cursor: not-allowed; }
.form-container { margin-top: 2rem; }
.editing-title { margin-bottom: 2rem; border-bottom: 1px solid #eee; padding-bottom: 1rem; }
.file-list { margin-top: 0.5rem; border: 1px solid #e0e0e0; border-radius: 4px; padding: 0.5rem; }
.file-list.new-files { border-color: #007bff; border-style: dashed; }
.file-list-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background-color: #f8f9fa; border-radius: 4px; margin-bottom: 0.5rem; }
.file-list-item:last-child { margin-bottom: 0; }
.file-list-item a { color: #0056b3; text-decoration: none; word-break: break-all; }
.file-list-item a:hover { text-decoration: underline; }
.replace-label { margin-top: 1rem; font-weight: 500; display: block; font-size: 0.9em; color: #555; }
.btn-remove-file { background: transparent; border: none; color: #dc3545; font-size: 1.5rem; line-height: 1; cursor: pointer; padding: 0 0.5rem; }
.danger-zone { margin-top: 2rem; border: 2px solid #dc3545; border-radius: 8px; padding: 1.5rem; }
.danger-zone h4 { color: #dc3545; margin-top: 0; }
.danger-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.btn-delete { background-color: #dc3545; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 4px; cursor: pointer; }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background-color: #fff; padding: 2rem; border-radius: 8px; width: 90%; max-width: 550px; text-align: center; }
.modal-actions { margin-top: 1.5rem; display: flex; justify-content: center; gap: 1rem; }
.btn-cancel, .btn-confirm-delete { padding: 0.6rem 1.5rem; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-cancel { background-color: #6c757d; color: white; }
.btn-confirm-delete { background-color: #dc3545; color: white; }
.placeholder-container { text-align: center; padding: 4rem; color: #6c757d; }
.search-dropdown.no-results { padding: 1rem; color: #6c757d; }
.image-preview {max-width: 200px; margin-top: 1rem; border-radius: 4px; border: 1px solid #ddd; }
.search-wrapper { position: relative; }
.search-input { width: 100%; padding: 0.75rem; font-size: 1rem; border: 1px solid #ccc; border-radius: 4px; }
.search-loader { position: absolute; right: 10px; top: 50%; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; transform: translateY(-50%); }
@keyframes spin { 0% { transform: translateY(-50%) rotate(0deg); } 100% { transform: translateY(-50%) rotate(360deg); } }
.search-dropdown { position: absolute; top: 100%; left: 0; right: 0; background-color: white; border: 1px solid #ccc; border-top: none; border-radius: 0 0 8px 8px; max-height: 300px; overflow-y: auto; z-index: 10; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
.search-dropdown ul { list-style: none; margin: 0; padding: 0; }
.search-dropdown li { padding: 0.8rem 1rem; cursor: pointer; border-bottom: 1px solid #f0f0f0; }
.search-dropdown li:last-child { border-bottom: none; }
.search-dropdown li:hover { background-color: #f0f0f0; }
.search-dropdown li small { color: #6c757d; }
.content-toolbar { background-color: #f8f9fa; padding: 0.5rem; border: 1px solid #ccc; border-bottom: none; border-top-left-radius: 4px; border-top-right-radius: 4px; }
.toolbar-btn { background-color: #6c757d; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; }
.feedback-message { margin-top: 1.5rem; padding: 1rem; border-radius: 4px; font-weight: 500; }
.feedback-message.success { background-color: #d4edda; color: #155724; }
.feedback-message.error { background-color: #f8d7da; color: #721c24; }
.feedback-message.info { background-color: #cce5ff; color: #004085; }
.form-actions {text-align: right;}
.btn-publish { padding: 0.8rem 2rem; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: bold; }
.required { color: #dc3545; }
.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #555; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
.main-header-bar { background-color: white; padding: 1.5rem 2rem; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center;}
.content-section { padding: 2rem; }
.search-fieldset { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; }
</style>