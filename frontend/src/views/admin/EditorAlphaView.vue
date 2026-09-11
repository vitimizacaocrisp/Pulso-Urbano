<template>
  <div class="alpha-shell">
    <div class="alpha-banner">
      <Icon icon="mdi:flask-outline" width="16" />
      <span>
        <strong>Editor Alpha</strong> — experimental, só para teste dos administradores.
        O conteúdo fica salvo <strong>apenas neste navegador</strong> e não é publicado.
      </span>
      <div class="alpha-acoes">
        <button type="button" class="alpha-botao" :disabled="salvando" @click="salvarNoServidor('rascunho')">
          <Icon icon="mdi:content-save-outline" width="14" /> Salvar
        </button>
        <button type="button" class="alpha-botao" :disabled="salvando" @click="publicar">
          <Icon icon="mdi:earth" width="14" /> Publicar
        </button>
        <button type="button" class="alpha-botao" :disabled="salvando" @click="carregarDoServidor">
          <Icon icon="mdi:cloud-download-outline" width="14" /> Abrir do servidor
        </button>
        <button type="button" class="alpha-botao" :disabled="salvando" @click="verHistorico">
          <Icon icon="mdi:history" width="14" /> Versões
        </button>
        <button type="button" class="alpha-botao" @click="exportarJson">
          <Icon icon="mdi:code-json" width="14" /> Exportar JSON
        </button>
        <label class="alpha-botao">
          <Icon icon="mdi:file-upload-outline" width="14" /> Importar JSON
          <input type="file" accept="application/json,.json" @change="importarJson" />
        </label>
        <button type="button" class="alpha-botao" @click="resetDocument">
          <Icon icon="mdi:restore" width="14" /> Recomeçar
        </button>
      </div>
    </div>

    <p v-if="aviso" class="alpha-aviso">{{ aviso }}</p>

    <div class="alpha-editor">
      <GraphicStudioEditor
        v-model:document="documento"
        home-href="/admin/dashboard"
        preview-href="/admin/editor-alpha/preview"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { Icon } from '@iconify/vue';
// Imports sem extensão de propósito: a lib é TypeScript e usa o padrão TS de
// importar com `.js`, que o Vite só resolve entre arquivos .ts — a partir de um
// .vue o import quebraria em runtime.
import { GraphicStudioEditor } from '@/studio/editor';
import { parseGraphicStudioDocument } from '@/studio/core';
import { createSeedDocument } from '@/studio/seedDocument';
import { ALPHA_STORAGE_KEY as STORAGE_KEY } from '@/studio/alphaStorage';
import { useTheme } from '@/composables/useTheme';
import api, { errorMessage } from '@/services/api';
import '@/assets/css/studio.css';
// Os `@keyframes` das animações de entrada moram aqui: o editor as lista nos
// presets, mas quem as define é a folha do documento renderizado.
import '@/assets/css/studio-render.css';

const documento = ref(createSeedDocument());
const aviso = ref('');
const salvando = ref(false);
// Versão do documento no servidor. `null` = ainda não veio de lá, então a
// próxima gravação é a primeira e não tem com quem conflitar.
const versaoServidor = ref(null);
const { theme } = useTheme();

let salvarTimer;

// O studio tem tema próprio e espera a classe `light` na raiz; o Pulso usa
// `data-theme` (light | dark | comfort). Esta ponte mantém os dois em sincronia
// sem duplicar CSS: 'comfort' é claro, então também recebe a classe.
function sincronizarTema() {
  const claro = theme.value !== 'dark';
  document.documentElement.classList.toggle('light', claro);
  document.documentElement.classList.toggle('dark', !claro);
}

