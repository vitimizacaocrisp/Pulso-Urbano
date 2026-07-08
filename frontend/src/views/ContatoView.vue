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
                <div class="icon-box"><Icon icon="mdi:email" /></div>
                <div class="info-text">
                  <span class="label">Email</span>
                  <a href="mailto:contato@pulsourbano.org" class="link">contato@pulsourbano.org</a>
                </div>
              </li>
              <li>
                <div class="icon-box"><Icon icon="mdi:map-marker" /></div>
                <div class="info-text">
                  <span class="label">Localização</span>
                  <span class="value">Belo Horizonte, MG, Brasil</span>
                </div>
              </li>
            </ul>
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
                    <Icon icon="mdi:account" class="input-icon" />
                    <input type="text" id="name" v-model="form.name" placeholder="Seu nome" required>
                </div>
              </div>
              
              <div class="form-group">
                <label for="email">Email</label>
                <div class="input-wrapper">
                    <Icon icon="mdi:at" class="input-icon" />
                    <input type="email" id="email" v-model="form.email" placeholder="seu@email.com" required>
                </div>
              </div>
              
              <div class="form-group">
                <label for="subject">Assunto</label>
                <div class="input-wrapper">
                    <Icon icon="mdi:tag" class="input-icon" />
                    <input type="text" id="subject" v-model="form.subject" placeholder="Sobre o que quer falar?">
                </div>
              </div>
              
              <div class="form-group">
                <label for="message">Mensagem</label>
                <textarea id="message" rows="5" v-model="form.message" placeholder="Escreva sua mensagem aqui..." required></textarea>
              </div>

              <div v-if="submissionStatus.message" :class="['submission-status', submissionStatus.type]">
                <Icon :icon="submissionStatus.type === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'" />
                {{ submissionStatus.message }}
              </div>

              <button type="submit" class="btn-submit" :disabled="isSubmitting">
                <span v-if="isSubmitting"><Icon icon="svg-spinners:ring-resize" /> Enviando...</span>
                <span v-else>Enviar Mensagem <Icon icon="mdi:send" /></span>
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
import { Icon } from '@iconify/vue';
import emailjs from '@emailjs/browser';
import MeuHeader from '@/components/MeuHeader.vue';
import MeuFooter from '@/components/MeuFooter.vue';

// Credenciais do EmailJS (definidas no .env.local — ver .env.example).
const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

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
    if (observer) observer.disconnect();

    observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    if (mainContainer.value) {
        const elements = mainContainer.value.querySelectorAll('.scroll-reveal');
        elements.forEach(el => observer.observe(el));
    }
    
    const headerContent = document.querySelector('.header-content.scroll-reveal');
    if (headerContent) observer.observe(headerContent);
};

onMounted(() => {
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

  // Sem credenciais configuradas, evita uma falha silenciosa.
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    submissionStatus.value = {
      message: 'Envio de e-mail ainda não configurado. Defina as variáveis VITE_EMAILJS_* no .env.',
      type: 'error'
    };
    isSubmitting.value = false;
    return;
  }

  try {
    // Parâmetros disponíveis no template do EmailJS como {{from_name}}, {{reply_to}}, {{subject}}, {{message}}.
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        from_name: form.name,
        reply_to:  form.email,
        subject:   form.subject || 'Contato pelo site Pulso Urbano',
        message:   form.message,
      },
      { publicKey: EMAILJS_PUBLIC_KEY }
    );

    submissionStatus.value = { message: 'Mensagem enviada com sucesso! Obrigado pelo contato.', type: 'success' };
    form.name = ''; form.email = ''; form.subject = ''; form.message = '';
  } catch (error) {
    console.error('EmailJS error:', error);
    submissionStatus.value = { message: 'Erro ao enviar. Tente novamente em instantes.', type: 'error' };
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.page-background {
    background-color: var(--bg-body);
    min-height: 100vh;
}

/* Header Compacto e Moderno */
.contact-header {
    /* Banner cobalt fixo — texto branco legível em qualquer tema */
    background: linear-gradient(135deg, #1d39c4 0%, #2f54eb 100%);
    color: #ffffff;
    padding: 4rem 1.5rem 6rem;
    text-align: center;
    margin-bottom: -3rem;
}
.header-content h2 {
    font-size: 2.5rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
    color: #ffffff;
}
.header-content p {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.85);
    max-width: 600px;
    margin: 0 auto;
}

.page-container {
    max-width: var(--container-width);
    margin: 0 auto;
    padding: 0 1.5rem 4rem;
    /* Eleva os cards acima do banner: o header usa margin-bottom negativo para
       criar o efeito de "cards flutuando sobre o banner"; sem z-index o banner
       pintava por cima dos títulos dos cards. */
    position: relative;
    z-index: 1;
}

.contact-grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 2rem;
    align-items: start;
}

.info-column {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    height: 100%;
}

.form-column {
    height: 100%;
}

/* CARDS */
.card-modern {
    background: var(--bg-card);
    border-radius: var(--radius-xl);
    padding: 2rem;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
}

/* Estilos Específicos Info Card */
.info-card h3 {
    color: var(--text-main);
    font-size: 1.25rem;
    margin-bottom: 1.5rem;
    font-weight: 700;
    border-bottom: 2px solid var(--border-color);
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
    background-color: var(--bg-hover);
    color: var(--brand-primary);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
}
.info-text {
    display: flex;
    flex-direction: column;
}
.info-text .label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
.info-text .value, .info-text .link { color: var(--text-main); font-weight: 500; font-size: 1rem; }
.info-text .link { text-decoration: none; transition: color 0.2s; }
.info-text .link:hover { color: var(--brand-primary); }

/* Mapa Ajustado */
.map-card { 
    padding: 0.5rem; 
    overflow: hidden; 
    flex-grow: 1;
    min-height: 300px;
    display: flex;
    flex-direction: column;
}
.map-card iframe { 
    border-radius: var(--radius-lg); 
    flex-grow: 1;
    min-height: 300px;
    border: 0;
}

/* Formulário Styles */
.form-header { margin-bottom: 2rem; }
.form-header h3 { font-size: 1.5rem; color: var(--text-main); margin-bottom: 0.5rem; font-weight: 700; }
.form-header p { color: var(--text-secondary); }

.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-main); font-size: 0.95rem; }
.input-wrapper { position: relative; }
.input-icon {
    position: absolute; left: 1rem; top: 50%; transform: translateY(-50%);
    color: var(--text-muted); font-size: 0.9rem;
}
.form-group input, .form-group textarea {
    width: 100%;
    padding: 0.85rem 1rem 0.85rem 2.5rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 1rem;
    transition: all 0.2s;
    background-color: var(--bg-input-form);
    color: var(--text-main);
}
.form-group textarea { padding-left: 1rem; resize: vertical; background-color: var(--bg-input-form); }

.form-group input:focus, .form-group textarea:focus {
    outline: none;
    border-color: var(--brand-primary);
    background-color: var(--bg-card);
    box-shadow: 0 0 0 4px rgba(47, 84, 235, 0.1);
}

.btn-submit {
    width: 100%;
    padding: 1rem;
    border-radius: var(--radius-md);
    border: none;
    background-color: var(--brand-primary);
    color: white;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    box-shadow: var(--shadow-md);
}
.btn-submit:hover:not(:disabled) {
    background-color: var(--brand-primary-hover);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

.submission-status {
    padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; font-weight: 500;
}
.submission-status.success { background-color: rgba(16, 185, 129, 0.1); color: var(--sys-success); }
.submission-status.error { background-color: rgba(239, 68, 68, 0.1); color: var(--sys-danger); }

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