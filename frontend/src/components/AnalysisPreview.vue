<template>
  <section class="content-section">
    <div class="content-header">
      <h2>Pré-visualização da Análise</h2>
    </div>
    <div class="markdown-preview">
      <h1>{{ analysis.title || 'Título da Análise' }}</h1>
      <p><strong>Tag:</strong> {{ analysis.tag || 'N/A' }}</p>
      <p><strong>Autor(es):</strong> {{ analysis.author || 'N/A' }}</p>
      <p><strong>Data da Pesquisa:</strong> {{ analysis.researchDate || 'N/A' }}</p>
      <p><strong>Descrição:</strong> {{ analysis.description || 'N/A' }}</p>
      
      <hr>
      <h3>Conteúdo Principal:</h3>
      <div v-html="renderedContent"></div> 
      
      <template v-if="analysis.referenceLinks && analysis.referenceLinks.trim()">
        <hr>
        <h3>Links de Referência:</h3>
        <ul>
          <li v-for="(link, index) in analysis.referenceLinks.split('\n').filter(l => l.trim() !== '')" :key="index">
            <a :href="link.startsWith('http') ? link : `//${link}`" target="_blank" rel="noopener noreferrer">{{ link }}</a>
          </li>
        </ul>
      </template>

      <template v-if="hasAttachments">
         <hr>
         <h3>Anexos:</h3>
         <div v-if="finalCoverImageUrl" class="attachment-item">
            <strong>Imagem de Capa:</strong>
            <a :href="getFullUrl(finalCoverImageUrl)" target="_blank">
                <img :src="getFullUrl(finalCoverImageUrl)" alt="Imagem de capa" class="attachment-preview-image">
            </a>
         </div>
         <div v-if="analysis.documentFiles && analysis.documentFiles.length > 0">
            <strong>Documentos Originais:</strong>
            <ul>
                <li v-for="doc in analysis.documentFiles" :key="doc.originalName">
                    <a :href="getFullUrl(doc.path)" target="_blank" rel="noopener noreferrer">{{ doc.originalName }}</a>
                </li>
            </ul>
         </div>
         <div v-if="analysis.dataFiles && analysis.dataFiles.length > 0">
            <strong>Ficheiros de Dados:</strong>
            <div v-for="file in analysis.dataFiles" :key="file.originalName" class="data-file-item">
                <a :href="getFullUrl(file.path)" target="_blank" rel="noopener noreferrer">{{ file.originalName }}</a>
                <button type="button" @click="$emit('view-data', file)" class="btn-visualizar">Visualizar Dados</button>
            </div>
         </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { marked } from 'marked';

const props = defineProps({
  analysis: { type: Object, required: true },
  coverImagePreviewUrl: { type: String, default: '' },
  // [NOVO] Aceita um Map de novas imagens de conteúdo dos componentes pais
  newContentImages: { type: Map, default: () => new Map() }
});

defineEmits(['view-data']);

const API_BASE_URL = 'http://localhost:3000';

const getFullUrl = (path) => {
    if (!path) return '#';
    if (path.startsWith('http') || path.startsWith('blob:')) {
        return path;
    }
    return `${API_BASE_URL}/${path.startsWith('/') ? path.substring(1) : path}`;
};

const finalCoverImageUrl = computed(() => {
    if (props.coverImagePreviewUrl) return props.coverImagePreviewUrl;
    if (typeof props.analysis.coverImage === 'string') return props.analysis.coverImage;
    return null;
});

// [LÓGICA DE RENDERIZAÇÃO CORRIGIDA E CENTRALIZADA]
const renderedContent = computed(() => {
  if (!props.analysis || !props.analysis.content) {
      return '<p><em>...</em></p>';
  }

  let processedContent = props.analysis.content;

  // ETAPA 1: Substitui os placeholders de NOVAS imagens (vindas do Map) por seus URLs de pré-visualização (blob:)
  // Esta lógica agora vive aqui, no componente de preview.
  if (props.newContentImages.size > 0) {
    for (const [placeholderId, imageData] of props.newContentImages.entries()) {
      const placeholderRegex = new RegExp(placeholderId.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
      if (imageData.blobUrl) {
        processedContent = processedContent.replace(placeholderRegex, imageData.blobUrl);
      }
    }
  }

  // ETAPA 2: Garante que TODAS as imagens já salvas (com caminho relativo /uploads/) tenham o URL completo do backend
  // Isso corrige a exibição de imagens ao editar uma análise existente.
  const relativePathRegex = /(!\[.*?\]\()(\/uploads\/.*?)\)/g;
  processedContent = processedContent.replace(relativePathRegex, `$1${API_BASE_URL}$2)`);

  // ETAPA 3: Converte o Markdown final para HTML
  return marked(processedContent);
});


const hasAttachments = computed(() => {
    return finalCoverImageUrl.value || 
           (props.analysis.documentFiles?.length > 0) ||
           (props.analysis.dataFiles?.length > 0);
});
</script>

<style scoped>
/* Seus estilos .scoped completos aqui */
.content-section{padding:var(--spacing-lg);max-width:1200px;margin:0 auto}.content-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem}.markdown-preview{background-color:#fff;border:1px solid #ccc;padding:1rem 1.5rem;min-height:420px;border-radius:4px;line-height:1.7;color:#333}.markdown-preview :deep(h1),.markdown-preview :deep(h2),.markdown-preview :deep(h3){border-bottom:1px solid #eee;padding-bottom:.3em;margin-top:1.5em;margin-bottom:1em}.markdown-preview :deep(img){max-width:100%;height:auto;border-radius:8px;margin:1em 0}.data-file-item{display:flex;justify-content:space-between;align-items:center;padding:.5rem;background-color:#f8f9fa;border-radius:4px;margin-top:.5rem}.btn-visualizar{background-color:#007bff;color:#fff;border:none;padding:.4rem .8rem;border-radius:4px;cursor:pointer}.attachment-item{margin-bottom:1rem;}.attachment-preview-image{max-width:250px;margin-top:.5rem;border-radius:8px;border:1px solid #dee2e6;display:block;}.data-file-item a, ul a{color:#0056b3;text-decoration:none;}.data-file-item a:hover, ul a:hover{text-decoration:underline;}
</style>