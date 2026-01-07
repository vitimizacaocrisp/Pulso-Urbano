<template>
    <MeuHeader />
    <div class="page-background">
        <!-- Hero Section -->
        <header class="about-hero">
            <div class="hero-content scroll-reveal">
                <span class="eyebrow">Quem Somos</span>
                <h1>Observatório Pulso Urbano</h1>
                <div class="hero-divider"></div>
            </div>
        </header>

        <main class="page-container">
            <div class="grid-layout">
                <!-- Seção Missão -->
                <section class="card-modern scroll-reveal delay-1">
                    <div class="card-icon">
                        <i class="fas fa-bullseye"></i>
                    </div>
                    <div class="card-content">
                        <h3>Nossa Missão</h3>
                        <p>O Pulso Urbano é uma plataforma digital voltada à democratização de dados, análises e previsões sobre questões urbanas e sociais no Brasil.</p>
                        <p>Nosso objetivo é desenvolver um ambiente virtual robusto e interativo que concentre e dissemine o acervo de dados sobre criminalidade, segurança pública e justiça, transformando conhecimento acadêmico complexo em informação acessível e confiável para toda a sociedade.</p>
                    </div>
                </section>

                <!-- Seção Visão/Contexto -->
                <section class="card-modern scroll-reveal delay-2">
                    <div class="card-icon">
                        <i class="fas fa-eye"></i>
                    </div>
                    <div class="card-content">
                        <h3>A Cifra Oculta</h3>
                        <p>Para entender a real dimensão da criminalidade, não basta olhar apenas para os registros oficiais. É preciso integrar dados administrativos com pesquisas de vitimização.</p>
                        <p>Nós buscamos capturar a "cifra oculta" do crime — os incidentes que nunca são reportados às autoridades. O Pulso Urbano nasce para preencher essa lacuna, oferecendo uma visão completa e multifacetada do problema de segurança pública.</p>
                    </div>
                </section>

                <!-- Seção Metodologia -->
                <section class="card-modern scroll-reveal delay-3">
                    <div class="card-icon">
                        <i class="fas fa-chart-network"></i>
                    </div>
                    <div class="card-content">
                        <h3>Metodologia Rigorosa</h3>
                        <p>Nosso compromisso é com a qualidade e a comparabilidade dos dados. Adotamos princípios de padrões internacionais como a <strong>Classificação Internacional de Crime para Fins Estatísticos (ICCS)</strong>.</p>
                        <p>Esta abordagem classifica os crimes com base no comportamento (o ato) e não segundo as diferentes leis de cada estado, permitindo uma comparação precisa e confiável em nível nacional.</p>
                    </div>
                </section>

                <!-- Seção Parceria -->
                <section class="card-modern highlight scroll-reveal delay-4">
                    <div class="card-content partner-content">
                        <div class="partner-text">
                            <h3>Parceria Estratégica</h3>
                            <p>Este projeto é desenvolvido em estreita colaboração com o <strong>CRISP - Centro de Estudos de Criminalidade e Segurança Pública da UFMG</strong>, uma referência nacional em pesquisas na área.</p>
                        </div>
                        <div class="partner-logo-placeholder">
                            <i class="fas fa-university"></i>
                            <span>UFMG / CRISP</span>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    </div>
    <MeuFooter />
</template>

<script setup>
import { onMounted } from 'vue';
import MeuHeader from '@/components/MeuHeader.vue';
import MeuFooter from '@/components/MeuFooter.vue';

// --- Scroll Animation Logic ---
const setupScrollAnimations = () => {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach(el => observer.observe(el));
};

onMounted(() => {
    setupScrollAnimations();
});
</script>

<style scoped>
.page-background {
    background-color: #f8fafc;
    min-height: 100vh;
    padding-bottom: 4rem;
}

/* HERO SECTION */
.about-hero {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
    padding: 6rem 1.5rem 8rem 1.5rem; /* Padding bottom extra para sobreposição */
    text-align: center;
    clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%);
    margin-bottom: -4rem;
}
.hero-content {
    max-width: 800px;
    margin: 0 auto;
}
.eyebrow {
    text-transform: uppercase;
    font-size: 0.85rem;
    letter-spacing: 2px;
    color: #6366f1;
    font-weight: 700;
    margin-bottom: 1rem;
    display: block;
}
.about-hero h1 {
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 1.5rem;
    line-height: 1.1;
}
.hero-divider {
    width: 60px;
    height: 4px;
    background-color: #6366f1;
    margin: 0 auto;
    border-radius: 2px;
}

/* CONTAINER PRINCIPAL */
.page-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 0 1.5rem;
}

.grid-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
}

/* CARDS */
.card-modern {
    background: white;
    border-radius: 16px;
    padding: 2.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    display: flex;
    gap: 2rem;
    align-items: flex-start;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.card-modern:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.card-icon {
    flex-shrink: 0;
    width: 60px;
    height: 60px;
    background-color: #e0e7ff;
    color: #4338ca;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
}

.card-content h3 {
    font-size: 1.5rem;
    color: #1e293b;
    margin: 0 0 1rem 0;
    font-weight: 700;
}
.card-content p {
    color: #475569;
    line-height: 1.7;
    margin-bottom: 1rem;
    font-size: 1.05rem;
}
.card-content p:last-child {
    margin-bottom: 0;
}

/* Card de Destaque (Parceria) */
.card-modern.highlight {
    background: linear-gradient(to right, #4338ca, #6366f1);
    color: white;
}
.card-modern.highlight h3 { color: white; }
.card-modern.highlight p { color: rgba(255,255,255,0.9); }

.partner-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 2rem;
}
.partner-logo-placeholder {
    flex-shrink: 0;
    width: 100px;
    height: 100px;
    background: rgba(255,255,255,0.15);
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 700;
}
.partner-logo-placeholder span {
    font-size: 0.7rem;
    margin-top: 0.5rem;
    text-transform: uppercase;
}

/* SCROLL REVEAL ANIMATIONS */
.scroll-reveal {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.scroll-reveal.is-visible {
    opacity: 1;
    transform: translateY(0);
}
.delay-1 { transition-delay: 0.1s; }
.delay-2 { transition-delay: 0.2s; }
.delay-3 { transition-delay: 0.3s; }
.delay-4 { transition-delay: 0.4s; }

/* RESPONSIVIDADE */
@media (max-width: 768px) {
    .card-modern { flex-direction: column; gap: 1rem; padding: 1.5rem; }
    .partner-content { flex-direction: column; text-align: center; }
    .about-hero h1 { font-size: 2.5rem; }
}
</style>