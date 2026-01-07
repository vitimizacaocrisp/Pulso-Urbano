<template>
<MeuHeader />
  <div class="page-background">
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>A carregar análise...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-box">
        <i class="fas fa-exclamation-triangle"></i>
        <p>{{ error }}</p>
        <router-link to="/posts" class="btn-secondary">Voltar ao índice</router-link>
      </div>
    </div>

    <div v-else-if="analysis" class="content-animate">
        <!-- Hero Header -->
        <header class="article-hero">
            <div class="hero-bg" :style="analysis.cover_image_path ? `background-image: url(${getFullMediaPath(analysis.cover_image_path)})` : ''"></div>
            <div class="hero-overlay"></div>
            <div class="hero-container">
                 <button class="back-link" @click="$router.back()">
                    <i class="fas fa-arrow-left"></i> Voltar
                 </button>
                 <div class="hero-text">
                    <span class="hero-category" v-if="analysis.category">{{ analysis.category }}</span>
                    <h1 class="hero-title">{{ analysis.title }}</h1>
                    <p class="hero-subtitle" v-if="analysis.subtitle">{{ analysis.subtitle }}</p>
                    
                    <div class="hero-meta">
                        <div class="author-block">
                             <div class="author-avatar-placeholder">{{ analysis.author.charAt(0) }}</div>
                             <div class="author-details">
                                <span class="by">Escrito por</span>
                                <span class="name">{{ analysis.author }}</span>
                             </div>
                        </div>
                        <div class="date-block">
                            <i class="far fa-calendar-alt"></i>
                            <span>{{ new Date(analysis.last_update || analysis.created_at).toLocaleDateString() }}</span>
                        </div>
                    </div>
                 </div>
            </div>
        </header>

        <article class="article-body-wrapper">
            <div class="content-container">
                <!-- Description/Lead -->
                <div class="article-lead" v-if="analysis.description">
                    {{ analysis.description }}
                </div>
                
                <hr class="divider">

                <!-- Main Content -->
                <div class="preview-content" v-html="renderedContent"></div>
                
                <!-- Attachments Section -->
                <section v-if="hasAttachments" class="attachments-section">
                    <h3 class="section-heading"><i class="fas fa-paperclip"></i> Referências e Anexos</h3>
                    
                    <div class="attachments-grid">
                        <div v-if="analysis.reference_links" class="attach-card links">
                            <h4>Links Externos</h4>
                            <ul class="link-list">
                                <li v-for="(link, idx) in analysis.reference_links.split('\n').filter(l => l.trim() !== '')" :key="idx">
                                    <a :href="link.startsWith('http') ? link : `//${link}`" target="_blank" rel="noopener noreferrer">
                                        <i class="fas fa-external-link-alt"></i> {{ link }}
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div v-if="analysis.document_file_path && analysis.document_file_path.length > 0" class="attach-card docs">
                            <h4>Documentos</h4>
                            <ul class="file-list">
                                <li v-for="doc in analysis.document_file_path" :key="doc.path">
                                    <a :href="getFullMediaPath(doc.path)" target="_blank" rel="noopener noreferrer" class="file-link">
                                        <i class="far fa-file-pdf"></i>
                                        <span>{{ doc.originalName }}</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                        
                        <div v-if="analysis.data_file_path && analysis.data_file_path.length > 0" class="attach-card data">
                            <h4>Dados Brutos</h4>
                            <ul class="file-list">
                                <li v-for="file in analysis.data_file_path" :key="file.path">
                                    <a :href="getFullMediaPath(file.path)" target="_blank" rel="noopener noreferrer" class="file-link">
                                        <i class="far fa-file-excel"></i>
                                        <span>{{ file.originalName }}</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>
            </div>
        </article>
    </div>
  </div>
  <MeuFooter />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import { marked } from 'marked';
import MeuHeader from '@/components/MeuHeader.vue';
import MeuFooter from '@/components/MeuFooter.vue';


const route = useRoute();
const analysis = ref(null);
const isLoading = ref(true);
const error = ref(null);

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

