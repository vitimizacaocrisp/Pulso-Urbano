import { createRouter, createWebHistory } from "vue-router";

// Importa as views
import Home from "../views/Home.vue";
import SobreView from "../views/Sobre.vue";
import NotFound from "../views/NotFound.vue";

const routes = [
    { path: "/", name: "Home", component: Home },
    { path: "/sobre", name: "Sobre", component: SobreView },

    // Rota para 404 - deve ser a última rota
    { path: "/:pathMatch(.*)*", name: "NotFound", component: NotFound }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;