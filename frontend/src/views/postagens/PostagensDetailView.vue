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

    <div v-else-if="post" class="content-animate" :style="accentVars">
      <!-- Hero -->
      <header v-if="!post.with_header" class="article-hero">
        <div class="hero-bg" :style="heroBgStyle"></div>
        <div class="hero-overlay"></div>
        <div class="hero-grain"></div>
        <div class="hero-container">
          <button class="back-link" @click="$router.back()"><Icon icon="mdi:arrow-left" /> Voltar</button>
          <div class="hero-text">
            <div class="hero-badges">
              <span class="hero-type" :style="{ '--chip': accent }"><Icon :icon="tipoIcon" width="14" /> {{ tipoLabel }}</span>
              <span class="hero-category" v-if="categoria">{{ categoria }}</span>
            </div>
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
              <div v-if="readingTime" class="date-block">
                <Icon icon="mdi:clock-outline" /><span>{{ readingTime }} de leitura</span>
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
          <!-- Resumo (lede editorial) -->
          <p v-if="post.resumo" class="resumo">{{ post.resumo }}</p>

          <!-- Dossiê: ficha técnica específica do tipo (todos os 6 tipos têm um) -->
          <aside v-if="dossieFields.length || dossieProse.length" class="dossie-card">
            <header class="dossie-head">
              <span class="dossie-chip"><Icon :icon="tipoIcon" width="17" /></span>
              <span class="dossie-label">Ficha técnica · {{ tipoLabel }}</span>
            </header>

            <dl v-if="dossieFields.length" class="dossie-grid">
              <div v-for="f in dossieFields" :key="f.label">
                <dt>{{ f.label }}</dt>
                <dd :class="{ mono: f.mono }">{{ f.value }}</dd>
              </div>
            </dl>

            <div v-for="b in dossieProse" :key="b.label" class="dossie-prose">
              <span class="dossie-prose-label">{{ b.label }}</span>
              <p>{{ b.value }}</p>
            </div>

            <div class="dossie-actions" v-if="doiHref || post.subtipo?.compra_url || legendasHref">
              <a v-if="doiHref" :href="doiHref" target="_blank" rel="noopener noreferrer" class="pill-btn"><Icon icon="mdi:link-variant" /> DOI / Link oficial</a>
              <a v-if="post.subtipo?.compra_url" :href="post.subtipo.compra_url" target="_blank" rel="noopener noreferrer" class="pill-btn"><Icon icon="mdi:cart-outline" /> Onde comprar</a>
              <a v-if="legendasHref" :href="legendasHref" target="_blank" rel="noopener noreferrer" class="pill-btn"><Icon icon="mdi:closed-caption-outline" /> Legendas (.vtt)</a>
            </div>
          </aside>

          <!-- Mídia (podcast/vídeo) -->
          <aside v-if="isMedia" class="media-card">
            <iframe v-if="embedIsIframe" class="media-player" :src="embedSrc" frameborder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy" title="Player"></iframe>
            <audio v-else-if="post.tipo === 'podcast' && rawMediaUrl" class="media-audio" controls :src="rawMediaUrl"></audio>
            <a v-else-if="rawMediaUrl" :href="rawMediaUrl" target="_blank" rel="noopener noreferrer" class="pill-btn primary media-fallback">
              <Icon icon="mdi:play-circle-outline" /> Assistir no site original
            </a>
            <p v-else class="media-empty"><Icon icon="mdi:link-off" /> Mídia indisponível.</p>
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
            <p class="section-kicker">Conteúdo</p>
            <IsolatedRenderer :content="renderedContent" />
          </div>

          <!-- Anexos -->
          <section v-if="temAnexos" class="attachments-section">
            <h3 class="section-heading"><Icon icon="mdi:paperclip" /> Arquivos e Anexos</h3>
            <ul class="attach-list">
              <li v-for="ax in post.anexos" :key="ax.id">
                <template v-if="post.previa">
                  <span class="attach-locked"><Icon :icon="anexoIcon(ax)" width="18" /> {{ ax.nome || 'Arquivo' }} — <router-link :to="{ name: 'Entrar', query: { redirect: $route.fullPath } }">entre para baixar</router-link></span>
                </template>
                <a v-else href="#" @click.prevent="baixar(ax)" :class="{ baixando: baixandoId === ax.id }">
                  <Icon :icon="baixandoId === ax.id ? 'mdi:loading' : anexoIcon(ax)" :class="{ spin: baixandoId === ax.id }" width="18" /> {{ ax.nome || 'Baixar arquivo' }}
                  <Icon icon="mdi:download" width="15" class="attach-dl-ico" />
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

