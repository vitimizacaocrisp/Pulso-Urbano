<template>
  <div class="up-prog" role="status" aria-live="polite">
    <div class="ring" :style="ringStyle">
      <span class="ring-pct">{{ percent }}%</span>
    </div>
    <div class="up-info">
      <p class="up-label">{{ label || 'Enviando arquivo…' }}</p>
      <div class="bar-track"><div class="bar-fill" :style="{ width: percent + '%' }"></div></div>
      <p v-if="sub" class="up-sub">{{ sub }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({
  percent: { type: Number, default: 0 },
  label: { type: String, default: '' },
  sub: { type: String, default: '' },
});
// Anel: parte determinística (progresso) + giro contínuo enquanto <100.
const ringStyle = computed(() => ({
  background: `conic-gradient(var(--brand-primary) ${props.percent * 3.6}deg, var(--bg-hover) 0deg)`,
}));
</script>

<style scoped>
.up-prog { display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-card); }
.ring { position: relative; width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; animation: up-spin 1.1s linear infinite; }
.ring::after { content: ''; position: absolute; inset: 6px; border-radius: 50%; background: var(--bg-card); }
.ring-pct { position: relative; z-index: 1; font-size: 0.7rem; font-weight: 800; color: var(--text-main); animation: up-counter-spin 1.1s linear infinite; }
.up-info { flex: 1; min-width: 0; }
.up-label { margin: 0 0 0.4rem; font-size: 0.9rem; font-weight: 600; color: var(--text-main); }
.bar-track { height: 8px; border-radius: 999px; background: var(--bg-hover); overflow: hidden; }
.bar-fill { height: 100%; background: var(--brand-primary); border-radius: 999px; transition: width 0.2s ease; }
.up-sub { margin: 0.4rem 0 0; font-size: 0.78rem; color: var(--text-muted); }
@keyframes up-spin { to { transform: rotate(360deg); } }
@keyframes up-counter-spin { to { transform: rotate(-360deg); } }
</style>
