<template>
  <div class="login-page-container">
    <div class="login-container">
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="login-header">
          <h2>Acesso Administrativo</h2>
          <p>Pulso Urbano</p>
        </div>

        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" v-model="email" placeholder="seuemail@exemplo.com" required>
        </div>
        
        <div class="form-group">
          <label for="password">Senha</label>
          <div class="password-wrapper">
            <input :type="passwordFieldType" id="password" v-model="password" required>
            <button type="button" @click="togglePasswordVisibility" class="toggle-password-btn">
              {{ isPasswordVisible ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>
        </div>

        <button type="submit" class="btn-login" :disabled="isLoading">
          {{ isLoading ? 'Entrando...' : 'Entrar' }}
        </button>

        <div class="back-to-site">
          <a href="/">&larr; Voltar ao site principal</a>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
// Importamos o Axios para fazer a requisição HTTP
import axios from 'axios';

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

export default {
  name: 'AdminLoginView',
  data() {
    return {
      // 2. Definimos as variáveis para armazenar os dados do formulário
      email: '',
      password: '',
      isPasswordVisible: false, // Para controlar a visibilidade da senha
      errorMessage: null, // Para guardar mensagens de erro
      isLoading: false,   // Para controlar o estado de "carregando"
    };
  },
  computed: {
    passwordFieldType() {
      return this.isPasswordVisible ? 'text' : 'password';
    }
  },
  methods: {
    // 5. Este método será chamado quando o formulário for submetido
    async handleLogin() {
      this.isLoading = true;
      this.errorMessage = null;

      try {
        // 6. Fazemos a requisição POST para o backend com os dados
        const response = await axios.post(API_URL+'/admin-auth', 
        {
          email: this.email,
          password: this.password,
        });
        
        // 7. SUCESSO: O backend respondeu positivamente
        console.log('Login bem-sucedido!', response.data);

        // Ações comuns após o login:
        // a. Salvar o token de autenticação (ex: JWT) no localStorage
        localStorage.setItem('authToken', response.data.token);

        // b. Redirecionar para a página de dashboard do admin
        this.$router.push('/admin');

      } catch (error) {
        // 8. ERRO: O backend respondeu com um erro
        console.error('Falha no login:', error.response);
        
        if (error.response && error.response.data && error.response.data.message) {
          // Exibe a mensagem de erro vinda do backend (ex: "Email ou senha inválidos")
          this.errorMessage = error.response.data.message;
        } else {
          // Mensagem genérica
          this.errorMessage = 'Ocorreu um erro. Tente novamente mais tarde.';
        }
      } finally {
        this.isLoading = false;
      }
    },
    togglePasswordVisibility()
    {
      this.isPasswordVisible = !this.isPasswordVisible;
    }
  }
}
</script>

<style scoped>
/* Adicione aqui seus estilos. Eles serão locais para este componente. */
.login-page-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5;
}

.login-container {
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.login-header h2 {
  margin: 0;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.btn-login {
  width: 100%;
  padding: 0.75rem;
  border: none;
  background-color: #007bff;
  color: white;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-login:disabled {
  background-color: #a0c7e4;
  cursor: not-allowed;
}

.btn-login:hover:not(:disabled) {
  background-color: #0056b3;
}

.error-message {
  color: #dc3545;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  text-align: center;
}

.back-to-site {
  text-align: center;
  margin-top: 1rem;
}
.password-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-wrapper input {
  padding-right: 80px; /* Espaço para o botão de mostrar/ocultar senha */
}

.toggle-password-btn {
  position: absolute;
  right: 10px; /* Posição à direita */
  top: 50%;
  transform: translateY(-50%); /* Centraliza verticalmente */
  
  /* Estilo visual */
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  font-weight: 600;
  padding: 4px;
}
</style>