function carregarRascunho() {
  try {
    const salvo = window.localStorage.getItem(STORAGE_KEY);
    if (salvo) documento.value = parseGraphicStudioDocument(JSON.parse(salvo));
  } catch {
    // Rascunho corrompido ou de uma versão antiga do schema: recomeça limpo em
    // vez de deixar a tela quebrada.
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function resetDocument() {
  if (!window.confirm('Descartar o rascunho e recomeçar do zero?')) return;
  window.localStorage.removeItem(STORAGE_KEY);
  documento.value = createSeedDocument();
  versaoServidor.value = null;
  aviso.value = '';
}

/**
 * Lista as versões guardadas e oferece restaurar uma.
 *
 * Restaurar grava como rascunho: voltar no tempo não deve republicar sozinho.
 */
async function verHistorico() {
  const slug = documento.value.metadata.slug;
  salvando.value = true;
  aviso.value = '';
  try {
    const { data } = await api.get(`/api/admin/studio-docs/${encodeURIComponent(slug)}/versoes`);
    const itens = data.data.itens;
    if (!itens.length) {
      aviso.value = 'Ainda não há versões anteriores desta página.';
      return;
    }
    const lista = itens
      .map((v) => `${v.versao} — ${new Date(v.created_at).toLocaleString('pt-BR')} (${v.status})`)
      .join('\n');
    const escolha = window.prompt(`Versões de ${slug}:\n${lista}\n\nRestaurar qual? (deixe vazio para cancelar)`, '');
    if (!escolha) return;
    const { data: restaurado } = await api.post(
      `/api/admin/studio-docs/${encodeURIComponent(slug)}/restaurar/${encodeURIComponent(escolha.trim())}`);
    const aberto = await api.get(`/api/admin/studio-docs/${encodeURIComponent(slug)}`);
    documento.value = parseGraphicStudioDocument(aberto.data.data.documento);
    versaoServidor.value = restaurado.data.data.versao;
    aviso.value = `Versão ${escolha.trim()} restaurada como rascunho (agora versão ${versaoServidor.value}).`;
  } catch (erro) {
    aviso.value = `Não foi possível ver o histórico: ${errorMessage(erro)}`;
  } finally {
    salvando.value = false;
  }
}

/**
 * Baixa o documento em JSON — o formato canônico, não a saída em HTML.
 *
 * É o que permite guardar um rascunho fora do navegador, mandar para outra
 * pessoa e continuar de onde parou. O HTML exportado no preview é a saída final;
 * este arquivo é a fonte.
 */
function exportarJson() {
  const texto = JSON.stringify(documento.value, null, 2);
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${documento.value.metadata.slug || 'documento'}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  aviso.value = '';
}

/**
 * Salva o documento no servidor, como rascunho ou publicado.
 *
 * O endereço público é o `slug` do documento, editável no próprio editor. Salvar
 * de novo com o mesmo slug sobrescreve — é a mesma página, não uma cópia.
 */
async function salvarNoServidor(status) {
  salvando.value = true;
  aviso.value = '';
  try {
    const { data } = await api.put('/api/admin/studio-docs', {
      status,
      // Versão que este editor abriu. O servidor recusa se alguém gravou no
      // meio do caminho, em vez de apagar o trabalho da outra pessoa.
      ...(versaoServidor.value ? { versao: versaoServidor.value } : {}),
      documento: documento.value,
    });
    versaoServidor.value = data?.data?.versao ?? null;
    const slug = data?.data?.slug ?? documento.value.metadata.slug;
    aviso.value = status === 'publicado'
      ? `Publicado em /p/${slug} (versão ${versaoServidor.value}).`
      : `Rascunho salvo no servidor: ${slug} (versão ${versaoServidor.value}).`;
  } catch (erro) {
    aviso.value = `Não foi possível salvar: ${errorMessage(erro)}`;
  } finally {
    salvando.value = false;
  }
}

function publicar() {
  const slug = documento.value.metadata.slug;
  if (!window.confirm(`Publicar em /p/${slug}? A página fica visível para qualquer visitante.`)) return;
  return salvarNoServidor('publicado');
}

async function carregarDoServidor() {
  const slug = window.prompt('Slug do documento a abrir:', documento.value.metadata.slug);
  if (!slug) return;
  salvando.value = true;
  aviso.value = '';
  try {
    const { data } = await api.get(`/api/admin/studio-docs/${encodeURIComponent(slug)}`);
    // Valida antes de trocar: documento estranho não derruba o que está aberto.
    documento.value = parseGraphicStudioDocument(data.data.documento);
    versaoServidor.value = data.data.versao ?? null;
    aviso.value = `Aberto do servidor: ${slug} (${data.data.status}, versão ${data.data.versao}).`;
  } catch (erro) {
    aviso.value = `Não foi possível abrir: ${errorMessage(erro)}`;
  } finally {
    salvando.value = false;
  }
}

async function importarJson(event) {
  const arquivo = event.target.files?.[0];
  // O input mantém o arquivo escolhido, e sem limpar não dá para reimportar o
  // mesmo arquivo depois de corrigi-lo.
  event.target.value = '';
  if (!arquivo) return;
  try {
    const texto = await arquivo.text();
    // Valida antes de trocar: um arquivo inválido não pode derrubar o rascunho
    // que está aberto.
    const proximo = parseGraphicStudioDocument(JSON.parse(texto));
    documento.value = proximo;
    // Documento importado é outro documento: a versão do servidor não vale mais.
    versaoServidor.value = null;
    aviso.value = `Importado: ${arquivo.name}`;
  } catch (erro) {
    aviso.value = `Não foi possível importar ${arquivo.name}. ${erro instanceof Error ? erro.message.slice(0, 300) : ''}`;
  }
}

watch(documento, (valor) => {
  window.clearTimeout(salvarTimer);
  salvarTimer = window.setTimeout(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(valor));
    } catch {
      // Cota cheia ou modo privativo: a edição segue, só não persiste.
    }
  }, 250);
}, { deep: true });

