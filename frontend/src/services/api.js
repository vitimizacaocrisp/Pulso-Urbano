import axios from 'axios';

// Base da API. Vazio em produção (mesmo domínio na Vercel: chamadas relativas
// /api/... resolvem same-origin). Em dev, o proxy do Vite encaminha /api.
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Instância única do axios — fonte de verdade para baseURL, credenciais e
// interceptors. Antes, ~12 arquivos repetiam `const API_BASE_URL = env...` e
// montavam a URL na mão; agora todos importam este cliente.
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // cookie httpOnly de auth viaja automaticamente
});

// Fallback de compat: se ainda houver token legado em localStorage, envia no
// header. Após o primeiro login novo, a auth é 100% via cookie httpOnly.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Tratamento central de erros de auth (doc 04) ─────────────────────
// A API v2 responde { success:false, error:{ code, message } }. Um handler é
// registrado por quem tem contexto de router/toast (main.js) via onAuthError;
// o interceptor apenas normaliza e delega. 401 → sessão perdida; 403 → sem
// permissão (não desloga).
let authErrorHandler = null;
export const onAuthError = (fn) => { authErrorHandler = fn; };

// Extrai o código de erro v2 (com fallback pro shape legado {message}).
export const errorCode = (e) => e?.response?.data?.error?.code || null;
export const errorMessage = (e) =>
  e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || 'Erro inesperado.';

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error?.response?.status;
    const code = errorCode(error);
    if ((status === 401 || status === 403) && authErrorHandler) {
      authErrorHandler({ status, code, message: errorMessage(error) });
    }
    return Promise.reject(error);
  }
);

// Constrói URL absoluta para um arquivo de mídia servido pela API/uploads.
// Centraliza o padrão que estava duplicado em coverUtils, HomeView, etc.
export const mediaUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path; // já absoluta (R2)
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default api;
