<template>
  <AuthCard titulo="Verificação de e-mail">
    <div v-if="estado === 'carregando'" class="form-ok"><span class="spinner spin-dark"></span> Verificando…</div>

    <template v-else-if="estado === 'ok'">
      <div class="form-ok"><strong>E-mail verificado!</strong> Sua conta está ativa.</div>
      <div class="form-links"><RouterLink to="/login">Entrar</RouterLink></div>
    </template>

    <template v-else>
      <div class="form-alert"><Icon icon="mdi:alert-circle" /> {{ erro }}</div>
      <div class="form-links"><RouterLink to="/login">Voltar ao login</RouterLink></div>
    </template>
  </AuthCard>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';
import AuthCard from './AuthCard.vue';
import { useAuth } from '@/composables/useAuth';
import { errorMessage } from '@/services/api';

const auth = useAuth();
const route = useRoute();
const estado = ref('carregando'); // carregando | ok | erro
const erro = ref('');

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : '';
  if (!token) { estado.value = 'erro'; erro.value = 'Link inválido — token ausente.'; return; }
  try {
    await auth.verificarEmail(token);
    estado.value = 'ok';
  } catch (e) {
    estado.value = 'erro';
    erro.value = errorMessage(e);
  }
});
</script>

<style scoped>
.spin-dark { border-color: var(--brand-primary); border-top-color: transparent; display: inline-block; vertical-align: middle; margin-right: 6px; }
</style>
