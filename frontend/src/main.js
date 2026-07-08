import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { onAuthError } from '@/services/api'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'

// importa o css global
import './assets/css/style.css'
import './assets/js/script.js'

// O cliente axios central (services/api.js) concentra baseURL, withCredentials
// e interceptors. Aqui só ligamos o tratamento de erro de auth ao router/toast.
const auth = useAuth();
const toast = useToast();

// O tratamento é por CÓDIGO de erro v2 (doc 04), não por status HTTP: um 401/403
// pode ser só "não logado" (probe do guard de rota, fetchMe em página pública)
// — estado normal e silencioso. Só reagimos aos códigos que exigem ação.
onAuthError(({ code }) => {
  // Kicks reais: sessão tomada em outro dispositivo ou conta desativada.
  if (code === 'sessao_encerrada' || code === 'conta_desativada') {
    toast.error(code === 'sessao_encerrada'
      ? 'Sua conta foi acessada em outro dispositivo.'
      : 'Sua conta foi desativada.');
    // Login certo por tipo: admin volta pro painel, usuário pro /entrar.
    const eraAdmin = auth.state.me?.tipo === 'admin'
      || router.currentRoute.value.path.startsWith('/admin');
    auth.limparSessao();
    const destino = eraAdmin ? 'AdminLogin' : 'Entrar';
    if (router.currentRoute.value.name !== destino) router.push({ name: destino });
    return;
  }
  // Logado, porém sem permissão para ESTA ação: avisa, não desloga.
  if (code === 'role_insuficiente') {
    toast.error('Você não tem permissão para essa ação.');
    return;
  }
  // sem_token / token_invalido / 403 legado sem code = "não logado": silencioso.
  // O guard de rota redireciona ao login quando a rota exige auth.
});

createApp(App)
  .use(router)
  .mount('#app')
