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

// Constrói URL absoluta para um arquivo de mídia servido pela API/uploads.
// Centraliza o padrão que estava duplicado em coverUtils, HomeView, etc.
export const mediaUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path; // já absoluta (R2)
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default api;
