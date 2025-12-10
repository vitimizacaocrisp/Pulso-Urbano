<template>
  <footer class="main-footer">
    <div class="footer-container">
      <!-- Coluna Sobre -->
      <div class="footer-column about">
        <h3 class="footer-logo">Pulso<span class="highlight">Urbano</span></h3>
        <p class="about-text">
            Um observatório digital dedicado a analisar os ritmos da segurança pública e justiça no Brasil.
            Projeto em parceria com o <a href="https://www.crisp.ufmg.br" target="_blank" class="crisp-link">CRISP/UFMG</a>.
        </p>
        <div class="contact-block">
            <div class="contact-item">
                 <i class="fas fa-map-marker-alt"></i>
                 <span>Belo Horizonte, MG</span>
            </div>
            <div class="contact-item">
                 <i class="fas fa-envelope"></i>
                 <a href="mailto:contato@pulsourbano.org">contato@pulsourbano.org</a>
            </div>
        </div>
      </div>

      <!-- Coluna Navegação -->
      <div class="footer-column links">
        <h4>Explorar</h4>
        <ul>
            <li><router-link to="/">Início</router-link></li>
            <li><router-link to="/categoria">Todas as Publicações</router-link></li>
            <li><router-link to="/sobre">Metodologia</router-link></li>
            <li><router-link to="/contato">Fale Conosco</router-link></li>
        </ul>
      </div>

      <!-- Coluna Categorias -->
      <div class="footer-column links">
         <h4>Tópicos</h4>
         <ul>
            <li v-for="category in categories" :key="category.path">
                <router-link :to="category.path">{{ category.name }}</router-link>
            </li>
         </ul>
      </div>

      <!-- Coluna Newsletter -->
      <div class="footer-column subscribe">
        <div class="subscribe-card">
          <h4>Newsletter</h4>
          <p>Análises profundas e dados atualizados diretamente na sua caixa de entrada.</p>
          <form class="subscribe-form" @submit.prevent="handleSubscription">
            <div class="input-group">
                <input type="email" placeholder="Seu melhor email" required>
                <button type="submit" aria-label="Inscrever">
                  <i class="fas fa-paper-plane"></i>
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Barra Inferior -->
    <div class="footer-bottom">
      <div class="bottom-content">
          <p class="copyright">&copy; {{ new Date().getFullYear() }} Pulso Urbano. Todos os direitos reservados.</p>
          
          <div class="social-actions">
            <div class="social-icons">
              <a href="#" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
              <a href="#" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
              <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
            </div>
            <button @click="scrollToTop" class="back-to-top" aria-label="Voltar ao topo">
                <i class="fas fa-arrow-up"></i>
            </button>
          </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { ref } from 'vue';

const categories = ref([
    { name: 'Educação', path: '/categoria/educacao' },
    { name: 'Saúde', path: '/categoria/saude' },
    { name: 'Segurança', path: '/categoria/criminalidade' },
    { name: 'Tecnologia', path: '/categoria/tecnologia' }
]);

const handleSubscription = () => {
  // Lógica futura de inscrição
  alert('Obrigado! Inscrição simulada com sucesso.');
};

const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
</script>

<style scoped>
.main-footer {
  background-color: #0f172a;
  color: #94a3b8;
  font-family: 'Inter', sans-serif;
  border-top: 1px solid #1e293b;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 5rem 1.5rem;
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1.5fr;
  gap: 3rem;
}

/* Tipografia Comum */
h4 {
    color: #fff;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 1.5rem;
    font-weight: 700;
}
.footer-logo {
    color: #fff;
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 1rem;
}
.highlight { color: #6366f1; }

/* Coluna Sobre */
.about-text {
    line-height: 1.7;
    margin-bottom: 1.5rem;
    font-size: 0.95rem;
}
.crisp-link { color: #fff; text-decoration: none; border-bottom: 1px solid #6366f1; }

.contact-block { display: flex; flex-direction: column; gap: 0.75rem; }
.contact-item { display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; }
.contact-item i { color: #6366f1; width: 16px; text-align: center; }
.contact-item a { color: #94a3b8; text-decoration: none; transition: color 0.2s; }
.contact-item a:hover { color: #fff; }

/* Links */
.links ul { list-style: none; padding: 0; margin: 0; }
.links li { margin-bottom: 0.75rem; }
.links a {
    color: #94a3b8; text-decoration: none; font-size: 0.95rem; transition: all 0.2s;
}
.links a:hover { color: #fff; padding-left: 5px; }

/* Newsletter Box */
.subscribe-card {
    background: #1e293b;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.subscribe-card p { font-size: 0.9rem; margin-bottom: 1.5rem; line-height: 1.5; }
.input-group {
    display: flex;
    background: #0f172a;
    border-radius: 6px;
    border: 1px solid #334155;
    overflow: hidden;
}
.input-group input {
    flex: 1;
    background: transparent;
    border: none;
    padding: 0.75rem;
    color: #fff;
    outline: none;
}
.input-group button {
    background: #6366f1;
    border: none;
    color: white;
    padding: 0 1.25rem;
    cursor: pointer;
    transition: background 0.2s;
}
.input-group button:hover { background: #4f46e5; }

/* Barra Inferior */
.footer-bottom {
    background: #0b1120;
    padding: 1.5rem 0;
    border-top: 1px solid #1e293b;
}
.bottom-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.copyright { font-size: 0.85rem; opacity: 0.8; }

.social-actions { display: flex; align-items: center; gap: 1.5rem; }
.social-icons { display: flex; gap: 1rem; }
.social-icons a {
    color: #94a3b8; font-size: 1.1rem; transition: color 0.2s;
}
.social-icons a:hover { color: #fff; transform: translateY(-2px); }

.back-to-top {
    background: #334155; color: white; border: none;
    width: 36px; height: 36px; border-radius: 6px;
    cursor: pointer; transition: background 0.2s;
}
.back-to-top:hover { background: #6366f1; }

@media (max-width: 992px) {
    .footer-container { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 600px) {
    .footer-container { grid-template-columns: 1fr; gap: 2rem; }
    .bottom-content { flex-direction: column; gap: 1rem; text-align: center; }
}
</style>