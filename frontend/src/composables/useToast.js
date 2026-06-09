import { reactive } from 'vue';

// Fila de toasts compartilhada entre todos os componentes.
const toasts = reactive([]);
let nextId = 0;

function push(message, type = 'info', duration = 5000) {
  const id = nextId++;
  toasts.push({ id, message, type });
  if (duration > 0) setTimeout(() => remove(id), duration);
  return id;
}

function remove(id) {
  const i = toasts.findIndex(t => t.id === id);
  if (i !== -1) toasts.splice(i, 1);
}

export function useToast() {
  return {
    toasts,
    remove,
    error:   (msg, d) => push(msg, 'error', d),
    success: (msg, d) => push(msg, 'success', d),
    info:    (msg, d) => push(msg, 'info', d),
  };
}
