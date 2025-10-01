<template>
  <div>
    <div v-if="isLoading" class="placeholder-container">
      <p>A carregar análise...</p>
    </div>

    <div v-else-if="error" class="placeholder-container error">
      <p>{{ error }}</p>
      <router-link to="/posts">Voltar</router-link>
    </div>

    <div v-else-if="analysis">
        <div class="back-button-wrapper">
             <button class="back-button" @click="$router.back()">← Voltar</button>
        </div>

        <section class="news-preview">
            <div class="preview-cover" v-if="analysis.cover_image_path">
                <img :src="getFullMediaPath(analysis.cover_image_path)" alt="Imagem de Capa" class="cover-image" />
            </div>
            <div class="preview-header">
                <h1 class="preview-title">{{ analysis.title || 'Título da Análise' }}</h1>
                <h2 v-if="analysis.subtitle" class="preview-subtitle">{{ analysis.subtitle }}</h2>
                <div class="preview-meta">
                    <span class="preview-category" v-if="analysis.category">{{ analysis.category }}</span>
                    <span class="preview-date" v-if="analysis.last_update">Atualizado em: {{ new Date(analysis.last_update).toLocaleDateString() }}</span>
                    <span class="preview-author" v-if="analysis.author">Por {{ analysis.author }}</span>
                </div>
            </div>
            <div class="preview-description" v-if="analysis.description">
                {{ analysis.description }}
            </div>
            <div class="preview-content" v-html="renderedContent"></div>
            
            <div v-if="hasAttachments">
                <h3 class="preview-section-title">Referências e Anexos:</h3>
                
                <ul class="preview-links" v-if="analysis.reference_links">
                    <li v-for="(link, idx) in analysis.reference_links.split('\n').filter(l => l.trim() !== '')" :key="idx">
                        <a :href="link.startsWith('http') ? link : `//${link}`" target="_blank" rel="noopener noreferrer">{{ link }}</a>
                    </li>
                </ul>

                <div class="preview-attachments">
                    <div v-if="analysis.document_file_path && analysis.document_file_path.length > 0" class="attachment-group">
                        <strong>Documentos Originais:</strong>
                        <ul>
                            <li v-for="doc in analysis.document_file_path" :key="doc.path">
                                <a :href="getFullMediaPath(doc.path)" target="_blank" rel="noopener noreferrer">{{ doc.originalName }}</a>
                            </li>
                        </ul>
                    </div>
                    
                    <div v-if="analysis.data_file_path && analysis.data_file_path.length > 0" class="attachment-group">
                        <strong>Ficheiros de Dados:</strong>
                        <ul>
                            <li v-for="file in analysis.data_file_path" :key="file.path" class="data-file-item">
                                <a :href="getFullMediaPath(file.path)" target="_blank" rel="noopener noreferrer">{{ file.originalName }}</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import { marked } from 'marked';

const route = useRoute();
const analysis = ref(null);
const isLoading = ref(true);
const error = ref(null);

const API_BASE_URL = 'http://localhost:3000' || process.env.VUE_APP_API_UR;

const getFullMediaPath = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const renderedContent = computed(() => {
  if (!analysis.value?.content) return '';
  let processedContent = analysis.value.content;

  // Garante que os caminhos de mídia no conteúdo sejam absolutos
  const relativePathRegex = /(src=["']|href=["']|url\()(\/uploads\/.*?)(["')])/g;
  processedContent = processedContent.replace(relativePathRegex, `$1${API_BASE_URL}$2$3`);

  return marked(processedContent);
});

const hasAttachments = computed(() => {
    if (!analysis.value) return false;
    return (
        analysis.value.reference_links ||
        (analysis.value.document_file_path && analysis.value.document_file_path.length > 0) ||
        (analysis.value.data_file_path && analysis.value.data_file_path.length > 0)
    );
});

