<template>
  <div>
    <header class="main-header-bar">
      <div class="header-content">
        <h1>Gestor de Conteúdo</h1>
        <p>Crie e edite as páginas de análise do site.</p>
      </div>
      <div class="header-actions">
        <button type="button" @click="isPreviewMode = !isPreviewMode" class="btn-toggle-preview">
          {{ isPreviewMode ? '⬅️ Voltar a Editar' : '👁️ Visualizar Prévia' }}
        </button>
      </div>
    </header>

    <section v-if="!isPreviewMode"  class="content-section">
      <form @submit.prevent="publishAnalysis" class="form-container">
        <fieldset>
          <legend>Metadados da Análise</legend>
          <div class="form-group">
            <label for="title">Título da Análise <span class="required">*</span></label>
            <input type="text" id="title" v-model="newAnalysis.title" required>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label for="tag">Tag (Ex: Vitimização) <span class="required">*</span></label>
              <input type="text" id="tag" v-model="newAnalysis.tag" required>
            </div>
            <div class="form-group">
              <label for="author">Autor(es) <span class="required">*</span></label>
              <input type="text" id="author" v-model="newAnalysis.author" placeholder="Ex: João Silva, Maria Souza" required>
            </div>
            <div class="form-group">
              <label for="researchDate">Data da Pesquisa <span class="required">*</span></label>
              <input type="text" id="researchDate" v-model="newAnalysis.researchDate" placeholder="Ex: 2024 ou 2022-2023" required>
            </div>
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
            <textarea id="content" ref="contentTextArea" v-model="newAnalysis.content" rows="15" required></textarea>
          </div>
        </fieldset>

        <fieldset>
          <legend>Anexos e Ficheiros de Referência</legend>
          <div class="form-grid">
            <div class="form-group">
              <label for="coverImage">Imagem de Capa</label>
              <input type="file" id="coverImage" @change="handleFileSelection($event, 'coverImage')" accept="image/*">
              <img v-if="imagePreviewUrl" :src="imagePreviewUrl" alt="Pré-visualização da imagem" class="image-preview">
            </div>
            <div class="form-group">
              <label for="documentFile">Pesquisa Original (PDF/Word)</label>
              <input type="file" id="documentFile" @change="handleFileSelection($event, 'documentFile')" accept=".pdf,.doc,.docx">
              <span v-if="newAnalysis.documentFile" class="file-name">{{ newAnalysis.documentFile.name }}</span>
            </div>
          </div>
           <div class="form-group">
            <label for="referenceLinks">Links de Referência</label>
            <textarea id="referenceLinks" v-model="newAnalysis.referenceLinks" rows="3" placeholder="Coloque um link por linha..."></textarea>
          </div>
        </fieldset>
        
        <fieldset>
          <legend>Dados Estruturados</legend>
            <div class="form-group">
              <label for="dataFile">Ficheiro de Dados (CSV/Excel)</label>
              <input type="file" id="dataFile" @change="handleFileSelection($event, 'dataFile')" accept=".csv,.xls,.xlsx">
              <span v-if="newAnalysis.dataFile" class="file-name">{{ newAnalysis.dataFile.name }}</span>
            </div>
        </fieldset>

        <div class="form-actions">
           <button type="submit" class="btn-publish" :disabled="isFormInvalid || isLoading">
            <span v-if="isLoading">Publicando...</span>
            <span v-else>Publicar Análise</span>
          </button>
        </div>
      </form>
      
      <div v-if="feedback.message" :class="['feedback-message', feedback.type]">
        {{ feedback.message }}
      </div>
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
            <a :href="link" target="_blank" rel="noopener noreferrer">{{ link }}</a>
          </li>
        </ul>
        <hr v-if="newAnalysis.coverImage || newAnalysis.documentFile || newAnalysis.dataFile">
        <h3>Anexos:</h3>
        <p v-if="newAnalysis.coverImage"><strong>Imagem de Capa:</strong> <a :href="imagePreviewUrl" target="_blank">Ver Imagem</a></p>
        <p v-if="newAnalysis.documentFile"><strong>Documento Original:</strong> {{ newAnalysis.documentFile.name }}</p>
        <p v-if="newAnalysis.dataFile"><strong>Ficheiro de Dados:</strong> {{ newAnalysis.dataFile.name }}</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { marked } from 'marked';

const isPreviewMode = ref(false);
const imageUploader = ref(null);
const contentTextArea = ref(null);
const isUploadingImage = ref(false);

const newAnalysis = ref({
  title: '',
  tag: '',
  author: '',
  researchDate: '',
  description: '',
  content: '',
  referenceLinks: '',
  coverImage: null,
  documentFile: null,
  dataFile: null,
});

const imagePreviewUrl = ref('');
const isLoading = ref(false);
const feedback = ref({ message: '', type: '' });

const renderedContent = computed(() => {
    if (newAnalysis.value.content) {
        return marked(newAnalysis.value.content);
    }
    return '<p><em>Comece a escrever para ver a pré-visualização...</em></p>';
});

const isFormInvalid = computed(() => {
  return !newAnalysis.value.title || !newAnalysis.value.tag || !newAnalysis.value.description || !newAnalysis.value.content || !newAnalysis.value.author || !newAnalysis.value.researchDate;
});

// Esta função agora será chamada corretamente pelo template
const handleFileSelection = (event, fieldName) => {
    const file = event.target.files[0];
    if (!file) {
        newAnalysis.value[fieldName] = null;
        if (fieldName === 'coverImage') imagePreviewUrl.value = '';
        return;
    }
    newAnalysis.value[fieldName] = file;
    if (fieldName === 'coverImage') imagePreviewUrl.value = URL.createObjectURL(file);
};

