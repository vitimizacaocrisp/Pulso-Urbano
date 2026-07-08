<template>
  <AuthCard titulo="Entrar" subtitulo="Acesse sua conta para ler as publicações na íntegra e baixar arquivos.">
    <form @submit.prevent="entrar">
      <div v-if="erro" class="form-alert"><Icon icon="mdi:alert-circle" /> {{ erro }}</div>

      <label class="field"><span>E-mail</span>
        <input v-model="email" type="email" autocomplete="email" required :disabled="carregando" placeholder="voce@email.com" />
      </label>
      <label class="field"><span>Senha</span>
        <input v-model="senha" type="password" autocomplete="current-password" required :disabled="carregando" placeholder="••••••••" />
      </label>
      <label class="lembrar"><input v-model="lembrar" type="checkbox" /> <span>Manter conectado</span></label>

      <button class="primary-btn" type="submit" :disabled="carregando">
        <span v-if="carregando" class="spinner"></span>
        <span v-else>Entrar</span>
      </button>

      <div class="form-links">
        <RouterLink to="/cadastro">Criar conta</RouterLink>
        <RouterLink to="/esqueci-senha">Esqueci a senha</RouterLink>
      </div>
    </form>
  </AuthCard>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import AuthCard from './AuthCard.vue';
import { useAuth } from '@/composables/useAuth';
import { errorMessage } from '@/services/api';

const auth = useAuth();
const route = useRoute();
const router = useRouter();

const email = ref('');
const senha = ref('');
const lembrar = ref(true);
const carregando = ref(false);
const erro = ref('');

async function entrar() {
  carregando.value = true;
  erro.value = '';
  try {
    await auth.login(email.value, senha.value, { tipo: 'user', rememberMe: lembrar.value });
    const destino = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    router.replace(destino);
  } catch (e) {
    erro.value = errorMessage(e);
  } finally {
    carregando.value = false;
  }
}
</script>

<style scoped>
.lembrar { display: flex; align-items: center; gap: 6px; font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 1.1rem; cursor: pointer; }
</style>