onMounted(async () => {
  const analysisId = route.params.id;
  if (!analysisId) {
    error.value = "ID da análise não fornecido.";
    isLoading.value = false;
    return;
  }
  
  try {
    // A rota para buscar uma análise pública pode ser diferente, ajuste se necessário
    const response = await axios.get(`${API_BASE_URL}/api/analyses/${analysisId}`);
    analysis.value = response.data.data;
  } catch (err) {
    console.error("Falha ao buscar análise:", err);
    error.value = err.response?.data?.message || 'Não foi possível carregar a análise.';
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
/* Estilos unificados da pré-visualização */
.placeholder-container {
    text-align: center;
    padding: 4rem 1rem;
    color: #6c757d;
}
.placeholder-container.error {
    color: #dc3545;
}
.back-button-wrapper {
    max-width: 1000px;
    margin: 1rem auto 0;
    padding: 0 1rem;
}
.back-button {
    background: #f0f0f0;
    border: 1px solid #ccc;
    padding: 0.5rem 1rem;
    border-radius: 5px;
    cursor: pointer;
    font-weight: 500;
}
.back-button:hover {
    background-color: #e0e0e0;
}

.news-preview { max-width: 1000px; margin: 1rem auto 3rem; background: #fff; border-radius: 10px; box-shadow: 0 6px 24px rgba(0,0,0,0.07); overflow: hidden; padding-bottom: 2rem; }
.preview-cover { width: 100%; }
.cover-image { width: 100%; max-height: 400px; object-fit: cover; display: block; }
.preview-header { padding: 1.5rem 2rem 0.5rem 2rem; text-align: left; }
.preview-title { font-size: 2.5rem; color: #222; margin-bottom: 0.25rem; line-height: 1.1; font-weight: 900; letter-spacing: -1px; }
.preview-subtitle { font-size: 1.25rem; color: #009dc4; font-weight: 500; margin-bottom: 0.25rem; }
.preview-meta { font-size: 0.92rem; color: #888; margin-bottom: 0.7rem; display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; align-items: center; }
.preview-category { background: #009dc4; color: #fff; font-weight: 600; padding: 0.1em 0.75em; border-radius: 36px; font-size: 0.9em; }
.preview-description {  text-overflow: ellipsis; overflow-wrap: anywhere; padding: 0 2rem 1rem 2rem; font-size: 1.22rem; color: #333; font-weight: 400; }
.preview-content { padding: 1rem 2rem 0 2rem; font-size: 1.1rem; color: #212121; word-break: break-word; line-height: 1.7; }
.preview-section-title { padding: 1.5rem 2rem 0.5rem 2rem; color: #009dc4; font-weight: bold; font-size: 1.1rem; border-top: 1px solid #eee; margin-top: 2rem; }
.preview-links { padding: 0 2rem 1rem 2rem; list-style: disc inside; margin-bottom: 1rem; }
.preview-links a { color: #0079ba; text-decoration: none; }
.preview-links a:hover { text-decoration: underline; }
.preview-attachments { padding: 0 2rem 2rem 2rem; }
.preview-attachments ul { padding-left: 0; list-style: none; }
.preview-attachments strong { font-weight: 600; }
.attachment-group { margin-top: 1.5rem; }
.attachment-group a { color: #0079ba; text-decoration: none; }
.attachment-group a:hover { text-decoration: underline; }
.data-file-item { display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; }
:deep(.preview-content p) { margin-bottom: 1.2em; }
:deep(.preview-content h1), :deep(.preview-content h2), :deep(.preview-content h3) { margin-top: 2em; margin-bottom: 0.8em; line-height: 1.2; }
:deep(.preview-content a) { color: #0079ba; text-decoration: underline; }
:deep(.preview-content ul), :deep(.preview-content ol) { padding-left: 1.5em; margin-bottom: 1.2em; }
:deep(.preview-content figure) { margin: 2rem auto; text-align: center; }
:deep(.preview-content figcaption) { margin-top: 0.75rem; color: #6c757d; font-size: 0.9rem; font-style: italic; }
:deep(.preview-content img) { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
:deep(.preview-content video) { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); background-color: #000; outline: none; }
:deep(.preview-content audio) { width: 100%; max-width: 600px; margin: 1em auto; display: block; accent-color: #007bff; }

/* ESTILOS DE RESPONSIVIDADE */
@media (max-width: 800px) {
  .news-preview { max-width: 100%; border-radius: 0; box-shadow: none; }
  .cover-image { max-height: 250px; }
  .preview-header, .preview-description, .preview-content, .preview-section-title, .preview-links, .preview-attachments { padding-left: 1rem; padding-right: 1rem; }
  .preview-title { font-size: 2rem; }
}
@media (max-width: 500px) {
  .preview-title { font-size: 1.5rem; }
  .preview-content { font-size: 1rem; }
}
</style>