// ── Identidade visual por tipo (ícone + cor de destaque do dossiê) ────
const TIPO_ICON = {
  analise: 'mdi:chart-box-outline', academico: 'mdi:school-outline', dado: 'mdi:database-outline',
  podcast: 'mdi:podcast', livro: 'mdi:bookshelf', video: 'mdi:play-box-outline',
};
const TIPO_ACCENT = {
  analise: '#2f54eb', academico: '#6b4c93', dado: '#1a8a6a',
  podcast: '#c46a1f', livro: '#8a4a2f', video: '#b33951',
};

const categoria = computed(() => post.value?.categorias?.[0]?.nome || null);
const tipoLabel = computed(() => TIPO_LABEL[post.value?.tipo] || 'Publicação');
const tipoIcon = computed(() => TIPO_ICON[post.value?.tipo] || 'mdi:file-document-outline');
const accent = computed(() => TIPO_ACCENT[post.value?.tipo] || 'var(--brand-primary)');
const accentVars = computed(() => ({ '--accent': accent.value }));
const autorPrincipal = computed(() => post.value?.autores?.[0]?.nome || post.value?.fontes?.[0]?.nome || null);
const isMedia = computed(() => ['podcast', 'video'].includes(post.value?.tipo));
const temAnexos = computed(() => (post.value?.anexos?.length || 0) > 0);

// Embed: só vira <iframe> se a plataforma for reconhecida (Spotify/Apple/
// YouTube/Vimeo); um link direto (mp3/rss/mp4) NUNCA foi feito pra <iframe> —
// antes isso quebrava silenciosamente. Agora vira <audio> ou botão "Assistir".
const EMBED_HOSTS = ['spotify.com', 'podcasts.apple.com', 'youtube.com', 'youtu.be', 'vimeo.com'];
const rawEmbedUrl = computed(() => post.value?.subtipo?.embed_url || '');
const embedIsIframe = computed(() => {
  try { return EMBED_HOSTS.some((h) => new URL(rawEmbedUrl.value).hostname.includes(h)); }
  catch { return false; }
});
const embedSrc = computed(() => (embedIsIframe.value ? mediaEmbedUrl(rawEmbedUrl.value) : ''));
const rawMediaUrl = computed(() => (!embedIsIframe.value ? rawEmbedUrl.value : ''));

const legendasHref = computed(() => post.value?.subtipo?.legendas_url || '');

const doiHref = computed(() => {
  const d = post.value?.subtipo?.doi;
  if (!d) return '';
  return d.startsWith('http') ? d : `https://doi.org/${d}`;
});

// mm:ss ou h:mm:ss a partir de segundos.
function fmtDuracao(seg) {
  const n = parseInt(seg, 10);
  if (!Number.isFinite(n) || n <= 0) return '';
  const h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60), s = n % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Campos curtos (grid label/valor) por tipo — inclui todos os campos do
