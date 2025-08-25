<template>
  <div>
    <header class="main-header-bar">
      <h1>Gestor de Conteúdo</h1>
      <p>Crie e edite as páginas de análise do site.</p>
    </header>

    <section class="content-section">
      <form @submit.prevent="publishAnalysis" class="form-container">
        <fieldset>
          <legend>Metadados da Análise</legend>
          <div class="form-group">
            <label for="title">Título da Análise <span class="required">*</span></label>
            <input type="text" id="title" v-model="newAnalysis.title" required>
          </div>
          <div class="form-group">
            <label for="tag">Tag (Ex: Vitimização, Análise Regional) <span class="required">*</span></label>
            <input type="text" id="tag" v-model="newAnalysis.tag" required>
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
            <textarea id="content" v-model="newAnalysis.content" rows="15" required></textarea>
          </div>
        </fieldset>

        <fieldset>
          <legend>Anexos e Mídia</legend>
          <div class="form-grid">
            <div class="form-group">
              <label for="coverImage">Imagem de Capa</label>
              <input type="file" id="coverImage" @change="handleImageUpload" accept="image/*">
              <img v-if="imagePreviewUrl" :src="imagePreviewUrl" alt="Pré-visualização da imagem" class="image-preview">
            </div>
            <div class="form-group">
              <label for="documentFile">Documento (PDF, Livro)</label>
              <input type="file" id="documentFile" @change="handleFileUpload($event, 'documentFile')" accept=".pdf,.doc,.docx">
              <span v-if="newAnalysis.documentFile" class="file-name">{{ newAnalysis.documentFile.name }}</span>
            </div>
            <div class="form-group">
              <label for="externalLink">Link Externo Relevante</label>
              <input type="url" id="externalLink" v-model="newAnalysis.externalLink" placeholder="https://exemplo.com/artigo">
            </div>
          </div>
        </fieldset>
        
        <fieldset>
          <legend>Dados Estruturados</legend>
           <div class="form-group">
              <label for="dataFile">Ficheiro de Dados (CSV, Excel)</label>
              <input type="file" id="dataFile" @change="handleFileUpload($event, 'dataFile')" accept=".csv,.xls,.xlsx">
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const newAnalysis = ref({
  title: '',
  tag: '',
  description: '',
  content: '',
  externalLink: '',
  coverImage: null,
  documentFile: null,
  dataFile: null,
});

const imagePreviewUrl = ref('');
const isLoading = ref(false);
const feedback = ref({ message: '', type: '' }); // type: 'success' ou 'error'

// Validação do formulário para ativar/desativar o botão
const isFormInvalid = computed(() => {
  return !newAnalysis.value.title || !newAnalysis.value.tag || !newAnalysis.value.description || !newAnalysis.value.content;
});

// Lida com o upload de ficheiros genéricos
const handleFileUpload = (event, fieldName) => {
  const file = event.target.files[0];
  if (file) {
    newAnalysis.value[fieldName] = file;
  }
};

// Lida especificamente com o upload de imagem para gerar pré-visualização
const handleImageUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    newAnalysis.value.coverImage = file;
    imagePreviewUrl.value = URL.createObjectURL(file);
  }
};

const resetForm = () => {
    newAnalysis.value = {
        title: '', tag: '', description: '', content: '',
        externalLink: '', coverImage: null, documentFile: null, dataFile: null,
    };
    imagePreviewUrl.value = '';
    // Limpa os inputs de ficheiro
    document.getElementById('coverImage').value = null;
    document.getElementById('documentFile').value = null;
    document.getElementById('dataFile').value = null;
}

// Comunicação com o Backend
const publishAnalysis = async () => {
  if (isFormInvalid.value) return;

  isLoading.value = true;
  feedback.value = { message: '', type: '' };

  // FormData é necessário para enviar ficheiros e texto juntos
  const formData = new FormData();
  
  // Adiciona os campos de texto
  formData.append('title', newAnalysis.value.title);
  formData.append('tag', newAnalysis.value.tag);
  formData.append('description', newAnalysis.value.description);
  formData.append('content', newAnalysis.value.content);
  formData.append('externalLink', newAnalysis.value.externalLink);

  // Adiciona os ficheiros, se existirem
  if (newAnalysis.value.coverImage) {
    formData.append('coverImage', newAnalysis.value.coverImage);
  }
  if (newAnalysis.value.documentFile) {
    formData.append('documentFile', newAnalysis.value.documentFile);
  }
  if (newAnalysis.value.dataFile) {
    formData.append('dataFile', newAnalysis.value.dataFile);
  }

  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch('http://localhost:3000/api/admin/analyses', {
      method: 'POST',
      headers: {
        // NÃO defina 'Content-Type', o navegador fará isso automaticamente para FormData
        'Authorization': `Bearer ${token}`
      },
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
</script>

<style scoped>
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