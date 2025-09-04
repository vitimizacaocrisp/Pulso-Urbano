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
import { ref, computed, onMounted, watch } from 'vue';
import { marked } from 'marked';
import axios from 'axios';

// --- Chave para o Rascunho no LocalStorage ---
const DRAFT_KEY = 'analysisFormDraft';

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

// [MODIFICADO] Esta variável irá agora guardar os ficheiros de imagem do conteúdo para serem enviados mais tarde
const contentImages = ref(new Map());

const imagePreviewUrl = ref('');
const isLoading = ref(false);
const feedback = ref({ message: '', type: '' });

// --- Lógica de Rascunho (Auto-Save) ---

// [NOVO] Função que guarda os dados de texto no localStorage com um timestamp de validade
const saveDraft = () => {
  //console.log('Salvando rascunho...');
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
    expires: Date.now() + (60 * 60 * 1000) // Validade de 1 hora
  };

  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
};

// [NOVO] Função que carrega o rascunho se ele for válido
const loadDraft = () => {
  const savedDraft = localStorage.getItem(DRAFT_KEY);
  if (savedDraft) {
    const draft = JSON.parse(savedDraft);
    // Verifica se o rascunho não expirou
    if (draft.expires > Date.now()) {
      //console.log('Carregando rascunho válido.');
      // Atualiza apenas os campos de texto
      Object.assign(newAnalysis.value, draft.data);
    } else {
      //console.log('Rascunho expirado, removendo.');
      localStorage.removeItem(DRAFT_KEY);
    }
  }
};

// [NOVO] Observa alterações nos campos de texto e chama a função de salvar
// O "debounce" (atraso) evita que a função seja chamada a cada tecla pressionada
let debounceTimer = null;
watch(
  () => ({
    title: newAnalysis.value.title,
    tag: newAnalysis.value.tag,
    author: newAnalysis.value.author,
    researchDate: newAnalysis.value.researchDate,
    description: newAnalysis.value.description,
    content: newAnalysis.value.content,
    referenceLinks: newAnalysis.value.referenceLinks,
  }),
  () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      saveDraft();
    }, 1000); // Salva 1 segundo após a última alteração
  },
  { deep: true }
);

// Ao montar o componente, tenta carregar um rascunho existente
onMounted(() => {
  loadDraft();
});
// --- Fim da Lógica de Rascunho ---

const renderedContent = computed(() => {
    if (newAnalysis.value.content) {
        return marked(newAnalysis.value.content);
    }
    return '<p><em>Comece a escrever para ver a pré-visualização...</em></p>';
});

const isFormInvalid = computed(() => {
  return !newAnalysis.value.title || !newAnalysis.value.tag || !newAnalysis.value.description || !newAnalysis.value.content || !newAnalysis.value.author || !newAnalysis.value.researchDate;
});

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

// [CORRIGIDO] Esta função foi totalmente reescrita. Agora ela NÃO faz o upload.
const uploadAndInsertImage = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 1. Criar um placeholder único para a imagem
    const placeholderId = `contentImage_${Date.now()}_${file.name}`;
    
    // 2. Guardar o ficheiro no nosso Map, associado ao seu placeholder
    contentImages.value.set(placeholderId, file);

    // 3. Criar a tag Markdown com o placeholder em vez de um URL real
    const imageMarkdown = `\n![${file.name}](${placeholderId})\n`;
    
    // 4. Inserir a tag na posição do cursor na textarea
    const textarea = contentTextArea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = newAnalysis.value.content;
    newAnalysis.value.content = text.substring(0, start) + imageMarkdown + text.substring(end);

    // 5. Limpar o input para permitir selecionar o mesmo ficheiro novamente
    event.target.value = null;
};

const resetForm = () => {
    newAnalysis.value = { title: '', tag: '', author: '', researchDate: '', description: '', content: '', referenceLinks: '', coverImage: null, documentFile: null, dataFile: null };
    imagePreviewUrl.value = '';
    contentImages.value.clear(); // Limpa também o Map de imagens
    document.getElementById('coverImage').value = null;
    document.getElementById('documentFile').value = null;
    document.getElementById('dataFile').value = null;

    // [MODIFICADO] Limpa também o rascunho ao resetar
    localStorage.removeItem(DRAFT_KEY);
};

// Esta função envia as imagens do conteúdo juntamente com o resto dos dados
const publishAnalysis = async () => {
  if (isFormInvalid.value) return;
  isLoading.value = true;
  feedback.value = { message: '', type: '' };

  const formData = new FormData();

  // Adiciona os campos de texto
  formData.append('title', newAnalysis.value.title);
  formData.append('tag', newAnalysis.value.tag);
  formData.append('author', newAnalysis.value.author);
  formData.append('researchDate', newAnalysis.value.researchDate);
  formData.append('description', newAnalysis.value.description);
  formData.append('content', newAnalysis.value.content); // O conteúdo com os placeholders
  formData.append('referenceLinks', newAnalysis.value.referenceLinks);

  // Adiciona os ficheiros de anexo
  if (newAnalysis.value.coverImage) formData.append('coverImage', newAnalysis.value.coverImage);
  if (newAnalysis.value.documentFile) formData.append('documentFile', newAnalysis.value.documentFile);
  if (newAnalysis.value.dataFile) formData.append('dataFile', newAnalysis.value.dataFile);

  // Adiciona todas as imagens do conteúdo ao FormData
  for (const [placeholderId, file] of contentImages.value.entries()) {
    formData.append(placeholderId, file);
  }

  try {
    const token = localStorage.getItem('authToken');
    const apiUrl = process.env.VUE_APP_API_URL || 'http://localhost:3000';

    const response = await axios.post(
      `${apiUrl}/api/admin/analyses`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    let resultMessage = 'Análise publicada com sucesso!';
    if (response.data && response.data.message) {
      resultMessage = response.data.message;
    }
    // [MODIFICADO] Após o sucesso, limpa o rascunho do localStorage
    localStorage.removeItem(DRAFT_KEY);

    feedback.value = { message: resultMessage, type: 'success' };
    resetForm();

  } catch (err) {
    let errorMessage = 'Falha ao publicar a análise.';
    if (err.response && err.response.data && err.response.data.message) {
      errorMessage = err.response.data.message;
    } else if (err.message) {
      errorMessage = err.message;
    }
    feedback.value = { message: errorMessage, type: 'error' };
  } finally {
    isLoading.value = false;
    setTimeout(() => { feedback.value = { message: '', type: '' }; }, 10000);
  }
};
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

@media (max-width: 768px) {
  .content-section {
    padding: 1rem !important;
  }
  .form-container {
    padding: 1rem !important;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .btn-publish {
    width: 100%;
  }
}
@media (max-width: 480px) {
  .content-section {
    padding: 0.5rem !important;
  }
  .form-container {
    padding: 0rem !important;
  }
  .main-header-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  .header-actions {
    width: 100%;
    text-align: right;
  }
}
</style>