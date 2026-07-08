<template>
  <div class="auth-split">
    <!-- Painel de marca (institucional, identidade fixa) -->
    <aside class="brand">
      <div class="brand-grid"></div>
      <div class="pulse" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>

      <RouterLink to="/" class="brand-logo">Pulso<span>Urbano</span></RouterLink>

      <div class="brand-mid">
        <p class="brand-eyebrow">Observatório Nacional</p>
        <h2 class="brand-tagline">Dados e inteligência para a segurança pública brasileira.</h2>
        <ul class="brand-points">
          <li><Icon icon="mdi:chart-box-outline" width="18" /> Análises e microdados de vitimização</li>
          <li><Icon icon="mdi:file-document-multiple-outline" width="18" /> Produções científicas e relatórios</li>
          <li><Icon icon="mdi:download-outline" width="18" /> Acervo aberto para download</li>
        </ul>
      </div>

      <p class="brand-footer">CRISP · UFMG — {{ ano }}</p>
    </aside>

    <!-- Painel de formulário -->
    <main class="form-side">
      <div class="form-box">
        <RouterLink to="/" class="mobile-logo">Pulso<span>Urbano</span></RouterLink>
        <h1 class="auth-title">{{ titulo }}</h1>
        <p v-if="subtitulo" class="auth-sub">{{ subtitulo }}</p>
        <slot />
        <RouterLink to="/" class="auth-back"><Icon icon="mdi:arrow-left" width="16" /> Voltar ao site</RouterLink>
      </div>
    </main>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue';
defineProps({ titulo: { type: String, required: true }, subtitulo: { type: String, default: '' } });
const ano = new Date().getFullYear();
</script>

<style scoped>
.auth-split {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  font-family: var(--font-body);
  background: var(--bg-body);
}

/* ── Painel de marca ── */
.brand {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 3rem 3.25rem;
  color: #eaf0ff;
  background:
    radial-gradient(1100px 500px at 85% -10%, rgba(47, 84, 235, 0.35), transparent 60%),
    linear-gradient(160deg, #0b1730 0%, #0a1226 55%, #070d1c 100%);
}
.brand-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(circle at 30% 40%, #000 0%, transparent 75%);
  z-index: 0;
}
/* "pulso" — anéis concêntricos expandindo (identidade da marca) */
.pulse { position: absolute; top: 20%; right: -60px; z-index: 0; }
.pulse span {
  position: absolute; border: 1px solid rgba(47,84,235,0.5); border-radius: 50%;
  width: 220px; height: 220px; top: 0; left: 0;
  animation: ring 4.5s ease-out infinite; opacity: 0;
}
.pulse span:nth-child(2) { animation-delay: 1.5s; }
.pulse span:nth-child(3) { animation-delay: 3s; }
@keyframes ring {
  0% { transform: scale(0.3); opacity: 0.8; }
  100% { transform: scale(1.6); opacity: 0; }
}
.brand-logo, .mobile-logo { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px; color: #fff; text-decoration: none; position: relative; z-index: 1; }
.brand-logo span, .mobile-logo span { color: var(--brand-primary); }
.brand-mid { position: relative; z-index: 1; }
.brand-eyebrow {
  font-size: 0.72rem; text-transform: uppercase; letter-spacing: 3px; font-weight: 700;
  color: #8ea2d6; margin: 0 0 1rem;
}
.brand-tagline { font-size: clamp(1.5rem, 2.6vw, 2.1rem); font-weight: 800; line-height: 1.2; margin: 0 0 2rem; letter-spacing: -0.5px; max-width: 460px; }
.brand-points { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.9rem; }
.brand-points li { display: flex; align-items: center; gap: 0.7rem; font-size: 0.95rem; color: #c3cfea; }
.brand-points svg { color: var(--brand-primary); flex-shrink: 0; }
.brand-footer { position: relative; z-index: 1; font-size: 0.8rem; color: #6f7fa6; margin: 0; }

/* ── Painel de formulário ── */
.form-side {
  display: flex; align-items: center; justify-content: center;
  padding: 2.5rem 1.5rem;
  background: var(--bg-surface, var(--bg-card));
}
.form-box { width: 100%; max-width: 400px; }
.mobile-logo { display: none; font-size: 1.5rem; margin-bottom: 1.75rem; }
.auth-title { font-size: 1.65rem; font-weight: 800; color: var(--text-main); margin: 0 0 0.4rem; letter-spacing: -0.5px; }
.auth-sub { color: var(--text-secondary); font-size: 0.95rem; margin: 0 0 1.9rem; line-height: 1.45; }
.auth-back { display: inline-flex; align-items: center; gap: 5px; margin-top: 1.75rem; color: var(--text-muted); text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
.auth-back:hover { color: var(--brand-primary); }

/* Primitivos de formulário compartilhados — aplicados ao conteúdo do slot. */
:slotted(.field) { display: flex; flex-direction: column; gap: 6px; margin-bottom: 1.15rem; }
:slotted(.field > span) { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
:slotted(.field input) { width: 100%; padding: 0.78rem 1rem; border: 1px solid var(--border-input, var(--border-color)); border-radius: 10px; background: var(--bg-input-form); color: var(--text-main); font-size: 0.95rem; transition: border-color 0.18s, box-shadow 0.18s, background 0.18s; }
:slotted(.field input:focus) { outline: none; border-color: var(--brand-primary); box-shadow: 0 0 0 4px rgba(47, 84, 235, 0.14); background: var(--bg-surface); }
:slotted(.primary-btn) { width: 100%; padding: 0.85rem; background: var(--brand-primary); color: #fff; border: none; border-radius: 10px; font-size: 0.98rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: transform 0.15s, box-shadow 0.2s, background 0.2s; box-shadow: 0 6px 18px rgba(47, 84, 235, 0.28); }
:slotted(.primary-btn:hover:not(:disabled)) { transform: translateY(-1px); box-shadow: 0 9px 22px rgba(47, 84, 235, 0.36); background: var(--brand-primary-hover, var(--brand-primary)); }
:slotted(.primary-btn:disabled) { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
:slotted(.form-alert) { background: var(--bg-danger-light); border: 1px solid var(--sys-danger); color: var(--sys-danger); padding: 0.75rem 0.9rem; border-radius: 10px; font-size: 0.88rem; margin-bottom: 1.1rem; display: flex; align-items: center; gap: 7px; }
:slotted(.form-ok) { background: var(--bg-hover); border: 1px solid var(--border-color); color: var(--text-secondary); padding: 0.85rem; border-radius: 10px; font-size: 0.9rem; margin-bottom: 1rem; }
:slotted(.form-hint) { font-size: 0.8rem; color: var(--text-muted); margin: -0.3rem 0 1.1rem; }
:slotted(.form-links) { display: flex; justify-content: space-between; gap: 0.75rem; margin-top: 1.2rem; font-size: 0.9rem; flex-wrap: wrap; }
:slotted(.form-links a) { color: var(--brand-primary); text-decoration: none; font-weight: 600; }
:slotted(.form-links a:hover) { text-decoration: underline; }
:slotted(.spinner) { width: 18px; height: 18px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: auth-spin 0.8s linear infinite; }
@keyframes auth-spin { to { transform: rotate(360deg); } }

@media (max-width: 900px) {
  .auth-split { grid-template-columns: 1fr; }
  .brand { display: none; }
  .mobile-logo { display: block; }
}
@media (prefers-reduced-motion: reduce) {
  .pulse span { animation: none; }
}
</style>
