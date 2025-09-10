<template>
  <div>
    <div v-if="isLoading" class="placeholder-container">
      <p>A carregar análise...</p>
    </div>

    <div v-else-if="error" class="placeholder-container error">
      <p>{{ error }}</p>
      <router-link :to="{ name: 'Analises' }">Voltar à lista de análises</router-link>
    </div>

    <div v-else-if="analysis" class="article-preview-container">
      <!-- Cabeçalho -->
      <header class="article-header">
        <!-- Botão de voltar -->
        <button class="back-button" @click="$router.back()">← Voltar</button>

        <h1>{{ analysis.title }}</h1>

        <!-- Autor -->
        <div class="article-meta">
          <span class="author-name">{{ analysis.author }}</span>
        </div>

        <!-- Imagem destacada -->
        <div v-if="analysis.cover_image_path" class="featured-image">
          <img :src="getFullMediaPath(analysis.cover_image_path)" alt="Imagem de capa da análise">
        </div>
      </header>

      <!-- Conteúdo -->
      <div class="article-body" v-html="renderedContent"></div>

      <!-- Rodapé -->
      <footer v-if="analysis.reference_links || analysis.document_file_path || analysis.data_file_path"
              class="article-footer">
        <h3>Referências e Anexos</h3>

        <div v-if="analysis.document_file_path" class="attachment-item">
          <strong>Documento Original:</strong>
          <a :href="getFullMediaPath(analysis.document_file_path)" target="_blank" rel="noopener noreferrer">
            {{ analysis.document_file_path.split('/').pop() }}
          </a>
        </div>

        <div v-if="analysis.data_file_path" class="attachment-item">
          <strong>Ficheiro de Dados:</strong>
          <a :href="getFullMediaPath(analysis.data_file_path)" target="_blank" rel="noopener noreferrer">
            {{ analysis.data_file_path.split('/').pop() }}
          </a>
        </div>

        <div v-if="analysis.reference_links" class="attachment-item">
          <strong>Links de Referência:</strong>
          <ul>
            <li v-for="(link, index) in analysis.reference_links.split('\n').filter(l => l.trim() !== '')"
                :key="index">
              <a :href="link" target="_blank" rel="noopener noreferrer">{{ link }}</a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const route = useRoute();
const analysis = ref(null);
const isLoading = ref(true);
const error = ref(null);

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

marked.use({
  hooks: {
    postprocess(html) {
      return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
    }
  }
});

const renderedContent = computed(() => {
  if (!analysis.value?.content) return '';
  let processedContent = analysis.value.content;

  const markdownRegex = /(!\[.*?\]\()(\/src\/uploads\/.*?)\)/g;
  processedContent = processedContent.replace(markdownRegex, `$1${API_BASE_URL}$2)`);

  const htmlRegex = /(<img[^>]*src=")(\/src\/uploads\/.*?)"/g;
  processedContent = processedContent.replace(htmlRegex, `$1${API_BASE_URL}$2"`);

  return marked(processedContent);
});

const getFullMediaPath = (path) => {
  if (!path) return '';
  return `${API_BASE_URL}/${path}`;
};

onMounted(async () => {
  const analysisId = route.params.id;
  if (!analysisId) {
    error.value = "ID da análise não fornecido.";
    isLoading.value = false;
    return;
  }
  
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_BASE_URL}/api/admin/analyses/${analysisId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 30000
    });
    
    if (response.status === 404) throw new Error('Análise não encontrada.');
    
    analysis.value = response.data.data;
  } catch (err) {
    error.value = err.message;
  } finally {
    isLoading.value = false;
  }
});
</script>

<style lang="less" scoped>
:root {
  --admin-primary-color: #2563eb;
  --admin-primary-hover: #1e40af;
  --admin-text-color: #1f2937;
  --admin-text-light: #6b7280;
  --admin-surface-color: #ffffff;
  --admin-border-color: #e5e7eb;
  --admin-bg-color: #f9fafb;
  --border-radius: 10px;
  --box-shadow: 0 6px 16px rgba(0,0,0,0.05);
}

.article-preview-container {
  max-width: 780px;
  margin: 2rem auto;
  padding: 2.5rem;
  background-color: var(--admin-surface-color);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  line-height: 1.7;
  font-family: 'Georgia', serif;
}

/* Botão voltar */
.back-button {
  display: inline-block;
  background: none;
  border: none;
  color: var(--admin-primary-color);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 1rem;
}
.back-button:hover {
  text-decoration: underline;
  color: var(--admin-primary-hover);
}

/* Cabeçalho */
.article-header h1 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  line-height: 1.3;
}
.article-body :deep(img) {
  width: 50%;
  max-width: 500px;
  height: auto;
  margin: 2rem auto;
  display: block;
  border-radius: 6px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.12);
  border: 1px solid var(--admin-border-color);
}

.article-meta {
  margin-bottom: 2rem;
  font-size: 0.95rem;
  color: var(--admin-text-light);
}

.author-name {
  font-weight: 600;
  color: var(--admin-text-color);
}

/* Imagem destacada */
.featured-image {
  margin-bottom: 2rem;
  text-align: center;
}
.featured-image img {
  width: 100%;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
}

/* Corpo */
.article-body {
  font-size: 1.1rem;
  color: var(--admin-text-color);
}
.article-body :deep(p) {
  margin-bottom: 1.2rem;
  text-align: justify;
}

/* Rodapé */
.article-footer {
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--admin-border-color);
}
.article-footer h3 {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  font-weight: 600;
}
.attachment-item {
  margin-bottom: 1rem;
}

/* Responsivo */
@media (max-width: 768px) {
  .article-preview-container {
    padding: 1.5rem;
  }
  .article-header h1 {
    font-size: 1.6rem;
  }
}
</style>
