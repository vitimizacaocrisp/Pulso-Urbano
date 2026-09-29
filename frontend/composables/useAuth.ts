import { reactive, computed } from 'vue'
import { useState } from '#imports'
import api from '@/services/api'
import type { AuthMe } from '@/types'

// Estado de autenticação v2 (docs 03/04). `me` = conta logada (user ou admin)
// vinda de /api/me; null = deslogado/desconhecido.
// useState (não reactive() de módulo) porque sob SSR cada request precisa do
// seu próprio estado — um singleton de módulo vazaria a sessão de um usuário
// pra resposta de outro.
export function useAuth() {
  const meState = useState<AuthMe | null>('auth-me', () => null)
  const carregadoState = useState('auth-carregado', () => false)

  const state = reactive({
    get me() { return meState.value },
    set me(v: AuthMe | null) { meState.value = v },
    get carregado() { return carregadoState.value },
    set carregado(v: boolean) { carregadoState.value = v },
  })

  const isLogado     = computed(() => !!state.me)
  const isAdmin      = computed(() => state.me?.tipo === 'admin')
  const isSuperadmin = computed(() => state.me?.tipo === 'admin' && state.me?.role === 'superadmin')

  // Busca o perfil (cookie httpOnly vai junto). 401 → deslogado (não é erro).
  async function fetchMe() {
    try {
      const { data } = await api.get('/api/me')
      state.me = data.data
    } catch {
      state.me = null
    } finally {
      state.carregado = true
    }
    return state.me
  }

  // tipo: 'user' | 'admin'. Endpoints diferentes (doc 06).
  // Admin com 2FA: retorna { requer2fa, challenge } SEM logar — o 2º passo é verify2fa.
  async function login(email: string, senha: string, { tipo = 'user', rememberMe = true }: { tipo?: 'user' | 'admin'; rememberMe?: boolean } = {}) {
    const url = tipo === 'admin' ? '/api/admin/auth/login' : '/api/auth/login'
    const { data } = await api.post(url, { email, password: senha, rememberMe })
    if (data?.data?.requer2fa) return { requer2fa: true, challenge: data.data.challenge }
    await fetchMe()
    return state.me
  }

  // 2º passo do login de admin com 2FA: código TOTP ou de recuperação.
  async function verify2fa(challenge: string, code: string) {
    await api.post('/api/admin/auth/2fa', { challenge, code })
    await fetchMe()
    return state.me
  }

  async function logout() {
    const tipo = state.me?.tipo || 'user'
    const url = tipo === 'admin' ? '/api/admin/auth/logout' : '/api/auth/logout'
    try { await api.post(url) } catch { /* ignora */ }
    state.me = null
  }

  // ── Fluxos de conta de usuário (doc 03) ──────────────────────────────
  // Cadastro: NÃO loga automaticamente — a conta precisa verificar o e-mail.
  // Retorna a mensagem do backend p/ exibir ao usuário.
  async function register({ nome, email, senha }: { nome: string; email: string; senha: string }) {
    const { data } = await api.post('/api/auth/register', { nome, email, senha })
    return data?.message || 'Cadastro recebido. Verifique seu e-mail para ativar a conta.'
  }

  // Resposta genérica (anti-enumeração): sempre "ok", exista a conta ou não.
  // tipo: 'user' | 'admin' (endpoints distintos).
  async function esqueciSenha(email: string, tipo: 'user' | 'admin' = 'user') {
    const url = tipo === 'admin' ? '/api/admin/auth/esqueci-senha' : '/api/auth/esqueci-senha'
    const { data } = await api.post(url, { email })
    return data?.message
  }

  // Consome token de reset e define nova senha (derruba sessões existentes).
  async function redefinirSenha(token: string, senha: string, tipo: 'user' | 'admin' = 'user') {
    const url = tipo === 'admin' ? '/api/admin/auth/redefinir-senha' : '/api/auth/redefinir-senha'
    await api.post(url, { token, senha })
  }

  // Consome token de verificação de e-mail (ativação de conta).
  async function verificarEmail(token: string) {
    await api.post('/api/auth/verificar', { token })
  }

  // Chamado pelo interceptor (plugins/auth-error-handler.client.ts) quando a
  // sessão morre remotamente.
  function limparSessao() { state.me = null }

  return {
    state, isLogado, isAdmin, isSuperadmin,
    fetchMe, login, logout, limparSessao, verify2fa,
    register, esqueciSenha, redefinirSenha, verificarEmail,
  }
}
