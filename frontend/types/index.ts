// Tipos compartilhados entre composables, services e páginas. Migração
// TS gradual (tsconfig sem strict) — tipamos o que é reusado com frequência;
// respostas de API mais específicas ficam `any`/inline onde não compensa.

// Conta autenticada (user ou admin), vinda de GET /api/me. Shape do backend
// varia um pouco por tipo de conta, por isso os campos extras ficam soltos.
export interface AuthMe {
  id: string | number
  tipo: 'user' | 'admin'
  role?: 'admin' | 'superadmin'
  nome?: string
  name?: string
  email?: string
  avatar_url?: string
  [key: string]: unknown
}

export type ToastType = 'error' | 'success' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

// Envelope padrão da API v2: { success, data } ou { success:false, error }.
export interface ApiEnvelope<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: { code?: string; message?: string }
}
