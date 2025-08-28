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
      <div class="header-content">
        <h1>Editar ou Excluir Análise</h1>
        <p>Pesquise por uma análise existente para modificar ou remover.</p>
      </div>
      <div class="header-actions">
        <button 
          type="button" 
          @click="isPreviewMode = !isPreviewMode" 
          class="btn-toggle-preview"
          :disabled="!currentAnalysis"
          title="Pesquise e selecione uma análise para ativar a pré-visualização"
        >
          {{ isPreviewMode ? '⬅️ Voltar a Editar' : '👁️ Visualizar Prévia' }}
        </button>
      </div>
    </header>

    <Transition name="fade" mode="out-in">
      <section v-if="!isPreviewMode" class="content-section">
        <fieldset class="search-fieldset">
          <legend>Pesquisar Análise</legend>
          <div class="search-wrapper">
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Digite para pesquisar por título, tag ou autor..."
              @focus="loadAllAnalyses"
              @blur="hideDropdown"
              class="search-input"
            >
            <div v-if="isLoading && !currentAnalysis" class="search-loader"></div>
            <div v-if="isDropdownVisible && filteredAnalyses.length > 0" class="search-dropdown">
              <ul>
                <li v-for="analysis in filteredAnalyses" :key="analysis.id" @mousedown.prevent="selectAnalysis(analysis)">
                  <strong>{{ analysis.title }}</strong><br>
                  <small>{{ analysis.author }} - {{ analysis.tag }} ({{ analysis.created_date }})</small>
                </li>
              </ul>
            </div>
            <div v-if="isDropdownVisible && filteredAnalyses.length === 0 && searchQuery" class="search-dropdown no-results">
              Nenhum resultado encontrado.
            </div>
          </div>
        </fieldset>

        <div v-if="feedback.message" :class="['feedback-message', feedback.type]" style="margin-top: 1rem;">
          {{ feedback.message }}
        </div>
        
        <form v-if="currentAnalysis" @submit.prevent="updateAnalysis" class="form-container">
          <h3 class="editing-title">Editando Análise #{{ currentAnalysis.id }}: {{ currentAnalysis.title }}</h3>
          
          <fieldset>
            <legend>Metadados da Análise</legend>
            <div class="form-group">
              <label for="edit-title">Título da Análise <span class="required">*</span></label>
              <input type="text" id="edit-title" v-model="currentAnalysis.title" required>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label for="edit-tag">Tag <span class="required">*</span></label>
                <input type="text" id="edit-tag" v-model="currentAnalysis.tag" required>
              </div>
              <div class="form-group">
                <label for="edit-author">Autor(es) <span class="required">*</span></label>
                <input type="text" id="edit-author" v-model="currentAnalysis.author" required>
              </div>
              <div class="form-group">
                <label for="edit-researchDate">Data da Pesquisa <span class="required">*</span></label>
                <input type="text" id="edit-researchDate" v-model="currentAnalysis.research_date" required>
              </div>
            </div>
            <div class="form-group">
              <label for="edit-description">Descrição Curta <span class="required">*</span></label>
              <textarea id="edit-description" v-model="currentAnalysis.description" rows="3" required></textarea>
            </div>
          </fieldset>
          
          <fieldset>
            <legend>Conteúdo Principal</legend>
            <div class="content-toolbar">
                <button type="button" @click="triggerImageUpload" :disabled="isUploadingImage" class="toolbar-btn">
                    <span v-if="isUploadingImage">A carregar...</span>
                    <span v-else>+ Inserir Imagem</span>
                </button>
                <input 
                    type="file" 
                    ref="imageUploader" 
                    @change="uploadAndInsertImage" 
                    style="display: none;" 
                    accept="image/*"
                >
            </div>
            <textarea id="edit-content" v-model="currentAnalysis.content" rows="15" required></textarea>
          </fieldset>

          <fieldset>
            <legend>Anexos e Mídia</legend>
            <div class="form-grid">
              <div class="form-group">
                <label>Imagem de Capa</label>
                <div v-if="currentAnalysis.cover_image_path" class="current-media">
                  <img :src="getFullMediaPath(currentAnalysis.cover_image_path)" alt="Imagem de capa atual">
                  <span>{{ currentAnalysis.cover_image_path.split('/').pop() }}</span>
                </div>
                <label class="replace-label">Substituir Imagem:</label>
                <input type="file" @change="handleFileSelection($event, 'newCoverImage')" accept="image/*">
              </div>
              <div class="form-group">
                <label>Pesquisa Original (PDF/Word)</label>
                <div v-if="currentAnalysis.document_file_path" class="current-media">
                  <span>Ficheiro Atual: {{ currentAnalysis.document_file_path.split('/').pop() }}</span>
                </div>
                <label class="replace-label">Substituir Ficheiro:</label>
                <input type="file" @change="handleFileSelection($event, 'newDocumentFile')" accept=".pdf,.doc,.docx">
              </div>
              <div class="form-group">
                <label>Ficheiro de Dados (CSV/Excel)</label>
                <div v-if="currentAnalysis.data_file_path" class="current-media">
                  <span>Ficheiro Atual: {{ currentAnalysis.data_file_path.split('/').pop() }}</span>
                </div>
                <label class="replace-label">Substituir Ficheiro:</label>
                <input type="file" @change="handleFileSelection($event, 'newDataFile')" accept=".csv,.xls,.xlsx">
              </div>
            </div>
            <div class="form-group">
              <label for="edit-referenceLinks">Links de Referência</label>
              <textarea id="edit-referenceLinks" v-model="currentAnalysis.reference_links" rows="3"></textarea>
            </div>
          </fieldset>

          <div class="form-actions">
            <button type="submit" class="btn-publish" :disabled="isLoading">
              <span v-if="isLoading">Salvando...</span>
              <span v-else>Salvar Alterações</span>
            </button>
          </div>
        </form>
        
        <div v-if="currentAnalysis" class="danger-zone">
          <h4>Zona de Perigo</h4>
          <div class="danger-content">
            <p>Excluir esta análise é uma ação permanente.</p>
            <button @click="triggerDelete" class="btn-delete">Excluir Análise</button>
          </div>
        </div>
      </section>
      <section v-else class="content-section">
        <div class="content-header">
          <h2>Pré-visualização da Análise</h2>
        </div>
        <div class="markdown-preview">
          <h1>{{ currentAnalysis.title || 'Título da Análise' }}</h1>
          <p><strong>Tag:</strong> {{ currentAnalysis.tag || 'N/A' }}</p>
          <p><strong>Autor(es):</strong> {{ currentAnalysis.author || 'N/A' }}</p>
          <p><strong>Data da Pesquisa:</strong> {{ currentAnalysis.research_date || 'N/A' }}</p>
          <p><strong>Descrição:</strong> {{ currentAnalysis.description || 'N/A' }}</p>
          <hr>
          <h3>Conteúdo:</h3>
          <div v-html="renderedContent"></div>
          <hr v-if="currentAnalysis.reference_links">
          <h3 v-if="currentAnalysis.reference_links">Links de Referência:</h3>
          <ul v-if="currentAnalysis.reference_links">
            <li v-for="(link, index) in currentAnalysis.reference_links.split('\n').filter(l => l.trim() !== '')" :key="index">
              <a :href="link" target="_blank" rel="noopener noreferrer">{{ link }}</a>
            </li>
          </ul>
          <hr v-if="currentAnalysis.cover_image_path || currentAnalysis.document_file_path || currentAnalysis.data_file_path || newFiles.newCoverImage || newFiles.newDocumentFile || newFiles.newDataFile">
          <h3>Anexos:</h3>
          <p v-if="newFiles.newCoverImage"><strong>Nova Imagem de Capa:</strong> <a :href="imagePreviewUrl" target="_blank">Ver Imagem</a></p>
          <p v-else-if="currentAnalysis.cover_image_path"><strong>Imagem de Capa Atual:</strong> <a :href="getFullMediaPath(currentAnalysis.cover_image_path)" target="_blank">Ver Imagem</a></p>

          <p v-if="newFiles.newDocumentFile"><strong>Novo Documento Original:</strong> {{ newFiles.newDocumentFile.name }}</p>
          <p v-else-if="currentAnalysis.document_file_path"><strong>Documento Original Atual:</strong> {{ currentAnalysis.document_file_path.split('/').pop() }}</p>

          <p v-if="newFiles.newDataFile"><strong>Novo Ficheiro de Dados:</strong> {{ newFiles.newDataFile.name }}</p>
          <p v-else-if="currentAnalysis.data_file_path"><strong>Ficheiro de Dados Atual:</strong> {{ currentAnalysis.data_file_path.split('/').pop() }}</p>
        </div>
      </section>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { marked } from 'marked';


