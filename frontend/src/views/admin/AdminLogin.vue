<template>
  <div class="login-wrapper">
    <div class="login-split">
      <!-- Lado Esquerdo: Branding e Visual -->
      <div class="login-brand">
        <div class="brand-overlay"></div>
        <div class="brand-content">
          <h1 class="logo">Pulso<span class="highlight">Urbano</span></h1>
          <p class="brand-tagline">
            Observatório de dados para inteligência e gestão de segurança pública.
          </p>
        </div>
        <div class="brand-footer">
          <p>&copy; {{ new Date().getFullYear() }} CRISP/UFMG</p>
        </div>
      </div>

      <!-- Lado Direito: Formulário -->
      <div class="login-form-container">
        <div class="form-box">
          <div class="form-header">
            <h2>Bem-vindo de volta</h2>
            <p>Insira as suas credenciais para aceder ao painel administrativo.</p>
          </div>

          <form v-if="!twofaStep" @submit.prevent="handleLogin">
            <div v-if="errorMessage" class="alert-error fade-in">
              <Icon icon="mdi:alert-circle" /> {{ errorMessage }}
            </div>

            <div class="input-group">
              <label for="email">Email Corporativo</label>
              <div class="input-wrapper" :class="{ 'focused': focusedField === 'email' }">
                <Icon icon="mdi:email" class="input-icon" />
                <input 
                  type="email" 
                  id="email" 
                  v-model="email" 
                  placeholder="nome@organizacao.com" 
                  required
                  :disabled="isLoading"
                  @focus="focusedField = 'email'"
                  @blur="focusedField = null"
                >
              </div>
            </div>

            <div class="input-group">
              <label for="password">Senha</label>
              <div class="input-wrapper" :class="{ 'focused': focusedField === 'password' }">
                <Icon icon="mdi:lock" class="input-icon" />
                <input 
                  :type="passwordFieldType" 
                  id="password" 
                  v-model="password" 
                  placeholder="••••••••" 
                  required
                  :disabled="isLoading"
                  @focus="focusedField = 'password'"
                  @blur="focusedField = null"
                >
                <button type="button" @click="togglePasswordVisibility" class="toggle-visibility" tabindex="-1">
                  <Icon :icon="isPasswordVisible ? 'mdi:eye-off' : 'mdi:eye'" />
                </button>
              </div>
            </div>

            <div class="form-actions">
              <label class="remember-me">
                <input type="checkbox" v-model="rememberMe"> <span>Lembrar-me</span>
              </label>
              <router-link to="/esqueci-senha?tipo=admin" class="forgot-password">Esqueceu a senha?</router-link>
            </div>

            <button type="submit" class="btn-submit" :disabled="isLoading">
              <span v-if="isLoading" class="spinner"></span>
              <span v-else>Aceder ao Painel <Icon icon="mdi:arrow-right" /></span>
            </button>
          </form>

          <!-- Passo 2FA (admin com verificação em duas etapas) -->
          <form v-else @submit.prevent="verify2fa">
            <div v-if="errorMessage" class="alert-error fade-in">
              <Icon icon="mdi:alert-circle" /> {{ errorMessage }}
            </div>
            <p class="twofa-hint"><Icon icon="mdi:shield-key-outline" /> Digite o código do seu app autenticador (ou um código de recuperação).</p>
            <div class="input-group">
              <label for="twofa">Código de verificação</label>
              <div class="input-wrapper" :class="{ 'focused': focusedField === 'twofa' }">
                <Icon icon="mdi:shield-check" class="input-icon" />
                <input type="text" id="twofa" v-model="twofaCode" placeholder="123456" autocomplete="one-time-code"
                  inputmode="text" required :disabled="isLoading" autofocus
                  @focus="focusedField = 'twofa'" @blur="focusedField = null">
              </div>
            </div>
            <button type="submit" class="btn-submit" :disabled="isLoading">
              <span v-if="isLoading" class="spinner"></span>
              <span v-else>Verificar <Icon icon="mdi:arrow-right" /></span>
            </button>
            <button type="button" class="btn-voltar" @click="cancelar2fa">Voltar</button>
          </form>

          <div class="back-link">
            <a href="/"><Icon icon="mdi:arrow-left" /> Voltar ao site principal</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Icon } from '@iconify/vue';
import { useAuth } from '@/composables/useAuth';
import { errorMessage } from '@/services/api';

