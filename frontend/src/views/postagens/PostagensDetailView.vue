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
      <header v-if="post.with_header !== false" class="article-hero">
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
            <header class="media-head">
              <span class="media-head-icon"><Icon :icon="mediaKind === 'audio' ? 'mdi:waveform' : 'mdi:play'" /></span>
              <span><small>Reprodução</small><strong>{{ mediaKind === 'audio' ? 'Ouça este episódio' : 'Assista ao vídeo' }}</strong></span>
            </header>
            <iframe v-if="embedIsIframe" class="media-player" :src="embedSrc" frameborder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy" title="Player"></iframe>
            <audio v-else-if="mediaKind === 'audio' && rawMediaUrl" class="media-audio" controls :src="rawMediaUrl"></audio>
            <video v-else-if="mediaKind === 'video' && rawMediaUrl" class="media-video" controls preload="metadata" :src="rawMediaUrl" :poster="post.cover?.url || undefined"></video>
            <a v-else-if="rawMediaUrl" :href="rawMediaUrl" target="_blank" rel="noopener noreferrer" class="pill-btn primary media-fallback">
              <Icon icon="mdi:play-circle-outline" /> Assistir no site original
            </a>
            <p v-else class="media-empty"><Icon icon="mdi:link-off" /> Mídia indisponível.</p>
          </aside>

          <section v-if="inlineImages.length" class="visual-section">
            <header class="section-title-row">
              <div><span class="section-eyebrow">Galeria</span><h3>Imagens da publicação</h3></div>
              <span class="section-count">{{ inlineImages.length }}</span>
            </header>
            <div class="visual-grid">
              <figure v-for="image in inlineImages" :key="image.id" class="visual-card">
                <img :src="image.url" :alt="image.nome || 'Imagem da publicação'" loading="lazy" />
                <figcaption><Icon icon="mdi:image-outline" /> {{ image.nome || 'Imagem' }}</figcaption>
              </figure>
            </div>
          </section>

          <!-- CTA de conta (anônimo) -->
          <div v-if="post.previa" class="cta-conta">
            <Icon icon="mdi:lock-outline" class="cta-ico" />
            <h3>Conteúdo completo para membros</h3>
            <p>Crie uma conta gratuita para ler esta publicação na íntegra{{ temDownloads ? ' e baixar os arquivos' : '' }}.</p>
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

          <!-- Laboratório de código e notebooks -->
          <section v-if="codeFiles.length" class="resource-section code-lab">
            <header class="section-title-row resource-head">
              <div><span class="section-eyebrow">Reprodutibilidade</span><h3><Icon icon="mdi:code-braces" /> Código e notebooks</h3></div>
              <div class="section-actions"><span class="section-count">{{ codeFiles.length }}</span><button v-if="!post.previa" class="resource-btn" :disabled="baixandoTodos === 'code'" @click="baixarTodos(codeFiles, 'code')"><Icon :icon="baixandoTodos === 'code' ? 'mdi:loading' : 'mdi:download-multiple'" :class="{ spin: baixandoTodos === 'code' }" /> Baixar todos</button></div>
            </header>
            <p class="attachments-intro">Fontes executáveis ficam isoladas da biblioteca geral. A prévia nunca executa o código.</p>
            <div v-if="post.previa" class="resource-locked"><Icon icon="mdi:lock-outline" /> Entre na sua conta para abrir e baixar os arquivos.</div>
            <div v-else class="resource-workbench">
              <nav class="resource-list" aria-label="Arquivos de código">
                <button v-for="file in codeFiles" :key="file.id" type="button" :class="{ active: selectedCode?.id === file.id }" @click="selecionarRecurso(file, 'code')">
                  <span class="resource-file-icon"><Icon :icon="attachmentGroup(file) === 'notebook' ? 'mdi:notebook-outline' : 'mdi:code-tags'" /></span>
                  <span><strong>{{ file.nome }}</strong><small>{{ attachmentGroup(file) === 'notebook' ? 'Notebook Python' : 'Código-fonte' }}<template v-if="file.tamanho"> · {{ formatBytes(file.tamanho) }}</template></small></span>
                  <Icon icon="mdi:chevron-right" />
                </button>
              </nav>
              <div v-if="selectedCode" class="resource-preview">
                <div class="preview-toolbar">
                  <div><span>{{ attachmentGroup(selectedCode) === 'notebook' ? 'Notebook' : 'Fonte' }}</span><strong>{{ selectedCode.nome }}</strong></div>
                  <div class="preview-actions">
                    <a v-if="attachmentGroup(selectedCode) === 'notebook'" :href="nbviewerUrl(resourceUrl(selectedCode))" target="_blank" rel="noopener noreferrer"><Icon icon="mdi:open-in-new" /> NBViewer</a>
                    <button v-if="attachmentGroup(selectedCode) === 'notebook'" type="button" @click="abrirEditorExterno(selectedCode, 'colab')"><Icon icon="mdi:google" /> Editar no Colab</button>
                    <button v-else type="button" @click="abrirEditorExterno(selectedCode, 'vscode')"><Icon icon="mdi:microsoft-visual-studio-code" /> VS Code Web</button>
                    <button type="button" @click="baixar(selectedCode)"><Icon icon="mdi:download" /> Baixar</button>
                  </div>
                </div>
                <div v-if="!canPreviewInMemory(selectedCode)" class="preview-limit"><Icon icon="mdi:database-lock-outline" /> Arquivo grande demais para carregar na memória do navegador. Use o download ou um ambiente externo.</div>
                <CodeNotebookViewer v-else :url="resourceUrl(selectedCode)" :kind="attachmentGroup(selectedCode) === 'notebook' ? 'notebook' : 'code'" />
              </div>
            </div>
          </section>

          <!-- Laboratório de dados -->
          <section v-if="dataFiles.length" class="resource-section data-lab">
            <header class="section-title-row resource-head">
              <div><span class="section-eyebrow">Exploração</span><h3><Icon icon="mdi:database-eye-outline" /> Dados e planilhas</h3></div>
              <div class="section-actions"><span class="section-count">{{ dataFiles.length }}</span><button v-if="!post.previa" class="resource-btn" :disabled="baixandoTodos === 'data'" @click="baixarTodos(dataFiles, 'data')"><Icon :icon="baixandoTodos === 'data' ? 'mdi:loading' : 'mdi:download-multiple'" :class="{ spin: baixandoTodos === 'data' }" /> Baixar todos</button></div>
            </header>
            <p class="attachments-intro">CSV, Excel, JSON e bancos SQLite podem ser inspecionados sem sair da publicação.</p>
            <div v-if="post.previa" class="resource-locked"><Icon icon="mdi:lock-outline" /> Entre na sua conta para explorar e baixar os dados.</div>
            <div v-else class="resource-workbench">
              <nav class="resource-list" aria-label="Arquivos de dados">
                <button v-for="file in dataFiles" :key="file.id" type="button" :class="{ active: selectedData?.id === file.id }" @click="selecionarRecurso(file, 'data')">
                  <span class="resource-file-icon"><Icon icon="mdi:file-table-outline" /></span>
                  <span><strong>{{ file.nome }}</strong><small>{{ fileExtension(file).toUpperCase() || 'Dados' }}<template v-if="file.tamanho"> · {{ formatBytes(file.tamanho) }}</template></small></span>
                  <Icon icon="mdi:chevron-right" />
                </button>
              </nav>
              <div v-if="selectedData" class="resource-preview">
                <div class="preview-toolbar">
                  <div><span>Conjunto selecionado</span><strong>{{ selectedData.nome }}</strong></div>
                  <div class="preview-actions">
                    <a :href="googleViewerUrl(resourceUrl(selectedData))" target="_blank" rel="noopener noreferrer"><Icon icon="mdi:google-spreadsheet" /> Google</a>
                    <a href="https://colab.research.google.com/#create=true" target="_blank" rel="noopener noreferrer"><Icon icon="mdi:chart-box-outline" /> Colab</a>
                    <button type="button" @click="baixar(selectedData)"><Icon icon="mdi:download" /> Baixar</button>
                  </div>
                </div>
                <div v-if="!canPreviewInMemory(selectedData)" class="preview-limit"><Icon icon="mdi:database-lock-outline" /> Para proteger o navegador, arquivos acima de 32 MB não são carregados automaticamente. O download completo continua disponível.</div>
                <ResourceDataViewer v-else :url="resourceUrl(selectedData)" :file="selectedData" />
              </div>
            </div>
          </section>

          <!-- Leitor de documentos -->
          <section v-if="documentFiles.length" class="resource-section document-lab">
            <header class="section-title-row resource-head">
              <div><span class="section-eyebrow">Leitura</span><h3><Icon icon="mdi:file-document-multiple-outline" /> Documentos</h3></div>
              <div class="section-actions"><span class="section-count">{{ documentFiles.length }}</span><button v-if="!post.previa" class="resource-btn" :disabled="baixandoTodos === 'documents'" @click="baixarTodos(documentFiles, 'documents')"><Icon :icon="baixandoTodos === 'documents' ? 'mdi:loading' : 'mdi:download-multiple'" :class="{ spin: baixandoTodos === 'documents' }" /> Baixar todos</button></div>
            </header>
            <p class="attachments-intro">PDF, Word, texto e Markdown têm leitura rápida e atalhos para ferramentas externas.</p>
            <div v-if="post.previa" class="resource-locked"><Icon icon="mdi:lock-outline" /> Entre na sua conta para ler e baixar os documentos.</div>
            <div v-else class="resource-workbench">
              <nav class="resource-list" aria-label="Documentos">
                <button v-for="file in documentFiles" :key="file.id" type="button" :class="{ active: selectedDocument?.id === file.id }" @click="selecionarRecurso(file, 'document')">
                  <span class="resource-file-icon"><Icon icon="mdi:file-document-outline" /></span>
                  <span><strong>{{ file.nome }}</strong><small>{{ fileExtension(file).toUpperCase() || 'Documento' }}<template v-if="file.tamanho"> · {{ formatBytes(file.tamanho) }}</template></small></span>
                  <Icon icon="mdi:chevron-right" />
                </button>
              </nav>
              <div v-if="selectedDocument" class="resource-preview">
                <div class="preview-toolbar">
                  <div><span>Documento selecionado</span><strong>{{ selectedDocument.nome }}</strong></div>
                  <div class="preview-actions">
                    <a :href="documentExternalUrl(selectedDocument)" target="_blank" rel="noopener noreferrer"><Icon icon="mdi:open-in-new" /> Abrir externamente</a>
                    <button type="button" @click="abrirEditorExterno(selectedDocument, 'docs')"><Icon icon="mdi:google-drive" /> Editar no Google Docs</button>
                    <button type="button" @click="baixar(selectedDocument)"><Icon icon="mdi:download" /> Baixar</button>
                  </div>
                </div>
                <DocumentMiniReader :url="resourceUrl(selectedDocument)" :file="selectedDocument" />
              </div>
            </div>
          </section>

          <!-- Anexos -->
          <section v-if="temAnexos" class="attachments-section">
            <header class="section-title-row attachments-head">
              <div><span class="section-eyebrow">Biblioteca</span><h3><Icon icon="mdi:paperclip" /> Arquivos para consulta</h3></div>
              <span class="section-count">{{ genericAttachments.length }}</span>
            </header>
            <p class="attachments-intro">Materiais complementares organizados por formato. Os links são protegidos e gerados no momento do download.</p>
            <ul class="attach-list">
              <li v-for="ax in genericAttachments" :key="ax.id" class="attach-item">
                <template v-if="post.previa">
                  <span class="attach-locked"><span class="attach-icon"><Icon :icon="anexoIcon(ax)" /></span><span class="attach-copy"><strong>{{ ax.nome || 'Arquivo' }}</strong><small>{{ anexoLabel(ax) }} · entre para baixar</small></span><Icon icon="mdi:lock-outline" class="attach-action" /></span>
                </template>
                <a v-else href="#" @click.prevent="baixar(ax)" :class="{ baixando: baixandoId === ax.id }">
                  <span class="attach-icon"><Icon :icon="baixandoId === ax.id ? 'mdi:loading' : anexoIcon(ax)" :class="{ spin: baixandoId === ax.id }" /></span>
                  <span class="attach-copy"><strong>{{ ax.nome || 'Baixar arquivo' }}</strong><small>{{ anexoLabel(ax) }}<template v-if="ax.tamanho"> · {{ formatBytes(ax.tamanho) }}</template></small></span>
                  <Icon icon="mdi:download" class="attach-action" />
                </a>
              </li>
            </ul>
          </section>
        </div>
      </article>
    </div>
  </div>
  <MeuFooter v-if="!post || post.with_footer !== false" />
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { useRoute, useRouter } from 'vue-router';
import api, { API_BASE_URL, errorMessage } from '@/services/api';
import MeuHeader from '@/components/MeuHeader.vue';
import MeuFooter from '@/components/MeuFooter.vue';
import IsolatedRenderer from '@/components/IsolatedRenderer.vue';
import CodeNotebookViewer from '@/components/postagens/CodeNotebookViewer.vue';
import ResourceDataViewer from '@/components/postagens/ResourceDataViewer.vue';
import DocumentMiniReader from '@/components/postagens/DocumentMiniReader.vue';
import { coverSvgDataUri } from '@/utils/coverUtils.js';
import { coverModel, TIPO_LABEL } from '@/utils/postagemV2.js';
import { mediaEmbedUrl } from '@/utils/analysisUtils.js';
import { formatBytes } from '@/utils/uploadR2.js';
import { useAuth } from '@/composables/useAuth';
import { useToast } from '@/composables/useToast';
import {
  attachmentGroup, canPreviewInMemory, fileExtension, nbviewerUrl, partitionAttachments,
} from '@/utils/attachmentResources';