const route = useRoute();
const searchQuery = ref('');
const allAnalyses = ref([]);
const isDropdownVisible = ref(false);
const currentAnalysis = ref(null);
const isPreviewMode = ref(false);

// Refs para os *novos* ficheiros a serem enviados
const newFiles = ref({
    newCoverImage: null,
    newDocumentFile: null,
    newDataFile: null
});

const isLoading = ref(false);
const feedback = ref({ message: '', type: '' });
const isDeleteModalVisible = ref(false);

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

const setFeedback = (message, type, duration = 5000) => {
    feedback.value = { message, type };
    if (duration > 0) {
        setTimeout(() => { feedback.value = { message: '', type: '' }; }, duration);
    }
};

const renderedContent = computed(() => {
    if (currentAnalysis.value && currentAnalysis.value.content) {
        return marked(currentAnalysis.value.content);
    }
    return '';
});

const filteredAnalyses = computed(() => {
  if (!searchQuery.value) {
    return allAnalyses.value;
  }
  const lowerCaseQuery = searchQuery.value.toLowerCase();
  return allAnalyses.value.filter(analysis => 
    analysis.title.toLowerCase().includes(lowerCaseQuery) ||
    (analysis.tag && analysis.tag.toLowerCase().includes(lowerCaseQuery)) ||
    (analysis.author && analysis.author.toLowerCase().includes(lowerCaseQuery))
  );
});

