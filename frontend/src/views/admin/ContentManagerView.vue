<template>
  <div>
    <DataVisualizationModal
        v-if="selectedFileForModal"
        :file="selectedFileForModal"
        @close="closeDataModal"
    />

    <header class="main-header-bar">
      <div class="header-content"><h1>Gestor de Conteúdo</h1><p>Crie e publique novas páginas de análise.</p></div>
      <div class="header-actions"><button type="button" @click="isPreviewMode = !isPreviewMode" class="btn-toggle-preview">{{ isPreviewMode ? '⬅️ Voltar a Editar' : '👁️ Visualizar Prévia' }}</button></div>
    </header>

    <section v-if="!isPreviewMode" class="content-section">
      <form @submit.prevent="publishAnalysis" class="form-container">
        <fieldset><legend>Metadados da Análise</legend>
          <div class="form-group"><label for="title">Título da Análise <span class="required">*</span></label><input type="text" id="title" v-model="newAnalysis.title" required></div>
          <div class="form-grid">
            <div class="form-group"><label for="tag">Tag (Ex: Vitimização) <span class="required">*</span></label><input type="text" id="tag" v-model="newAnalysis.tag" required></div>
            <div class="form-group"><label for="author">Autor(es) <span class="required">*</span></label><input type="text" id="author" v-model="newAnalysis.author" required></div>
            <div class="form-group"><label for="researchDate">Data da Pesquisa <span class="required">*</span></label><input type="text" id="researchDate" v-model="newAnalysis.researchDate" placeholder="Ex: 2024 ou 2022-2023" required></div>
          </div>
          <div class="form-group"><label for="description">Descrição Curta (para o card) <span class="required">*</span></label><textarea id="description" v-model="newAnalysis.description" rows="3" required></textarea></div>
        </fieldset>
        
        <fieldset><legend>Conteúdo Principal</legend>
          <div class="form-group"><label for="content">Conteúdo Completo (suporta Markdown) <span class="required">*</span></label>
            <div class="content-toolbar"><button type="button" @click="triggerImageUpload" class="toolbar-btn">+ Inserir Imagem</button><input type="file" ref="imageUploader" @change="uploadAndInsertImage" style="display: none;" accept="image/*"></div>
            <textarea id="content" ref="contentTextArea" v-model="newAnalysis.content" rows="15" required></textarea>
          </div>
        </fieldset>
        
        <fieldset><legend>Anexos e Ficheiros de Referência</legend>
          <div class="form-group"><label for="coverImage">Imagem de Capa</label><input type="file" id="coverImage" @change="handleFileSelection($event, 'coverImage')" accept="image/*"><img v-if="newAnalysis.coverImageUrl" :src="newAnalysis.coverImageUrl" alt="Pré-visualização da imagem de capa" class="image-preview"></div>
          <div class="form-group"><label for="documentFiles">Documentos Originais (PDF/Word)</label><input type="file" id="documentFiles" @change="handleFileSelection($event, 'documentFiles')" accept=".pdf,.doc,.docx" multiple>
            <div v-if="newAnalysis.documentFiles.length > 0" class="file-list"><div v-for="(file, index) in newAnalysis.documentFiles" :key="index" class="file-list-item"><span>{{ file.name }}</span><button type="button" @click="removeFile(index, 'documentFiles')" class="btn-remove-file">×</button></div></div>
          </div>
          <div class="form-group"><label for="dataFiles">Ficheiros de Dados (CSV/Excel)</label><input type="file" id="dataFiles" @change="handleFileSelection($event, 'dataFiles')" accept=".csv,.xls,.xlsx" multiple>
            <div v-if="newAnalysis.dataFiles.length > 0" class="file-list"><div v-for="(file, index) in newAnalysis.dataFiles" :key="index" class="file-list-item"><span>{{ file.name }}</span><button type="button" @click="removeFile(index, 'dataFiles')" class="btn-remove-file">×</button></div></div>
          </div>
          <div class="form-group"><label for="referenceLinks">Links de Referência</label><textarea id="referenceLinks" v-model="newAnalysis.referenceLinks" rows="3" placeholder="Coloque um link por linha..."></textarea></div>
        </fieldset>
        
        <div class="form-actions"><button type="submit" class="btn-publish" :disabled="isFormInvalid || isLoading"><span v-if="isLoading">Publicando...</span><span v-else>Publicar Análise</span></button></div>
      </form>
      <div v-if="feedback.message" :class="['feedback-message', feedback.type]">{{ feedback.message }}</div>
    </section>

    <section v-else class="content-section">
        <div class="content-header">
            <h2>Pré-visualização da Análise</h2>
        </div>
        <div class="markdown-preview">
            <h1>{{ newAnalysis.title || 'Título da Análise' }}</h1>
            <p><strong>Tag:</strong> {{ newAnalysis.tag || 'N/A' }}</p>
            <p><strong>Autor(es):</strong> {{ newAnalysis.author || 'N/A' }}</p>
            <p><strong>Data da Pesquisa:</strong> {{ newAnalysis.researchDate || 'N/A' }}</p>
            <p><strong>Descrição:</strong> {{ newAnalysis.description || 'N/A' }}</p>
            <hr>
            <h3>Conteúdo:</h3>
            <div v-html="renderedContent"></div>
            <hr v-if="newAnalysis.referenceLinks">
            <h3 v-if="newAnalysis.referenceLinks">Links de Referência:</h3>
            <ul v-if="newAnalysis.referenceLinks">
                <li v-for="(link, index) in newAnalysis.referenceLinks.split('\n').filter(l => l.trim() !== '')" :key="index">
                    <a :href="link.startsWith('http') ? link : `//${link}`" target="_blank" rel="noopener noreferrer">{{ link }}</a>
                </li>
            </ul>
            <hr v-if="newAnalysis.coverImage || newAnalysis.documentFiles.length > 0 || newAnalysis.dataFiles.length > 0">
            <h3>Anexos:</h3>
            <p v-if="newAnalysis.coverImage"><strong>Imagem de Capa:</strong> <a :href="newAnalysis.coverImageUrl" target="_blank">Ver Imagem</a></p>
            <div v-if="newAnalysis.documentFiles.length > 0">
                <strong>Documentos Originais:</strong>
                <ul><li v-for="doc in newAnalysis.documentFiles" :key="doc.name">{{ doc.name }}</li></ul>
            </div>
            <div v-if="newAnalysis.dataFiles.length > 0">
                <strong>Ficheiros de Dados:</strong>
                <div v-for="file in newAnalysis.dataFiles" :key="file.name" class="data-file-item">
                    <span>{{ file.name }}</span>
                    <button type="button" @click="openDataModal(file)" class="btn-visualizar">Visualizar Dados</button>
                </div>
            </div>
        </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { marked } from 'marked';
