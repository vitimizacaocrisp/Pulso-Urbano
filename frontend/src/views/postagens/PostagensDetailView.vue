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
        <router-link to="/categoria" class="btn-secondary">Voltar ao índice</router-link>
      </div>
    </div>

    <div v-else-if="analysis" class="content-animate">

      <!-- CABEÇALHO DA PESQUISA — só aparece se with_header for false -->
      <header v-if="!analysis.with_header" class="article-hero">
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
              <!-- Autor -->
              <div class="author-block">
                <div class="author-avatar-placeholder">{{ analysis.author.charAt(0) }}</div>
                <div class="author-details">
                  <span class="by">Escrito por</span>
                  <span class="name">{{ analysis.author }}</span>
                </div>
              </div>

              <!-- Data -->
              <div class="date-block">
                <i class="far fa-calendar-alt"></i>
                <span>{{ new Date(analysis.last_update || analysis.created_at).toLocaleDateString() }}</span>
              </div>

              <!-- Nacionalidade -->
              <div v-if="analysis.nationality" class="meta-tag-block">
                <i class="fas fa-globe-americas"></i>
                <span>{{ analysis.nationality }}</span>
              </div>

              <!-- Estados -->
              <div v-if="analysis.states && analysis.states.length" class="meta-tag-block">
                <i class="fas fa-map-marker-alt"></i>
                <div class="tag-list">
                  <span
                    v-for="(state, idx) in analysis.states"
                    :key="'state-' + idx"
                    class="meta-tag"
                  >{{ state }}</span>
                </div>
              </div>

              <!-- Cidades -->
              <div v-if="analysis.cities && analysis.cities.length" class="meta-tag-block">
                <i class="fas fa-city"></i>
                <div class="tag-list">
                  <span
                    v-for="(city, idx) in analysis.cities"
                    :key="'city-' + idx"
                    class="meta-tag"
                  >{{ city }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Se with_header for true: exibe apenas o botão Voltar fora do hero -->
      <div v-else class="back-only-bar">
        <button class="back-link-plain" @click="$router.back()">
          <i class="fas fa-arrow-left"></i> Voltar
        </button>
      </div>

      <article class="article-body-wrapper" :class="{ 'full-width': analysis.with_header && analysis.with_footer }">
        <div class="content-container" :class="{ 'content-container--full': analysis.with_header && analysis.with_footer }">
          <div class="preview-content-wrapper">
            <IsolatedRenderer :content="renderedContent" />
          </div>

          <!-- FOOTER DA PESQUISA — só aparece se with_footer for false -->
          <section v-if="!analysis.with_footer && hasAttachments" class="attachments-section">
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
            </div>
          </section>

          <!-- Aviso quando with_footer é true e o footer já está no conteúdo -->
          <!-- (Nenhum footer extra é renderizado aqui — o conteúdo já o contém) -->

        </div>
      </article>
    </div>
  </div>
  <MeuFooter />
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import MeuHeader from '@/components/MeuHeader.vue';
import MeuFooter from '@/components/MeuFooter.vue';
import IsolatedRenderer from '@/components/IsolatedRenderer.vue';

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
  if (!analysis.value?.content) return '<p><em>Conteúdo não disponível.</em></p>';

  let content = analysis.value.content.trim();

  if (content.includes('&lt;') && content.includes('&gt;')) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = content;
    content = textarea.value;
  }

  content = content.replace(
    /(src=["']|href=["']|url\()(\/uploads\/.*?)(["'])/g,
    `$1${API_BASE_URL}$2$3`
  );

  if (content.startsWith('```html')) {
    content = content.replace(/^```html\s*/i, '').replace(/\s*```$/, '').trim();
  }

  const isHTML = /^</.test(content);

  return isHTML ? content : `<p>${content}</p>`;
});

const hasAttachments = computed(() => {
  return analysis.value && analysis.value.reference_links && analysis.value.reference_links.trim() !== '';
});

const fetchAnalysis = async (id) => {
  if (!id) {
    error.value = "ID da análise não fornecido.";
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_BASE_URL}/api/admin/analyses/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    analysis.value = response.data.data;
  } catch (err) {
    console.error("Falha ao buscar análise:", err);
    error.value = err.response?.data?.message || 'Não foi possível carregar a análise.';
    analysis.value = null;
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchAnalysis(route.params.id);
});

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      fetchAnalysis(newId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
);
</script>

<style scoped>
.page-background {
  background-color: #ffffff;
  min-height: 100vh;
}

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

/* ── Cabeçalho hero ── */
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
  filter: blur(8px);
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
  align-items: flex-start;
  gap: 1.5rem 2rem;
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

/* Novos blocos de metadados (nationality, states, cities) */
.meta-tag-block {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  color: #cbd5e1;
  font-size: 0.9rem;
}
.meta-tag-block i {
  margin-top: 3px;
  flex-shrink: 0;
  color: #94a3b8;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.meta-tag {
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 20px;
  padding: 0.15rem 0.6rem;
  font-size: 0.8rem;
  color: #e2e8f0;
  backdrop-filter: blur(4px);
  white-space: nowrap;
}

/* Barra de voltar quando o cabeçalho está desativado (with_header = true) */
.back-only-bar {
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.back-link-plain {
  background: none;
  border: 1px solid #cbd5e1;
  color: #334155;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  transition: background 0.2s, color 0.2s;
}
.back-link-plain:hover { background: #e2e8f0; color: #0f172a; }

/* ── Corpo do artigo ── */
.article-body-wrapper {
  background: white;
  position: relative;
  z-index: 3;
  padding-bottom: 4rem;
}

/* Quando with_header e with_footer são true: remove restrições de largura */
.article-body-wrapper.full-width {
  padding-bottom: 0;
}
.content-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
}
.content-container--full {
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}
.content-container--full .preview-content-wrapper {
  margin: 0 !important;
}

.preview-content-wrapper {
  margin: 2rem 0;
}

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

@media (max-width: 768px) {
  .hero-title { font-size: 2.5rem; }
  .hero-container { padding: 3rem 1rem; }
  .content-container { padding: 2rem 1rem; }
}
</style>