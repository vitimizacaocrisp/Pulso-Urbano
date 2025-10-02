import { createRouter, createWebHistory } from "vue-router";
import axios from 'axios';

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
    // Ex: axios.defaults.baseURL = 'http://localhost:3000';
    await axios.get('/api/auth/verify-token', {
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
  },
  {
    path: "/contato",
    name: "Contato",
    component: () => import("../views/ContatoView.vue"),
  },
  {
    path: "/sobre",
    name: "Sobre",
    component: () => import("../views/Sobre.vue"),
  },
  {
    path: '/categoria/:categoryName?',
    name: 'CategoryView',
    component: () => import('../views/CategoryView.vue'),
  },
  {
    path: '/postagem/:id',
    name: 'AnalysisDetail',
    component: () => import("../views/postagens/PostagensDetailView.vue"),
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
    // Guarda de segurança no "portão principal" do admin.
    // Verifica a validade do token com o backend antes de entrar em QUALQUER rota filha.
    beforeEnter: async (to, from, next) => {
      const isAuthenticated = await checkAuthStatus();
      if (isAuthenticated) {
        next(); // Permite a entrada na área de admin.
      } else {
        next({ name: 'AdminLogin' }); // Bloqueia e redireciona para o login.
      }
    },
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
        path: 'edit-analysis/:id',
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
  const token = localStorage.getItem('authToken');
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  // 1. Verificação primária e mais rápida:
  // Se a rota exige login e o usuário NÃO tem token, redireciona imediatamente.
  if (requiresAuth && !token) {
    return next({ name: 'AdminLogin' });
  }

  // 2. Lógica para impedir que usuários logados acessem a página de login:
  // Se o usuário tem um token e tenta acessar o login, verifica a validade
  // e o redireciona para o dashboard se o token for válido.
  if (to.name === 'AdminLogin' && token) {
    const isAuthenticated = await checkAuthStatus();
    if (isAuthenticated) {
      return next({ name: 'AdminDashboard' });
    }
  }

  // 3. Em todos os outros casos, permite a navegação.
  // A validação de segurança mais profunda para rotas de admin será feita pelo 'beforeEnter'.
  next();
});

export default router;