const getFullMediaPath = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const renderedContent = computed(() => {
  if (!analysis.value?.content) return '';
  
  let processedContent = analysis.value.content.trim();

  const relativePathRegex = /(src=["']|href=["']|url\()(\/uploads\/.*?)(["')])/g;
  processedContent = processedContent.replace(relativePathRegex, `$1${API_BASE_URL}$2$3`);

  if (processedContent.startsWith('```html') && processedContent.endsWith('```')) {
    return processedContent.replace(/^```html\s*/i, '').replace(/\s*```$/, '').trim();
  }
  
  const hasHTMLTags = /<[a-z][\s\S]*>/i.test(processedContent);
  const hasMarkdownSyntax = /^# |\*\*.*\*\*|__.*__|\[.*\]\(.*\)|\* .*|```/.test(processedContent);
  
  if (hasHTMLTags && !hasMarkdownSyntax) {
    return processedContent;
  }
  
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
.page-background {
    background-color: #ffffff;
    min-height: 100vh;
}

/* Loading & Error States */
.loading-state, .error-state {
    height: 60vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #64748b;
}
.spinner {
    border: 3px solid #e2e8f0;
    border-top: 3px solid #6366f1;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.error-box {
    text-align: center;
    background: #fef2f2;
    padding: 2rem;
    border-radius: 12px;
    color: #991b1b;
}
.error-box i { font-size: 2rem; margin-bottom: 1rem; }
.btn-secondary {
    display: inline-block;
    margin-top: 1rem;
    color: #991b1b;
    text-decoration: underline;
}

/* HERO SECTION - ESTILO CINEMATOGRÁFICO */
.article-hero {
    position: relative;
    background-color: #0f172a;
    color: white;
    min-height: 500px;
    display: flex;
    align-items: center;
    overflow: hidden;
}
.hero-bg {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background-size: cover;
    background-position: center;
    opacity: 0.4;
    filter: blur(8px); /* Blur suave para focar no texto */
    transform: scale(1.1);
}
.hero-overlay {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(to bottom, rgba(15,23,42,0.3), rgba(15,23,42,0.95));
}
.hero-container {
    position: relative;
    z-index: 2;
    max-width: 900px;
    margin: 0 auto;
    padding: 4rem 1.5rem;
    width: 100%;
}
.back-link {
    background: rgba(255,255,255,0.1);
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    cursor: pointer;
    margin-bottom: 2rem;
    transition: background 0.2s;
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
}
.back-link:hover { background: rgba(255,255,255,0.2); }

.hero-category {
    display: inline-block;
    background: #6366f1;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 1rem;
}
.hero-title {
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 0.5rem;
    letter-spacing: -1px;
}
.hero-subtitle {
    font-size: 1.5rem;
    color: #cbd5e1;
    font-weight: 300;
    margin-bottom: 2rem;
    line-height: 1.4;
}

.hero-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2rem;
    margin-top: 2rem;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 2rem;
}
.author-block { display: flex; align-items: center; gap: 0.75rem; }
.author-avatar-placeholder {
    width: 40px; height: 40px; background: #475569; color: white;
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-weight: bold; font-size: 1.2rem;
}
.author-details { display: flex; flex-direction: column; }
.author-details .by { font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; }
.author-details .name { font-weight: 700; font-size: 1rem; }
.date-block { display: flex; align-items: center; gap: 0.5rem; color: #cbd5e1; font-size: 0.9rem; }

/* CONTENT BODY */
.article-body-wrapper {
    background: white;
    position: relative;
    z-index: 3;
    padding-bottom: 4rem;
}
.content-container {
    max-width: 800px; /* Largura ideal para leitura (65-75 chars) */
    margin: 0 auto;
    padding: 3rem 1.5rem;
}

.article-lead {
    font-size: 1.35rem;
    line-height: 1.6;
    color: #334155;
    font-weight: 500; /* Medium font weight para destaque */
    margin-bottom: 2rem;
    font-family: serif; /* Opcional: serif para o lead dá ar jornalístico */
}

.divider {
    border: 0;
    height: 1px;
    background: #e2e8f0;
    margin: 2rem auto;
    width: 100px; /* Separador pequeno e elegante */
}

/* Typography do Conteúdo */
:deep(.preview-content) {
    font-family: 'Georgia', serif; /* Serif para corpo do texto é melhor para leitura longa */
    font-size: 1.125rem;
    line-height: 1.8;
    color: #1e293b;
}
:deep(.preview-content p) { margin-bottom: 1.5em; }
:deep(.preview-content h2) {
    font-family: 'Inter', sans-serif;
    font-size: 2rem;
    font-weight: 700;
    margin-top: 2.5rem;
    margin-bottom: 1rem;
    color: #0f172a;
}
:deep(.preview-content h3) {
    font-family: 'Inter', sans-serif;
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 2rem;
    margin-bottom: 0.75rem;
    color: #334155;
}
:deep(.preview-content blockquote) {
    border-left: 4px solid #6366f1;
    padding-left: 1.5rem;
    margin: 2rem 0;
    font-style: italic;
    color: #475569;
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 0 8px 8px 0;
}
:deep(.preview-content img) {
    width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 2rem 0;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}
:deep(.preview-content a) {
    color: #6366f1;
    text-decoration: underline;
    text-underline-offset: 2px;
}

/* ATTACHMENTS SECTION */
.attachments-section {
    margin-top: 4rem;
    background: #f8fafc;
    border-radius: 12px;
    padding: 2rem;
    border: 1px solid #e2e8f0;
}
.section-heading {
    font-size: 1.25rem;
    color: #0f172a;
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #cbd5e1;
    display: inline-block;
}
.attachments-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
}
.attach-card h4 {
    font-size: 0.9rem;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 1rem;
    font-weight: 700;
}
.file-list, .link-list {
    list-style: none;
    padding: 0;
}
.file-list li, .link-list li { margin-bottom: 0.75rem; }
.file-link, .link-list a {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: #334155;
    font-size: 0.95rem;
    padding: 0.5rem;
    border-radius: 6px;
    transition: background 0.2s;
}
.file-link:hover, .link-list a:hover {
    background: #e2e8f0;
    color: #2563eb;
}

/* Responsividade */
@media (max-width: 768px) {
    .hero-title { font-size: 2.5rem; }
    .hero-container { padding: 3rem 1rem; }
    .content-container { padding: 2rem 1rem; }
}
</style>