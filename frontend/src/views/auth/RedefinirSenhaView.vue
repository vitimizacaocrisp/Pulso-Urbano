<template>
  <AuthCard titulo="Redefinir senha" subtitulo="Escolha uma nova senha para sua conta.">
    <div v-if="!token" class="form-alert"><Icon icon="mdi:alert-circle" /> Link inválido — token ausente.</div>

    <div v-else-if="ok" class="form-ok">
      <strong>Senha redefinida.</strong> As outras sessões foram encerradas.
      <div class="form-links"><RouterLink :to="tipo === 'admin' ? '/login_admin' : '/login'">Entrar</RouterLink></div>
    </div>

    <form v-else @submit.prevent="redefinir">
      <div v-if="erro" class="form-alert"><Icon icon="mdi:alert-circle" /> {{ erro }}</div>
      <label class="field"><span>Nova senha</span>
        <div class="pw-wrap">
          <input v-model="senha" :type="ver ? 'text' : 'password'" autocomplete="new-password" required :disabled="carregando" placeholder="Mínimo 10 caracteres" />
          <button type="button" class="eye" @click="ver = !ver" tabindex="-1" aria-label="Mostrar senha">
            <Icon :icon="ver ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" width="20" />
          </button>
        </div>
      </label>
      <label class="field"><span>Confirmar senha</span>
        <div class="pw-wrap">
          <input v-model="senha2" :type="ver ? 'text' : 'password'" autocomplete="new-password" required :disabled="carregando" placeholder="Repita a senha" />
        </div>
      </label>
      <button class="primary-btn" type="submit" :disabled="carregando">
        <span v-if="carregando" class="spinner"></span>
        <span v-else>Redefinir senha</span>
      </button>
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
const token = typeof route.query.token === 'string' ? route.query.token : '';
const tipo = route.query.tipo === 'admin' ? 'admin' : 'user';

const senha = ref('');
const senha2 = ref('');
const carregando = ref(false);
const erro = ref('');
const ok = ref(false);
const ver = ref(false);

async function redefinir() {
  erro.value = '';
  if (senha.value.length < 10) { erro.value = 'A senha deve ter pelo menos 10 caracteres.'; return; }
  if (senha.value !== senha2.value) { erro.value = 'As senhas não coincidem.'; return; }
  carregando.value = true;
  try {
    await auth.redefinirSenha(token, senha.value, tipo);
    ok.value = true;
  } catch (e) {
    erro.value = errorMessage(e);
  } finally {
    carregando.value = false;
  }
}
</script>

<style scoped>
.pw-wrap { position: relative; display: flex; align-items: center; width: 100%; }
.pw-wrap input { width: 100%; padding-right: 40px; }
.eye { position: absolute; right: 10px; background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; padding: 0; }
.eye:hover { color: var(--brand-primary); }
</style>