let hasLoadedOnce = false;
const loadAllAnalyses = async () => {
  if (hasLoadedOnce) {
    isDropdownVisible.value = true;
    return;
  }
  isLoading.value = true;
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/api/admin/analyses-list`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Falha ao carregar a lista de análises.');
    const result = await response.json();
    allAnalyses.value = result.data;
    hasLoadedOnce = true;
    isDropdownVisible.value = true;
  } catch (err) {
    setFeedback(err.message, 'error');
  } finally {
    isLoading.value = false;
  }
};

const hideDropdown = () => {
    setTimeout(() => { isDropdownVisible.value = false; }, 200);
};

const selectAnalysis = async (analysis) => {
  isDropdownVisible.value = false;
  searchQuery.value = analysis.title;
  
  isLoading.value = true;
  feedback.value = { message: '', type: '' };

  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/api/admin/analyses/${analysis.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Falha ao carregar os dados completos da análise.');
    const result = await response.json();
    currentAnalysis.value = result.data;
  } catch (err) {
    setFeedback(err.message, 'error');
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
    // Se um ID for passado via query param (ex: do dashboard), carrega-o
    if(route.query.id) {
        selectAnalysis({ id: route.query.id, title: `Carregando Análise #${route.query.id}...`});
    }
});


const getFullMediaPath = (path) => {
    if(!path) return '';
    return `${API_BASE_URL}/${path}`;
};

const handleFileSelection = (event, fieldName) => {
    const file = event.target.files[0];
    newFiles.value[fieldName] = file || null;
};

