<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <RouterLink to="/" class="auth-logo">Pulso<span>Urbano</span></RouterLink>
      <h1 class="auth-title">{{ titulo }}</h1>
      <p v-if="subtitulo" class="auth-sub">{{ subtitulo }}</p>
      <slot />
    </div>
    <RouterLink to="/" class="auth-back"><Icon icon="mdi:arrow-left" /> Voltar ao site</RouterLink>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue';
defineProps({ titulo: { type: String, required: true }, subtitulo: { type: String, default: '' } });
</script>

<style scoped>
.auth-wrap {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  padding: 2rem 1rem;
  background: var(--bg-body);
  font-family: var(--font-body);
}
.auth-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-surface, var(--bg-card));
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 2rem;
  box-shadow: var(--shadow-sm);
}
.auth-logo { display: block; text-align: center; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.5px; color: var(--text-main); text-decoration: none; margin-bottom: 1.25rem; }
.auth-logo span { color: var(--brand-primary); }
.auth-title { font-size: 1.4rem; font-weight: 800; color: var(--text-main); margin: 0 0 0.35rem; }
.auth-sub { color: var(--text-secondary); font-size: 0.92rem; margin: 0 0 1.5rem; }
.auth-back { color: var(--text-secondary); text-decoration: none; font-size: 0.88rem; display: inline-flex; align-items: center; gap: 4px; }
.auth-back:hover { color: var(--text-main); }

/* Primitivos de formulário compartilhados — aplicados ao conteúdo do slot. */
:slotted(.field) { display: flex; flex-direction: column; gap: 5px; margin-bottom: 1rem; }
:slotted(.field > span) { font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); }
:slotted(.field input) { padding: 0.7rem 0.85rem; border: 1px solid var(--border-input, var(--border-color)); border-radius: 8px; background: var(--bg-input-form); color: var(--text-main); font-size: 0.95rem; }
:slotted(.field input:focus) { outline: none; border-color: var(--brand-primary); box-shadow: 0 0 0 4px rgba(47, 84, 235, 0.1); }
:slotted(.primary-btn) { width: 100%; padding: 0.8rem; background: var(--brand-primary); color: #fff; border: none; border-radius: 8px; font-size: 0.98rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.2s; }
:slotted(.primary-btn:hover:not(:disabled)) { background: var(--brand-primary-hover, var(--brand-primary)); }
:slotted(.primary-btn:disabled) { opacity: 0.6; cursor: not-allowed; }
:slotted(.form-alert) { background: var(--bg-danger-light); border: 1px solid var(--sys-danger); color: var(--sys-danger); padding: 0.7rem 0.85rem; border-radius: 8px; font-size: 0.88rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 6px; }
:slotted(.form-ok) { background: var(--bg-hover); border: 1px solid var(--border-color); color: var(--text-secondary); padding: 0.8rem; border-radius: 8px; font-size: 0.9rem; margin-bottom: 1rem; }
:slotted(.form-hint) { font-size: 0.78rem; color: var(--text-muted); margin-top: -0.4rem; margin-bottom: 1rem; }
:slotted(.form-links) { display: flex; justify-content: space-between; gap: 0.75rem; margin-top: 1.1rem; font-size: 0.88rem; flex-wrap: wrap; }
:slotted(.form-links a) { color: var(--brand-primary); text-decoration: none; font-weight: 600; }
:slotted(.form-links a:hover) { text-decoration: underline; }
:slotted(.spinner) { width: 18px; height: 18px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: auth-spin 0.8s linear infinite; }
@keyframes auth-spin { to { transform: rotate(360deg); } }
</style>
