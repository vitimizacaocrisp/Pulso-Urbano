<script setup>
import { useToast } from '@/composables/useToast';

const { toasts, remove } = useToast();
</script>

<template>
  <div class="toast-container" role="status" aria-live="polite">
    <transition-group name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        :class="['toast', `toast--${t.type}`]"
        @click="remove(t.id)"
      >
        <span class="toast__msg">{{ t.message }}</span>
        <button class="toast__close" aria-label="Fechar" @click.stop="remove(t.id)">&times;</button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: min(360px, calc(100vw - 2rem));
}
.toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  cursor: pointer;
}
.toast--error   { background: #dc2626; }
.toast--success { background: #16a34a; }
.toast--info    { background: #2563eb; }
.toast__msg { flex: 1; }
.toast__close {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.85;
}
.toast__close:hover { opacity: 1; }

.toast-enter-active,
.toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from,
.toast-leave-to { opacity: 0; transform: translateX(20px); }
</style>