export default {
  name: 'AdminLoginView',
  components: { Icon },
  setup() { return { auth: useAuth() }; },
  data() {
    return {
      email: '',
      password: '',
      rememberMe: true,
      isPasswordVisible: false,
      errorMessage: null,
      isLoading: false,
      focusedField: null,
      twofaStep: false,
      twofaChallenge: '',
      twofaCode: ''
    };
  },
  computed: {
    passwordFieldType() {
      return this.isPasswordVisible ? 'text' : 'password';
    }
  },
  methods: {
    async handleLogin() {
      this.isLoading = true;
      this.errorMessage = null;

      try {
        // Auth v2: cookie httpOnly + sessão única (doc 04). Login de admin.
        const r = await this.auth.login(this.email, this.password, { tipo: 'admin', rememberMe: this.rememberMe });
        if (r?.requer2fa) { this.twofaStep = true; this.twofaChallenge = r.challenge; return; }
        localStorage.removeItem('authToken'); // limpa token legado, se houver
        this.$router.push('/admin');

      } catch (error) {
        if (error.response) {
          this.errorMessage = errorMessage(error);
        } else {
          this.errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
        }
      } finally {
        this.isLoading = false;
      }
    },
    async verify2fa() {
      this.isLoading = true;
      this.errorMessage = null;
      try {
        await this.auth.verify2fa(this.twofaChallenge, this.twofaCode);
        localStorage.removeItem('authToken');
        this.$router.push('/');
      } catch (error) {
        this.errorMessage = error.response ? errorMessage(error) : 'Não foi possível conectar ao servidor.';
      } finally {
        this.isLoading = false;
      }
    },
    cancelar2fa() {
      this.twofaStep = false; this.twofaChallenge = ''; this.twofaCode = ''; this.errorMessage = null;
    },
    togglePasswordVisibility() {
      this.isPasswordVisible = !this.isPasswordVisible;
    }
  }
}
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  /* Fundo adapta-se ao tema */
  background-color: var(--bg-body); 
  font-family: var(--font-body);
  color: var(--text-main);
}

.login-split {
  display: flex;
  min-height: 100vh;
}

/* LADO ESQUERDO (BRANDING) - Mantém cores fixas pois é identidade */
.login-brand {
  flex: 1;
  background: #0f172a; /* Slate 900 fixo para branding */
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4rem;
  color: white;
  overflow: hidden;
}

.login-brand::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232f54eb' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  z-index: 0;
}

.brand-content { position: relative; z-index: 2; margin-top: auto; margin-bottom: auto; }
.logo { font-size: 3rem; font-weight: 800; margin-bottom: 1rem; letter-spacing: -1px; color: #fff; }
.highlight { color: var(--brand-primary); }
.brand-tagline { font-size: 1.5rem; font-weight: 300; opacity: 0.9; line-height: 1.4; max-width: 500px; color: #cbd5e1; }
.brand-footer { position: relative; z-index: 2; font-size: 0.85rem; opacity: 0.6; color: #cbd5e1; }

/* LADO DIREITO (FORMULÁRIO) */
.login-form-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: var(--bg-surface); /* Adapta ao tema */
}

.form-box {
  width: 100%;
  max-width: 420px;
}

.form-header {
  margin-bottom: 2.5rem;
  text-align: left;
}

.form-header h2 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 0.5rem;
}

.form-header p {
  color: var(--text-secondary);
  font-size: 1rem;
}

/* INPUTS */
.input-group {
  margin-bottom: 1.5rem;
}

.input-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid var(--border-input);
  border-radius: 8px;
  background-color: var(--bg-input-form);
  transition: all 0.2s ease;
}

.input-wrapper.focused {
  border-color: var(--brand-primary);
  background-color: var(--bg-surface);
  box-shadow: 0 0 0 4px rgba(47, 84, 235, 0.1);
}

.input-icon {
  position: absolute;
  left: 1rem;
  color: var(--text-muted);
  font-size: 1rem;
}

.input-wrapper input {
  width: 100%;
  padding: 0.85rem 1rem 0.85rem 2.8rem;
  border: none;
  background: transparent;
  font-size: 1rem;
  color: var(--text-main);
  outline: none;
  border-radius: 8px;
}

.toggle-visibility {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 1rem;
  color: var(--text-muted);
  transition: color 0.2s;
}
.toggle-visibility:hover { color: var(--text-main); }

/* AÇÕES */
.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  font-size: 0.9rem;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.forgot-password {
  color: var(--brand-primary);
  text-decoration: none;
  font-weight: 600;
}
.forgot-password:hover { text-decoration: underline; }

/* BOTÃO DE LOGIN */
.btn-submit {
  width: 100%;
  padding: 0.9rem;
  background-color: var(--brand-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-submit:hover:not(:disabled) {
  background-color: var(--brand-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.btn-submit:disabled {
  background-color: var(--sys-secondary);
  cursor: not-allowed;
}

.spinner {
  width: 20px; height: 20px;
  border: 2px solid #fff; border-top-color: transparent;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* FEEDBACK */
.alert-error {
  background-color: var(--bg-danger-light);
  border: 1px solid var(--sys-danger);
  color: var(--sys-danger);
  padding: 0.85rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

.twofa-hint {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.9rem; color: var(--text-secondary); margin: 0 0 1.5rem;
}
.btn-voltar {
  width: 100%; margin-top: 0.75rem; padding: 0.6rem;
  background: none; border: none; color: var(--text-secondary);
  font-size: 0.9rem; cursor: pointer;
}
.btn-voltar:hover { color: var(--text-main); }

.back-link {
  margin-top: 2rem;
  text-align: center;
}
.back-link a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}
.back-link a:hover { color: var(--text-main); }

/* RESPONSIVIDADE */
@media (max-width: 900px) {
  .login-brand { display: none; }
  .login-form-container { width: 100%; }
}
</style>