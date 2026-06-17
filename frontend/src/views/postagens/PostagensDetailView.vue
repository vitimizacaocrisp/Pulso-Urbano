<template>
  <MeuHeader />
  <div class="page-background">
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>A carregar análise...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-box">
        <Icon icon="mdi:alert" />
        <p>{{ error }}</p>
        <router-link to="/" class="btn-secondary">Voltar ao início</router-link>
      </div>
    </div>

    <div v-else-if="analysis" class="content-animate">

      <!-- Cabeçalho hero — apenas quando with_header for false -->
      <header v-if="!analysis.with_header" class="article-hero">
        <div class="hero-bg" :style="heroBgStyle"></div>
        <div class="hero-overlay"></div>
        <div class="hero-container">
          <button class="back-link" @click="$router.back()">
            <Icon icon="mdi:arrow-left" /> Voltar
          </button>
          <div class="hero-text">
            <span class="hero-category" v-if="analysis.category">{{ analysis.category }}</span>
            <h1 class="hero-title">{{ analysis.title }}</h1>
            <p class="hero-subtitle" v-if="analysis.subtitle">{{ analysis.subtitle }}</p>
            <div class="hero-meta">
              <div class="author-block">
                <div class="author-avatar-placeholder">{{ analysis.author?.charAt(0) }}</div>
                <div class="author-details">
                  <span class="by">Escrito por</span>
                  <span class="name">{{ analysis.author }}</span>
                </div>
              </div>
              <div class="date-block">
                <Icon icon="mdi:calendar-blank-outline" />
                <span>{{ new Date(analysis.last_update || analysis.created_at).toLocaleDateString() }}</span>
              </div>
              <div v-if="analysis.nationality" class="meta-tag-block">
                <Icon icon="mdi:earth" />
                <span>{{ analysis.nationality }}</span>
              </div>
              <div v-if="analysis.states && analysis.states.length" class="meta-tag-block">
                <Icon icon="mdi:map-marker" />
                <div class="tag-list">
                  <span v-for="(state, idx) in analysis.states" :key="'state-'+idx" class="meta-tag">{{ state }}</span>
                </div>
              </div>
              <div v-if="analysis.cities && analysis.cities.length" class="meta-tag-block">
                <Icon icon="mdi:city" />
                <div class="tag-list">
                  <span v-for="(city, idx) in analysis.cities" :key="'city-'+idx" class="meta-tag">{{ city }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div v-else class="back-only-bar">
        <button class="back-link-plain" @click="$router.back()">
          <Icon icon="mdi:arrow-left" /> Voltar
        </button>
      </div>

      <article class="article-body-wrapper" :class="{ 'full-width': analysis.with_header && analysis.with_footer }">
        <div class="content-container" :class="{ 'content-container--full': analysis.with_header && analysis.with_footer }">

          <!-- Produção acadêmica: bloco de citação (formato ABNT) -->
          <aside v-if="entryType === 'academic'" class="academic-card">
            <span class="academic-badge">{{ meta.academicType || 'Produção Acadêmica' }}</span>
            <p v-if="citation" class="academic-citation">{{ citation }}</p>
            <div class="academic-actions">
              <a v-if="meta.pdfUrl" :href="meta.pdfUrl" target="_blank" rel="noopener noreferrer" class="academic-btn primary">
                <Icon icon="mdi:file-pdf-box" /> Baixar documento
              </a>
              <a v-if="doiHref" :href="doiHref" target="_blank" rel="noopener noreferrer" class="academic-btn">
                <Icon icon="mdi:link-variant" /> DOI / Link oficial
              </a>
            </div>
          </aside>

          <!-- Dado primário: ficha técnica + downloads -->
          <aside v-else-if="entryType === 'dataset'" class="dataset-card">
            <div class="dataset-title"><Icon icon="mdi:database-outline" /> Ficha Técnica</div>
            <dl class="dataset-grid">
              <div v-if="meta.instrument"><dt>Instrumento</dt><dd>{{ meta.instrument }}</dd></div>
              <div v-if="meta.dataFormat"><dt>Formato</dt><dd>{{ meta.dataFormat }}</dd></div>
              <div v-if="meta.sampleSize"><dt>Amostra / cobertura</dt><dd>{{ meta.sampleSize }}</dd></div>
              <div v-if="analysis.source"><dt>Fonte</dt><dd>{{ analysis.source }}</dd></div>
            </dl>
            <div v-if="validReferenceLinks.length" class="dataset-downloads">
              <a v-for="(link, i) in validReferenceLinks" :key="i"
                :href="link.startsWith('http') ? link : `//${link}`"
                target="_blank" rel="noopener noreferrer" class="academic-btn primary">
                <Icon icon="mdi:download" /> Baixar arquivo<span v-if="validReferenceLinks.length > 1"> {{ i + 1 }}</span>
              </a>
            </div>
          </aside>

          <div class="preview-content-wrapper">
            <IsolatedRenderer :content="renderedContent" />
          </div>

          <section v-if="hasAttachments" class="attachments-section">
            <h3 class="section-heading"><Icon icon="mdi:paperclip" /> Referências e Anexos</h3>
            <div class="attachments-grid">
              <div v-if="validReferenceLinks.length" class="attach-card links">
                <h4>Links Externos</h4>
                <ul class="link-list">
                  <li v-for="(link, idx) in validReferenceLinks" :key="idx">
                    <a :href="link.startsWith('http') ? link : `//${link}`" target="_blank" rel="noopener noreferrer">
                      <Icon icon="mdi:open-in-new" /> {{ link }}
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
import { ref, computed, onMounted, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import MeuHeader from '@/components/MeuHeader.vue';
import MeuFooter from '@/components/MeuFooter.vue';
import IsolatedRenderer from '@/components/IsolatedRenderer.vue';
import { fetchWithCache, CacheKeys, TTL } from '@/utils/apiCache.js';
import { coverSvgDataUri } from '@/utils/coverUtils.js';
import { parseMeta, parseReferenceLinks, buildCitation } from '@/utils/analysisUtils.js';

const route    = useRoute();
const analysis = ref(null);
const isLoading = ref(true);
const error    = ref(null);

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const getFullMediaPath = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Fundo do hero: capa real se houver, senão SVG temático gerado (sem placeholder vazio).
const heroBgStyle = computed(() => {
  const a = analysis.value;
  if (!a) return '';
  const src = a.cover_image_path ? getFullMediaPath(a.cover_image_path) : coverSvgDataUri(a);
  return `background-image: url("${src}")`;
});

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

  return /^</.test(content) ? content : `<p>${content}</p>`;
});

