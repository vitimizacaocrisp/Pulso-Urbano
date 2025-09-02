import { createRouter, createWebHistory } from "vue-router";

// --- Layouts Principais ---
import AdminLayout from '../views/admin/AdminLayout.vue';
import AnalisesLayout from '../views/AnalisesLayout.vue';

// --- Views Públicas (ou que não precisam de layout aninhado) ---
import Home from "../views/Home.vue";
import SobreView from "../views/Sobre.vue";
import NotFound from "../views/NotFound.vue";
import Educacao from "@/views/Educacao.vue";
import Publicacoes from "@/views/Publicacoes.vue";
import AdminLogin from "@/views/admin/AdminLogin.vue";

// --- Views aninhadas de "Análises" ---
import Analises from "../views/AnalisesView.vue"; // A página principal que lista as análises
import AnalysisDetailView from "../views/analises/AnalysisDetailView.vue"; // Detalhes de uma análise específica

// --- Views aninhadas de "Admin" ---
import AdminDashboardView from '../views/admin/AdminDashboard.vue';
import SqlTerminalView from '../views/admin/SqlTerminalView.vue';
import ContentManagerView from '../views/admin/ContentManagerView.vue';
import EditAnalysisView from '../views/admin/EditAnalysisView.vue';

const routes = [
  // --- Rota de Login (Pública) ---
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: AdminLogin,
    meta: { requiresAuth: false, hideLayout: true } // Esta rota NÃO exige autenticação
  },

  // --- Rotas Protegidas ---
  {
    path: "/",
    name: "Home",
    component: Home,
    meta: { requiresAuth: true }
  },
  {
    path: "/sobre",
    name: "Sobre",
    component: SobreView,
    meta: { requiresAuth: true }
  },
  {
    path: "/educacao",
    name: "Educacao",
    component: Educacao,
    meta: { requiresAuth: true }
  },
  {
    path: "/publicacoes",
    name: "Publicacoes",
    component: Publicacoes,
    meta: { requiresAuth: true }
  },

  // [MODIFICADO] Estrutura aninhada para as Análises
  {
    path: '/analises',
    component: AnalisesLayout, // Usa o novo layout como componente pai
    meta: { requiresAuth: true },
    children: [
      {
        path: ':id', // URL: /analises/1, /analises/2, etc.
        name: 'AnalysisDetail',
        component: AnalysisDetailView,
      },
      {
        path: '', // URL: /analises
        name: 'Analises',
        component: Analises, // Página que lista todas as análises
      }
    ]
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
        path: 'sql-terminal',
        name: 'SqlTerminal',
        component: SqlTerminalView,
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
  history: createWebHistory(process.env.BASE_URL),
  routes
});

// O seu "navigation guard" global, que agora protegerá quase todas as rotas
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const token = localStorage.getItem('authToken');

  if (requiresAuth && !token) {
    // Se a rota exige autenticação e não há token, redireciona para o login
    next({ name: 'AdminLogin' });
  } else {
    // Caso contrário, permite o acesso
    next();
  }
});

export default router;