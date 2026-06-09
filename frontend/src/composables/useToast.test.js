import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useToast } from './useToast';

const { toasts, remove, error, success, info } = useToast();

beforeEach(() => {
  toasts.splice(0); // limpa a fila compartilhada entre testes
  vi.useRealTimers();
});

describe('useToast', () => {
  it('error() adiciona um toast do tipo error', () => {
    error('falhou');
    expect(toasts.length).toBe(1);
    expect(toasts[0]).toMatchObject({ message: 'falhou', type: 'error' });
  });

  it('success() e info() usam os tipos corretos', () => {
    success('ok');
    info('nota');
    expect(toasts.map((t) => t.type)).toEqual(['success', 'info']);
  });

  it('remove() remove o toast pelo id', () => {
    const id = error('x');
    expect(toasts.length).toBe(1);
    remove(id);
    expect(toasts.length).toBe(0);
  });

  it('cada toast recebe um id único', () => {
    const a = error('a');
    const b = error('b');
    expect(a).not.toBe(b);
  });

  it('o toast é removido automaticamente após a duração', () => {
    vi.useFakeTimers();
    error('some', 1000);
    expect(toasts.length).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(toasts.length).toBe(0);
  });

  it('duração 0 não remove automaticamente', () => {
    vi.useFakeTimers();
    error('fica', 0);
    vi.advanceTimersByTime(10000);
    expect(toasts.length).toBe(1);
  });
});