// subtipo, mesmo os que antes nunca eram exibidos em lugar nenhum.
const dossieFields = computed(() => {
  const s = post.value?.subtipo;
  const p = post.value;
  if (!s || !p) return [];
  const F = [];
  const add = (label, value, mono) => { if (value !== null && value !== undefined && value !== '') F.push({ label, value, mono }); };

  if (p.tipo === 'academico') {
    add('Tipo de produção', s.tipo_producao);
    add('Ano', s.ano, true);
    add('Veículo', s.veiculo);
    add('Qualis', s.qualis, true);
    add('ISSN', s.issn, true);
    add('Orientador(a)', s.orientador);
    add('Programa', s.programa);
  } else if (p.tipo === 'dado') {
    add('Instrumento', s.instrumento);
    add('Formato', s.formato, true);
    add('Tamanho da amostra', s.tamanho_amostra, true);
    add('Cobertura', s.cobertura);
    add('Período de coleta', s.periodo_coleta);
    add('Licença', s.licenca, true);
  } else if (p.tipo === 'podcast') {
    add('Formato', s.formato_midia === 'video' ? 'Vídeo' : s.formato_midia === 'audio' ? 'Áudio' : '');
    add('Plataforma', s.plataforma);
    add('Temporada', s.temporada, true);
    add('Episódio', s.numero_episodio, true);
    add('Convidados', s.convidados);
  } else if (p.tipo === 'livro') {
    add('Editora', s.editora);
    add('Ano', s.ano_pub, true);
    add('Edição', s.edicao, true);
    add('ISBN', s.isbn, true);
    add('Páginas', s.num_paginas, true);
  } else if (p.tipo === 'video') {
    add('Plataforma', s.plataforma);
    add('Duração', fmtDuracao(s.duracao_seg), true);
  }
  return F;
});

// Campos longos (parágrafo) por tipo — metodologia/indicadores da análise
// não eram exibidos em NENHUM lugar antes desta revisão.
const dossieProse = computed(() => {
  const s = post.value?.subtipo;
  const p = post.value;
  if (!s || !p) return [];
  const B = [];
  const add = (label, value) => { if (value && String(value).trim()) B.push({ label, value }); };

  if (p.tipo === 'analise') {
    add('Indicadores de destaque', s.indicadores);
    add('Metodologia', s.metodologia);
  } else if (p.tipo === 'dado') {
    add('Metodologia amostral', s.metodologia_amostral);
  } else if (p.tipo === 'livro') {
    add('Sumário', s.sumario);
  } else if (p.tipo === 'podcast') {
    add('Transcrição', s.transcricao);
  }
  return B;
});

const ANEXO_ICON = {
  documento: 'mdi:file-document-outline', dado: 'mdi:file-table-outline', audio: 'mdi:file-music-outline',
  video: 'mdi:file-video-outline', imagem: 'mdi:file-image-outline', anexo: 'mdi:file-outline',
};
const anexoIcon = (ax) => ANEXO_ICON[ax?.tipo] || 'mdi:file-outline';

