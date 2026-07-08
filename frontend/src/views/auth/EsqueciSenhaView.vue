<template>
  <AuthCard titulo="Recuperar senha" subtitulo="Enviaremos um link para redefinir sua senha.">
    <div v-if="enviado" class="form-ok">
      {{ mensagem }}
      <div class="form-links"><RouterLink :to="tipo === 'admin' ? '/login_admin' : '/login'">Voltar ao login</RouterLink></div>
    </div>

    <form v-else @submit.prevent="enviar">
      <div v-if="erro" class="form-alert"><Icon icon="mdi:alert-circle" /> {{ erro }}</div>
      <label class="field"><span>E-mail</span>
        <input v-model="email" type="email" autocomplete="email" required :disabled="carregando" placeholder="voce@email.com" />
      </label>
      <button class="primary-btn" type="submit" :disabled="carregando">
        <span v-if="carregando" class="spinner"></span>
        <span v-else>Enviar link</span>
      </button>
      <div class="form-links"><RouterLink :to="tipo === 'admin' ? '/login_admin' : '/login'">Voltar ao login</RouterLink></div>
    </form>
  </AuthCard>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';
import AuthCard from './AuthCard.vue';
import { useAuth } from '@/composables/useAuth';
import { errorMessage } from '@/services/api';

const auth = useAuth();
const route = useRoute();
const tipo = route.query.tipo === 'admin' ? 'admin' : 'user';
const email = ref('');
const carregando = ref(false);
const erro = ref('');
const enviado = ref(false);
const mensagem = ref('');

async function enviar() {
  carregando.value = true;
  erro.value = '';
  try {
    mensagem.value = (await auth.esqueciSenha(email.value, tipo)) || 'Se houver uma conta, você receberá um e-mail em instantes.';
    enviado.value = true;
  } catch (e) {
    erro.value = errorMessage(e);
  } finally {
    carregando.value = false;
  }
}
</script>
