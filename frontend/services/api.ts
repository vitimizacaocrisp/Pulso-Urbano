import axios, { type AxiosError } from 'axios'
import { useRequestEvent, useRuntimeConfig } from '#imports'
import { appendResponseHeader, type H3Event } from 'h3'
// appendResponseHeader vem de h3 (dependência transitiva do Nitro) — não é
// reexportado por #imports fora de rotas server/, então importamos direto.

// Base da API. Frontend e backend são projetos Vercel separados (domínios
// diferentes) — sempre cross-origin, mesmo em produção.
export const API_BASE_URL = (): string => useRuntimeConfig().public.apiUrl || ''

// Instância única do axios — fonte de verdade para baseURL, credenciais e
// interceptors. Sob SSR o fetch é servidor-a-servidor: o cookie httpOnly de
// auth não viaja sozinho (isso só acontece em fetch feito pelo browser), por
// isso o interceptor abaixo encaminha o Cookie manualmente e retransmite
// qualquer Set-Cookie da resposta de volta pro browser.
const api = axios.create({ withCredentials: true })

function currentRequestEvent(): H3Event | null {
  if (!import.meta.server) return null
  try { return useRequestEvent() } catch { return null }
}

api.interceptors.request.use((config) => {
  config.baseURL = API_BASE_URL()
  const event = currentRequestEvent()
  if (event) {
    const cookie = event.node.req.headers.cookie
    if (cookie) config.headers.set('Cookie', cookie)
  }
  return config
})

// ── Tratamento central de erros de auth (doc 04) ─────────────────────
// A API v2 responde { success:false, error:{ code, message } }. Um handler é
// registrado por quem tem contexto de router/toast (plugins/auth-error-handler)
// via onAuthError; o interceptor apenas normaliza e delega. 401 → sessão
// perdida; 403 → sem permissão (não desloga).
export interface AuthErrorInfo {
  status?: number
  code: string | null
  message: string
}
type AuthErrorHandler = (info: AuthErrorInfo) => void

let authErrorHandler: AuthErrorHandler | null = null
export const onAuthError = (fn: AuthErrorHandler) => { authErrorHandler = fn }

// Guarda anti-enxurrada: quando a sessão morre remotamente (sessão única), há
// várias requisições em voo/repetidas — cada 401 dispararia um toast. Marcamos
// o "kick" como tratado e só voltamos a reagir após uma resposta 2xx (ex.: novo
// login), evitando o loop de dezenas de toasts idênticos.
let sessionKicked = false
export const resetAuthKick = () => { sessionKicked = false }

// Extrai o código de erro v2 (com fallback pro shape legado {message}).
export const errorCode = (e: any): string | null => e?.response?.data?.error?.code || null
export const errorMessage = (e: any): string =>
  e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || 'Erro inesperado.'

api.interceptors.response.use(
  (r) => {
    sessionKicked = false // resposta ok → re-arma o guard
    const event = currentRequestEvent()
    const setCookie = r.headers?.['set-cookie']
    if (event && setCookie) {
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
      cookies.forEach((c) => appendResponseHeader(event, 'set-cookie', c))
    }
    return r
  },
  (error: AxiosError) => {
    const status = error?.response?.status
    const code = errorCode(error)
    if ((status === 401 || status === 403) && authErrorHandler) {
      // Kicks duros (sessão tomada / conta desativada): dispara UMA vez.
      if (code === 'sessao_encerrada' || code === 'conta_desativada') {
        if (sessionKicked) return Promise.reject(error)
        sessionKicked = true
      }
      authErrorHandler({ status, code, message: errorMessage(error) })
    }
    return Promise.reject(error)
  }
)

// Constrói URL absoluta para um arquivo de mídia servido pela API/uploads.
// Centraliza o padrão que estava duplicado em coverUtils, HomeView, etc.
export const mediaUrl = (path?: string | null): string => {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path // já absoluta (R2)
  const base = API_BASE_URL()
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

export default api
