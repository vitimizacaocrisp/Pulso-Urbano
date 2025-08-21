<template>
  <div class="dashboard-body">
    <div class="dashboard-container">
      <aside class="dashboard-sidebar">
        <div class="sidebar-header">
          <h3>Pulso Urbano</h3>
          <span>Painel Admin</span>
        </div>
        <nav class="sidebar-nav">
          <ul>
            <li><a href="#" class="active">Dashboard</a></li>
            <li><a href="#">Gerenciar Pesquisas</a></li>
          </ul>
        </nav>
        <div class="sidebar-footer">
          <button @click="logout" class="btn-logout">Sair &rarr;</button>
        </div>
      </aside>

      <main class="dashboard-main">
        <header class="main-header-bar">
          <h1>Dashboard</h1>
          <p v-if="adminUser">Bem-vindo, {{ adminUser.email }}!</p>
          <p v-else>Bem-vindo, Administrador!</p>
        </header>

        <section class="content-section">
          <h2>Pesquisas Recentes</h2>
          
          <div v-if="isLoading" class="loading-message">Carregando dados...</div>
          
          <div v-if="error" class="error-message">{{ error }}</div>
          
          <div v-if="!isLoading && !error && adminData" class="data-table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título da Pesquisa</th>
                  <th>Ano</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in adminData" :key="item.id">
                  <td>{{ item.id }}</td>
                  <td>{{ item.pesquisa }}</td>
                  <td>{{ item.ano }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'AdminDashboardView',
  data() {
    return {
      adminUser: null,    // Para guardar informações do usuário (vindo do token)
      adminData: [],      // Para guardar os dados da API
      isLoading: true,    // Para controlar o estado de carregamento
      error: null,        // Para guardar mensagens de erro
    };
  },
  methods: {
    // 2. Método para fazer logout
    logout() {
      // Remove o token do armazenamento
      localStorage.removeItem('authToken');
      // Redireciona para a página de login usando o Vue Router
      this.$router.push({ name: 'AdminLogin' });
    },
    
    // 3. Método para buscar dados da API protegida
    async fetchAdminData() {
      this.isLoading = true;
      this.error = null;
      
      // Pega o token salvo no localStorage
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        // Se por algum motivo não houver token, faz logout
        this.logout();
        return;
      }
      
      try {
        // Faz a requisição para a rota protegida, enviando o token no header
        const response = await axios.get('http://localhost:3000/api/admin/data', {
          headers: {
            'Authorization': `Bearer ${token}` // O formato é 'Bearer SEU_TOKEN'
          }
        });
        
        // Atualiza os dados do componente com a resposta da API
        this.adminData = response.data.data;
        this.adminUser = { email: response.data.message.split(' ').pop() }; // Pega o email da mensagem

      } catch (err) {
        // Se a API retornar um erro (ex: 401 Unauthorized - token expirado/inválido)
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          // O token é inválido, então deslogamos o usuário
          this.error = 'Sua sessão expirou. Por favor, faça login novamente.';
          this.logout();
        } else {
          // Outro tipo de erro (ex: servidor fora do ar)
          this.error = 'Não foi possível carregar os dados do painel.';
          console.error('Erro ao buscar dados do admin:', err);
        }
      } finally {
        this.isLoading = false;
      }
    }
  },
  // 4. Lifecycle Hook: é executado assim que o componente é criado
  created() {
    // Chama o método para buscar os dados assim que a página do dashboard carrega
    this.fetchAdminData();
  }
}
</script>

<style scoped>
.dashboard-body {
  /* ... */
}
.loading-message, .error-message {
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
}
.error-message {
  color: #dc3545;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}
.data-table-container table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
.data-table-container th, .data-table-container td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
.data-table-container th {
  background-color: #f2f2f2;
}
/* ... outros estilos ... */
</style>