const updateAnalysis = async () => {
    if (!currentAnalysis.value) return;
    isLoading.value = true;
    setFeedback('Salvando alterações...', 'info', 0);

    const formData = new FormData();
    
    // Adiciona todos os campos de texto
    for (const key in currentAnalysis.value) {
        if (currentAnalysis.value[key] !== null) {
            formData.append(key, currentAnalysis.value[key]);
        }
    }
    // Adiciona os ficheiros que foram substituídos
    for (const key in newFiles.value) {
        if (newFiles.value[key]) {
            formData.append(key, newFiles.value[key]);
        }
    }

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/admin/analyses/${currentAnalysis.value.id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao atualizar a análise.');
        }
        const result = await response.json();
        setFeedback(result.message, 'success');
        
    } catch (err) {
        setFeedback(err.message, 'error');
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
        const response = await fetch(`${API_BASE_URL}/api/admin/analyses/${currentAnalysis.value.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Falha ao excluir a análise.');
        const result = await response.json();
        setFeedback(result.message, 'success');
        currentAnalysis.value = null;
        searchQuery.value = '';
        hasLoadedOnce = false; // Força recarregar a lista na próxima busca
        allAnalyses.value = [];
    } catch (err) {
        setFeedback(err.message, 'error');
    } finally {
        isLoading.value = false;
    }
};

</script>

<style scoped>
.btn-toggle-preview:disabled {
  border-color: #adb5bd;
  color: #adb5bd;
  cursor: not-allowed;
  background-color: transparent;
}
.btn-toggle-preview {
  background-color: transparent;
  border: 1px solid #007bff;
  color: #007bff;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}
.btn-toggle-preview:hover {
    background-color: #007bff;
    color: white;
}
.content-toolbar { background-color: #f8f9fa; padding: 0.5rem; border: 1px solid #ccc; border-bottom: none; border-top-left-radius: 4px; border-top-right-radius: 4px; }
.toolbar-btn { background-color: #6c757d; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; }
#content { border-top-left-radius: 0; border-top-right-radius: 0; }
.main-header-bar { background-color: white; padding: 1.5rem 2rem; border-bottom: 1px solid #dee2e6; }
.content-section { padding: 2rem; }
.search-fieldset { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; }
.search-wrapper { position: relative; }
.search-input { width: 100%; padding: 0.75rem; font-size: 1rem; border: 1px solid #ccc; border-radius: 4px; }
.search-loader {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}
@keyframes spin { 0% { transform: translateY(-50%) rotate(0deg); } 100% { transform: translateY(-50%) rotate(360deg); } }
.search-dropdown { position: absolute; top: 100%; left: 0; right: 0; background-color: white; border: 1px solid #ccc; border-top: none; border-radius: 0 0 8px 8px; max-height: 300px; overflow-y: auto; z-index: 10; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
.search-dropdown ul { list-style: none; margin: 0; padding: 0; }
.search-dropdown li { padding: 0.8rem 1rem; cursor: pointer; border-bottom: 1px solid #f0f0f0; }
.search-dropdown li:last-child { border-bottom: none; }
.search-dropdown li:hover { background-color: #f0f0f0; }
.search-dropdown li small { color: #6c757d; }
.search-dropdown.no-results { padding: 1rem; color: #6c757d; }
.form-container { margin-top: 2rem; background-color: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.form-container textarea { width: 100%; padding: 0.75rem; font-size: 1rem; border: 1px solid #ccc; border-radius: 4px; font-family: inherit; }
.editing-title { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #eee; }
.current-media { margin-top: 0.5rem; padding: 0.5rem; background-color: #f8f9fa; border-radius: 4px; font-size: 0.9em; }
.current-media img { max-width: 150px; display: block; margin-bottom: 0.5rem; }
.replace-label { margin-top: 1rem; font-weight: 500; display: block; font-size: 0.9em; color: #555; }
.danger-zone { margin-top: 2rem; border: 2px solid #dc3545; border-radius: 8px; padding: 1.5rem; }
.danger-zone h4 { color: #dc3545; margin-top: 0; }
.danger-content { display: flex; justify-content: space-between; align-items: center; }
.btn-delete { background-color: #dc3545; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 4px; cursor: pointer; }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background-color: #2d2d2d; padding: 2rem; border-radius: 8px; width: 90%; max-width: 550px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); border: 1px solid #444; color: #d4d4d4; }
.warning-text { color: #f1c40f; font-weight: bold; }
.btn-confirm-delete { background-color: #dc3545; color: white; }
.feedback-message { margin-top: 1.5rem; padding: 1rem; border-radius: 4px; font-weight: 500; }
.feedback-message.success { background-color: #d4edda; color: #155724; }
.feedback-message.error { background-color: #f8d7da; color: #721c24; }
.feedback-message.info { background-color: #cce5ff; color: #004085; }
</style>