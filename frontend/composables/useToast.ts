import { useState } from '#imports'
import type { Toast, ToastType } from '@/types'

// Fila de toasts. useState (não reactive() de módulo) porque sob SSR cada
// request precisa da sua própria fila — um singleton de módulo vazaria
// toasts entre usuários diferentes.
let nextId = 0

export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function push(message: string, type: ToastType = 'info', duration = 5000) {
    // Evita empilhar toasts idênticos (ex.: rajada de 401 na sessão única).
    const dup = toasts.value.find(t => t.message === message && t.type === type)
    if (dup) return dup.id
    const id = nextId++
    toasts.value.push({ id, message, type })
    if (duration > 0) setTimeout(() => remove(id), duration)
    return id
  }

  function remove(id: number) {
    const i = toasts.value.findIndex(t => t.id === id)
    if (i !== -1) toasts.value.splice(i, 1)
  }

  return {
    toasts,
    remove,
    error:   (msg: string, d?: number) => push(msg, 'error', d),
    success: (msg: string, d?: number) => push(msg, 'success', d),
    info:    (msg: string, d?: number) => push(msg, 'info', d),
  }
}
