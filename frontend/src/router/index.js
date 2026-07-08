import { createRouter, createWebHistory } from "vue-router";
import { ref } from 'vue';
import { useAuth } from '@/composables/useAuth';

export const isRouteLoading = ref(false);
// Vira true após a 1ª navegação resolver. Enquanto false, App.vue mostra a
// splash de boot; depois disso, navegações usam só a barra de progresso.
export const appBooted = ref(false);


const routes = [
  // --- Rotas Públicas (observatório aberto, sem login) ---
  // Modelo de acesso v2: listagens e acervo são públicos. Baixar arquivos e ver
  // a postagem na íntegra exigem conta de usuário (gate no backend + view de
  // detalhe, prévia p/ anônimo). Ver docs/planejamento (modelo de acesso).
  {
    path: "/",
    name: "Home",
    component: () => import("../views/HomeView.vue")
  },
  { path: '/pesquisa',
    name: 'Pesquisa',
    component: () => import('@/views/PesquisaView.vue')
  },
  {
    path: "/contato",
    name: "Contato",
    component: () => import("../views/ContatoView.vue")
  },
  // Acervo unificado — um só componente (AcervoView) muda o recorte via viewKey.
  {
    path: "/catalogo",
    name: "Catalogo",
    component: () => import("../views/AcervoView.vue"),
    props: { viewKey: 'all' }
  },
  {
    path: "/analises",
    name: "Analises",
    component: () => import("../views/AcervoView.vue"),
    props: { viewKey: 'analysis' }
  },
  {
    path: "/producoes",
    name: "Producoes",
    component: () => import("../views/AcervoView.vue"),
    props: { viewKey: 'academic' }
  },
  {
    path: "/dados",
    name: "Dados",
    component: () => import("../views/AcervoView.vue"),
    props: { viewKey: 'dataset' }
  },
  {
    path: "/podcast",
    name: "Podcast",
    component: () => import("../views/AcervoView.vue"),
    props: { viewKey: 'podcast' }
  },
  {
    path: "/crisp",
    name: "Crisp",
    component: () => import("../views/AcervoView.vue"),
    props: { viewKey: 'crisp' }
  },
  {
    path: "/sobre",
    name: "Sobre",
    component: () => import("../views/SobreView.vue")
  },
  {
    // Público com gate de conteúdo: o backend entrega prévia p/ anônimo e
    // corpo completo + URLs de download p/ logado (optionalAuth). :id aceita
    // slug ou id legado (numérico → 301 client-side p/ o slug).
    path: '/postagem/:id',
    name: 'AnalysisDetail',
    component: () => import("../views/postagens/PostagensDetailView.vue")
  },
  {
    // Login de ADMIN (equipe CRISP). Contas de usuário usam /login.
    path: '/login_admin',
    name: 'AdminLogin',
    component: () => import("@/views/admin/AdminLogin.vue")
  },

  // --- Contas de usuário (público, distinto do admin) ---
  {
    path: '/login',
    name: 'Entrar',
    component: () => import("@/views/auth/EntrarView.vue")
  },
  {
    path: '/cadastro',
    name: 'Cadastro',
    component: () => import("@/views/auth/CadastroView.vue")
  },
  {
    path: '/esqueci-senha',
    name: 'EsqueciSenha',
    component: () => import("@/views/auth/EsqueciSenhaView.vue")
  },
  {
    path: '/redefinir-senha',
    name: 'RedefinirSenha',
    component: () => import("@/views/auth/RedefinirSenhaView.vue")
  },
  {
    path: '/verificar-email',
    name: 'VerificarEmail',
    component: () => import("@/views/auth/VerificarEmailView.vue")
  },
  {
    // Conta de user OU admin (ambos têm perfil em /api/me).
    path: '/conta',
    name: 'Conta',
    component: () => import("@/views/ContaView.vue"),
    meta: { requiresAuth: true }
  },

  // --- Rotas de Administração (protegidas) ---
  {
    path: '/admin',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: { requiresAdmin: true },
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
        path: 'criar',
        name: 'CriarPostagem',
        component: () => import('@/components/admin/postagem/PostagemWizard.vue'),
      },
      {
        path: 'editar',
        name: 'EditarPostagem',
        component: () => import('@/components/admin/postagem/PostagemEditor.vue'),
      },
      {
        path: 'equipe',
        name: 'Equipe',
        component: () => import('../views/admin/EquipeView.vue'),
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

// Guarda de Rota Global. Auth v2 via cookie httpOnly (o JS não lê o cookie):
// perguntamos ao backend com /api/me. requiresAdmin exige tipo=admin;
// requiresAuth aceita qualquer conta (user ou admin). Rotas públicas não
// disparam checagem. Login de admin = /login_admin; de usuário = /login.
const auth = useAuth();

router.beforeEach(async (to) => {
  isRouteLoading.value = true;

  const requiresAdmin = to.matched.some(r => r.meta.requiresAdmin);
  const requiresAuth  = to.matched.some(r => r.meta.requiresAuth);
  const isLoginPage   = to.name === 'AdminLogin' || to.name === 'Entrar';

  if (!requiresAdmin && !requiresAuth && !isLoginPage) return true;

  const me = await auth.fetchMe(); // null = deslogado

  // Rota protegida sem sessão → login apropriado, guardando o destino.
  if ((requiresAdmin || requiresAuth) && !me) {
    return { name: requiresAdmin ? 'AdminLogin' : 'Entrar', query: { redirect: to.fullPath } };
  }
  // Área de admin acessada por conta de usuário → login de admin.
  if (requiresAdmin && me.tipo !== 'admin') {
    return { name: 'AdminLogin', query: { redirect: to.fullPath } };
  }
  // Já logado numa página de login → home (evita login duplicado).
  if (isLoginPage && me) {
    return { name: 'Home' };
  }
  return true;
});

router.afterEach(() => {
  isRouteLoading.value = false;
  appBooted.value = true;
});



export default router;