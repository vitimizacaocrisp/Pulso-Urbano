import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { useAuth } from '@/composables/useAuth'

// Substitui o antigo router.beforeEach global. Auth v2 via cookie httpOnly
// (o JS não lê o cookie): perguntamos ao backend com /api/me. Aplicado só
// nas páginas que precisam (definePageMeta({middleware:'auth', ...})), não
// globalmente — evita checagem em toda navegação de página pública.
export default defineNuxtRouteMiddleware(async (to) => {
  // O cookie httpOnly de auth pertence ao domínio do BACKEND (projeto Vercel
  // separado), então o SSR nunca o enxerga: perguntar ao /api/me no servidor
  // sempre voltaria "deslogado" e o estado errado hidrataria no browser. A
  // checagem roda só no cliente.
  if (import.meta.server) return
  const { state, fetchMe } = useAuth()
  if (!state.carregado) await fetchMe() // null = deslogado

  const requiresAdmin = !!to.meta.requiresAdmin

  if (!state.me) {
    return navigateTo({ path: requiresAdmin ? '/login_admin' : '/login', query: { redirect: to.fullPath } })
  }
  if (requiresAdmin && state.me.tipo !== 'admin') {
    return navigateTo({ path: '/login_admin', query: { redirect: to.fullPath } })
  }
})
