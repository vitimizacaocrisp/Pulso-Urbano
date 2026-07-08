<template>
  <MeuHeader />
  <div class="page-background">
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>A carregar publicação...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-box">
        <Icon icon="mdi:alert" />
        <p>{{ error }}</p>
        <router-link to="/" class="btn-secondary">Voltar ao início</router-link>
      </div>
    </div>

    <div v-else-if="post" class="content-animate">
      <!-- Hero -->
      <header v-if="!post.with_header" class="article-hero">
        <div class="hero-bg" :style="heroBgStyle"></div>
        <div class="hero-overlay"></div>
        <div class="hero-container">
          <button class="back-link" @click="$router.back()"><Icon icon="mdi:arrow-left" /> Voltar</button>
          <div class="hero-text">
            <span class="hero-category" v-if="categoria">{{ categoria }}</span>
            <span class="hero-type">{{ tipoLabel }}</span>
            <h1 class="hero-title">{{ post.titulo }}</h1>
            <p class="hero-subtitle" v-if="post.subtitulo">{{ post.subtitulo }}</p>
            <div class="hero-meta">
              <div v-if="autorPrincipal" class="author-block">
                <div class="author-avatar-placeholder">{{ autorPrincipal.charAt(0) }}</div>
                <div class="author-details"><span class="by">Por</span><span class="name">{{ autorPrincipal }}</span></div>
              </div>
              <div v-if="post.publicado_em" class="date-block">
                <Icon icon="mdi:calendar-blank-outline" /><span>{{ fmtData(post.publicado_em) }}</span>
              </div>
              <div v-if="post.nacionalidade" class="meta-tag-block"><Icon icon="mdi:earth" /><span>{{ post.nacionalidade }}</span></div>
              <div v-if="post.ufs && post.ufs.length" class="meta-tag-block">
                <Icon icon="mdi:map-marker" />
                <div class="tag-list"><span v-for="uf in post.ufs" :key="uf" class="meta-tag">{{ uf }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div v-else class="back-only-bar">
        <button class="back-link-plain" @click="$router.back()"><Icon icon="mdi:arrow-left" /> Voltar</button>
      </div>

      <article class="article-body-wrapper">
        <div class="content-container">
          <!-- Resumo sempre visível -->
          <p v-if="post.resumo" class="resumo">{{ post.resumo }}</p>

          <!-- Cartões por tipo (dado/academico): metadados são públicos -->
          <aside v-if="post.tipo === 'academico'" class="type-card">
            <span class="type-badge">{{ post.subtipo?.tipo_producao || 'Produção Científica' }}</span>
            <dl class="type-grid">
              <div v-if="post.subtipo?.veiculo"><dt>Veículo</dt><dd>{{ post.subtipo.veiculo }}</dd></div>
              <div v-if="post.subtipo?.ano"><dt>Ano</dt><dd>{{ post.subtipo.ano }}</dd></div>
              <div v-if="post.subtipo?.qualis"><dt>Qualis</dt><dd>{{ post.subtipo.qualis }}</dd></div>
              <div v-if="post.subtipo?.orientador"><dt>Orientador</dt><dd>{{ post.subtipo.orientador }}</dd></div>
            </dl>
            <a v-if="doiHref" :href="doiHref" target="_blank" rel="noopener noreferrer" class="pill-btn"><Icon icon="mdi:link-variant" /> DOI / Link oficial</a>
          </aside>

          <aside v-else-if="post.tipo === 'dado'" class="type-card">
            <div class="type-title"><Icon icon="mdi:database-outline" /> Ficha Técnica</div>
            <dl class="type-grid">
              <div v-if="post.subtipo?.instrumento"><dt>Instrumento</dt><dd>{{ post.subtipo.instrumento }}</dd></div>
              <div v-if="post.subtipo?.formato"><dt>Formato</dt><dd>{{ post.subtipo.formato }}</dd></div>
              <div v-if="post.subtipo?.tamanho_amostra"><dt>Amostra</dt><dd>{{ post.subtipo.tamanho_amostra }}</dd></div>
              <div v-if="post.subtipo?.cobertura"><dt>Cobertura</dt><dd>{{ post.subtipo.cobertura }}</dd></div>
              <div v-if="post.subtipo?.periodo_coleta"><dt>Coleta</dt><dd>{{ post.subtipo.periodo_coleta }}</dd></div>
              <div v-if="post.subtipo?.licenca"><dt>Licença</dt><dd>{{ post.subtipo.licenca }}</dd></div>
            </dl>
          </aside>

          <aside v-else-if="post.tipo === 'livro'" class="type-card">
            <dl class="type-grid">
              <div v-if="post.subtipo?.editora"><dt>Editora</dt><dd>{{ post.subtipo.editora }}</dd></div>
              <div v-if="post.subtipo?.ano_pub"><dt>Ano</dt><dd>{{ post.subtipo.ano_pub }}</dd></div>
              <div v-if="post.subtipo?.isbn"><dt>ISBN</dt><dd>{{ post.subtipo.isbn }}</dd></div>
              <div v-if="post.subtipo?.num_paginas"><dt>Páginas</dt><dd>{{ post.subtipo.num_paginas }}</dd></div>
            </dl>
            <a v-if="post.subtipo?.compra_url" :href="post.subtipo.compra_url" target="_blank" rel="noopener noreferrer" class="pill-btn"><Icon icon="mdi:cart-outline" /> Onde comprar</a>
          </aside>

          <!-- Mídia (podcast/vídeo): player só quando logado; anônimo vê CTA -->
          <aside v-if="isMedia && embedSrc" class="media-card">
            <iframe class="media-player" :src="embedSrc" frameborder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy" title="Player"></iframe>
          </aside>

          <!-- CTA de conta (anônimo) -->
          <div v-if="post.previa" class="cta-conta">
            <Icon icon="mdi:lock-outline" class="cta-ico" />
            <h3>Conteúdo completo para membros</h3>
            <p>Crie uma conta gratuita para ler esta publicação na íntegra{{ temAnexos ? ' e baixar os arquivos' : '' }}.</p>
            <div class="cta-actions">
              <router-link :to="{ name: 'Cadastro' }" class="pill-btn primary">Criar conta grátis</router-link>
              <router-link :to="{ name: 'Entrar', query: { redirect: $route.fullPath } }" class="pill-btn">Já tenho conta</router-link>
            </div>
          </div>

          <!-- Conteúdo completo (logado) -->
          <div v-else-if="post.conteudo" class="preview-content-wrapper">
            <IsolatedRenderer :content="renderedContent" />
          </div>

          <!-- Anexos -->
          <section v-if="temAnexos" class="attachments-section">
            <h3 class="section-heading"><Icon icon="mdi:paperclip" /> Arquivos e Anexos</h3>
            <ul class="attach-list">
              <li v-for="ax in post.anexos" :key="ax.id">
                <template v-if="post.previa">
                  <span class="attach-locked"><Icon icon="mdi:lock-outline" /> {{ ax.nome || 'Arquivo' }} — <router-link :to="{ name: 'Entrar', query: { redirect: $route.fullPath } }">entre para baixar</router-link></span>
                </template>
                <a v-else href="#" @click.prevent="baixar(ax)" :class="{ baixando: baixandoId === ax.id }">
                  <Icon :icon="baixandoId === ax.id ? 'mdi:loading' : 'mdi:download'" :class="{ spin: baixandoId === ax.id }" /> {{ ax.nome || 'Baixar arquivo' }}
                </a>
              </li>
            </ul>
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
import { useRoute, useRouter } from 'vue-router';
import api, { API_BASE_URL, errorMessage } from '@/services/api';
import MeuHeader from '@/components/MeuHeader.vue';
import MeuFooter from '@/components/MeuFooter.vue';
import IsolatedRenderer from '@/components/IsolatedRenderer.vue';
import { coverSvgDataUri } from '@/utils/coverUtils.js';
import { coverModel, TIPO_LABEL } from '@/utils/postagemV2.js';
import { mediaEmbedUrl } from '@/utils/analysisUtils.js';
import { useAuth } from '@/composables/useAuth';

const route = useRoute();
const router = useRouter();
const auth = useAuth();

const post = ref(null);
const isLoading = ref(true);
const error = ref(null);
const baixandoId = ref(null);

// Download: pede uma URL assinada (TTL curto) ao backend e abre. O bucket é
// privado, então o link vem do endpoint autenticado, não do payload.
async function baixar(ax) {
  if (baixandoId.value) return;
  baixandoId.value = ax.id;
  try {
    const { data } = await api.get(`/api/postagens/${encodeURIComponent(post.value.slug)}/anexos/${ax.id}/url`);
    if (data?.data?.url) window.open(data.data.url, '_blank', 'noopener');
    else throw new Error('Arquivo indisponível.');
  } catch (e) {
    error.value = null; // não derruba a página
    alert(errorMessage(e));
  } finally {
    baixandoId.value = null;
  }
}

const categoria = computed(() => post.value?.categorias?.[0]?.nome || null);
const tipoLabel = computed(() => TIPO_LABEL[post.value?.tipo] || 'Publicação');
const autorPrincipal = computed(() => post.value?.autores?.[0]?.nome || post.value?.fontes?.[0]?.nome || null);
const isMedia = computed(() => ['podcast', 'video'].includes(post.value?.tipo));
const embedSrc = computed(() => mediaEmbedUrl(post.value?.subtipo?.embed_url));
const temAnexos = computed(() => (post.value?.anexos?.length || 0) > 0);
const doiHref = computed(() => {
  const d = post.value?.subtipo?.doi;
  if (!d) return '';
  return d.startsWith('http') ? d : `https://doi.org/${d}`;
});

const heroBgStyle = computed(() => {
  const p = post.value;
  if (!p) return '';
  const src = p.cover?.url || coverSvgDataUri(coverModel(p));
  return `background-image: url("${src}")`;
});

const renderedContent = computed(() => {
  let c = (post.value?.conteudo || '').trim();
  if (!c) return '<p><em>Conteúdo não disponível.</em></p>';
  if (c.includes('&lt;') && c.includes('&gt;')) {
    const ta = document.createElement('textarea'); ta.innerHTML = c; c = ta.value;
  }
  c = c.replace(/(src=["']|href=["']|url\()(\/uploads\/.*?)(["'])/g, `$1${API_BASE_URL}$2$3`);
  if (c.startsWith('```html')) c = c.replace(/^```html\s*/i, '').replace(/\s*```$/, '').trim();
  return /^</.test(c) ? c : `<p>${c}</p>`;
});

const fmtData = (d) => { try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return ''; } };

