<template>
  <div class="page-wrapper">
    <MeuHeader />

    <!-- ── HERO reformulado (type-aware) ── -->
    <section class="acervo-hero" :style="{ '--accent': view.accent }">
      <div class="hero-blob blob-a"></div>
      <div class="hero-blob blob-b"></div>

      <div class="hero-inner">
        <p class="hero-eyebrow"><Icon :icon="view.icon" width="16" /> {{ view.eyebrow }}</p>
        <h1 class="hero-title">{{ view.title }}</h1>
        <p class="hero-sub">{{ view.subtitle }}</p>

        <!-- Troca de tipo inline (dobra como navegação) -->
        <nav class="hero-tabs" aria-label="Tipos de acervo">
          <router-link
            v-for="v in views"
            :key="v.key"
            :to="v.route"
            class="hero-tab"
            :class="{ active: v.key === view.key }"
          >
            <Icon :icon="v.icon" width="15" />
            {{ v.label }}
          </router-link>
        </nav>

        <!-- Contagem live do recorte atual -->
        <div class="hero-count" v-if="total !== null">
          <span class="count-num">{{ total }}</span>
          <span class="count-lbl">{{ view.countLabel }}</span>
        </div>
      </div>
    </section>

    <main class="content-container">
      <!-- :key força recriação ao trocar de recorte (/catalogo → /dados...) -->
      <CardAnalisesCatalogo
        :key="view.key"
        :entry-type="view.entryType"
        :crisp="!!view.crisp"
        @total="total = $event"
      />
    </main>

    <MeuFooter />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import MeuHeader from '@/components/MeuHeader.vue';
import MeuFooter from '@/components/MeuFooter.vue';
import CardAnalisesCatalogo from '@/components/catalogo/CardAnalisesCatalogo.vue';
import { acervoView, ACERVO_VIEWS, ACERVO_ORDER } from '@/config/acervoTypes.js';

// viewKey vem das rotas (props estáticas). Default 'all' = catálogo geral.
const props = defineProps({
  viewKey: { type: String, default: 'all' },
});

const view = computed(() => acervoView(props.viewKey));
const views = ACERVO_ORDER.map((k) => ACERVO_VIEWS[k]);

// Total do recorte atual (emitido pelo grid). Reseta ao trocar de view.
const total = ref(null);
watch(() => props.viewKey, () => { total.value = null; });
</script>

<style scoped>
.page-wrapper { display: flex; flex-direction: column; min-height: 100vh; }

/* ── HERO ── */
.acervo-hero {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(1200px 400px at 80% -20%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%),
    linear-gradient(160deg, #0b1a35 0%, #0e1830 60%, #0a1226 100%);
  padding: clamp(3rem, 7vw, 5.5rem) 1.5rem clamp(2.5rem, 5vw, 4rem);
  color: #fff;
}
.hero-blob {
  position: absolute; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 40%, transparent) 0%, transparent 70%);
  filter: blur(6px); z-index: 0;
}
.blob-a { width: 520px; height: 520px; top: -160px; right: -120px; }
.blob-b { width: 360px; height: 360px; bottom: -180px; left: 8%; opacity: 0.6; }

.hero-inner { position: relative; z-index: 1; max-width: var(--container-width); margin: 0 auto; }

.hero-eyebrow {
  display: inline-flex; align-items: center; gap: 0.45rem;
  font-size: 0.72rem; text-transform: uppercase; letter-spacing: 3px; font-weight: 700;
  color: color-mix(in srgb, var(--accent) 60%, #fff);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 6px 14px; border-radius: 999px; margin: 0 0 1.1rem;
}
.hero-title {
  font-size: clamp(2rem, 5vw, 3.25rem); font-weight: 900; line-height: 1.08;
  letter-spacing: -1px; margin: 0 0 0.9rem;
}
.hero-sub {
  color: #aab6d4; font-size: clamp(0.95rem, 1.6vw, 1.12rem); line-height: 1.55;
  max-width: 680px; margin: 0 0 2rem;
}

/* Tabs de troca de tipo */
.hero-tabs { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 2rem; }
.hero-tab {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.55rem 1.05rem; border-radius: 999px;
  font-size: 0.9rem; font-weight: 600; text-decoration: none;
  color: #c8d2ea;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.14);
  transition: all 0.18s ease;
}
.hero-tab:hover { background: rgba(255, 255, 255, 0.12); color: #fff; transform: translateY(-1px); }
.hero-tab.active {
  background: var(--accent); border-color: var(--accent); color: #fff;
  box-shadow: 0 6px 18px color-mix(in srgb, var(--accent) 45%, transparent);
}

/* Contagem live */
.hero-count { display: flex; align-items: baseline; gap: 0.6rem; }
.count-num { font-size: clamp(2rem, 4vw, 2.75rem); font-weight: 900; color: #fff; line-height: 1; }
.count-lbl { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; color: #8b97b8; }

.content-container {
  width: 100%; max-width: var(--container-width); margin: 0 auto;
  padding: 1.5rem 0.5rem 3rem;
}

@media (max-width: 600px) {
  .hero-tab { padding: 0.5rem 0.85rem; font-size: 0.82rem; }
}
</style>