import axios from 'axios';
import DataVisualizationModal from '../../components/DataVisualizationModal.vue';
import { uploadFile } from '../../services/b2Service'; // Ajuste o caminho

const DRAFT_KEY = 'analysisFormDraft';

const isPreviewMode = ref(false);
const isLoading = ref(false);
const feedback = ref({ message: '', type: '' });
const selectedFileForModal = ref(null);

const imageUploader = ref(null);
const contentTextArea = ref(null);

const getInitialAnalysisState = () => ({
  title: '', tag: '', author: '', researchDate: '', description: '', content: '', referenceLinks: '',
  coverImage: null,
  coverImageUrl: '',
  documentFiles: [],
  dataFiles: []
});
const newAnalysis = ref(getInitialAnalysisState());

const renderedContent = computed(() => {
    const contentWithImages = newAnalysis.value.content.replace(
        /!\[(.*?)\]\(uploading,(.*?)\)/g,
        `![Carregando imagem...]()`
    );
    return contentWithImages ? marked(contentWithImages) : '<p><em>Comece a escrever para ver a pré-visualização...</em></p>';
});

// --- Lógica de Rascunho (Auto-Save) ---
const saveDraft = () => {
  const textData = {
    title: newAnalysis.value.title,
    tag: newAnalysis.value.tag,
    author: newAnalysis.value.author,
    researchDate: newAnalysis.value.researchDate,
    description: newAnalysis.value.description,
    content: newAnalysis.value.content,
    referenceLinks: newAnalysis.value.referenceLinks,
  };
  const draft = {
    data: textData,
    expires: Date.now() + (60 * 60 * 1000)
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
};

const loadDraft = () => {
  const savedDraft = localStorage.getItem(DRAFT_KEY);
  if (savedDraft) {
    const draft = JSON.parse(savedDraft);
    if (draft.expires > Date.now()) {
      Object.assign(newAnalysis.value, draft.data);
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  }
};

let debounceTimer = null;
watch(newAnalysis, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(saveDraft, 1000);
}, { deep: true });

onMounted(loadDraft);

// --- CORREÇÃO: Lógica de Limpeza de Memória atualizada ---
// Esta função revoga apenas a URL local da imagem de capa, se existir.
const cleanupCoverImageBlob = () => {
    if (newAnalysis.value.coverImageUrl && newAnalysis.value.coverImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(newAnalysis.value.coverImageUrl);
    }
};

// Limpa a URL do blob ao sair do componente.
onBeforeUnmount(cleanupCoverImageBlob);

// --- Manipulação de Formulário e Ficheiros ---
const isFormInvalid = computed(() => !newAnalysis.value.title || !newAnalysis.value.tag || !newAnalysis.value.description || !newAnalysis.value.content || !newAnalysis.value.author || !newAnalysis.value.researchDate);

const handleFileSelection = (event, fieldName) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  if (fieldName === 'coverImage') {
    cleanupCoverImageBlob(); // Limpa a URL antiga antes de criar uma nova
    newAnalysis.value.coverImage = files[0];
    newAnalysis.value.coverImageUrl = URL.createObjectURL(files[0]); 
  } else {
    newAnalysis.value[fieldName] = [...newAnalysis.value[fieldName], ...Array.from(files)];
  }
  event.target.value = null;
};

