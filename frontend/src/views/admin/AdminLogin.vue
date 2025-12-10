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

          <form @submit.prevent="handleLogin">
            <div v-if="errorMessage" class="alert-error fade-in">
              <i class="fas fa-exclamation-circle"></i> {{ errorMessage }}
            </div>

            <div class="input-group">
              <label for="email">Email Corporativo</label>
              <div class="input-wrapper" :class="{ 'focused': focusedField === 'email' }">
                <i class="fas fa-envelope input-icon"></i>
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
                <i class="fas fa-lock input-icon"></i>
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
                  <i :class="isPasswordVisible ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                </button>
              </div>
            </div>

            <div class="form-actions">
              <label class="remember-me">
                <input type="checkbox"> <span>Lembrar-me</span>
              </label>
              <a href="#" class="forgot-password">Esqueceu a senha?</a>
            </div>

            <button type="submit" class="btn-submit" :disabled="isLoading">
              <span v-if="isLoading" class="spinner"></span>
              <span v-else>Aceder ao Painel <i class="fas fa-arrow-right"></i></span>
            </button>
          </form>

          <div class="back-link">
            <a href="/"><i class="fas fa-arrow-left"></i> Voltar ao site principal</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

export default {
  name: 'AdminLoginView',
  data() {
    return {
      email: '',
      password: '',
      isPasswordVisible: false,
      errorMessage: null,
      isLoading: false,
      focusedField: null
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
        const response = await axios.post(API_URL+'/admin-auth', {
          email: this.email,
          password: this.password,
        });
        
        localStorage.setItem('authToken', response.data.token);
        this.$router.push('/admin');

      } catch (error) {
        if (error.response?.data?.message) {
          this.errorMessage = error.response.data.message;
        } else {
          this.errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
        }
      } finally {
        this.isLoading = false;
      }
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
  background-color: #fff;
  font-family: 'Inter', sans-serif;
}

.login-split {
  display: flex;
  min-height: 100vh;
}

/* LADO ESQUERDO (BRANDING) */
.login-brand {
  flex: 1;
  background: #0f172a;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4rem;
  color: white;
  overflow: hidden;
}

/* Padrão de fundo sutil */
.login-brand::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  z-index: 0;
}

.brand-content {
  position: relative;
  z-index: 2;
  margin-top: auto;
  margin-bottom: auto;
}

.logo {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 1rem;
  letter-spacing: -1px;
}
.highlight { color: #6366f1; }

.brand-tagline {
  font-size: 1.5rem;
  font-weight: 300;
  opacity: 0.9;
  line-height: 1.4;
  max-width: 500px;
}

.brand-footer {
  position: relative;
  z-index: 2;
  font-size: 0.85rem;
  opacity: 0.6;
}

/* LADO DIREITO (FORMULÁRIO) */
.login-form-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: #ffffff;
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
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.form-header p {
  color: #64748b;
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
  color: #334155;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background-color: #f8fafc;
  transition: all 0.2s ease;
}

.input-wrapper.focused {
  border-color: #6366f1;
  background-color: #fff;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.input-icon {
  position: absolute;
  left: 1rem;
  color: #94a3b8;
  font-size: 1rem;
}

.input-wrapper input {
  width: 100%;
  padding: 0.85rem 1rem 0.85rem 2.8rem; /* Espaço para o ícone */
  border: none;
  background: transparent;
  font-size: 1rem;
  color: #1e293b;
  outline: none;
  border-radius: 8px;
}

.toggle-visibility {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 1rem;
  color: #94a3b8;
  transition: color 0.2s;
}
.toggle-visibility:hover { color: #475569; }

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
  color: #475569;
  cursor: pointer;
}

.forgot-password {
  color: #6366f1;
  text-decoration: none;
  font-weight: 600;
}
.forgot-password:hover { text-decoration: underline; }

/* BOTÃO DE LOGIN */
.btn-submit {
  width: 100%;
  padding: 0.9rem;
  background-color: #6366f1;
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
  background-color: #4f46e5;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}

.btn-submit:disabled {
  background-color: #a5b4fc;
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
  background-color: #fef2f2;
  border: 1px solid #fee2e2;
  color: #b91c1c;
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

.back-link {
  margin-top: 2rem;
  text-align: center;
}
.back-link a {
  color: #64748b;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}
.back-link a:hover { color: #1e293b; }

/* RESPONSIVIDADE */
@media (max-width: 900px) {
  .login-brand { display: none; }
  .login-form-container { width: 100%; }
}
</style>