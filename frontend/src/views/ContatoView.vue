<template>
  <MeuHeader />
  <div class="page-background">
    <!-- Header Simples e Elegante -->
    <header class="contact-header">
      <div class="header-content scroll-reveal">
        <h2>Fale Conosco</h2>
        <p>Tem alguma dúvida, sugestão ou proposta de parceria? Estamos prontos para ouvir você.</p>
      </div>
    </header>

    <main class="page-container" ref="mainContainer">
      <div class="contact-grid">
        
        <!-- Coluna Esquerda: Informações e Mapa -->
        <div class="info-column">
          <div class="card-modern info-card scroll-reveal delay-1">
            <h3>Canais de Atendimento</h3>
            <ul class="contact-list">
              <li>
                <div class="icon-box"><i class="fas fa-envelope"></i></div>
                <div class="info-text">
                  <span class="label">Email</span>
                  <a href="mailto:contato@pulsourbano.org" class="link">contato@pulsourbano.org</a>
                </div>
              </li>
              <li>
                <div class="icon-box"><i class="fas fa-map-marker-alt"></i></div>
                <div class="info-text">
                  <span class="label">Localização</span>
                  <span class="value">Belo Horizonte, MG, Brasil</span>
                </div>
              </li>
            </ul>

            <div class="social-section">
              <h4>Siga-nos</h4>
              <div class="social-icons">
                <a href="#" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                <a href="#" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
                <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                <a href="#" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
              </div>
            </div>
          </div>

          <div class="card-modern map-card scroll-reveal delay-2">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d119976.24823126418!2d-44.0250915392336!3d-19.9027454941916!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xa690cacacf2c33%3A0x55551ab5a78a63e0!2sBelo%20Horizonte%2C%20MG!5e0!3m2!1spt-BR!2sbr!4v1664654939771!5m2!1spt-BR!2sbr" 
              width="100%" 
              height="100%" 
              style="border:0;" 
              allowfullscreen="" 
              loading="lazy" 
              referrerpolicy="no-referrer-when-downgrade"
              title="Mapa de Belo Horizonte"
            ></iframe>
          </div>
        </div>

        <!-- Coluna Direita: Formulário -->
        <div class="form-column">
          <div class="card-modern form-card scroll-reveal delay-3">
            <div class="form-header">
                <h3>Envie uma Mensagem</h3>
                <p>Preencha o formulário abaixo e entraremos em contato em breve.</p>
            </div>
            
            <form @submit.prevent="handleSubmit" class="modern-form">
              <div class="form-group">
                <label for="name">Nome Completo</label>
                <div class="input-wrapper">
                    <i class="fas fa-user input-icon"></i>
                    <input type="text" id="name" v-model="form.name" placeholder="Seu nome" required>
                </div>
              </div>
              
              <div class="form-group">
                <label for="email">Email</label>
                <div class="input-wrapper">
                    <i class="fas fa-at input-icon"></i>
                    <input type="email" id="email" v-model="form.email" placeholder="seu@email.com" required>
                </div>
              </div>
              
              <div class="form-group">
                <label for="subject">Assunto</label>
                <div class="input-wrapper">
                    <i class="fas fa-tag input-icon"></i>
                    <input type="text" id="subject" v-model="form.subject" placeholder="Sobre o que quer falar?">
                </div>
              </div>
              
              <div class="form-group">
                <label for="message">Mensagem</label>
                <textarea id="message" rows="5" v-model="form.message" placeholder="Escreva sua mensagem aqui..." required></textarea>
              </div>

              <div v-if="submissionStatus.message" :class="['submission-status', submissionStatus.type]">
                <i :class="submissionStatus.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'"></i>
                {{ submissionStatus.message }}
              </div>

              <button type="submit" class="btn-submit" :disabled="isSubmitting">
                <span v-if="isSubmitting"><i class="fas fa-spinner fa-spin"></i> Enviando...</span>
                <span v-else>Enviar Mensagem <i class="fas fa-paper-plane"></i></span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  </div>
  <MeuFooter />
</template>

<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue';
import MeuHeader from '@/components/MeuHeader.vue';
import MeuFooter from '@/components/MeuFooter.vue';

const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: ''
});

const isSubmitting = ref(false);
const submissionStatus = ref({ message: '', type: '' });
const mainContainer = ref(null);
let observer = null;

// --- Animation Logic ---
const setupScrollAnimations = () => {
    // Desconecta observador anterior se existir
    if (observer) observer.disconnect();

    observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    // Seleciona elementos apenas dentro deste componente para evitar erros em outras páginas
    if (mainContainer.value) {
        const elements = mainContainer.value.querySelectorAll('.scroll-reveal');
        elements.forEach(el => observer.observe(el));
    }
    
    // Anima o header separadamente pois está fora do mainContainer
    const headerContent = document.querySelector('.header-content.scroll-reveal');
    if (headerContent) observer.observe(headerContent);
};

onMounted(() => {
    // Pequeno delay para garantir que o DOM foi renderizado
    setTimeout(() => {
        setupScrollAnimations();
    }, 100);
});

onUnmounted(() => {
    if (observer) observer.disconnect();
});

