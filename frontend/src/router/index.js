import { createRouter, createWebHistory } from "vue-router";
import { ref } from 'vue';
import api from '@/services/api';

export const isRouteLoading = ref(false);
// Vira true após a 1ª navegação resolver. Enquanto false, App.vue mostra a
// splash de boot; depois disso, navegações usam só a barra de progresso.
export const appBooted = ref(false);

const checkAuthStatus = async () => {
  // Auth via cookie httpOnly: JS não consegue lê-lo, então não dá pra checar
  // localmente. Perguntamos ao backend (o cookie vai junto via withCredentials).
  try {
    await api.get('/api/admin/verify-token');
    return true; // Cookie válido.
  } catch (error) {
    return false; // Sem cookie, inválido ou expirado.
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
  // Acervo unificado — um só componente (AcervoView) muda o recorte via viewKey.
  {
    path: "/catalogo",
    name: "Catalogo",
    component: () => import("../views/AcervoView.vue"),
    meta: { requiresAuth: true },
    props: { viewKey: 'all' }
  },
  {
    path: "/analises",
    name: "Analises",
    component: () => import("../views/AcervoView.vue"),
    meta: { requiresAuth: true },
    props: { viewKey: 'analysis' }
  },
  {
    path: "/producoes",
    name: "Producoes",
    component: () => import("../views/AcervoView.vue"),
    meta: { requiresAuth: true },
    props: { viewKey: 'academic' }
  },
  {
    path: "/dados",
    name: "Dados",
    component: () => import("../views/AcervoView.vue"),
    meta: { requiresAuth: true },
    props: { viewKey: 'dataset' }
  },
  {
    path: "/crisp",
    name: "Crisp",
    component: () => import("../views/AcervoView.vue"),
    meta: { requiresAuth: true },
    props: { viewKey: 'crisp' }
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