// Tipo de conteúdo + metadados (produção acadêmica / dado primário).
const entryType = computed(() => analysis.value?.entry_type || 'analysis');
const meta      = computed(() => parseMeta(analysis.value?.meta));
const citation  = computed(() => buildCitation(analysis.value));
const doiHref   = computed(() => {
  const d = meta.value.doi;
  if (!d) return '';
  return d.startsWith('http') ? d : `https://doi.org/${d}`;
});

// Referências válidas (descarta lixo: ".", traço, linha vazia).
const validReferenceLinks = computed(() => parseReferenceLinks(analysis.value?.reference_links));

// Anexos só na seção de links quando NÃO for dataset (datasets já listam
// os downloads na ficha técnica — evita duplicar).
const hasAttachments = computed(() =>
  entryType.value !== 'dataset' && validReferenceLinks.value.length > 0
);

const fetchAnalysis = async (id) => {
  if (!id) { error.value = 'ID da análise não fornecido.'; isLoading.value = false; return; }
  isLoading.value = true;
  error.value = null;

  try {
    // Usa a rota PÚBLICA /api/analyses/:id — sem token, com cache de 5 min.
    // Corrige o bug anterior que usava a rota protegida /api/admin/analyses/:id
    // para páginas acessíveis publicamente.
    const data = await fetchWithCache(
      CacheKeys.analysis(id),
      () => axios
        .get(`${API_BASE_URL}/api/analyses/${id}`)
        .then(r => r.data?.data),
      TTL.LONG // 5 min
    );

    analysis.value = data;
  } catch (err) {
    console.error('Falha ao buscar análise:', err);
    error.value = err.response?.data?.message || 'Não foi possível carregar a análise.';
    analysis.value = null;
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => fetchAnalysis(route.params.id));

watch(() => route.params.id, (newId, oldId) => {
  if (newId && newId !== oldId) {
    fetchAnalysis(newId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});
</script>

<style scoped>
.page-background { background-color: var(--bg-body); min-height: 100vh; }
.loading-state, .error-state { height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); }
.spinner { border: 3px solid var(--border-color); border-top: 3px solid var(--brand-primary); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin-bottom: 1rem; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.error-box { text-align: center; background: var(--bg-danger-light); padding: 2rem; border-radius: 12px; color: var(--sys-danger); }
.error-box i { font-size: 2rem; margin-bottom: 1rem; }
.btn-secondary { display: inline-block; margin-top: 1rem; color: var(--sys-danger); text-decoration: underline; }
.article-hero { position: relative; background-color: #0f172a; color: white; min-height: 500px; display: flex; align-items: center; overflow: hidden; }
.hero-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0.4; filter: blur(8px); transform: scale(1.1); }
.hero-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(15,23,42,0.3), rgba(15,23,42,0.95)); }
.hero-container { position: relative; z-index: 2; max-width: 900px; margin: 0 auto; padding: 4rem 1.5rem; width: 100%; }
.back-link { background: rgba(255,255,255,0.1); border: none; color: white; padding: 0.5rem 1rem; border-radius: 20px; cursor: pointer; margin-bottom: 2rem; transition: background 0.2s; backdrop-filter: blur(4px); display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; }
.back-link:hover { background: rgba(255,255,255,0.2); }
.hero-category { display: inline-block; background: var(--brand-primary); color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1rem; }
.hero-title    { font-size: 3.5rem; font-weight: 800; line-height: 1.1; margin-bottom: 0.5rem; letter-spacing: -1px; }
.hero-subtitle { font-size: 1.5rem; color: #cbd5e1; font-weight: 300; margin-bottom: 2rem; line-height: 1.4; }
.hero-meta     { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 1.5rem 2rem; margin-top: 2rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 2rem; }
.author-block  { display: flex; align-items: center; gap: 0.75rem; }
.author-avatar-placeholder { width: 40px; height: 40px; background: #475569; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem; }
.author-details { display: flex; flex-direction: column; }
.author-details .by   { font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; }
.author-details .name { font-weight: 700; font-size: 1rem; }
.date-block    { display: flex; align-items: center; gap: 0.5rem; color: #cbd5e1; font-size: 0.9rem; }
.meta-tag-block { display: flex; align-items: flex-start; gap: 0.5rem; color: #cbd5e1; font-size: 0.9rem; }
.meta-tag-block i { margin-top: 3px; flex-shrink: 0; color: #94a3b8; }
.tag-list      { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.meta-tag      { background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; padding: 0.15rem 0.6rem; font-size: 0.8rem; color: #e2e8f0; backdrop-filter: blur(4px); white-space: nowrap; }
.back-only-bar { padding: 1rem 1.5rem; background: var(--bg-surface); border-bottom: 1px solid var(--border-color); }
.back-link-plain { background: none; border: 1px solid var(--border-color); color: var(--text-secondary); padding: 0.4rem 1rem; border-radius: 20px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; transition: background 0.2s, color 0.2s; }
.back-link-plain:hover { background: var(--bg-hover); color: var(--text-main); }
.article-body-wrapper { background: var(--bg-body); position: relative; z-index: 3; padding-bottom: 4rem; }
.article-body-wrapper.full-width { padding-bottom: 0; }
.content-container { max-width: 900px; margin: 0 auto; padding: 3rem 1.5rem; }
.content-container--full { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
.content-container--full .preview-content-wrapper { margin: 0 !important; }
.preview-content-wrapper { margin: 2rem 0; }

/* Produção acadêmica — bloco de citação */
.academic-card {
  margin: 2rem 0; padding: 1.5rem 1.75rem;
  background: var(--bg-surface); border: 1px solid var(--border-color);
  border-left: 4px solid var(--brand-primary); border-radius: 12px;
}
.academic-badge {
  display: inline-block; background: rgba(47, 84, 235, 0.1); color: var(--brand-primary);
  font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
  padding: 0.25rem 0.7rem; border-radius: 4px; margin-bottom: 1rem;
}
.academic-citation {
  font-family: Georgia, 'Times New Roman', serif; font-size: 1rem;
  line-height: 1.6; color: var(--text-main); margin: 0 0 1.25rem;
}
.academic-actions, .dataset-downloads { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.dataset-downloads { margin-top: 1.25rem; }
.academic-btn {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.6rem 1.1rem; border-radius: 8px; text-decoration: none;
  font-size: 0.9rem; font-weight: 600; border: 1px solid var(--brand-primary);
  color: var(--brand-primary); background: transparent; transition: background 0.2s, color 0.2s;
}
.academic-btn:hover { background: var(--brand-primary); color: #fff; }
.academic-btn.primary { background: var(--brand-primary); color: #fff; }
.academic-btn.primary:hover { filter: brightness(1.08); }

/* Dado primário — ficha técnica */
.dataset-card {
  margin: 2rem 0; padding: 1.5rem 1.75rem;
  background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px;
}
.dataset-title {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 1.25rem;
}
.dataset-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 0; }
.dataset-grid dt { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 700; margin-bottom: 0.2rem; }
.dataset-grid dd { margin: 0; font-size: 0.95rem; color: var(--text-main); font-weight: 600; }
.attachments-section { margin-top: 4rem; background: var(--bg-surface); border-radius: 12px; padding: 2rem; border: 1px solid var(--border-color); }
.section-heading { font-size: 1.25rem; color: var(--text-main); margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--border-color); display: inline-block; }
.attachments-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
.attach-card h4 { font-size: 0.9rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 1rem; font-weight: 700; }
.link-list     { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
.link-list li  { margin: 0; }
.link-list a   { display: flex; align-items: center; gap: 0.6rem; text-decoration: none; color: var(--brand-primary); font-weight: 600; font-size: 0.95rem; padding: 0.6rem 0.85rem; border-radius: 8px; border: 1px solid var(--brand-primary); background: color-mix(in srgb, var(--brand-primary) 7%, transparent); word-break: break-all; transition: background 0.2s, color 0.2s; }
.link-list a:hover { background: var(--brand-primary); color: #fff; }
.link-list a :deep(svg) { flex-shrink: 0; }
@media (max-width: 768px) { .hero-title { font-size: 2.5rem; } .hero-container { padding: 3rem 1rem; } .content-container { padding: 2rem 1rem; } }
</style>