watch(theme, sincronizarTema);

onMounted(() => {
  carregarRascunho();
  sincronizarTema();
  document.body.classList.add('has-alpha-editor');
});

onBeforeUnmount(() => {
  window.clearTimeout(salvarTimer);
  // As classes são do studio; fora dele o Pulso volta a mandar sozinho.
  document.documentElement.classList.remove('light', 'dark');
  document.body.classList.remove('has-alpha-editor');
});
</script>

<style>
/* Não escopado de propósito: alcança o shell do admin, que é o pai.
   `.admin-main` usa `min-height: 100vh`, ou seja, altura indefinida — e altura
   indefinida faz `height: 100%` do editor colapsar, deixando o canvas sem
   tamanho. Aqui a altura vira definida e o scroll passa a ser interno, só
   enquanto esta rota está montada. As outras telas do admin não mudam. */
body.has-alpha-editor .admin-main {
  height: 100vh;
  min-height: 0;
}

body.has-alpha-editor .main-scroll {
  min-height: 0;
}
</style>

<style scoped>
.alpha-shell {
  display: flex;
  flex-direction: column;
  /* Ocupa a área de conteúdo do admin inteira: o editor precisa de altura
     definida, senão o canvas colapsa. */
  height: 100%;
  min-height: 0;
}

.alpha-banner {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex: 0 0 auto;
  padding: 0.55rem 1rem;
  border-bottom: 1px solid var(--border-color);
  background: color-mix(in srgb, #f59e0b 12%, var(--bg-header));
  color: var(--text-main);
  font-size: 0.82rem;
}

.alpha-banner > span {
  flex: 1;
  min-width: 0;
}

.alpha-acoes {
  display: flex;
  gap: 0.4rem;
  flex: 0 0 auto;
}

.alpha-botao {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.25rem 0.6rem;
  color: inherit;
  background: transparent;
  cursor: pointer;
  font-size: 0.78rem;
  white-space: nowrap;
}

.alpha-botao:hover {
  background: var(--bg-body);
}

/* O input fica escondido dentro do label, que já é o botão visível. */
.alpha-botao input[type="file"] {
  display: none;
}

.alpha-aviso {
  flex: 0 0 auto;
  margin: 0;
  padding: 0.45rem 1rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-body);
  color: var(--text-main);
  font-size: 0.78rem;
}

.alpha-editor {
  flex: 1;
  min-height: 0;
}

@media (max-width: 720px) {
  .alpha-banner {
    font-size: 0.74rem;
  }
}
</style>
