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
import axios from 'axios';
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

// [CORRIGIDO] A propriedade computada agora processa tanto Markdown quanto HTML
const renderedContent = computed(() => {
    if (!analysis.value?.content) return '';

    let processedContent = analysis.value.content;

    // 1. Encontra e corrige os caminhos de imagem em formato MARKDOWN `![...](/uploads/...)`
    const markdownRegex = /(!\[.*?\]\()(\/src\/uploads\/.*?)\)/g;
    processedContent = processedContent.replace(markdownRegex, `$1${API_BASE_URL}$2)`);

    // 2. Encontra e corrige os caminhos de imagem em formato HTML `<img src="/uploads/...">`
    const htmlRegex = /(<img[^>]*src=")(\/src\/uploads\/.*?)"/g;
    processedContent = processedContent.replace(htmlRegex, `$1${API_BASE_URL}$2"`);
    
    // Agora, com todos os caminhos corrigidos, renderiza o conteúdo
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
    const token = localStorage.getItem('authToken'); // Assumindo que a rota ainda é protegida
    const response = await axios.get(`${API_BASE_URL}/api/admin/analyses/${analysisId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 30000 // 30 segundos para aguardar a resposta
    });
    
    if (response.status === 404) throw new Error('Análise não encontrada.');
    if (!response.ok) throw new Error('Falha ao carregar os dados da análise.');
    
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
  --admin-primary-color: #2563eb; /* azul formal */
  --admin-primary-hover: #1e40af;
  --admin-text-color: #1f2937; /* cinza escuro */
  --admin-text-light: #4b5563; 
  --admin-surface-color: #ffffff;
  --admin-border-color: #e5e7eb;
  --admin-bg-color: #f9fafb;
  --admin-font-family: Georgia, 'Times New Roman', serif; /* tipografia mais acadêmica */
  --border-radius: 8px;
  --box-shadow: 0 6px 20px rgba(0,0,0,0.06);
}

/* --- Área principal --- */
.content-section {
  padding: 2rem;
  background-color: var(--admin-bg-color);
}

.article-preview-container {
  max-width: 960px; /* maior largura para leitura */
  margin: 0 auto;
  background-color: var(--admin-surface-color);
  padding: 3rem 4rem;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  font-family: var(--admin-font-family);
  line-height: 1.8;
}

/* --- Cabeçalho --- */
.article-header h1 {
  font-size: 2.4rem;
  font-weight: 700;
  text-align: center;
  line-height: 1.3;
  margin: 0 0 2rem;
}

.article-meta {
  text-align: center;
  font-size: 0.95rem;
  color: var(--admin-text-light);
  margin-bottom: 2.5rem;
  border-bottom: 1px solid var(--admin-border-color);
  padding-bottom: 1.2rem;
}

.tag-badge {
  background-color: #dbeafe;
  color: var(--admin-primary-color);
  padding: 0.25rem 0.7rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

/* --- Corpo --- */
.article-body {
  font-size: 1.15rem;
  color: var(--admin-text-color);
}

.article-body :deep(h2),
.article-body :deep(h3) {
  font-weight: 600;
  margin-top: 2.2rem;
  margin-bottom: 1.2rem;
  border-bottom: 2px solid #f3f4f6;
  padding-bottom: 0.3rem;
}

.article-body :deep(p) {
  margin-bottom: 1.4rem;
  text-align: justify;
}

/* --- Imagens no conteúdo --- */
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

/* Legendas de imagens */
.article-body :deep(figure) {
  text-align: center;
  margin: 2rem auto;
}
.article-body :deep(figcaption) {
  font-size: 0.9rem;
  color: var(--admin-text-light);
  margin-top: 0.6rem;
  font-style: italic;
}

/* Citações */
.article-body :deep(blockquote) {
  border-left: 4px solid var(--admin-primary-color);
  padding-left: 1.5rem;
  margin: 2rem 0;
  font-style: italic;
  color: var(--admin-text-light);
}

/* Listas */
.article-body :deep(ul),
.article-body :deep(ol) {
  margin-bottom: 1.5rem;
  padding-left: 2rem;
}

/* Código */
.article-body :deep(pre) {
  background-color: #f3f4f6;
  padding: 1.2rem;
  border-radius: 6px;
  border: 1px solid var(--admin-border-color);
  overflow-x: auto;
  font-size: 0.95rem;
}

/* Links */
.article-body :deep(a) {
  color: var(--admin-primary-color);
  text-decoration: none;
  font-weight: 500;
}
.article-body :deep(a:hover) {
  text-decoration: underline;
  color: var(--admin-primary-hover);
}

/* --- Rodapé / Referências --- */
.article-footer {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 2px solid var(--admin-border-color);
}

.article-footer h3 {
  font-size: 1.25rem;
  margin-bottom: 1.2rem;
  font-weight: 600;
  text-align: left;
}

.attachment-item {
  margin-bottom: 1.2rem;
  font-size: 1rem;
}

.attachment-preview-image {
  max-width: 400px;
  margin-top: 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--admin-border-color);
}

/* --- Responsividade detalhada --- */
@media (max-width: 1200px) {
  .article-preview-container {
    max-width: 90%;
    padding: 2.5rem;
  }
}

@media (max-width: 992px) {
  .article-header h1 {
    font-size: 2rem;
  }
  .article-body {
    font-size: 1.05rem;
  }
}

@media (max-width: 768px) {
  .article-preview-container {
    padding: 1.8rem;
  }
  .article-header h1 {
    font-size: 1.8rem;
  }
  .article-body :deep(img) {
    max-width: 100%;
  }
}

@media (max-width: 576px) {
  .article-preview-container {
    padding: 1.2rem;
  }
  .article-header h1 {
    font-size: 1.5rem;
  }
  .article-body {
    font-size: 1rem;
  }
  .article-footer h3 {
    font-size: 1.1rem;
  }
}

</style>