async function resolverSlug(param) {
  // Numérico = id legado (/postagem/123): resolve slug e substitui a rota.
  if (/^\d+$/.test(param)) {
    const { data } = await api.get(`/api/postagens/id/${param}`);
    const slug = data?.data?.slug;
    if (slug) { router.replace({ name: 'AnalysisDetail', params: { id: slug } }); return null; }
    throw new Error('nao_encontrado');
  }
  return param;
}

function beacon(id) {
  if (!id) return;
  const chave = `viewed:${id}`;
  if (sessionStorage.getItem(chave)) return;
  sessionStorage.setItem(chave, '1');
  api.post(`/api/postagens/${id}/view`).catch(() => {});
}

async function carregar(param) {
  isLoading.value = true; error.value = null; post.value = null;
  try {
    const slug = await resolverSlug(param);
    if (slug === null) return; // redirecionado
    // Garante que o estado de login já foi resolvido (prévia vs completo).
    if (!auth.state.carregado) await auth.fetchMe();
    const { data } = await api.get(`/api/postagens/${encodeURIComponent(slug)}`);
    post.value = data.data;
    beacon(post.value.id);
  } catch (err) {
    error.value = err?.response?.status === 404 ? 'Publicação não encontrada.' : errorMessage(err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => carregar(route.params.id));
watch(() => route.params.id, (novo, antigo) => {
  if (novo && novo !== antigo) { carregar(novo); window.scrollTo({ top: 0, behavior: 'smooth' }); }
});
// Reage a login/logout na mesma página (recarrega p/ prévia↔completo).
watch(() => auth.state.me, (n, o) => {
  if (post.value && (!!n !== !!o)) carregar(route.params.id);
});
</script>

<style scoped>
.page-background { background-color: var(--bg-body); min-height: 100vh; }
.loading-state, .error-state { height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); }
.spinner { border: 3px solid var(--border-color); border-top: 3px solid var(--brand-primary); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin-bottom: 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-box { text-align: center; background: var(--bg-danger-light); padding: 2rem; border-radius: 12px; color: var(--sys-danger); }
.btn-secondary { display: inline-block; margin-top: 1rem; color: var(--sys-danger); text-decoration: underline; }

.article-hero { position: relative; background-color: #0f172a; color: #fff; min-height: 420px; display: flex; align-items: center; overflow: hidden; }
.hero-bg { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0.4; filter: blur(8px); transform: scale(1.1); }
.hero-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(15,23,42,0.3), rgba(15,23,42,0.95)); }
.hero-container { position: relative; z-index: 2; max-width: 900px; margin: 0 auto; padding: 3.5rem 1.5rem; width: 100%; }
.back-link { background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 0.5rem 1rem; border-radius: 20px; cursor: pointer; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; }
.back-link:hover { background: rgba(255,255,255,0.2); }
.hero-category { display: inline-block; background: var(--brand-primary); color: #fff; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-right: 0.5rem; }
.hero-type { display: inline-block; background: rgba(255,255,255,0.15); color: #e2e8f0; padding: 0.25rem 0.7rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
.hero-title { font-size: clamp(2rem, 5vw, 3.25rem); font-weight: 800; line-height: 1.1; margin: 1rem 0 0.5rem; letter-spacing: -1px; }
.hero-subtitle { font-size: 1.25rem; color: #cbd5e1; font-weight: 300; margin-bottom: 1.5rem; line-height: 1.4; }
.hero-meta { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 1rem 2rem; margin-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1.5rem; }
.author-block { display: flex; align-items: center; gap: 0.75rem; }
.author-avatar-placeholder { width: 40px; height: 40px; background: #475569; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
.author-details { display: flex; flex-direction: column; }
.author-details .by { font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; }
.author-details .name { font-weight: 700; }
.date-block, .meta-tag-block { display: flex; align-items: center; gap: 0.5rem; color: #cbd5e1; font-size: 0.9rem; }
.tag-list { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.meta-tag { background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; padding: 0.15rem 0.6rem; font-size: 0.8rem; color: #e2e8f0; }
.back-only-bar { padding: 1rem 1.5rem; background: var(--bg-surface); border-bottom: 1px solid var(--border-color); }
.back-link-plain { background: none; border: 1px solid var(--border-color); color: var(--text-secondary); padding: 0.4rem 1rem; border-radius: 20px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; }

.article-body-wrapper { background: var(--bg-body); padding-bottom: 4rem; }
.content-container { max-width: 900px; margin: 0 auto; padding: 2.5rem 1.5rem; }
.resumo { font-size: 1.15rem; line-height: 1.6; color: var(--text-secondary); border-left: 4px solid var(--brand-primary); padding-left: 1rem; margin: 0 0 2rem; }
.preview-content-wrapper { margin: 2rem 0; }

.type-card, .media-card { margin: 1.5rem 0; padding: 1.5rem 1.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; }
.type-title { display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 1.25rem; }
.type-badge { display: inline-block; background: rgba(47,84,235,0.1); color: var(--brand-primary); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 0.25rem 0.7rem; border-radius: 4px; margin-bottom: 1rem; }
.type-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin: 0 0 1rem; }
.type-grid dt { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 700; margin-bottom: 0.2rem; }
.type-grid dd { margin: 0; font-size: 0.95rem; color: var(--text-main); font-weight: 600; }
.media-player { width: 100%; height: 240px; border-radius: 12px; border: none; }

.pill-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.1rem; border-radius: 8px; text-decoration: none; font-size: 0.9rem; font-weight: 600; border: 1px solid var(--brand-primary); color: var(--brand-primary); background: transparent; transition: background 0.2s, color 0.2s; }
.pill-btn:hover { background: var(--brand-primary); color: #fff; }
.pill-btn.primary { background: var(--brand-primary); color: #fff; }

.cta-conta { margin: 2rem 0; padding: 2rem; text-align: center; background: var(--bg-surface); border: 1px dashed var(--brand-primary); border-radius: 14px; }
.cta-ico { font-size: 2.2rem; color: var(--brand-primary); }
.cta-conta h3 { margin: 0.5rem 0 0.35rem; color: var(--text-main); font-size: 1.25rem; }
.cta-conta p { color: var(--text-secondary); margin: 0 0 1.25rem; }
.cta-actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }

.attachments-section { margin-top: 3rem; background: var(--bg-surface); border-radius: 12px; padding: 1.75rem; border: 1px solid var(--border-color); }
.section-heading { font-size: 1.2rem; color: var(--text-main); margin: 0 0 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
.attach-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem; }
.attach-list a { display: inline-flex; align-items: center; gap: 0.6rem; text-decoration: none; color: var(--brand-primary); font-weight: 600; padding: 0.6rem 0.85rem; border-radius: 8px; border: 1px solid var(--brand-primary); background: color-mix(in srgb, var(--brand-primary) 7%, transparent); }
.attach-list a:hover { background: var(--brand-primary); color: #fff; }
.attach-locked { display: inline-flex; align-items: center; gap: 0.4rem; color: var(--text-muted); font-size: 0.92rem; }
.attach-locked a { color: var(--brand-primary); }
.attach-list a.baixando { opacity: 0.7; pointer-events: none; }
.spin { animation: spin 0.8s linear infinite; }

@media (max-width: 768px) { .hero-title { font-size: 2.2rem; } .content-container { padding: 2rem 1rem; } }
</style>
