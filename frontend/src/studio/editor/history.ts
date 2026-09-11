export interface EditorHistory<T> {
  past: T[]
  future: T[]
  limit: number
}

export interface HistoryStep<T> {
  history: EditorHistory<T>
  value?: T
}

export function createEditorHistory<T>(limit = 50): EditorHistory<T> {
  return { past: [], future: [], limit: Math.max(1, limit) }
}

export function recordEditorHistory<T>(history: EditorHistory<T>, current: T): EditorHistory<T> {
  return {
    ...history,
    past: [...history.past, current].slice(-history.limit),
    future: [],
  }
}

export function undoEditorHistory<T>(history: EditorHistory<T>, current: T): HistoryStep<T> {
  const value = history.past.at(-1)
  if (value === undefined) return { history }
  return {
    value,
    history: {
      ...history,
      past: history.past.slice(0, -1),
      future: [...history.future, current].slice(-history.limit),
    },
  }
}

export function redoEditorHistory<T>(history: EditorHistory<T>, current: T): HistoryStep<T> {
  const value = history.future.at(-1)
  if (value === undefined) return { history }
  return {
    value,
    history: {
      ...history,
      past: [...history.past, current].slice(-history.limit),
      future: history.future.slice(0, -1),
    },
  }
}
