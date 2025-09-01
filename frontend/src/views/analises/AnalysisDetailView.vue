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
      <header class="article-header">
        <h1>{{ analysis.title }}</h1>
        <div class="article-meta">
            <span><strong>Autor(es):</strong> {{ analysis.author }}</span>
            <span><strong>Data:</strong> {{ analysis.research_date }}</span>
            <span><strong>Tag:</strong> <span class="tag-badge">{{ analysis.tag }}</span></span>
        </div>
      </header>
      
      <div class="article-body" v-html="renderedContent"></div>
      
      <footer v-if="analysis.reference_links || analysis.cover_image_path || analysis.document_file_path || analysis.data_file_path" class="article-footer">
        <h3>Referências e Anexos</h3>
        
        <div v-if="analysis.cover_image_path" class="attachment-item">
          <strong>Imagem de Capa:</strong>
          <img :src="getFullMediaPath(analysis.cover_image_path)" alt="Imagem de capa da análise" class="attachment-preview-image">
        </div>

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
                <li v-for="(link, index) in analysis.reference_links.split('\n').filter(l => l.trim() !== '')" :key="index">
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
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const route = useRoute();
const analysis = ref(null);
const isLoading = ref(true);
const error = ref(null);

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

// Configuração de segurança para o 'marked'
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

    // Garante que todas as imagens no conteúdo tenham o URL completo do backend
    const relativeImagePathRegex = /(<img[^>]*src=")(\/uploads\/.*?)"/g;
    processedContent = processedContent.replace(relativeImagePathRegex, `$1${API_BASE_URL}$2"`);
    
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
    const response = await fetch(`${API_BASE_URL}/api/admin/analyses/${analysisId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.status === 404) {
        throw new Error('Análise não encontrada.');
    }
    if (!response.ok) {
        throw new Error('Falha ao carregar os dados da análise.');
    }
    
    const result = await response.json();
    analysis.value = result.data;

  } catch (err) {
    error.value = err.message;
  } finally {
    isLoading.value = false;
  }
});
</script>
<style lang="less" scoped>
:root {
  --admin-primary-color: #007bff;
  --admin-text-color: #212529;
  --admin-text-light: #6c757d;
  --admin-surface-color: #ffffff;
  --admin-border-color: #dee2e6;
  --admin-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --border-radius: 8px;
  --box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

/* --- Layout Principal da Pré-visualização --- */
.content-section {
  padding: 2rem;
  background-color: #f4f6f8; /* Fundo do admin */
}

.article-preview-container {
  max-width: 800px; /* Largura otimizada para leitura */
  margin: 0 auto;
  background-color: var(--admin-surface-color);
  padding: 3rem;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  font-family: var(--admin-font-family);
}

/* --- Cabeçalho do Artigo --- */
.article-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--admin-text-color);
  margin-top: 0;
  margin-bottom: 1rem;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  color: var(--admin-text-light);
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--admin-border-color);
  font-size: 0.9em;
}

.tag-badge {
  background-color: #e7eefc;
  color: #0056b3;
  padding: 0.25rem 0.6rem;
  border-radius: 15px;
  font-weight: 600;
}

/* --- Corpo do Artigo (Conteúdo Markdown) --- */
.article-body {
  line-height: 1.8;
  color: var(--admin-text-color);
  font-size: 1.1rem;
}

.article-body :deep(h2),
.article-body :deep(h3) {
  font-weight: 600;
  margin-top: 2.5rem;
  margin-bottom: 1.2rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f0f0f0;
}

.article-body :deep(p) {
  margin-bottom: 1.2rem;
}

.article-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--border-radius);
  margin: 1.5rem 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.article-body :deep(blockquote) {
  border-left: 4px solid var(--admin-primary-color);
  padding-left: 1.5em;
  margin-left: 0;
  font-style: italic;
  color: var(--admin-text-light);
}

.article-body :deep(ul),
.article-body :deep(ol) {
    padding-left: 1.5em;
}

.article-body :deep(pre) {
  background-color: #f8f9fa;
  padding: 1em;
  border-radius: 5px;
  overflow-x: auto;
  border: 1px solid var(--admin-border-color);
}

.article-body :deep(a) {
    color: var(--admin-primary-color);
    text-decoration: none;
    font-weight: 500;
}

.article-body :deep(a:hover) {
    text-decoration: underline;
}
.article-body :deep(img) {
  width: 60%;
  max-width: 400px;
  height: auto;
  border-radius: var(--border-radius);
  margin: 1.5rem 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}


/* --- Rodapé do Artigo (Anexos) --- */
.article-footer {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--admin-border-color);
}

.article-footer h3 {
  font-size: 1.2rem;
  color: var(--admin-text-light);
  margin-bottom: 1.5rem;
}

.attachment-item {
  margin-bottom: 1rem;
  font-size: 1rem;
}

.attachment-preview-image {
  max-width: 250px;
  margin-top: 0.5rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--admin-border-color);
  display: block;
}

.placeholder-container {
  text-align: center;
  padding: 4rem;
  background-color: #fff;
  border-radius: 8px;
  color: #6c757d;
}
.placeholder-container.error {
    color: #dc3545;
}
/* --- Responsividade --- */
@media (max-width: 768px) {
  .article-preview-container {
    padding: 1.5rem;
  }
  .article-header h1 {
    font-size: 2rem;
  }
  .article-body {
    font-size: 1rem;
  }
}

</style>