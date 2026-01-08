import { ref } from 'vue';

// Estado global do tema
const isDark = ref(false);

export function useTheme() {
  
  // Função para aplicar o tema no HTML e LocalStorage
  const applyTheme = (dark) => {
    const themeValue = dark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', themeValue);
    localStorage.setItem('user-theme', themeValue);
    isDark.value = dark;
  };

  const toggleTheme = () => {
    applyTheme(!isDark.value);
  };

  // Inicialização (Checa localStorage ou preferência do sistema)
  const initTheme = () => {
    const savedTheme = localStorage.getItem('user-theme');
    if (savedTheme) {
      applyTheme(savedTheme === 'dark');
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(systemPrefersDark);
    }
  };

  return {
    isDark,
    toggleTheme,
    initTheme
  };
}