const handleSubmit = async () => {
  isSubmitting.value = true;
  submissionStatus.value = { message: '', type: '' };

  try {
    // Simulação
    await new Promise(resolve => setTimeout(resolve, 1500));
    submissionStatus.value = { message: 'Mensagem enviada com sucesso! Obrigado pelo contato.', type: 'success' };
    
    // Limpar form
    form.name = ''; form.email = ''; form.subject = ''; form.message = '';
  } catch (error) {
    submissionStatus.value = { message: 'Erro ao enviar. Tente novamente.', type: 'error' };
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.page-background {
    background-color: #f8fafc;
    min-height: 100vh;
}

/* Header Compacto e Moderno */
.contact-header {
    background-color: #1e293b;
    color: white;
    padding: 4rem 1.5rem 6rem;
    text-align: center;
    margin-bottom: -3rem;
}
.header-content h2 {
    font-size: 2.5rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
}
.header-content p {
    font-size: 1.1rem;
    color: #94a3b8;
    max-width: 600px;
    margin: 0 auto;
}

.page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem 4rem;
}

.contact-grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 2rem;
    align-items: start; /* Impede que colunas estiquem desnecessariamente se não for desejado */
}

/* Coluna da Esquerda (Flex para organizar Info + Mapa) */
.info-column {
    display: flex;
    flex-direction: column;
    gap: 2rem; /* Espaçamento entre o card de info e o mapa */
    height: 100%;
}

/* Coluna da Direita */
.form-column {
    height: 100%;
}

/* CARDS */
.card-modern {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    border: 1px solid rgba(0,0,0,0.02);
}

/* Estilos Específicos Info Card */
.info-card h3 {
    color: #0f172a;
    font-size: 1.25rem;
    margin-bottom: 1.5rem;
    font-weight: 700;
    border-bottom: 2px solid #f1f5f9;
    padding-bottom: 0.75rem;
}
.contact-list {
    list-style: none;
    padding: 0;
    margin: 0 0 2rem 0;
}
.contact-list li {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
}
.icon-box {
    width: 40px; height: 40px;
    background-color: #e0e7ff;
    color: #4338ca;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
}
.info-text {
    display: flex;
    flex-direction: column;
}
.info-text .label { font-size: 0.8rem; color: #64748b; text-transform: uppercase; font-weight: 600; }
.info-text .value, .info-text .link { color: #1e293b; font-weight: 500; font-size: 1rem; }
.info-text .link { text-decoration: none; transition: color 0.2s; }
.info-text .link:hover { color: #6366f1; }

.social-section h4 { font-size: 0.9rem; color: #64748b; text-transform: uppercase; margin-bottom: 1rem; }
.social-icons { display: flex; gap: 0.75rem; }
.social-icons a {
    width: 36px; height: 36px;
    background: #f1f5f9;
    color: #64748b;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
    text-decoration: none;
}
.social-icons a:hover {
    background: #6366f1;
    color: white;
    transform: translateY(-2px);
}

/* Mapa Ajustado */
.map-card { 
    padding: 0.5rem; 
    overflow: hidden; 
    flex-grow: 1; /* Ocupa espaço restante se a coluna do form for maior */
    min-height: 300px;
    display: flex;
    flex-direction: column;
}
.map-card iframe { 
    border-radius: 12px; 
    flex-grow: 1;
    min-height: 300px;
    border: 0;
}

/* Formulário Styles */
.form-header { margin-bottom: 2rem; }
.form-header h3 { font-size: 1.5rem; color: #1e293b; margin-bottom: 0.5rem; font-weight: 700; }
.form-header p { color: #64748b; }

.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; color: #334151; font-size: 0.95rem; }
.input-wrapper { position: relative; }
.input-icon {
    position: absolute; left: 1rem; top: 50%; transform: translateY(-50%);
    color: #94a3b8; font-size: 0.9rem;
}
.form-group input, .form-group textarea {
    width: 100%;
    padding: 0.85rem 1rem 0.85rem 2.5rem; /* Padding esquerdo para o ícone */
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.2s;
    background-color: #f8fafc;
}
.form-group textarea { padding-left: 1rem; resize: vertical; background-color: #f8fafc; } /* Textarea sem ícone interno */

.form-group input:focus, .form-group textarea:focus {
    outline: none;
    border-color: #6366f1;
    background-color: white;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.btn-submit {
    width: 100%;
    padding: 1rem;
    border-radius: 8px;
    border: none;
    background-color: #6366f1;
    color: white;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    box-shadow: 0 4px 6px rgba(99, 102, 241, 0.2);
}
.btn-submit:hover:not(:disabled) {
    background-color: #4f46e5;
    transform: translateY(-2px);
    box-shadow: 0 6px 8px rgba(99, 102, 241, 0.3);
}
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

.submission-status {
    padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; font-weight: 500;
}
.submission-status.success { background-color: #ecfdf5; color: #047857; }
.submission-status.error { background-color: #fef2f2; color: #b91c1c; }

/* Scroll Animations */
.scroll-reveal {
    opacity: 0; transform: translateY(20px);
    transition: opacity 0.6s ease-out, transform 0.6s ease-out;
    will-change: opacity, transform;
}
.scroll-reveal.is-visible { opacity: 1; transform: translateY(0); }
.delay-1 { transition-delay: 0.1s; }
.delay-2 { transition-delay: 0.2s; }
.delay-3 { transition-delay: 0.3s; }

/* Responsividade */
@media (max-width: 992px) {
  .contact-grid { grid-template-columns: 1fr; gap: 3rem; }
  .contact-header { padding-top: 3rem; }
  .map-card { min-height: 350px; }
}
</style>