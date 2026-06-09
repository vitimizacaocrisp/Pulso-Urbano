import { ref, computed } from 'vue';

// Modos disponíveis (na ordem do ciclo).
const THEMES = ['light', 'dark', 'comfort'];

// Estado global do tema (string).
const theme = ref('light');

// Compatibilidade: componentes antigos usam isDark.
const isDark = computed(() => theme.value === 'dark');

export function useTheme() {

  const applyTheme = (name) => {
    if (!THEMES.includes(name)) name = 'light';
    theme.value = name;
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem('user-theme', name);
  };

  // Cicla: claro → escuro → conforto → claro …
  const cycleTheme = () => {
    const idx = THEMES.indexOf(theme.value);
    applyTheme(THEMES[(idx + 1) % THEMES.length]);
  };

  // Mantém o nome antigo apontando para o ciclo.
  const toggleTheme = cycleTheme;

  const setTheme = (name) => applyTheme(name);

  // Inicialização: localStorage ou preferência do sistema.
  const initTheme = () => {
    const saved = localStorage.getItem('user-theme');
    if (saved && THEMES.includes(saved)) {
      applyTheme(saved);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }
  };

  return { theme, isDark, toggleTheme, cycleTheme, setTheme, initTheme };
}
