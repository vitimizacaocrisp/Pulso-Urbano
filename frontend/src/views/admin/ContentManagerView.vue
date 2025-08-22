<template>
  <div>
    <header class="main-header-bar">
      <h1>Gestor de Conteúdo</h1>
      <p>Crie e edite as páginas de análise do site.</p>
    </header>

    <section class="content-section">
      <div class="form-container">
        <h3>Nova Análise</h3>
        <form @submit.prevent="publishAnalysis">
          <div class="form-group">
            <label for="title">Título da Análise</label>
            <input type="text" id="title" v-model="newAnalysis.title" required>
          </div>
          <div class="form-group">
            <label for="tag">Tag (Ex: Vitimização, Análise Regional)</label>
            <input type="text" id="tag" v-model="newAnalysis.tag" required>
          </div>
          <div class="form-group">
            <label for="description">Descrição Curta (para o card na página inicial)</label>
            <textarea id="description" v-model="newAnalysis.description" rows="3" required></textarea>
          </div>
          <div class="form-group">
            <label for="content">Conteúdo Completo (em Markdown)</label>
            <textarea id="content" v-model="newAnalysis.content" rows="10" required></textarea>
          </div>
          <button type="submit" class="btn-publish">Publicar Análise</button>
        </form>
        <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const newAnalysis = ref({
  title: '',
  tag: '',
  description: '',
  content: ''
});
const successMessage = ref('');

const publishAnalysis = () => {
  console.log('Publicando análise:', newAnalysis.value);
  // Aqui, você faria uma chamada à API para guardar estes dados
  successMessage.value = `A análise "${newAnalysis.value.title}" foi publicada com sucesso!`;
  
  // Limpa o formulário após a publicação
  newAnalysis.value = { title: '', tag: '', description: '', content: '' };

  setTimeout(() => { successMessage.value = '' }, 5000);
};
</script>

<style scoped>
.main-header-bar {
  background-color: white;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #dee2e6;
}
.content-section {
  padding: 2rem;
}
.form-container {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.form-group {
  margin-bottom: 1.5rem;
}
.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}
.btn-publish {
  padding: 0.75rem 1.5rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}
.success-message {
  margin-top: 1rem;
  color: #28a745;
  font-weight: bold;
}
</style>