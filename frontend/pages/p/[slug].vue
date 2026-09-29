<template>
  <main class="studio-publica">
    <div v-if="carregando" class="studio-estado">Carregando…</div>
    <div v-else-if="erro" class="studio-estado">{{ erro }}</div>
    <!-- `measure-auto` desligado: fora do editor os tamanhos gravados no
         documento são a verdade, e deixar o CSS redimensionar aqui causaria um
         salto quando as fontes terminassem de carregar. -->
    <div v-else ref="palco" class="studio-palco">
      <GraphicStudioRenderer
        v-if="documento"
        :document="documento"
        :measure-auto="false"
        :animate="true"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { GraphicStudioRenderer } from '@/studio/renderer';
import { parseGraphicStudioDocument, syncComponentInstances } from '@/studio/core';
import { googleFontsStylesheetUrl } from '@/studio/editor/catalog';
import api, { errorMessage } from '@/services/api';
import '@/assets/css/studio-render.css';

const route = useRoute();
definePageMeta({ name: 'PaginaStudio', layout: false });
const documento = ref(null);
const carregando = ref(true);
const erro = ref('');
const palco = ref(null);

// Geometria absoluta não reflui: a página inteira encolhe proporcionalmente
// para caber em telas menores, sem nunca ampliar além do tamanho original.
function encaixar() {
  const raiz = palco.value?.querySelector('[data-graphicstudio-document]');
  if (!raiz || !palco.value) return;
  const largura = Number.parseFloat(raiz.style.width) || raiz.offsetWidth;
  const altura = Number.parseFloat(raiz.style.height) || raiz.offsetHeight;
  if (!largura) return;
  const fator = Math.min(1, palco.value.clientWidth / largura);
  raiz.style.transformOrigin = 'top left';
  raiz.style.transform = fator < 1 ? `scale(${fator})` : '';
  palco.value.style.height = `${Math.round(altura * fator)}px`;
}

function carregarFontes() {
  if (document.querySelector('link[data-graphicstudio-fonts]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = googleFontsStylesheetUrl();
  link.dataset.graphicstudioFonts = '';
  document.head.append(link);
}

onMounted(async () => {
  carregarFontes();
  try {
    const { data } = await api.get(`/api/studio/${encodeURIComponent(String(route.params.slug))}`);
    // Cópias de componente materializadas antes de exibir, mesmo que o documento
    // tenha sido publicado sem nenhuma edição depois de importado.
    documento.value = syncComponentInstances(parseGraphicStudioDocument(data.data.documento));
    document.title = data.data.titulo;
  } catch (requisicaoFalhou) {
    erro.value = errorMessage(requisicaoFalhou) || 'Página não encontrada.';
  } finally {
    carregando.value = false;
    // Espera o renderer montar antes de medir.
    window.setTimeout(encaixar, 0);
  }
  window.addEventListener('resize', encaixar);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', encaixar);
});
</script>

<style scoped>
.studio-publica {
  min-height: 60vh;
  background: #fff;
}

.studio-palco {
  overflow: hidden;
  width: 100%;
}

.studio-estado {
  padding: 4rem 1rem;
  color: var(--text-main);
  text-align: center;
}
</style>
