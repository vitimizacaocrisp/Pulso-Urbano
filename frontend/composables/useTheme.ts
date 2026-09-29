import { computed } from 'vue'
import { useCookie } from '#imports'

// Modos disponíveis (na ordem do ciclo).
const THEMES = ['light', 'dark', 'comfort'] as const
export type ThemeName = typeof THEMES[number]

// Cookie (não localStorage): o SSR precisa saber o tema no 1º request pra
// renderizar `data-theme` correto de cara — sem isso haveria flash de tema
// errado (FOUC) que só um script inline no <head> resolvia antes.
export function useTheme() {
  const theme = useCookie<ThemeName>('user-theme', {
    default: () => 'light',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    watch: true,
  })

  const isDark = computed(() => theme.value === 'dark')

  const applyTheme = (name: string) => {
    theme.value = (THEMES as readonly string[]).includes(name) ? (name as ThemeName) : 'light'
  }

  // Cicla: claro → escuro → conforto → claro …
  const cycleTheme = () => {
    const idx = THEMES.indexOf(theme.value)
    applyTheme(THEMES[(idx + 1) % THEMES.length])
  }

  // Mantém o nome antigo apontando para o ciclo.
  const toggleTheme = cycleTheme

  const setTheme = (name: string) => applyTheme(name)

  // 1ª visita (cookie ainda não setado por escolha do usuário): usa a
  // preferência do sistema. Em visitas seguintes o cookie já decide no SSR.
  const initTheme = () => {
    if (!import.meta.client) return
    if (document.cookie.includes('user-theme=')) return
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(prefersDark ? 'dark' : 'light')
  }

  return { theme, isDark, toggleTheme, cycleTheme, setTheme, initTheme }
}