const route = useRoute();
const router = useRouter();
const auth = useAuth();
const toast = useToast();

const post = ref(null);
const isLoading = ref(true);
const error = ref(null);
const baixandoId = ref(null);
const baixandoTodos = ref('');
const signedMediaUrl = ref('');
const inlineImages = ref([]);
const resourceUrls = ref({});
const selectedCode = ref(null);
const selectedData = ref(null);
const selectedDocument = ref(null);

// Download: pede uma URL assinada (TTL curto) ao backend e abre. O bucket é
// privado, então o link vem do endpoint autenticado, não do payload.
async function baixar(ax) {
  if (baixandoId.value && baixandoId.value !== ax.id) return false;
  baixandoId.value = ax.id;
  try {
    const { data } = await api.get(`/api/postagens/${encodeURIComponent(post.value.slug)}/anexos/${ax.id}/url`);
    if (!data?.data?.url) throw new Error('Arquivo indisponível.');
    const link = document.createElement('a');
    link.href = data.data.url;
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch (e) {
    error.value = null; // não derruba a página
    toast.error(errorMessage(e));
    return false;
  } finally {
    baixandoId.value = null;
  }
}

async function baixarTodos(files, group) {
  if (baixandoTodos.value || !files.length) return;
  baixandoTodos.value = group;
  let ok = 0;
  for (const file of files) {
    if (await baixar(file)) ok += 1;
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  baixandoTodos.value = '';
  if (ok) toast.success(`${ok} arquivo${ok > 1 ? 's' : ''} preparado${ok > 1 ? 's' : ''} para download.`);
}

async function assinarRecurso(file) {
  if (!file || post.value?.previa) return '';
  if (resourceUrls.value[file.id]) return resourceUrls.value[file.id];
  try {
    const { data } = await api.get(
      `/api/postagens/${encodeURIComponent(post.value.slug)}/anexos/${file.id}/url?inline=1`);
    const url = data?.data?.url || '';
    resourceUrls.value = { ...resourceUrls.value, [file.id]: url };
    return url;
  } catch (err) {
    toast.error(errorMessage(err));
    return '';
  }
}

const resourceUrl = (file) => file ? (resourceUrls.value[file.id] || '') : '';

async function selecionarRecurso(file, group) {
  if (group === 'code') selectedCode.value = file;
  else if (group === 'data') selectedData.value = file;
  else selectedDocument.value = file;
  await assinarRecurso(file);
}

const googleViewerUrl = (url) => url
  ? `https://docs.google.com/gview?embedded=0&url=${encodeURIComponent(url)}`
  : 'https://drive.google.com/';
const officeViewerUrl = (url) => url
  ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`
  : 'https://www.microsoft365.com/';
const documentExternalUrl = (file) => {
  const url = resourceUrl(file);
  return ['doc', 'docx', 'rtf'].includes(fileExtension(file)) ? officeViewerUrl(url) : (url || '#');
};

function abrirEditorExterno(file, editor) {
  const destinations = {
    colab: 'https://colab.research.google.com/#create=true',
    vscode: 'https://vscode.dev/',
    docs: 'https://drive.google.com/drive/u/0/my-drive',
  };
  window.open(destinations[editor], '_blank', 'noopener');
  baixar(file);
  toast.info('O arquivo foi baixado. Importe-o no editor que acabou de abrir.');
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
const mediaKind = computed(() =>
  post.value?.tipo === 'video' || post.value?.subtipo?.formato_midia === 'video' ? 'video' : 'audio');
const resourceGroups = computed(() => partitionAttachments(post.value?.anexos || []));
const codeFiles = computed(() => [...resourceGroups.value.notebooks, ...resourceGroups.value.code]);
const dataFiles = computed(() => resourceGroups.value.data);
const documentFiles = computed(() => resourceGroups.value.documents);
const genericAttachments = computed(() => resourceGroups.value.attachments);
const temAnexos = computed(() => genericAttachments.value.length > 0);
const temDownloads = computed(() => (post.value?.anexos?.length || 0) > 0);

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
const rawMediaUrl = computed(() => signedMediaUrl.value || (!embedIsIframe.value ? rawEmbedUrl.value : ''));

async function carregarMidiaPropria() {
  signedMediaUrl.value = '';
  inlineImages.value = [];
  if (!post.value || post.value.previa) return;

  const imagens = (post.value.anexos || []).filter((a) => a.tipo === 'imagem').slice(0, 12);
  inlineImages.value = (await Promise.all(imagens.map(async (image) => {
    try {
      const { data } = await api.get(
        `/api/postagens/${encodeURIComponent(post.value.slug)}/anexos/${image.id}/url?inline=1`);
      return data?.data?.url ? { ...image, url: data.data.url } : null;
    } catch { return null; }
  }))).filter(Boolean);

  if (rawEmbedUrl.value) return;
  const formato = post.value.tipo === 'video' || post.value.subtipo?.formato_midia === 'video' ? 'video' : 'audio';
  const anexo = post.value.anexos?.find((a) => a.tipo === formato)
    || post.value.anexos?.find((a) => ['audio', 'video'].includes(a.tipo));
  if (!anexo) return;
  try {
    const { data } = await api.get(
      `/api/postagens/${encodeURIComponent(post.value.slug)}/anexos/${anexo.id}/url?inline=1`);
    signedMediaUrl.value = data?.data?.url || '';
  } catch { /* o cartÃ£o exibe o fallback de indisponibilidade */ }
}

async function carregarRecursos() {
  resourceUrls.value = {};
  selectedCode.value = codeFiles.value[0] || null;
  selectedData.value = dataFiles.value[0] || null;
  selectedDocument.value = documentFiles.value[0] || null;
  if (post.value?.previa) return;
  await Promise.all([
    assinarRecurso(selectedCode.value),
    assinarRecurso(selectedData.value),
    assinarRecurso(selectedDocument.value),
  ]);
}

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
  documento: 'mdi:file-document-outline', dado: 'mdi:file-table-outline', codigo: 'mdi:code-tags',
  notebook: 'mdi:notebook-outline', audio: 'mdi:file-music-outline', video: 'mdi:file-video-outline',
  imagem: 'mdi:file-image-outline', anexo: 'mdi:file-outline',
};
const anexoIcon = (ax) => ANEXO_ICON[ax?.tipo] || 'mdi:file-outline';
const ANEXO_LABEL = {
  documento: 'Documento', dado: 'Planilha ou dados', codigo: 'Código-fonte', notebook: 'Notebook Python',
  audio: 'Áudio', video: 'Vídeo', imagem: 'Imagem', anexo: 'Outro arquivo',
};
const anexoLabel = (ax) => ANEXO_LABEL[ax?.tipo] || 'Arquivo';

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
    await Promise.all([carregarMidiaPropria(), carregarRecursos()]);
    beacon(post.value.id);
  } catch (err) {
    error.value = err?.response?.status === 404 ? 'Publicação não encontrada.' : errorMessage(err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => carregar(route.params.id));
watch(() => route.params.id, (novo, antigo) => {
  if (novo && novo !== antigo) { window.scrollTo({ top: 0, behavior: 'auto' }); carregar(novo); }
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

.media-card { margin: 2rem 0; padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 14px; box-shadow: 0 16px 40px rgba(2, 6, 23, .08); }
.media-head { display: flex; align-items: center; gap: .8rem; margin-bottom: 1rem; }
.media-head-icon { width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; background: color-mix(in srgb, var(--accent, var(--brand-primary)) 14%, transparent); color: var(--accent, var(--brand-primary)); font-size: 1.2rem; }
.media-head span:last-child { display: flex; flex-direction: column; }
.media-head small, .section-eyebrow { color: var(--text-muted); font-size: .68rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.media-head strong { color: var(--text-main); font-size: 1rem; }
.media-player { width: 100%; height: 240px; border-radius: 8px; border: none; display: block; }
.media-audio, .media-video { width: 100%; display: block; }
.media-video { max-height: 70vh; border-radius: 8px; background: #020617; }
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

.section-title-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.section-title-row h3 { display: flex; align-items: center; gap: .5rem; margin: .2rem 0 0; color: var(--text-main); font-size: 1.2rem; }
.section-count { min-width: 34px; height: 34px; padding: 0 .6rem; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: color-mix(in srgb, var(--accent, var(--brand-primary)) 12%, transparent); color: var(--accent, var(--brand-primary)); font-size: .78rem; font-weight: 800; }
.visual-section { margin: 2.4rem 0; }
.visual-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 1rem; }
.visual-card { margin: 0; overflow: hidden; border: 1px solid var(--border-color); border-radius: 14px; background: var(--bg-surface); }
.visual-card img { width: 100%; max-height: 520px; object-fit: cover; display: block; background: var(--bg-input-form); }
.visual-card figcaption { display: flex; align-items: center; gap: .45rem; padding: .75rem .9rem; color: var(--text-secondary); font-size: .82rem; font-weight: 650; }

.resource-section { margin: 3rem 0 0; padding: 1.35rem; border: 1px solid var(--border-color); border-radius: 16px; background: var(--bg-surface); box-shadow: 0 18px 55px rgba(2, 6, 23, .06); }
.resource-section.code-lab { border-top: 3px solid #5f72e8; }
.resource-section.data-lab { border-top: 3px solid #1a8a6a; }
.resource-section.document-lab { border-top: 3px solid #b46a35; }
.resource-head { align-items: flex-start; }
.section-actions, .preview-actions { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.resource-btn, .preview-actions a, .preview-actions button { display: inline-flex; align-items: center; justify-content: center; gap: .38rem; min-height: 34px; padding: .42rem .7rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-input-form); color: var(--text-secondary); font: inherit; font-size: .72rem; font-weight: 750; text-decoration: none; cursor: pointer; }
.resource-btn:hover, .preview-actions a:hover, .preview-actions button:hover { border-color: var(--accent, var(--brand-primary)); color: var(--accent, var(--brand-primary)); }
.resource-btn:disabled { opacity: .55; cursor: wait; }
.resource-workbench { display: grid; grid-template-columns: minmax(210px, 250px) minmax(0, 1fr); gap: .85rem; align-items: start; }
.resource-list { display: grid; gap: .45rem; }
.resource-list > button { width: 100%; min-width: 0; display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: .55rem; padding: .65rem; border: 1px solid var(--border-color); border-radius: 11px; background: var(--bg-input-form); color: var(--text-main); text-align: left; cursor: pointer; }
.resource-list > button:hover, .resource-list > button.active { border-color: var(--accent, var(--brand-primary)); background: color-mix(in srgb, var(--accent, var(--brand-primary)) 7%, var(--bg-input-form)); }
.resource-list > button.active { box-shadow: inset 3px 0 0 var(--accent, var(--brand-primary)); }
.resource-file-icon { width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border-radius: 9px; background: color-mix(in srgb, var(--accent, var(--brand-primary)) 12%, transparent); color: var(--accent, var(--brand-primary)); }
.resource-list strong, .resource-list small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.resource-list strong { font-size: .78rem; }
.resource-list small { margin-top: .1rem; color: var(--text-muted); font-size: .66rem; }
.resource-preview { min-width: 0; }
.preview-toolbar { display: flex; align-items: center; justify-content: space-between; gap: .8rem; margin-bottom: .55rem; padding: .55rem .65rem; border-radius: 10px; background: var(--bg-input-form); }
.preview-toolbar > div:first-child { min-width: 0; }
.preview-toolbar > div:first-child span, .preview-toolbar > div:first-child strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.preview-toolbar > div:first-child span { color: var(--text-muted); font-size: .62rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.preview-toolbar > div:first-child strong { margin-top: .08rem; color: var(--text-main); font-size: .78rem; }
.preview-limit, .resource-locked { min-height: 150px; display: flex; align-items: center; justify-content: center; gap: .55rem; padding: 1.5rem; border: 1px dashed var(--border-color); border-radius: 13px; background: var(--bg-input-form); color: var(--text-muted); font-size: .82rem; line-height: 1.5; text-align: center; }

.attachments-section { margin-top: 3rem; background: var(--bg-surface); border-radius: 14px; padding: 1.75rem; border: 1px solid var(--border-color); }
.attachments-intro { max-width: 650px; margin: .65rem 0 1.35rem; color: var(--text-muted); font-size: .88rem; line-height: 1.55; }
.section-heading { font-size: 1.2rem; color: var(--text-main); margin: 0 0 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
.attach-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; }
.attach-item { min-width: 0; }
.attach-list a, .attach-locked { width: 100%; min-width: 0; display: flex; align-items: center; gap: .75rem; text-decoration: none; padding: .78rem; border-radius: 11px; border: 1px solid var(--border-color); background: var(--bg-input-form); transition: border-color .18s, transform .18s, background .18s; }
.attach-list a { color: var(--text-main); }
.attach-list a:hover { border-color: var(--accent, var(--brand-primary)); background: color-mix(in srgb, var(--accent, var(--brand-primary)) 7%, var(--bg-input-form)); transform: translateY(-1px); }
.attach-icon { flex: 0 0 38px; width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; background: color-mix(in srgb, var(--accent, var(--brand-primary)) 12%, transparent); color: var(--accent, var(--brand-primary)); font-size: 1.15rem; }
.attach-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.attach-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .86rem; }
.attach-copy small { margin-top: .12rem; color: var(--text-muted); font-size: .72rem; }
.attach-action { flex: 0 0 auto; color: var(--accent, var(--brand-primary)); opacity: .8; }
.attach-locked { color: var(--text-muted); }
.attach-list a.baixando { opacity: 0.7; pointer-events: none; }
.spin { animation: spin 0.8s linear infinite; }

@media (max-width: 768px) {
  .hero-title { font-size: 2.2rem; }
  .content-container { padding: 2rem 1rem; }
  .resumo { font-size: 1.15rem; }
  .dossie-card { padding: 1.25rem 1.25rem 1.4rem; }
  .dossie-grid { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.9rem 1.1rem; }
  .attachments-section { padding: 1.25rem; }
  .attach-list { grid-template-columns: 1fr; }
  .visual-grid { grid-template-columns: 1fr; }
  .resource-workbench { grid-template-columns: 1fr; }
  .resource-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .preview-toolbar { align-items: flex-start; flex-direction: column; }
  .preview-actions { width: 100%; }
  .preview-actions a, .preview-actions button { flex: 1 1 auto; }
}
@media (max-width: 520px) {
  .resource-section { padding: 1rem; }
  .resource-head { flex-direction: column; }
  .section-actions { width: 100%; justify-content: space-between; }
  .resource-list { grid-template-columns: 1fr; }
}
</style>
