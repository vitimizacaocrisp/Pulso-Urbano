import { createRouter, createWebHistory } from "vue-router";
import axios from 'axios';

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';
/**
 * Função de segurança que valida o token com o backend.
 * É a fonte de verdade para saber se o usuário está autenticado.
 * @returns {Promise<boolean>} - Retorna true se autenticado, false caso contrário.
 */
const checkAuthStatus = async () => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    return false;
  }
  
  try {
    // A URL completa da API deve ser configurada globalmente no Axios ou vir de variáveis de ambiente
    await axios.get(API_BASE_URL + '/api/admin/verify-token', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return true; // Token é válido.
  } catch (error) {
    console.error("Token inválido ou expirado. Removendo...");
    localStorage.removeItem('authToken'); // Limpa o token inválido.
    return false;
  }
};

const routes = [
  // --- Rotas Públicas (acessíveis a todos) ---
  {
    path: "/",
    name: "Home",
    component: () => import("../views/HomeView.vue"),
    meta: { requiresAuth: true }
  },
  {
    path: "/contato",
    name: "Contato",
    component: () => import("../views/ContatoView.vue"),
    meta: { requiresAuth: true }
  },
  {
    path: "/sobre",
    name: "Sobre",
    component: () => import("../views/Sobre.vue"),
    meta: { requiresAuth: true }
  },
  {
    path: '/categoria/:categoryName?',
    name: 'CategoryView',
    component: () => import('../views/CategoryView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/postagem/:id',
    name: 'AnalysisDetail',
    component: () => import("../views/postagens/PostagensDetailView.vue"),
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'AdminLogin',
    component: () => import("@/views/admin/AdminLogin.vue"),
    meta: { hideLayout: true }
  },

  // --- Rotas de Administração (protegidas) ---
  {
    path: '/admin',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: { requiresAuth: true, hideLayout: true },
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('../views/admin/AdminDashboard.vue'),
      },
      {
        path: 'content-manager',
        name: 'ContentManager',
        component: () => import('../views/admin/ContentManagerView.vue'),
      },
      {
        path: 'edit-analysis/:id?',
        name: 'EditAnalysis',
        component: () => import('../views/admin/EditAnalysisView.vue'),
        props: true
      },
      {
        // Redireciona /admin para /admin/dashboard
        path: '',
        redirect: { name: 'AdminDashboard' },
      }
    ],
  },

  // --- Rota 404 (Not Found) ---
  { 
    path: "/:pathMatch(.*)*", 
    name: "NotFound", 
    component: () => import("../views/NotFound.vue") 
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Guarda de Rota Global: lida com a lógica primária de navegação.
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(r => r.meta.requiresAuth);

  if (requiresAuth) {
    const isAuth = await checkAuthStatus();
    if (!isAuth) {
      return next({ name: 'AdminLogin' });
    }
  }

  if (to.name === 'AdminLogin') {
    const token = localStorage.getItem('authToken');
    if (token) {
      const isAuth = await checkAuthStatus();
      if (isAuth) {
        return next({ name: 'AdminDashboard' });
      }
    }
  }

  return next();
});


export default router;