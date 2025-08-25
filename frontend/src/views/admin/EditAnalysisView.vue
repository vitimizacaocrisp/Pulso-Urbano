<template>
  <div>
    <div v-if="isDeleteModalVisible" class="modal-overlay" @click="cancelDelete">
      <div class="modal-content" @click.stop>
        <h4>Confirmar Exclusão</h4>
        <p>Tem a certeza de que deseja excluir permanentemente a análise <strong>"{{ currentAnalysis.title }}"</strong>?</p>
        <p class="warning-text">Esta ação não pode ser desfeita.</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="cancelDelete">Cancelar</button>
          <button class="btn-confirm-delete" @click="confirmDelete">Sim, Excluir</button>
        </div>
      </div>
    </div>

    <header class="main-header-bar">
      <h1>Editar ou Excluir Análise</h1>
      <p>Pesquise por uma análise existente para modificar ou remover.</p>
    </header>

    <section class="content-section">
      <fieldset class="search-fieldset">
        <legend>Pesquisar Análise</legend>
        <div class="form-group search-group">
          <label for="search">ID da Análise</label>
          <input type="number" id="search" v-model="searchId" placeholder="Digite o ID da análise..." @keyup.enter="fetchAnalysis">
          <button @click="fetchAnalysis" :disabled="isLoading">
            <span v-if="isLoading && searchInProgress">Buscando...</span>
            <span v-else>Buscar</span>
          </button>
        </div>
      </fieldset>

      <div v-if="feedback.message" :class="['feedback-message', feedback.type]" style="margin-top: 1rem;">
        {{ feedback.message }}
      </div>

      <form v-if="currentAnalysis" @submit.prevent="updateAnalysis" class="form-container">
        <h3>Editando Análise: {{ currentAnalysis.title }}</h3>
        
        <fieldset>
          <legend>Metadados da Análise</legend>
          <div class="form-group">
            <label for="title">Título da Análise <span class="required">*</span></label>
            <input type="text" id="title" v-model="currentAnalysis.title" required>
          </div>
          </fieldset>

        <fieldset>
          <legend>Anexos e Mídia (Substituir)</legend>
           <div class="form-group">
              <label for="coverImage">Substituir Imagem de Capa</label>
              <p v-if="currentAnalysis.cover_image_path" class="current-file">Ficheiro Atual: {{ currentAnalysis.cover_image_path }}</p>
              <input type="file" id="coverImage" @change="handleImageUpload" accept="image/*">
              <img v-if="imagePreviewUrl" :src="imagePreviewUrl" alt="Pré-visualização da nova imagem" class="image-preview">
            </div>
          </fieldset>
        
        <div class="form-actions">
           <button type="submit" class="btn-publish" :disabled="isLoading">
            <span v-if="isLoading && !searchInProgress">Salvando...</span>
            <span v-else>Salvar Alterações</span>
          </button>
        </div>
      </form>
      
      <div v-if="currentAnalysis" class="danger-zone">
        <h4>Zona de Perigo</h4>
        <div class="danger-content">
          <p>Excluir esta análise é uma ação permanente e removerá todos os dados e ficheiros associados.</p>
          <button @click="triggerDelete" class="btn-delete">Excluir Análise</button>
        </div>
      </div>

    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const searchId = ref(null);
const currentAnalysis = ref(null);
const newCoverImage = ref(null);
const imagePreviewUrl = ref('');

const isLoading = ref(false);
const searchInProgress = ref(false);
const feedback = ref({ message: '', type: '' });
const isDeleteModalVisible = ref(false);

const API_BASE_URL = 'http://localhost:3000';

const setFeedback = (message, type, duration = 5000) => {
    feedback.value = { message, type };
    setTimeout(() => { feedback.value = { message: '', type: '' }; }, duration);
};

const fetchAnalysis = async () => {
  if (!searchId.value) {
    setFeedback('Por favor, insira um ID para pesquisar.', 'error');
    return;
  }
  isLoading.value = true;
  searchInProgress.value = true;
  currentAnalysis.value = null;
  feedback.value = { message: '', type: '' };

  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/api/admin/analyses/${searchId.value}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      if (response.status === 404) throw new Error('Análise não encontrada com o ID fornecido.');
      throw new Error('Falha ao buscar a análise.');
    }
    const result = await response.json();
    currentAnalysis.value = result.data;
  } catch (err) {
    setFeedback(err.message, 'error');
  } finally {
    isLoading.value = false;
    searchInProgress.value = false;
  }
};

// [NOVO] Verifica se um ID foi passado via URL ao carregar a página
onMounted(() => {
    if(route.query.id) {
        searchId.value = route.query.id;
        fetchAnalysis();
    }
});

const updateAnalysis = async () => {
    // Lógica para enviar os dados atualizados, similar ao `publishAnalysis`
    // Use FormData para enviar os campos de texto e os novos ficheiros
    console.log("A atualizar análise...", currentAnalysis.value);
    setFeedback('Funcionalidade de atualização ainda não implementada.', 'success');
};

const triggerDelete = () => {
    isDeleteModalVisible.value = true;
};

const cancelDelete = () => {
    isDeleteModalVisible.value = false;
};

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
        currentAnalysis.value = null; // Limpa o formulário
        searchId.value = null;
    } catch (err) {
        setFeedback(err.message, 'error');
    } finally {
        isLoading.value = false;
    }
};

const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if(file){
        newCoverImage.value = file;
        imagePreviewUrl.value = URL.createObjectURL(file);
    }
};
</script>

<style scoped>
/* Adicione aqui os estilos do seu formulário, modal e zona de perigo */
.search-fieldset { border: 1px solid #e0e0e0; border-radius: 8px; padding: 2rem; }
.search-group { display: flex; align-items: center; gap: 1rem; }
.search-group input { flex-grow: 1; }
.form-container { margin-top: 2rem; }
.current-file { font-style: italic; color: #555; font-size: 0.9em; }
.danger-zone { margin-top: 2rem; border: 2px solid #dc3545; border-radius: 8px; padding: 1.5rem; }
.danger-zone h4 { color: #dc3545; margin-top: 0; }
.danger-content { display: flex; justify-content: space-between; align-items: center; }
.btn-delete { background-color: #dc3545; color: white; }
.modal-overlay {  }
.modal-content {  }
.warning-text { color: #f1c40f; font-weight: bold; }
.btn-confirm-delete { background-color: #dc3545; color: white; }
/* Importe outros estilos necessários do seu ContentManagerView.vue */
</style>