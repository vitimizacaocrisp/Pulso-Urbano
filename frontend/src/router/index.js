import { createRouter, createWebHistory } from "vue-router";

// Importa as views
import Home from "../views/Home.vue";
import SobreView from "../views/Sobre.vue";
import NotFound from "../views/NotFound.vue";
import Educacao from "@/views/Educacao.vue";
import Publicacoes from "@/views/Publicacoes.vue";
import Analises from "@/views/Analises.vue";

import AtividadePolicial from "@/views/paineis/AtividadePolicial.vue";
import CrimesEconomicos from "@/views/paineis/CrimesEconomicos.vue";
import Homicidios from "@/views/paineis/Homicidios.vue";
import SistemaJustica from "@/views/paineis/SistemaJustica.vue";
import ViolenciaGenero from "@/views/paineis/ViolenciaGenero.vue";
import Vitimizacao from "@/views/paineis/Vitimizacao.vue";

import AdminLogin from "@/views/admin/AdminLogin.vue";
import AdminDashboard from "@/views/admin/AdminDashboard.vue";

const routes = [
    { path: "/", name: "Home", component: Home },
    { path: "/sobre", name: "Sobre", component: SobreView },
    { path: "/educacao", name: "Educacao", component: Educacao },
    { path: "/publicacoes", name: "Publicacoes", component: Publicacoes },
    { path: "/analises", name: "Analises", component: Analises },

    { path: "/paineis/atividade-policial", name: "AtividadePolicial", component: AtividadePolicial },
    { path: "/paineis/crimes-economicos", name: "CrimesEconomicos", component: CrimesEconomicos },
    { path: "/paineis/homicidios", name: "Homicidios", component: Homicidios },
    { path: "/paineis/sistema-justica", name: "SistemaJustica", component: SistemaJustica },
    { path: "/paineis/violencia-genero", name: "ViolenciaGenero", component: ViolenciaGenero },
    { path: "/paineis/vitimizacao", name: "Vitimizacao", component: Vitimizacao },

    // Rotas do Admin
    
    { path: "/admin/login", name: "AdminLogin", component: AdminLogin, meta: { hideLayout: true } },
    { path: "/admin/dashboard", name: "AdminDashboard", component: AdminDashboard, meta: { hideLayout: true, requiresAuth: true } },

    // Rota para 404 - deve ser a última rota
    { path: "/:pathMatch(.*)*", name: "NotFound", component: NotFound }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

// 2. Navigation Guard Global
router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('authToken'); // Verifica se o token existe

  // Se a rota requer autenticação e o usuário NÃO está autenticado
  if (to.meta.requiresAuth && !isAuthenticated) {
    // Redireciona para a página de login
    next({ name: 'AdminLogin' });
  } else {
    // Caso contrário, permite o acesso
    next();
  }
});

export default router;