import { defineNuxtPlugin, useRouter } from '#imports'
import { onAuthError } from '@/services/api'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'

// Tratamento é por CÓDIGO de erro v2 (doc 04), não por status HTTP: um 401/403
// pode ser só "não logado" (probe do guard de rota, fetchMe em página pública)
// — estado normal e silencioso. Só reagimos aos códigos que exigem ação.
// Client-only: durante SSR um 401 só deve renderizar a página como anônima,
// nunca disparar toast/redirect (o middleware de auth já cuida do redirect).
export default defineNuxtPlugin(() => {
  const auth = useAuth()
  const toast = useToast()
  const router = useRouter()

  onAuthError(({ code }) => {
    // Kicks reais: sessão tomada em outro dispositivo ou conta desativada.
    if (code === 'sessao_encerrada' || code === 'conta_desativada') {
      toast.error(code === 'sessao_encerrada'
        ? 'Sua conta foi acessada em outro dispositivo.'
        : 'Sua conta foi desativada.')
      const eraAdmin = auth.state.me?.tipo === 'admin'
        || router.currentRoute.value.path.startsWith('/admin')
        || router.currentRoute.value.path === '/login_admin'
      auth.limparSessao()
      const destino = eraAdmin ? '/login_admin' : '/login'
      if (router.currentRoute.value.path !== destino) router.push(destino)
      return
    }
    // Logado, porém sem permissão para ESTA ação: avisa, não desloga.
    if (code === 'role_insuficiente') {
      toast.error('Você não tem permissão para essa ação.')
      return
    }
    // sem_token / token_invalido / 403 legado sem code = "não logado": silencioso.
    // O middleware de rota redireciona ao login quando a rota exige auth.
  })
})
