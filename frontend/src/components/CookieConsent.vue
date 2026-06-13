<template>
  <transition name="cookie-slide">
    <div v-if="visible" class="cookie-consent" role="dialog" aria-live="polite" aria-label="Aviso de cookies">
      <div class="cookie-consent__text">
        <Icon icon="mdi:cookie-outline" width="22" />
        <p>
          Usamos cookies para salvar suas preferências (tema, sessão e cache) e
          melhorar sua experiência de navegação. Ao continuar, você concorda
          com o uso de cookies. <router-link to="/sobre">Saiba mais</router-link>
        </p>
      </div>
      <div class="cookie-consent__actions">
        <button class="cookie-btn cookie-btn--ghost" @click="reject">Recusar</button>
        <button class="cookie-btn cookie-btn--primary" @click="accept">Aceitar</button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Icon } from '@iconify/vue';

const STORAGE_KEY = 'cookie-consent';
const visible = ref(false);

onMounted(() => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    setTimeout(() => { visible.value = true; }, 800);
  }
});

const accept = () => {
  localStorage.setItem(STORAGE_KEY, 'accepted');
  visible.value = false;
};

const reject = () => {
  localStorage.setItem(STORAGE_KEY, 'rejected');
  visible.value = false;
};
</script>

<style scoped>
.cookie-consent {
  position: fixed;
  left: 1rem;
  right: 1rem;
  bottom: 1rem;
  z-index: 9998;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: 720px;
  margin: 0 auto;
  padding: 1rem 1.25rem;
  background: var(--bg-surface);
  color: var(--text-main);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
}

.cookie-consent__text {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  flex: 1 1 280px;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-muted);
  margin: 0;
}

.cookie-consent__text :deep(svg) {
  flex-shrink: 0;
  margin-top: 0.15rem;
  color: var(--brand-primary);
}

.cookie-consent__text p { margin: 0; }

.cookie-consent__text a {
  color: var(--brand-primary);
  font-weight: 600;
  text-decoration: none;
}
.cookie-consent__text a:hover { text-decoration: underline; }

.cookie-consent__actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.cookie-btn {
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.cookie-btn--primary {
  background: var(--brand-primary);
  color: #ffffff;
}
.cookie-btn--primary:hover { background: var(--sys-primary-hover); }

.cookie-btn--ghost {
  background: transparent;
  color: var(--text-muted);
  border-color: var(--border-color);
}
.cookie-btn--ghost:hover { color: var(--text-main); border-color: var(--text-muted); }

.cookie-slide-enter-active,
.cookie-slide-leave-active { transition: all 0.3s ease; }
.cookie-slide-enter-from,
.cookie-slide-leave-to { opacity: 0; transform: translateY(20px); }

@media (max-width: 480px) {
  .cookie-consent { flex-direction: column; align-items: stretch; }
  .cookie-consent__actions { justify-content: flex-end; }
}
</style>
