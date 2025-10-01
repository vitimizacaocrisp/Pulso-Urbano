import { createRouter, createWebHistory } from "vue-router";

// --- Layouts Principais ---
import AdminLayout from '../views/admin/AdminLayout.vue';

// --- Views Públicas ---
import HomeView from "../views/HomeView.vue";
import ContatoView from "../views/ContatoView.vue";
import SobreView from "../views/Sobre.vue";
import CategoryView from '../views/CategoryView.vue';
import PostsDetailView from "../views/postagens/PostagensDetailView.vue";
import AdminLogin from "@/views/admin/AdminLogin.vue";
import NotFound from "../views/NotFound.vue";

// --- Views aninhadas de "Admin" ---
import AdminDashboardView from '../views/admin/AdminDashboard.vue';
import ContentManagerView from '../views/admin/ContentManagerView.vue';
import EditAnalysisView from '../views/admin/EditAnalysisView.vue';

const routes = [
  // --- Rotas Públicas (acessíveis a todos) ---
  {
    path: "/",
    name: "Home",
    component: HomeView,
    meta: { requiresAuth: true } 
  },
  {
    path: "/contato",
    name: "Contato",
    component: ContatoView,
    meta: { requiresAuth: true }
  },
  {
    path: "/sobre",
    name: "Sobre",
    component: SobreView,
    meta: { requiresAuth: true }
  },
  {
    path: '/categoria/:categoryName?', // Rota para listar por categoria ou todas
    name: 'CategoryView',
    component: CategoryView,
    meta: { requiresAuth: true }
  },
  {
    // ROTA CORRIGIDA: Nome e caminho ajustados
    path: '/postagem/:id', 
    name: 'PostsDetail',
    component: PostsDetailView,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'AdminLogin',
    component: AdminLogin,
    meta: { requiresAuth: false, hideLayout: true} // Não requer autenticação
  },

  // --- Rotas de Administração (já estavam aninhadas) ---
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, hideLayout: true },
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: AdminDashboardView,
      },
      {
        path: 'content-manager',
        name: 'ContentManager',
        component: ContentManagerView,
      },
      {
        path: 'edit-analysis',
        name: 'EditAnalysis',
        component: EditAnalysisView,
      },
      {
        path: '',
        redirect: { name: 'AdminDashboard' },
      }
    ],
  },

  // --- Rota 404 (deve ser a última) ---
  { path: "/:pathMatch(.*)*", name: "NotFound", component: NotFound }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation Guard: Protege as rotas de admin
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const token = localStorage.getItem('authToken');

  if (to.name === 'AdminLogin' && token) {
    // Se tentar acessar o login já logado, vai para o dashboard
    next({ name: 'AdminDashboard' });
  } else if (requiresAuth && !token) {
    // Se a rota exige login e não há token, vai para o login
    next({ name: 'AdminLogin' });
  } else {
    // Permite o acesso
    next();
  }
});

export default router;