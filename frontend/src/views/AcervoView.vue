<template>
  <div class="page-wrapper">
    <MeuHeader />

    <section class="acervo-hero">
      <div class="hero-inner">
        <p class="hero-eyebrow"><Icon :icon="icon" /> {{ eyebrow }}</p>
        <h1 class="hero-title">{{ pageTitle }}</h1>
        <p class="hero-sub">{{ pageSubtitle }}</p>
      </div>
    </section>

    <main class="content-container">
      <!-- :key força recriação ao trocar de /producoes para /dados -->
      <CardAnalisesCatalogo :key="entryType" :entry-type="entryType" />
    </main>

    <MeuFooter />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import MeuHeader from '@/components/MeuHeader.vue';
import MeuFooter from '@/components/MeuFooter.vue';
import CardAnalisesCatalogo from '@/components/catalogo/CardAnalisesCatalogo.vue';

const props = defineProps({
  entryType:   { type: String, required: true },
  pageTitle:   { type: String, default: 'Acervo' },
  pageSubtitle:{ type: String, default: '' },
  eyebrow:     { type: String, default: 'Acervo' },
  icon:        { type: String, default: 'mdi:bookshelf' },
});
// computeds preservam reatividade ao alternar entre /producoes e /dados
const entryType    = computed(() => props.entryType);
const pageTitle    = computed(() => props.pageTitle);
const pageSubtitle = computed(() => props.pageSubtitle);
const eyebrow      = computed(() => props.eyebrow);
const icon         = computed(() => props.icon);
</script>

<style scoped>
.page-wrapper { display: flex; flex-direction: column; min-height: 100vh; }
.acervo-hero { position: relative; background: var(--bg-header); padding: 3.5rem 1.5rem 3rem; }
.hero-inner { max-width: var(--container-width); margin: 0 auto; }
.hero-eyebrow { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 3px; color: var(--brand-primary); font-weight: 700; margin-bottom: 0.75rem; }
.hero-title { font-size: clamp(1.8rem, 4vw, 2.75rem); font-weight: 900; color: #fff; margin: 0 0 0.5rem; line-height: 1.15; }
.hero-sub { color: var(--text-muted); font-size: 0.98rem; max-width: 640px; line-height: 1.5; }
.content-container { width: 100%; max-width: var(--container-width); margin: 0 auto; padding: 1.5rem 0.5rem 3rem; }
@media (max-width: 600px) { .acervo-hero { padding: 2.5rem 1rem 2rem; } }
</style>
