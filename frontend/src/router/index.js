import { createRouter, createWebHistory } from "vue-router";
import { ref } from 'vue';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const isRouteLoading = ref(false);
// Vira true após a 1ª navegação resolver. Enquanto false, App.vue mostra a
// splash de boot; depois disso, navegações usam só a barra de progresso.
export const appBooted = ref(false);

const checkAuthStatus = async () => {
  // Sem token salvo: nem chega a bater no backend.
  if (!localStorage.getItem('authToken')) return false;
  // O interceptor do axios (main.js) injeta o header Authorization.
  try {
    await axios.get(API_BASE_URL + '/api/admin/verify-token');
    return true; // Token válido.
  } catch (error) {
    return false; // Token inválido ou expirado.
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
  { path: '/pesquisa',
    name: 'Pesquisa',
    component: () => import('@/views/PesquisaView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: "/contato",
    name: "Contato",
    component: () => import("../views/ContatoView.vue"),
    meta: { requiresAuth: true }
  },
  {
    path: "/catalogo",
    name: "Catalogo",
    component: () => import("../views/CatalogoView.vue"),
    meta: { requiresAuth: true }
  },
  {
    path: "/sobre",
    name: "Sobre",
    component: () => import("../views/SobreView.vue"),
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
    component: () => import("@/views/admin/AdminLogin.vue")
  },

  // --- Rotas de Administração (protegidas) ---
  {
    path: '/admin',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: { requiresAuth: true},
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

  isRouteLoading.value = true;

  /* ─────────────────────────────
     AUTENTICAÇÃO
  ───────────────────────────── */
  const requiresAuth = to.matched.some(r => r.meta.requiresAuth);

  if (requiresAuth) {
    const isAuth = await checkAuthStatus();
    if (!isAuth) {
      return next({ name: 'AdminLogin' });
    }
  }

  /* ─────────────────────────────
     EVITA LOGIN DUPLICADO
  ───────────────────────────── */
  if (to.name === 'AdminLogin') {
    const isAuth = await checkAuthStatus();
    if (isAuth) {
      return next({ name: 'AdminDashboard' });
    }
  }

  return next();
});

router.afterEach(() => {
  isRouteLoading.value = false;
  appBooted.value = true;
});



export default router;