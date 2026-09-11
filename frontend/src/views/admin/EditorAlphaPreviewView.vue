<template>
  <div class="preview-shell">
    <header class="preview-bar">
      <div>
        <strong>Preview do Editor Alpha</strong>
        <span v-if="documento">{{ documento.metadata.title }}</span>
      </div>
      <div class="preview-actions">
        <button type="button" @click="carregar">
          <Icon icon="mdi:refresh" width="14" /> Atualizar
        </button>
        <button type="button" :disabled="!documento" @click="baixarHtml">
          <Icon icon="mdi:download-outline" width="14" /> Baixar HTML
        </button>
        <RouterLink to="/admin/editor-alpha">
          <Icon icon="mdi:pencil-outline" width="14" /> Voltar ao editor
        </RouterLink>
      </div>
    </header>

    <p v-if="avisoExport" class="preview-aviso">{{ avisoExport }}</p>

    <div ref="palco" class="preview-stage">
      <!-- `measure-auto` fica desligado de propósito: fora do editor os tamanhos
           gravados no documento são a verdade, e deixar o CSS redimensionar aqui
           faria o preview divergir do que seria publicado. -->
      <GraphicStudioRenderer
        v-if="documento"
        :document="documento"
        :measure-auto="false"
        :animate="true"
      />
      <p v-else class="preview-empty">
        {{ erro || 'Nenhum rascunho salvo ainda. Crie algo no editor e volte aqui.' }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { Icon } from '@iconify/vue';
import { GraphicStudioRenderer } from '@/studio/renderer';
import { parseGraphicStudioDocument } from '@/studio/core';
// Direto do catálogo, não de '@/studio/editor': importar o índice traria o
// editor inteiro para o chunk desta tela, que só renderiza.
import { googleFontsStylesheetUrl } from '@/studio/editor/catalog';
import { ALPHA_STORAGE_KEY } from '@/studio/alphaStorage';
import { buildStandaloneHtml, countEphemeralAssets, suggestedFileName } from '@/studio/exportHtml';
// A mesma folha entra duas vezes de propósito: aplicada nesta tela, e como texto
// para ser embutida no arquivo exportado, que não pode depender do build.
import '@/assets/css/studio-render.css';
import studioRenderCss from '@/assets/css/studio-render.css?raw';

const documento = ref(null);
const erro = ref('');
const avisoExport = ref('');
const palco = ref(null);

// O preview abre em outra aba, então lê o rascunho do zero a cada visita. Se o
// editor estiver aberto ao lado, "Atualizar" busca a versão mais recente.
function carregar() {
  erro.value = '';
  try {
    const salvo = window.localStorage.getItem(ALPHA_STORAGE_KEY);
    documento.value = salvo ? parseGraphicStudioDocument(JSON.parse(salvo)) : null;
  } catch {
    documento.value = null;
    erro.value = 'O rascunho salvo não é um documento válido.';
  }
}

// O preview abre em aba própria, onde o editor não está montado para injetar as
// fontes que o documento referencia. Sem isto, o texto cairia no fallback e o
// preview não mostraria o que seria publicado.
function carregarFontes() {
  if (document.querySelector('link[data-graphicstudio-fonts]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = googleFontsStylesheetUrl();
  link.dataset.graphicstudioFonts = '';
  document.head.append(link);
}

/**
 * Baixa o que está na tela como um HTML que abre sozinho.
 *
 * O corpo é o DOM que o renderer já produziu, não uma segunda serialização —
 * o arquivo é, por construção, igual ao preview.
 */
function baixarHtml() {
  avisoExport.value = '';
  const raiz = palco.value?.querySelector('[data-graphicstudio-document]');
  if (!raiz || !documento.value) return;

  const corpo = raiz.outerHTML;
  const efemeros = countEphemeralAssets(corpo);
  if (efemeros > 0) {
    // Arquivos enviados do computador viram URLs `blob:`, válidas só nesta aba.
    // O arquivo baixado sai com esses espaços vazios, e é melhor dizer isso
    // antes do que entregar um HTML furado em silêncio.
    avisoExport.value = `${efemeros} arquivo(s) enviado(s) do computador não entram no HTML exportado. Troque por imagens com endereço público para incluí-los.`;
  }

  const html = buildStandaloneHtml({
    title: documento.value.metadata.title,
    bodyHtml: corpo,
    css: studioRenderCss,
    fontsHref: googleFontsStylesheetUrl(),
    // O tamanho da prancheta vem do próprio elemento renderizado, que já soma
    // todas as telas do documento. Com ele o arquivo encolhe para caber em
    // telas estreitas em vez de exigir rolagem lateral.
    board: { width: raiz.offsetWidth, height: raiz.offsetHeight },
  });

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedFileName(documento.value.metadata.title);
  link.click();
  // Revogar no próximo tick: revogar antes do clique ser processado cancela o
  // download em alguns navegadores.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

onMounted(() => {
  carregarFontes();
  carregar();
});
</script>

<style scoped>
/* `min-height` e não `height`: aqui a página pode crescer e rolar junto com o
   admin — o preview não precisa da altura fixa que o editor exige. */
.preview-shell {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.preview-bar {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  flex: 0 0 auto;
  padding: 0.55rem 1rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-header);
  font-size: 0.82rem;
}

.preview-bar span {
  margin-left: 0.5rem;
  color: var(--text-muted, var(--text-main));
}

.preview-actions {
  display: flex;
  gap: 0.5rem;
}

.preview-aviso {
  flex: 0 0 auto;
  margin: 0;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border-color);
  background: color-mix(in srgb, #f59e0b 14%, var(--bg-header));
  color: var(--text-main);
  font-size: 0.78rem;
}

.preview-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.preview-actions button,
.preview-actions a {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.25rem 0.6rem;
  color: var(--text-main);
  background: transparent;
  cursor: pointer;
  font-size: 0.78rem;
  text-decoration: none;
}

.preview-stage {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 1.5rem;
  background: var(--bg-body);
}

.preview-empty {
  margin: 3rem auto;
  max-width: 32rem;
  color: var(--text-main);
  text-align: center;
}
</style>