// Tempo estimado de leitura (200 palavras/min) a partir do HTML de conteúdo —
// só faz sentido pra tipos com texto longo (analise/academico/dado).
const readingTime = computed(() => {
  const p = post.value;
  if (!p?.conteudo || p.previa || !['analise', 'academico', 'dado'].includes(p.tipo)) return '';
  const texto = p.conteudo.replace(/<[^>]+>/g, ' ');
  const palavras = texto.trim().split(/\s+/).filter(Boolean).length;
  const min = Math.max(1, Math.round(palavras / 200));
  return `${min} min`;
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
.hero-grain { position: absolute; inset: 0; opacity: 0.05; mix-blend-mode: overlay; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
.hero-container { position: relative; z-index: 2; max-width: 900px; margin: 0 auto; padding: 3.5rem 1.5rem; width: 100%; }
.back-link { background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 0.5rem 1rem; border-radius: 20px; cursor: pointer; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; }
.back-link:hover { background: rgba(255,255,255,0.2); }
.hero-badges { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.hero-type { display: inline-flex; align-items: center; gap: 0.35rem; background: color-mix(in srgb, var(--chip) 55%, #0f172a 45%); border: 1px solid color-mix(in srgb, var(--chip) 65%, transparent); color: #fff; padding: 0.25rem 0.7rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
.hero-category { display: inline-block; background: rgba(255,255,255,0.12); color: #e2e8f0; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
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

/* Resumo — lede editorial em serifada, sem caixa pesada */
.resumo { font-family: var(--font-display); font-style: italic; font-size: 1.3rem; line-height: 1.55; color: var(--text-main); font-weight: 500; border-left: 3px solid var(--accent, var(--brand-primary)); padding-left: 1.25rem; margin: 0 0 2.25rem; }

.section-kicker { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: var(--text-muted); margin: 2.5rem 0 1rem; }
.preview-content-wrapper { margin: 1.5rem 0; }

/* ── Dossiê: ficha técnica unificada por tipo ─────────────────────── */
.dossie-card { position: relative; margin: 1.5rem 0; padding: 1.5rem 1.75rem 1.6rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-left: 3px solid var(--accent, var(--brand-primary)); border-radius: 4px 12px 12px 4px; }
.dossie-head { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1.1rem; padding-bottom: 0.9rem; border-bottom: 1px dashed var(--border-color); }
.dossie-chip { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 8px; background: color-mix(in srgb, var(--accent, var(--brand-primary)) 14%, transparent); color: var(--accent, var(--brand-primary)); flex-shrink: 0; }
.dossie-label { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1.4px; color: var(--text-muted); }
.dossie-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1.1rem 1.5rem; margin: 0; }
.dossie-grid dt { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 700; margin-bottom: 0.2rem; }
.dossie-grid dd { margin: 0; font-size: 0.98rem; color: var(--text-main); font-weight: 600; line-height: 1.4; }
.dossie-grid dd.mono { font-variant-numeric: tabular-nums; font-family: ui-monospace, 'SF Mono', Consolas, monospace; font-weight: 500; }
.dossie-prose { margin-top: 1.35rem; padding-top: 1.1rem; border-top: 1px dashed var(--border-color); }
.dossie-prose:first-of-type { margin-top: 1.1rem; }
.dossie-prose-label { display: block; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; color: var(--accent, var(--brand-primary)); margin-bottom: 0.5rem; }
.dossie-prose p { margin: 0; color: var(--text-secondary); line-height: 1.65; white-space: pre-line; }
.dossie-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 1.35rem; }

.media-card { margin: 1.5rem 0; padding: 1rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; }
.media-player { width: 100%; height: 240px; border-radius: 8px; border: none; display: block; }
.media-audio { width: 100%; display: block; }
.media-fallback { width: 100%; justify-content: center; padding: 1rem; }
.media-empty { display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); margin: 0; padding: 0.5rem; }

.pill-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.1rem; border-radius: 8px; text-decoration: none; font-size: 0.9rem; font-weight: 600; border: 1px solid var(--accent, var(--brand-primary)); color: var(--accent, var(--brand-primary)); background: transparent; transition: background 0.2s, color 0.2s; }
.pill-btn:hover { background: var(--accent, var(--brand-primary)); color: #fff; }
.pill-btn.primary { background: var(--accent, var(--brand-primary)); color: #fff; }

.cta-conta { margin: 2rem 0; padding: 2rem; text-align: center; background: var(--bg-surface); border: 1px dashed var(--accent, var(--brand-primary)); border-radius: 14px; }
.cta-ico { font-size: 2.2rem; color: var(--accent, var(--brand-primary)); }
.cta-conta h3 { margin: 0.5rem 0 0.35rem; color: var(--text-main); font-size: 1.25rem; }
.cta-conta p { color: var(--text-secondary); margin: 0 0 1.25rem; }
.cta-actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }

.attachments-section { margin-top: 3rem; background: var(--bg-surface); border-radius: 12px; padding: 1.75rem; border: 1px solid var(--border-color); }
.section-heading { font-size: 1.2rem; color: var(--text-main); margin: 0 0 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
.attach-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem; }
.attach-list a { display: inline-flex; align-items: center; gap: 0.6rem; text-decoration: none; color: var(--accent, var(--brand-primary)); font-weight: 600; padding: 0.6rem 0.85rem; border-radius: 8px; border: 1px solid var(--accent, var(--brand-primary)); background: color-mix(in srgb, var(--accent, var(--brand-primary)) 7%, transparent); }
.attach-list a:hover { background: var(--accent, var(--brand-primary)); color: #fff; }
.attach-dl-ico { margin-left: auto; opacity: 0.7; }
.attach-locked { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.92rem; }
.attach-locked a { color: var(--accent, var(--brand-primary)); }
.attach-list a.baixando { opacity: 0.7; pointer-events: none; }
.spin { animation: spin 0.8s linear infinite; }

@media (max-width: 768px) {
  .hero-title { font-size: 2.2rem; }
  .content-container { padding: 2rem 1rem; }
  .resumo { font-size: 1.15rem; }
  .dossie-card { padding: 1.25rem 1.25rem 1.4rem; }
  .dossie-grid { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.9rem 1.1rem; }
}
</style>
