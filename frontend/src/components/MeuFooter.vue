<template>
  <footer class="main-footer">
    <div class="footer-container">
      <!-- Coluna Sobre -->
      <div class="footer-column about">
        <h3 class="footer-logo">Pulso<span class="highlight">Urbano</span></h3>
        <p class="about-text">
            Um observatório digital dedicado a analisar os ritmos da segurança pública e justiça no Brasil.
            Projeto em parceria com o <a href="https://www.crisp.ufmg.br" target="_blank" class="crisp-link">CRISP/UFMG</a>,
            financiado pela <a href="https://fapemig.br" target="_blank" class="crisp-link">FAPEMIG</a>.
        </p>
        <div class="contact-block">
            <div class="contact-item">
                 <Icon icon="mdi:map-marker" width="16" />
                 <span>Belo Horizonte, MG</span>
            </div>
            <div class="contact-item">
                 <Icon icon="mdi:email" width="16" />
                 <a href="mailto:contato@pulsourbano.org">contato@pulsourbano.org</a>
            </div>
        </div>
      </div>

      <!-- Coluna Navegação -->
      <div class="footer-column links">
        <h4>Explorar</h4>
        <ul>
            <li><router-link to="/">Início</router-link></li>
            <li><router-link to="/catalogo">Todas as Publicações</router-link></li>
            <li><router-link to="/producoes">Produções Científicas</router-link></li>
            <li><router-link to="/dados">Repositório de Dados</router-link></li>
            <li><router-link to="/podcast">Podcast</router-link></li>
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
                  <Icon icon="mdi:send" width="16" />
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Barra Inferior -->
    <div class="footer-bottom">
      <div class="bottom-content">
          <div class="copyright-block">
            <p class="copyright">&copy; {{ new Date().getFullYear() }} Pulso Urbano · CRISP/UFMG. Todos os direitos reservados.</p>
            <p class="funding">Financiado pela FAPEMIG — Edital 001/2023, Demanda Universal · Processo APQ-02456-23.</p>
          </div>

          <div class="social-actions">
            <button @click="scrollToTop" class="back-to-top" aria-label="Voltar ao topo">
                <Icon icon="mdi:arrow-up" width="18" />
            </button>
          </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { ref } from 'vue';
import { Icon } from '@iconify/vue';

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
  /* Usa a variável de fundo do footer definida no CSS global */
  background-color: var(--bg-footer);
  /* Define uma cor base clara para o texto, já que o footer é escuro */
  color: var(--text-light); 
  font-family: var(--font-body);
  border-top: 1px solid var(--border-header);
}

.footer-container {
  max-width: var(--container-width);
  margin: 0 auto;
  padding: 5rem 1.5rem;
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1.5fr;
  gap: 3rem;
}

/* Tipografia Comum */
h4 {
    color: var(--text-white);
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 1.5rem;
    font-weight: 700;
}
.footer-logo {
    color: var(--text-white);
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 1rem;
}
.highlight { color: var(--brand-primary); }

/* Coluna Sobre */
.about-text {
    line-height: 1.7;
    margin-bottom: 1.5rem;
    font-size: 0.95rem;
    color: var(--text-light);
    opacity: 0.8;
}
.crisp-link { 
    color: var(--text-white); 
    text-decoration: none; 
    border-bottom: 1px solid var(--brand-primary); 
    transition: color 0.2s;
}
.crisp-link:hover { color: var(--brand-primary); }

.contact-block { display: flex; flex-direction: column; gap: 0.75rem; }
.contact-item { display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; color: var(--text-light); }
.contact-item i { color: var(--brand-primary); width: 16px; text-align: center; }
.contact-item a { color: var(--text-light); text-decoration: none; transition: color 0.2s; }
.contact-item a:hover { color: var(--text-white); }

/* Links */
.links ul { list-style: none; padding: 0; margin: 0; }
.links li { margin-bottom: 0.75rem; }
.links a {
    color: var(--text-light);
    text-decoration: none; 
    font-size: 0.95rem; 
    transition: all 0.2s;
    opacity: 0.8;
}
.links a:hover { 
    color: var(--text-white); 
    opacity: 1;
    padding-left: 5px; 
}

/* Newsletter Box */
.subscribe-card {
    background: rgba(255, 255, 255, 0.05); /* Fundo translúcido para adaptar ao tema */
    padding: 2rem;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-header);
}
.subscribe-card p { font-size: 0.9rem; margin-bottom: 1.5rem; line-height: 1.5; color: var(--text-light); opacity: 0.9; }
.input-group {
    display: flex;
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-header);
    overflow: hidden;
}
.input-group input {
    flex: 1;
    background: transparent;
    border: none;
    padding: 0.75rem;
    color: var(--text-white);
    outline: none;
}
.input-group input::placeholder { color: rgba(255,255,255,0.5); }

.input-group button {
    background: var(--brand-primary);
    border: none;
    color: var(--text-white);
    padding: 0 1.25rem;
    cursor: pointer;
    transition: background 0.2s;
}
.input-group button:hover { background: var(--brand-primary-hover); }

/* Barra Inferior */
.footer-bottom {
    background: rgba(0, 0, 0, 0.2); /* Escurece levemente em relação ao footer */
    padding: 1.5rem 0;
    border-top: 1px solid var(--border-header);
}
.bottom-content {
    max-width: var(--container-width);
    margin: 0 auto;
    padding: 0 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.copyright-block { display: flex; flex-direction: column; gap: 0.25rem; }
.copyright { font-size: 0.85rem; opacity: 0.6; color: var(--text-light); margin: 0; }
.funding { font-size: 0.78rem; opacity: 0.45; color: var(--text-light); margin: 0; }

.social-actions { display: flex; align-items: center; gap: 1.5rem; }

.back-to-top {
    background: rgba(255, 255, 255, 0.1); 
    color: var(--text-white); 
    border: 1px solid var(--border-header);
    width: 36px; height: 36px; 
    border-radius: var(--radius-md);
    cursor: pointer; 
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}
.back-to-top:hover { 
    background: var(--brand-primary); 
    border-color: var(--brand-primary);
}

@media (max-width: 992px) {
    .footer-container { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 600px) {
    .footer-container { grid-template-columns: 1fr; gap: 2rem; }
    .bottom-content { flex-direction: column; gap: 1rem; text-align: center; }
}
</style>