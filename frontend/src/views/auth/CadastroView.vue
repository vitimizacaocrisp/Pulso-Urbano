<template>
  <AuthCard titulo="Criar conta" subtitulo="Cadastre-se para ler as publicações na íntegra e baixar arquivos.">
    <div v-if="pronto" class="form-ok">
      <strong>Tudo certo!</strong> {{ mensagem }}
      <div class="form-links"><RouterLink to="/entrar">Ir para o login</RouterLink></div>
    </div>

    <form v-else @submit.prevent="cadastrar">
      <div v-if="erro" class="form-alert"><Icon icon="mdi:alert-circle" /> {{ erro }}</div>

      <label class="field"><span>Nome</span>
        <input v-model="nome" type="text" maxlength="120" autocomplete="name" :disabled="carregando" placeholder="Seu nome" />
      </label>
      <label class="field"><span>E-mail</span>
        <input v-model="email" type="email" autocomplete="email" required :disabled="carregando" placeholder="voce@email.com" />
      </label>
      <label class="field"><span>Senha</span>
        <input v-model="senha" type="password" autocomplete="new-password" required :disabled="carregando" placeholder="Mínimo 10 caracteres" />
      </label>
      <label class="field"><span>Confirmar senha</span>
        <input v-model="senha2" type="password" autocomplete="new-password" required :disabled="carregando" />
      </label>
      <p class="form-hint">Use pelo menos 10 caracteres.</p>

      <button class="primary-btn" type="submit" :disabled="carregando">
        <span v-if="carregando" class="spinner"></span>
        <span v-else>Criar conta</span>
      </button>

      <div class="form-links">
        <RouterLink to="/entrar">Já tenho conta</RouterLink>
      </div>
    </form>
  </AuthCard>
</template>

<script setup>
import { ref } from 'vue';
import { Icon } from '@iconify/vue';
import AuthCard from './AuthCard.vue';
import { useAuth } from '@/composables/useAuth';
import { errorMessage } from '@/services/api';

const auth = useAuth();

const nome = ref('');
const email = ref('');
const senha = ref('');
const senha2 = ref('');
const carregando = ref(false);
const erro = ref('');
const pronto = ref(false);
const mensagem = ref('');

async function cadastrar() {
  erro.value = '';
  if (senha.value.length < 10) { erro.value = 'A senha deve ter pelo menos 10 caracteres.'; return; }
  if (senha.value !== senha2.value) { erro.value = 'As senhas não coincidem.'; return; }
  carregando.value = true;
  try {
    mensagem.value = await auth.register({ nome: nome.value, email: email.value, senha: senha.value });
    pronto.value = true;
  } catch (e) {
    erro.value = errorMessage(e);
  } finally {
    carregando.value = false;
  }
}
</script>
