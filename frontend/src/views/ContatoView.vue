<template>
  <main class="page-content">
    <header class="page-header">
      <h2>Fale Conosco</h2>
      <p>Tem alguma dúvida, sugestão ou proposta de parceria? Use um dos canais abaixo para entrar em contato.</p>
    </header>

    <div class="contact-grid">
      <div class="contact-info-wrapper">
        <div class="contact-details card">
          <h3>Informações de Contato</h3>
          <ul>
            <li>
              <i class="fas fa-envelope"></i>
              <div>
                <strong>Email</strong>
                <a href="mailto:contato@pulsourbano.org">contato@pulsourbano.org</a>
              </div>
            </li>
            <li>
              <i class="fas fa-map-marker-alt"></i>
              <div>
                <strong>Localização</strong>
                <span>Belo Horizonte, MG, Brasil</span>
              </div>
            </li>
          </ul>
          <div class="social-icons">
            <a href="#" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
            <a href="#" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
            <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
            <a href="#" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
          </div>
        </div>

        <div class="map-container card">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d119976.24823126418!2d-44.0250915392336!3d-19.9027454941916!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xa690cacacf2c33%3A0x55551ab5a78a63e0!2sBelo%20Horizonte%2C%20MG!5e0!3m2!1spt-BR!2sbr!4v1664654939771!5m2!1spt-BR!2sbr" 
            width="600" 
            height="450" 
            style="border:0;" 
            allowfullscreen="" 
            loading="lazy" 
            referrerpolicy="no-referrer-when-downgrade"
            title="Mapa de Belo Horizonte"
          ></iframe>
        </div>
      </div>

      <div class="contact-form-wrapper card">
        <h3>Envie uma Mensagem</h3>
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="name">Seu Nome</label>
            <input type="text" id="name" v-model="form.name" required>
          </div>
          <div class="form-group">
            <label for="email">Seu Email</label>
            <input type="email" id="email" v-model="form.email" required>
          </div>
          <div class="form-group">
            <label for="subject">Assunto</label>
            <input type="text" id="subject" v-model="form.subject">
          </div>
          <div class="form-group">
            <label for="message">Sua Mensagem</label>
            <textarea id="message" rows="6" v-model="form.message" required></textarea>
          </div>

          <div v-if="submissionStatus.message" :class="['submission-status', submissionStatus.type]">
            {{ submissionStatus.message }}
          </div>

          <button type="submit" class="btn-primary" :disabled="isSubmitting">
            <span v-if="isSubmitting">Enviando...</span>
            <span v-else>Enviar Mensagem</span>
          </button>
        </form>
      </div>
    </div>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue';

const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: ''
});

const isSubmitting = ref(false);
const submissionStatus = ref({ message: '', type: '' });

const handleSubmit = async () => {
  isSubmitting.value = true;
  submissionStatus.value = { message: '', type: '' };

  // --- SIMULAÇÃO DE ENVIO PARA API ---
  // Substitua este bloco por sua chamada `axios.post` real.
  try {
    console.log("Dados do formulário:", form);
    
    // Simula um atraso de rede
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simula uma resposta de sucesso
    submissionStatus.value = { message: 'Mensagem enviada com sucesso! Obrigado.', type: 'success' };
    
    // Limpa o formulário
    form.name = '';
    form.email = '';
    form.subject = '';
    form.message = '';

  } catch (error) {
    console.error("Erro no envio:", error);
    submissionStatus.value = { message: 'Houve um erro ao enviar sua mensagem. Tente novamente.', type: 'error' };
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
/* Estilos herdados do projeto */
.page-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
}
.page-header {
    text-align: left;
    margin-bottom: 3rem;
}
.page-header h2 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    color: #2c3e50;
}
.page-header p {
    font-size: 1.1rem;
    color: #555;
    max-width: 600px;
    margin: 0;
}
.card {
  background-color: #fff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  padding: 1.5rem;
}

/* Layout da Página de Contato */
.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 2rem;
}

/* Coluna da Esquerda */
.contact-info-wrapper .card {
  margin-bottom: 2rem;
}
.contact-details h3, .contact-form-wrapper h3 {
  font-size: 1.5rem;
  color: #111827;
  margin: 0 0 1.5rem 0;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 1rem;
}
.contact-details ul {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem 0;
}
.contact-details li {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
}
.contact-details i {
  font-size: 1.2rem;
  color: #6366f1;
  margin-top: 5px;
  width: 25px;
  text-align: center;
}
.contact-details div {
  display: flex;
  flex-direction: column;
}
.contact-details strong {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.25rem;
}
.contact-details span, .contact-details a {
  color: #6b7280;
  text-decoration: none;
}
.contact-details a:hover {
  text-decoration: underline;
}
.social-icons {
  display: flex;
  gap: 1rem;
  border-top: 1px solid #e9ecef;
  padding-top: 1.5rem;
}
.social-icons a {
  font-size: 1.2rem;
  color: #9ca3af;
  transition: color 0.2s;
}
.social-icons a:hover {
  color: #6366f1;
}

.map-container {
  padding: 0;
  overflow: hidden; /* Garante que o iframe fique contido */
}
.map-container iframe {
  width: 100%;
  height: 300px;
  display: block;
}

/* Coluna da Direita (Formulário) */
.form-group {
  margin-bottom: 1.5rem;
}
.form-group label {
  display: block;
  margin-bottom: .5rem;
  font-weight: 500;
  color: #374151;
}
.form-group input, .form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.form-group input:focus, .form-group textarea:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px #e0e7ff;
}
.btn-primary {
  width: 100%;
  padding: 0.8rem 1rem;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  background-color: #6366f1;
  color: white;
  font-size: 1rem;
}
.btn-primary:disabled {
  background-color: #a5b4fc;
  cursor: not-allowed;
}
.submission-status {
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
  text-align: center;
}
.submission-status.success {
  background-color: #d1fae5;
  color: #065f46;
}
.submission-status.error {
  background-color: #fee2e2;
  color: #991b1b;
}

/* Responsividade */
@media (max-width: 992px) {
  .contact-grid {
    grid-template-columns: 1fr;
  }
}
</style>