<template>
  <AuthCard titulo="Criar conta" subtitulo="Cadastre-se para ler as publicações na íntegra e baixar arquivos.">
    <div v-if="pronto" class="form-ok success-box">
      <div class="success-icon-wrap">
        <Icon icon="mdi:check-circle" width="48" />
      </div>
      <strong>Conta criada com sucesso!</strong>
      <p>{{ mensagem }}</p>
      <RouterLink to="/login" class="primary-btn mt-4">Fazer Login</RouterLink>
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
        <div class="input-with-icon">
          <input v-model="senha" :type="senhaVisible ? 'text' : 'password'" autocomplete="new-password" required :disabled="carregando" placeholder="Mínimo 10 caracteres" />
          <button type="button" class="eye-btn" @click="senhaVisible = !senhaVisible" tabindex="-1" aria-label="Mostrar senha">
            <Icon :icon="senhaVisible ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" width="20" />
          </button>
        </div>
      </label>
      <label class="field"><span>Confirmar senha</span>
        <div class="input-with-icon">
          <input v-model="senha2" :type="senhaVisible ? 'text' : 'password'" autocomplete="new-password" required :disabled="carregando" placeholder="Repita a senha" />
        </div>
      </label>
      <p class="form-hint"><Icon icon="mdi:information-outline" width="14" style="vertical-align: text-bottom; margin-right: 4px;" />Use pelo menos 10 caracteres.</p>

      <button class="primary-btn" type="submit" :disabled="carregando">
        <span v-if="carregando" class="spinner"></span>
        <span v-else>Criar conta</span>
      </button>

      <div class="form-links">
        <RouterLink to="/login">Já tenho conta</RouterLink>
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
const senhaVisible = ref(false);

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

<style scoped>
.input-with-icon { position: relative; display: flex; align-items: center; width: 100%; }
.input-with-icon input { width: 100%; padding-right: 40px; }
.eye-btn { position: absolute; right: 10px; background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
.eye-btn:hover { color: var(--brand-primary); }

.success-box { text-align: center; padding: 1.5rem 0.5rem; background: transparent; border: none; }
.success-icon-wrap { color: var(--sys-success, #10b981); margin-bottom: 1.2rem; display: flex; justify-content: center; animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.success-box strong { display: block; font-size: 1.4rem; color: var(--text-main); margin-bottom: 0.5rem; font-weight: 800; }
.success-box p { color: var(--text-secondary); margin-bottom: 2rem; font-size: 0.95rem; line-height: 1.5; }
.mt-4 { margin-top: 1.5rem; }

@keyframes popIn {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
