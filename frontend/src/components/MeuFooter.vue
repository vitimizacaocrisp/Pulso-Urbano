<template>
  <footer class="main-footer">
    <div class="footer-container">
      <div class="footer-section about-us">
        <h3>Pulso Urbano</h3>
        <p class="about-text">Um projeto do <a href="https://www.crisp.ufmg.br" target="_blank" class="crisp-link">CRISP/UFMG</a>. Para parcerias, sugestões ou dúvidas, entre em contato conosco.</p>
        <ul class="contact-info">
          <li>
            <i class="fas fa-map-marker-alt"></i>
            <span>Belo Horizonte, MG, Brasil</span>
          </li>
          <li>
            <i class="fas fa-envelope"></i>
            <a href="mailto:contato@pulsourbano.org">contato@pulsourbano.org</a>
          </li>
        </ul>
      </div>

      <div class="footer-section useful-links">
        <h4>Navegue</h4>
        <div class="links-columns">
            <ul>
              <li><router-link to="/categoria">Todas as Publicações</router-link></li>
              <li><router-link to="/sobre">Sobre o Projeto</router-link></li>
              <li><router-link to="/contato">Contato</router-link></li>
            </ul>
            <ul>
              <li v-for="category in categories" :key="category.path">
                <router-link :to="category.path">{{ category.name }}</router-link>
              </li>
            </ul>
        </div>
      </div>

      <div class="footer-section subscribe">
        <div class="subscribe-box">
          <h4>Inscreva-se na Newsletter</h4>
          <p>Seja o primeiro a receber as últimas análises e novidades.</p>
          <form class="subscribe-form" @submit.prevent="handleSubscription">
            <input type="email" placeholder="Digite seu email" required>
            <button type="submit" aria-label="Inscrever">
              <i class="fas fa-arrow-right"></i>
            </button>
          </form>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <p>&copy; {{ new Date().getFullYear() }} Pulso Urbano. Todos os direitos reservados.</p>
      <div class="footer-bottom-right">
        <div class="social-icons">
          <a href="#" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
          <a href="#" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
          <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
          <a href="#" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
        </div>
        <a href="#" @click.prevent="scrollToTop" class="back-to-top" aria-label="Voltar ao topo">
            <i class="fas fa-arrow-up"></i>
        </a>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { ref } from 'vue';

// Lista de categorias, consistente com o header
const categories = ref([
    { name: 'Educação', path: '/categoria/educacao' },
    { name: 'Saúde', path: '/categoria/saude' },
    { name: 'Política', path: '/categoria/politica' },
    { name: 'Criminalidade', path: '/categoria/criminalidade' },
    { name: 'Tecnologia', path: '/categoria/tecnologia' }
]);

const handleSubscription = () => {
  // Lógica para lidar com a inscrição do usuário
  alert('Obrigado por se inscrever!');
};

const scrollToTop = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};
</script>

<style scoped>
/* Para que os ícones funcionem, lembre-se de importar o Font Awesome no seu projeto. */

/* Estilo principal do rodapé com variáveis CSS */
.main-footer {
  /* Definição da Paleta de Cores e Fontes */
  --color-bg-dark: #0f172a;
  --color-bg-medium: #1e293b;
  --color-text-primary: #cbd5e1;
  --color-text-headings: #f8fafc;
  --color-accent-primary: #6366f1;
  --color-accent-primary-hover: #4f46e5;
  --color-accent-secondary: #e62354;
  --color-accent-secondary-hover: #c91e4a;
  --color-border: #334155;
  --color-white: #fff;
  --font-family-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

  /* Aplicação das variáveis */
  background-color: var(--color-bg-dark);
  color: var(--color-text-primary);
  padding: 60px 0 0;
  font-family: var(--font-family-sans);
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 40px;
}

.footer-section h3, .footer-section h4 {
  color: var(--color-text-headings);
  margin-bottom: 20px;
  font-size: 1.2rem;
}

.footer-section p {
  line-height: 1.7;
  margin-bottom: 15px;
}

.footer-section a {
  color: var(--color-text-primary);
  text-decoration: none;
  transition: color 0.3s ease;
}

.footer-section a:hover,
.footer-section a.router-link-exact-active {
  color: var(--color-accent-primary);
}

/* Seção Sobre Nós */
.about-us .crisp-link {
  font-weight: bold;
  color: var(--color-text-headings);
}
.about-us .about-text {
  max-width: 350px;
}

.contact-info {
  list-style: none;
  padding: 0;
  margin-top: 20px;
}

.contact-info li {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.contact-info i {
  color: var(--color-accent-primary);
  margin-right: 12px;
  width: 20px;
  text-align: center;
}

/* Seção de Links Úteis */
.useful-links .links-columns {
  display: flex;
  gap: 40px;
}
.useful-links ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.useful-links li {
  margin-bottom: 12px;
}

/* Seção de Newsletter */
.subscribe-box {
  background-color: var(--color-bg-medium);
  padding: 30px;
  border-radius: 8px;
}

.subscribe-form {
  display: flex;
  align-items: center;
  background-color: var(--color-white);
  border-radius: 6px;
  overflow: hidden;
  margin-top: 20px;
}

.subscribe-form input {
  flex-grow: 1;
  border: none;
  padding: 12px 15px;
  outline: none;
  font-size: 1rem;
  color: var(--color-border);
}

.subscribe-form button {
  background-color: var(--color-accent-primary);
  color: var(--color-white);
  border: none;
  padding: 12px 18px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-size: 1.1rem;
}

.subscribe-form button:hover {
  background-color: var(--color-accent-primary-hover);
}

/* Barra Inferior */
.footer-bottom {
  border-top: 1px solid var(--color-border);
  margin-top: 60px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  gap: 15px;
}

.footer-bottom p {
  margin: 0;
  font-size: 0.9rem;
}

.footer-bottom-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.social-icons {
  display: flex;
  gap: 15px;
}

.social-icons a {
  color: var(--color-text-primary);
  font-size: 1.1rem;
  transition: color 0.3s ease;
}

.social-icons a:hover {
  color: var(--color-accent-primary);
}

.back-to-top {
  background-color: var(--color-accent-secondary);
  color: var(--color-white);
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 6px;
  font-size: 1.1rem;
  text-decoration: none;
  transition: background-color 0.3s ease, transform 0.3s ease;
}

.back-to-top:hover {
  background-color: var(--color-accent-secondary-hover);
  transform: translateY(-3px);
  color: var(--color-white);
}

/* Responsividade */
@media (max-width: 768px) {
  .useful-links .links-columns {
    flex-direction: column;
    gap: 0;
  }
  .footer-container {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .contact-info li {
    justify-content: center;
  }
  .about-us .about-text {
    margin-left: auto;
    margin-right: auto;
  }
  .footer-bottom {
    flex-direction: column;
    gap: 20px;
  }
}
</style>