const removeFile = (index, fieldName) => {
  newAnalysis.value[fieldName].splice(index, 1);
};

const triggerImageUpload = () => imageUploader.value.click();

const uploadAndInsertImage = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const placeholder = `![enviando,${file.name}]()`;
  const textarea = contentTextArea.value;
  const start = textarea.selectionStart;
  
  newAnalysis.value.content = newAnalysis.value.content.substring(0, start) + `\n${placeholder}\n` + newAnalysis.value.content.substring(start);
  event.target.value = null;

  try {
    const imageUrl = await uploadFile(file);
    const imageMarkdown = `![${file.name}](${imageUrl})`;
    
    newAnalysis.value.content = newAnalysis.value.content.replace(placeholder, imageMarkdown);
  } catch (error) {
    newAnalysis.value.content = newAnalysis.value.content.replace(placeholder, '\n*Falha no upload da imagem.*\n');
    feedback.value = { message: 'Falha ao enviar a imagem.', type: 'error' };
  }
};

// --- CORREÇÃO: Função de resetar formulário implementada ---
const resetForm = () => {
  cleanupCoverImageBlob(); // Limpa a URL do blob da imagem de capa
  newAnalysis.value = getInitialAnalysisState(); // Reseta o estado do formulário
  localStorage.removeItem(DRAFT_KEY); // Remove o rascunho
  
  // Limpa visualmente os inputs de arquivo
  document.getElementById('coverImage').value = null;
  document.getElementById('documentFiles').value = null;
  document.getElementById('dataFiles').value = null;
};

