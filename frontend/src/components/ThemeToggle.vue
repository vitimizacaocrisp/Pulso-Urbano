<script setup>
import { ref, onMounted } from 'vue';

// Estado reativo para o ícone e lógica
const isDark = ref(false);

// Função para alternar o tema
const toggleTheme = () => {
  isDark.value = !isDark.value;
  updateTheme();
};

// Aplica a classe no DOM e salva no localStorage
const updateTheme = () => {
  const themeValue = isDark.value ? 'dark' : 'light';
  
  // Define o atributo data-theme na tag <html>
  document.documentElement.setAttribute('data-theme', themeValue);
  
  // Salva a preferência
  localStorage.setItem('user-theme', themeValue);
};

// Ao montar o componente, verifica preferências salvas ou do sistema
onMounted(() => {
  const savedTheme = localStorage.getItem('user-theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme) {
    isDark.value = savedTheme === 'dark';
  } else {
    // Se não tiver salvo, usa a preferência do sistema
    isDark.value = systemPrefersDark;
  }
  
  // Aplica o tema inicial
  updateTheme();
});
</script>

<template>
  <button 
    @click="toggleTheme" 
    class="theme-toggle-btn"
    :title="isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'"
    aria-label="Alternar Tema"
  >
    <!-- Ícone Sol (Light Mode) -->
    <svg v-if="!isDark" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>

    <!-- Ícone Lua (Dark Mode) -->
    <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle-btn {
  background: transparent;
  border: 1px solid var(--border-color); /* Usa a variável para se adaptar ao tema */
  color: var(--text-main);              /* Usa a variável para se adaptar ao tema */
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.theme-toggle-btn:hover {
  background-color: var(--bg-surface);
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
  transform: rotate(15deg);
}
</style>