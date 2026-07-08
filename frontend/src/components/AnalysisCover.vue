<template>
  <div class="analysis-cover" :class="{ 'is-generated': cover.kind !== 'image' }">
    <!-- Imagem real ou foto externa -->
    <img
      v-if="cover.kind === 'image' || cover.kind === 'photo'"
      :src="cover.src"
      :alt="analysis.title"
      loading="lazy"
      @error="onImgError"
    />
    <!-- SVG temático gerado (categoria/tags) -->
    <div v-else class="cover-svg" v-html="cover.svg"></div>

    <!-- Indicativo da análise sobre fotos externas -->
    <div v-if="cover.kind === 'photo'" class="photo-indicator">
      <span class="photo-cat">{{ analysis.category || 'Análise' }}</span>
      <span class="photo-title">{{ analysis.title }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { pickCover, buildCoverSvg } from '@/utils/coverUtils.js';

const props = defineProps({
  analysis: { type: Object, required: true },
});

// Se a foto externa falhar, cai para o SVG gerado.
const imgFailed = ref(false);

const cover = computed(() => {
  const c = pickCover(props.analysis);
  if ((c.kind === 'photo' || c.kind === 'image') && imgFailed.value) {
    return { kind: 'svg', svg: buildCoverSvg(props.analysis) };
  }
  return c;
});

const onImgError = () => { imgFailed.value = true; };
</script>

<style scoped>
.analysis-cover {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: var(--bg-hover);
}
.analysis-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.5s ease;
}
.cover-svg,
.cover-svg :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
.cover-svg :deep(svg) { object-fit: cover; }

.photo-indicator {
  position: absolute;
  inset: auto 0 0 0;
  padding: 1.5rem 1rem 0.9rem;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.78));
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.photo-cat {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 700;
  opacity: 0.85;
}
.photo-title {
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
