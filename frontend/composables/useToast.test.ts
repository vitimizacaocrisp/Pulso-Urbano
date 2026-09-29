import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, type Ref } from 'vue'

// useToast() usa useState() do Nuxt (#imports), que exige um app Nuxt ativo.
// Fora do runtime do Nuxt (vitest puro), mockamos useState por um ref
// singleton por chave — suficiente pra testar a lógica da fila de toasts.
const stateStore = new Map<string, Ref>()
vi.mock('#imports', () => ({
  useState: (key: string, init?: () => unknown) => {
    if (!stateStore.has(key)) stateStore.set(key, ref(init ? init() : undefined))
    return stateStore.get(key)
  },
}))

const { useToast } = await import('./useToast')
const { toasts, remove, error, success, info } = useToast()

beforeEach(() => {
  toasts.value.splice(0) // limpa a fila compartilhada entre testes
  vi.useRealTimers()
})

describe('useToast', () => {
  it('error() adiciona um toast do tipo error', () => {
    error('falhou')
    expect(toasts.value.length).toBe(1)
    expect(toasts.value[0]).toMatchObject({ message: 'falhou', type: 'error' })
  })

  it('success() e info() usam os tipos corretos', () => {
    success('ok')
    info('nota')
    expect(toasts.value.map((t) => t.type)).toEqual(['success', 'info'])
  })

  it('remove() remove o toast pelo id', () => {
    const id = error('x')
    expect(toasts.value.length).toBe(1)
    remove(id)
    expect(toasts.value.length).toBe(0)
  })

  it('cada toast recebe um id único', () => {
    const a = error('a')
    const b = error('b')
    expect(a).not.toBe(b)
  })

  it('o toast é removido automaticamente após a duração', () => {
    vi.useFakeTimers()
    error('some', 1000)
    expect(toasts.value.length).toBe(1)
    vi.advanceTimersByTime(1000)
    expect(toasts.value.length).toBe(0)
  })

  it('duração 0 não remove automaticamente', () => {
    vi.useFakeTimers()
    error('fica', 0)
    vi.advanceTimersByTime(10000)
    expect(toasts.value.length).toBe(1)
  })
})
