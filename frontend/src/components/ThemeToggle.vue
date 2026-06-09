<script setup>
import { onMounted, computed } from 'vue';
import { useTheme } from '@/composables/useTheme';

const { theme, cycleTheme, initTheme } = useTheme();

onMounted(() => {
  initTheme();
});

const label = computed(() => ({
  light:   'Tema: Claro (clique p/ Escuro)',
  dark:    'Tema: Escuro (clique p/ Conforto)',
  comfort: 'Tema: Conforto (clique p/ Claro)',
}[theme.value]));
</script>

<template>
  <button
    @click="cycleTheme"
    class="theme-toggle-btn"
    :class="`is-${theme}`"
    :title="label"
    aria-label="Alternar tema"
  >
    <!-- Claro: sol -->
    <svg v-if="theme === 'light'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>

    <!-- Escuro: lua -->
    <svg v-else-if="theme === 'dark'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>

    <!-- Conforto: olho (descanso visual) -->
    <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle-btn {
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  padding: 0;
  background: transparent;
  border: 1px solid var(--border-color, #ccc);
  color: var(--text-main, #333);
  cursor: pointer;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.theme-toggle-btn:hover {
  background-color: var(--bg-hover);
  transform: rotate(15deg);
}

/* Dá um leve tom ao botão conforme o modo ativo */
.theme-toggle-btn.is-comfort { color: var(--brand-primary); }
</style>