const triggerImageUpload = () => { imageUploader.value.click(); };

const uploadAndInsertImage = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    isUploadingImage.value = true;
    const formData = new FormData();
    formData.append('image', file);
    try {
        const token = localStorage.getItem('authToken');
        const apiUrl = process.env.VUE_APP_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/admin/upload-image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });
        if (!response.ok) throw new Error('Falha no upload da imagem.');
        const result = await response.json();
        const imageUrl = `${apiUrl}${result.url}`;
        const imageMarkdown = `\n![Descrição da imagem](${imageUrl})\n`;
        const textarea = contentTextArea.value;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = newAnalysis.value.content;
        newAnalysis.value.content = text.substring(0, start) + imageMarkdown + text.substring(end);
    } catch (err) {
        feedback.value = { message: err.message, type: 'error' };
        setTimeout(() => { feedback.value = { message: '', type: '' } }, 5000);
    } finally {
        isUploadingImage.value = false;
        event.target.value = null;
    }
};

const resetForm = () => {
    newAnalysis.value = { title: '', tag: '', author: '', researchDate: '', description: '', content: '', referenceLinks: '', coverImage: null, documentFile: null, dataFile: null };
    imagePreviewUrl.value = '';
    document.getElementById('coverImage').value = null;
    document.getElementById('documentFile').value = null;
    document.getElementById('dataFile').value = null;
};

const publishAnalysis = async () => {
  if (isFormInvalid.value) return;
  isLoading.value = true;
  feedback.value = { message: '', type: '' };
  const formData = new FormData();
  formData.append('title', newAnalysis.value.title);
  formData.append('tag', newAnalysis.value.tag);
  formData.append('author', newAnalysis.value.author);
  formData.append('researchDate', newAnalysis.value.researchDate);
  formData.append('description', newAnalysis.value.description);
  formData.append('content', newAnalysis.value.content);
  formData.append('referenceLinks', newAnalysis.value.referenceLinks);
  if (newAnalysis.value.coverImage) formData.append('coverImage', newAnalysis.value.coverImage);
  if (newAnalysis.value.documentFile) formData.append('documentFile', newAnalysis.value.documentFile);
  if (newAnalysis.value.dataFile) formData.append('dataFile', newAnalysis.value.dataFile);
  
  for (const [placeholderId, file] of contentImages.value.entries()) {
    formData.append(placeholderId, file);
  }

  try {
    const token = localStorage.getItem('authToken');
    const apiUrl = process.env.VUE_APP_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/admin/analyses`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Falha ao publicar a análise.');
    }
    const result = await response.json();
    feedback.value = { message: result.message, type: 'success' };
    resetForm();
  } catch (err) {
    feedback.value = { message: err.message, type: 'error' };
  } finally {
    isLoading.value = false;
    setTimeout(() => { feedback.value = { message: '', type: '' }; }, 7000);
  }
};

const contentImages = ref(new Map());
</script>

<style scoped>
.main-header-bar {
  background-color: var(--admin-surface-color);
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--admin-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.main-header-bar h1 {
  margin: 0;
}
.main-header-bar p {
  margin: 0;
  color: var(--admin-text-light);
}

.content-section {
  padding: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
}
.content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
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

.markdown-preview {
    background-color: #fff;
    border: 1px solid #ccc;
    padding: 1rem 1.5rem;
    min-height: 420px;
    border-radius: 4px;
    line-height: 1.7;
    color: #333;
}
.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3) {
    border-bottom: 1px solid #eee;
    padding-bottom: 0.3em;
    margin-top: 1.5em;
    margin-bottom: 1em;
}
.markdown-preview :deep(p) {
    margin-bottom: 1em;
}
.markdown-preview :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1em 0;
}
.markdown-preview :deep(blockquote) {
    border-left: 4px solid #ccc;
    padding-left: 1em;
    margin-left: 0;
    color: #666;
}
.markdown-preview :deep(pre) {
    background-color: #f5f5f5;
    padding: 1em;
    border-radius: 4px;
    overflow-x: auto;
}

.content-toolbar { background-color: #f8f9fa; padding: 0.5rem; border: 1px solid #ccc; border-bottom: none; border-top-left-radius: 4px; border-top-right-radius: 4px; }
.toolbar-btn { background-color: #6c757d; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; }
#content { border-top-left-radius: 0; border-top-right-radius: 0; }
.main-header-bar { background-color: white; padding: 1.5rem 2rem; border-bottom: 1px solid #dee2e6; }
.content-section { padding: 2rem; }
.form-container { background-color: white; padding: 2.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
fieldset { border: 1px solid #e0e0e0; border-radius: 8px; padding: 2rem; margin-bottom: 2rem; }
legend { font-size: 1.2rem; font-weight: 600; padding: 0 0.5rem; color: #333; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #555; }
.form-group input, .form-group textarea { width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; box-sizing: border-box; }
.required { color: #dc3545; }
.form-actions { text-align: right; }
.btn-publish { padding: 0.8rem 2rem; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: bold; }
.btn-publish:disabled { background-color: #a5d6a7; cursor: not-allowed; }
.image-preview { max-width: 200px; margin-top: 1rem; border-radius: 4px; border: 1px solid #ddd; }
.file-name { font-style: italic; color: #555; margin-top: 0.5rem; display: block; }
.feedback-message { margin-top: 1.5rem; padding: 1rem; border-radius: 4px; font-weight: 500; }
.feedback-message.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.feedback-message.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
</style>