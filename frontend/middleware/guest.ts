import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { useAuth } from '@/composables/useAuth'

// Páginas de login (/login, /login_admin): usuário já logado é mandado pra
// Home, evitando login duplicado. Mesmo comportamento do antigo isLoginPage
// no router.beforeEach (sempre volta pra Home, independente do tipo).
export default defineNuxtRouteMiddleware(async () => {
  // O cookie httpOnly de auth pertence ao domínio do BACKEND (projeto Vercel
  // separado), então o SSR nunca o enxerga: perguntar ao /api/me no servidor
  // sempre voltaria "deslogado" e o estado errado hidrataria no browser. A
  // checagem roda só no cliente.
  if (import.meta.server) return
  const { state, fetchMe } = useAuth()
  if (!state.carregado) await fetchMe()
  if (state.me) return navigateTo('/')
})