const publishAnalysis = async () => {
  if (isFormInvalid.value) {
    feedback.value = { message: 'Por favor, preencha todos os campos obrigatórios.', type: 'error' };
    return;
  }
  isLoading.value = true;
  feedback.value = { message: '', type: '' };

  try {
    const coverImageUrl = newAnalysis.value.coverImage ? await uploadFile(newAnalysis.value.coverImage) : '';
    
    const documentFilesData = await Promise.all(
      newAnalysis.value.documentFiles.map(async (file) => ({
        path: await uploadFile(file),
        originalName: file.name,
      }))
    );
    
    const dataFilesData = await Promise.all(
      newAnalysis.value.dataFiles.map(async (file) => ({
        path: await uploadFile(file),
        originalName: file.name,
      }))
    );

    const payload = {
      title: newAnalysis.value.title,
      tag: newAnalysis.value.tag,
      author: newAnalysis.value.author,
      researchDate: newAnalysis.value.researchDate,
      description: newAnalysis.value.description,
      content: newAnalysis.value.content,
      referenceLinks: newAnalysis.value.referenceLinks,
      coverImagePath: coverImageUrl,
      documentFilePath: JSON.stringify(documentFilesData),
      dataFilePath: JSON.stringify(dataFilesData),
    };

    const token = localStorage.getItem('authToken');
    const apiUrl = 'http://localhost:3000';
    
    const response = await axios.post(`${apiUrl}/api/admin/analyses`, payload, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    feedback.value = { message: response.data.message || 'Análise publicada com sucesso!', type: 'success' };
    resetForm();
    isPreviewMode.value = false;
  } catch (err) {
    feedback.value = { message: err.response?.data?.message || 'Falha ao publicar a análise.', type: 'error' };
  } finally {
    isLoading.value = false;
    setTimeout(() => { feedback.value = { message: '', type: '' }; }, 7000);
  }
};

const openDataModal = (file) => {
    selectedFileForModal.value = file;
};
const closeDataModal = () => {
    selectedFileForModal.value = null;
};
</script>

<style scoped>
.main-header-bar{background-color:#fff;padding:1.5rem 2rem;border-bottom:1px solid #dee2e6;display:flex;justify-content:space-between;align-items:center}.header-content h1{margin:0}.header-content p{margin:0;color:#6c757d}.btn-toggle-preview{background-color:transparent;border:1px solid #007bff;color:#007bff;padding:.5rem 1rem;border-radius:5px;cursor:pointer;font-weight:500}.btn-toggle-preview:hover{background-color:#007bff;color:#fff}.content-section{padding:2rem;max-width:1200px;margin:0 auto}.form-container{background-color:#fff;padding:2.5rem;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,.1)}fieldset{border:1px solid #e0e0e0;border-radius:8px;padding:2rem;margin-bottom:2rem}legend{font-size:1.2rem;font-weight:600;padding:0 .5rem;color:#333}.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1.5rem}.form-group{margin-bottom:1.5rem}.form-group label{display:block;margin-bottom:.5rem;font-weight:500;color:#555}.form-group input,.form-group textarea{width:100%;padding:.75rem;border:1px solid #ccc;border-radius:4px;font-size:1rem;box-sizing:border-box}.required{color:#dc3545}.content-toolbar{background-color:#f8f9fa;padding:.5rem;border:1px solid #ccc;border-bottom:none;border-top-left-radius:4px;border-top-right-radius:4px}.toolbar-btn{background-color:#6c757d;color:#fff;border:none;padding:.4rem .8rem;border-radius:4px;cursor:pointer}#content{border-top-left-radius:0;border-top-right-radius:0}.form-actions{text-align:right}.btn-publish{padding:.8rem 2rem;background-color:#28a745;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:1rem;font-weight:700}.btn-publish:disabled{background-color:#a5d6a7;cursor:not-allowed}.image-preview{max-width:200px;margin-top:1rem;border-radius:4px;border:1px solid #ddd}.feedback-message{margin-top:1.5rem;padding:1rem;border-radius:4px;font-weight:500}.feedback-message.success{background-color:#d4edda;color:#155724;border:1px solid #c3e6cb}.feedback-message.error{background-color:#f8d7da;color:#721c24;border:1px solid #f5c6cb}.file-list{margin-top:1rem;border:1px solid #e0e0e0;border-radius:4px;padding:.5rem}.file-list-item{display:flex;justify-content:space-between;align-items:center;padding:.5rem;background-color:#f8f9fa;border-radius:4px;margin-bottom:.5rem}.file-list-item:last-child{margin-bottom:0}.btn-remove-file{background:0 0;border:none;color:#dc3545;font-size:1.5rem;line-height:1;cursor:pointer;padding:0 .5rem}
.markdown-preview{background-color:#fff;border:1px solid #ccc;padding:1rem 1.5rem;min-height:420px;border-radius:4px;line-height:1.7;color:#333}.markdown-preview .content-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem}.markdown-preview :deep(h1),.markdown-preview :deep(h2),.markdown-preview :deep(h3){border-bottom:1px solid #eee;padding-bottom:.3em;margin-top:1.5em;margin-bottom:1em}.markdown-preview :deep(img){max-width:100%;height:auto;border-radius:8px;margin:1em 0}.data-file-item{display:flex;justify-content:space-between;align-items:center;padding:.5rem;background-color:#f8f9fa;border-radius:4px;margin-top:.5rem}.btn-visualizar{background-color:#007bff;color:#fff;border:none;padding:.4rem .8rem;border-radius:4px;cursor:pointer}
</style>