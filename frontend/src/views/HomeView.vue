<template>
  <MeuHeader />
  <div>
    <section class="hero-canvas-container" ref="heroContainer">
      <canvas ref="canvasRef" class="interactive-canvas"></canvas>
      <div class="canvas-overlay"></div>
      <div class="hero-content">
        <h1 class="fade-in-up">Pulso Urbano</h1>
        <p class="fade-in-up delay-1">Analisando os ritmos da segurança pública e justiça no Brasil.</p>
      </div>
    </section>

    <div class="page-container">
      <main class="main-content">
        <section class="section-label scroll-reveal">Destaque do Dia</section>

        <article class="featured-article card-modern scroll-reveal">
          <div v-if="dailyHighlight.isLoading" class="status-message">
            <div class="spinner-large"></div>
            <p>Gerando destaque do dia...</p>
          </div>
          <div v-else-if="dailyHighlight.error" class="status-message error">
            {{ dailyHighlight.error }}
          </div>
          <template v-else-if="dailyHighlight.data">
            <div class="featured-grid">
              <figure class="featured-image-wrapper">
                <img :src="getFullMediaPath(dailyHighlight.data.cover_image_path)" alt="Imagem de capa do destaque">
                <router-link :to="`/categoria/${dailyHighlight.data.category?.toLowerCase()}`" class="category-badge-overlay">
                  {{ dailyHighlight.data.category }}
                </router-link>
              </figure>
              <div class="featured-content">
                <header class="article-header">
                  <div class="article-meta">
                    <span><i class="far fa-calendar"></i> {{ new Date(dailyHighlight.data.created_at).toLocaleDateString() }}</span>
                  </div>
                  <h1>{{ dailyHighlight.data.title }}</h1>
                  <div class="author-meta">
                    <span class="author-name">Por <strong>{{ dailyHighlight.data.author }}</strong></span>
                  </div>
                </header>
                <p class="lead">{{ dailyHighlight.data.description }}</p>
                <router-link :to="{ name: 'AnalysisDetail', params: { id: dailyHighlight.data.id } }" class="btn-text">
                  Ler Análise Completa <i class="fas fa-arrow-right"></i>
                </router-link>
              </div>
            </div>
          </template>
        </article>

        <section class="section-header-row scroll-reveal">
          <h3 class="section-label">Recentes</h3>
        </section>

        <div class="scroll-reveal delay-1">
          <RecentPosts :post-count="6" />
        </div>
      </main>

      <aside class="sidebar">

        <!-- Widget: Dados em Foco -->
        <div class="sidebar-widget card-modern context-widget scroll-reveal delay-2">
          <h3 class="widget-title">Dados em Foco</h3>
          <div v-if="population.isLoading" class="status-message small"><div class="spinner-badge"></div></div>
          <div v-else-if="population.error" class="status-message small error">Falha ao carregar.</div>
          <div v-else class="stats-list">
            <div class="stat-card">
              <span class="stat-label">População Brasil ({{ population.data.ano }})</span>
              <strong class="stat-number">{{ formatNumber(population.data.total) }}</strong>
            </div>
            <div v-if="population.data.topState" class="stat-card highlight">
              <span class="stat-label">Maior Estado ({{ population.data.topState.uf }})</span>
              <strong class="stat-number small">{{ formatNumber(population.data.topState.populacao) }}</strong>
            </div>
          </div>
        </div>

        <!-- Widget: Newsletter -->
        <div class="sidebar-widget card-modern newsletter-widget scroll-reveal delay-3">
          <div class="newsletter-content">
            <h3 class="widget-title inverted">Newsletter</h3>
            <p>Receba as análises mais profundas sobre segurança pública diretamente no seu email.</p>
            <form class="subscribe-form" @submit.prevent>
              <input type="email" placeholder="Seu melhor email">
              <button type="submit" class="btn-subscribe">Inscrever-se</button>
            </form>
          </div>
        </div>
      </aside>
    </div>
  </div>
  <MeuFooter />
</template>

<script setup>
import { reactive, onMounted, onUnmounted, ref, nextTick } from 'vue';
import axios from 'axios';
import RecentPosts from '@/components/RecentPosts.vue';
import MeuHeader   from '@/components/MeuHeader.vue';
import MeuFooter   from '@/components/MeuFooter.vue';
import { fetchWithCache, CacheKeys, TTL } from '@/utils/apiCache.js';

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

// ─── Scroll reveal ────────────────────────────────────────────────────
const setupScrollAnimations = () => {
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { root: null, rootMargin: '0px', threshold: 0.1 });
  document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
};

// ─── Canvas ───────────────────────────────────────────────────────────
const canvasRef      = ref(null);
const heroContainer  = ref(null);
let animationFrameId = null;
let particles        = [];
let mouse            = { x: null, y: null };
let idleTime         = 0;
let autoMouse        = { x: 0, y: 0 };

class Particle {
  constructor(w, h) {
    this.x = Math.random() * w; this.y = Math.random() * h;
    this.vx = (Math.random() - 0.5) * 0.5; this.vy = (Math.random() - 0.5) * 0.5;
    this.size = Math.random() * 2 + 1;
    this.baseX = this.x; this.baseY = this.y;
    this.density = (Math.random() * 30) + 1;
  }
  update(mx, my, w, h) {
    const dx = mx - this.x, dy = my - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxD = 300, force = (maxD - dist) / maxD;
    if (dist < maxD) {
      this.x += (dx / dist) * force * this.density;
      this.y += (dy / dist) * force * this.density;
    } else {
      this.x += (this.baseX - this.x) * 0.05;
      this.y += (this.baseY - this.y) * 0.05;
    }
    this.baseX += this.vx; this.baseY += this.vy;
    if (this.baseX < 0 || this.baseX > w) this.vx = -this.vx;
    if (this.baseY < 0 || this.baseY > h) this.vy = -this.vy;
  }
  draw(ctx) {
    ctx.fillStyle = 'rgba(99,102,241,0.8)';
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
  }
}

const initParticles = (w, h) => {
  particles = [];
  const n = (w * h) / 9000;
  for (let i = 0; i < n; i++) particles.push(new Particle(w, h));
};

const initCanvas = () => {
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  const resize = () => {
    canvas.width  = heroContainer.value.offsetWidth;
    canvas.height = heroContainer.value.offsetHeight;
    initParticles(canvas.width, canvas.height);
  };
  window.addEventListener('resize', resize);
  resize();

  const handleMouseMove  = (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; idleTime = 0; };
  const handleMouseLeave = ()  => { mouse.x = null; mouse.y = null; };
  heroContainer.value.addEventListener('mousemove',  handleMouseMove);
  heroContainer.value.addEventListener('mouseleave', handleMouseLeave);

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let tx = mouse.x, ty = mouse.y;
    if (mouse.x === null) {
      idleTime += 0.01;
      autoMouse.x = (canvas.width  / 2) + Math.cos(idleTime)       * (canvas.width  / 3);
      autoMouse.y = (canvas.height / 2) + Math.sin(idleTime * 1.5)  * (canvas.height / 4);
      tx = autoMouse.x; ty = autoMouse.y;
    }
    for (let i = 0; i < particles.length; i++) {
      particles[i].update(tx, ty, canvas.width, canvas.height);
      particles[i].draw(ctx);
      for (let j = i; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 100) {
          ctx.beginPath(); ctx.strokeStyle = `rgba(99,102,241,${1 - d / 100})`; ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke();
        }
      }
    }
    if (tx !== null) {
      for (let i = 0; i < particles.length; i++) {
        const dx = particles[i].x - tx, dy = particles[i].y - ty;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 150) {
          ctx.beginPath(); ctx.strokeStyle = `rgba(255,255,255,${0.5 - d / 150})`; ctx.lineWidth = 1;
          ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(tx, ty); ctx.stroke();
        }
      }
    }
    animationFrameId = requestAnimationFrame(animate);
  };
  animate();

  return () => {
    window.removeEventListener('resize', resize);
    if (heroContainer.value) {
      heroContainer.value.removeEventListener('mousemove',  handleMouseMove);
      heroContainer.value.removeEventListener('mouseleave', handleMouseLeave);
    }
    cancelAnimationFrame(animationFrameId);
  };
};

// ─── Estado ───────────────────────────────────────────────────────────
const population = reactive({ isLoading: true, error: null, data: { total: 0, topState: null, ano: null } });
const dailyHighlight = reactive({ isLoading: true, error: null, data: null });
//const categories     = reactive({ isLoading: true, error: null, data: [] });

const formatNumber   = (num) => typeof num === 'number' ? num.toLocaleString('pt-BR') : '...';
const getFullMediaPath = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

// ─── Dados do IBGE — cacheia 24 h ─────────────────────────────────────
const fetchPopulationData = async () => {
  population.isLoading = true;
  try {
    const ano = new Date().getFullYear() - 1;
    const processedData = await fetchWithCache(
      CacheKeys.ibge(ano),
      async () => {
        const url = `https://apisidra.ibge.gov.br/values/t/6579/n3/all/v/9324/p/${ano}/h/n`;
        const response = await axios.get(url);
        const rawData  = response.data;
        if (!Array.isArray(rawData) || rawData.length < 2) throw new Error('Formato IBGE inesperado.');
        return rawData.slice(1).map(item => ({ uf: item.D3N, populacao: Number(item.V) || 0 }));
      },
      TTL.IBGE
    );
    population.data.total    = processedData.reduce((s, st) => s + st.populacao, 0);
    population.data.topState = [...processedData].sort((a, b) => b.populacao - a.populacao)[0];
    population.data.ano      = new Date().getFullYear() - 1;
    population.error = null;
  } catch (err) {
    console.error('IBGE error:', err);
    population.error = 'Falha ao carregar dados populacionais.';
  } finally {
    population.isLoading = false;
  }
};

// ─── Destaque do dia — rota dedicada /api/highlight ───────────────────
const fetchHighlight = async () => {
  dailyHighlight.isLoading = true;
  try {
    const token   = localStorage.getItem('authToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const data = await fetchWithCache(
      'highlight:day',
      () => axios.get(`${API_BASE_URL}/api/highlight`, { headers }).then(r => r.data?.data),
      TTL.DEFAULT // 30 s
    );
    dailyHighlight.data  = data;
    dailyHighlight.error = null;
  } catch (err) {
    console.error('Highlight error:', err);
    dailyHighlight.error = 'Não foi possível gerar um destaque.';
  } finally {
    dailyHighlight.isLoading = false;
  }
};

// ─── Lifecycle ────────────────────────────────────────────────────────
let cleanupCanvas;

onMounted(() => {
  // Requests independentes e paralelas
  fetchHighlight();
  // fetchCategories(); // Comentado pois a rota /api/categories não está sendo utilizada
  fetchPopulationData();
  cleanupCanvas = initCanvas();
  nextTick(setupScrollAnimations);
});

onUnmounted(() => { if (cleanupCanvas) cleanupCanvas(); });
</script>

<style scoped>
/* Mantém exatamente o mesmo CSS do original */
.scroll-reveal {
  opacity: 0; transform: translateY(60px);
  transition: opacity 1s cubic-bezier(0.16,1,0.3,1), transform 1s cubic-bezier(0.16,1,0.3,1);
  will-change: opacity, transform;
}
.scroll-reveal.is-visible { opacity: 1; transform: translateY(0); }
.delay-1 { transition-delay: 0.1s; }
.delay-2 { transition-delay: 0.2s; }
.delay-3 { transition-delay: 0.3s; }

.hero-canvas-container {
  position: relative; height: 91vh; width: 100%; overflow: hidden;
  display: flex; justify-content: center; align-items: center;
  background-color: var(--slate-900);
}
.interactive-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }
.canvas-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: radial-gradient(circle at center, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0.9) 100%);
  z-index: 2; pointer-events: none;
}
.hero-content {
  position: relative; z-index: 3; color: #fff; text-align: center;
  padding: 2rem; max-width: 800px; pointer-events: none;
}
.hero-content h1 { font-size: 5rem; font-weight: 800; margin: 0 0 1rem 0; letter-spacing: -2px; line-height: 1; text-shadow: 0 4px 12px rgba(0,0,0,0.5); }
.hero-content p  { font-size: 1.5rem; font-weight: 300; max-width: 700px; margin: 0 auto; opacity: 0.9; }
.fade-in-up { animation: fadeInUp 0.8s ease-out forwards; opacity: 0; transform: translateY(20px); }
.delay-1    { animation-delay: 0.3s; }
@keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }

.page-container { display: flex; flex-wrap: wrap; gap: 3rem; max-width: var(--container-width); margin: 3rem auto; padding: 0 1.5rem; background-color: var(--bg-body); }
.main-content   { flex: 3; min-width: 0; }
.sidebar        { flex: 1; min-width: 320px; }
.section-label  { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); font-weight: 700; margin-bottom: 1rem; border-left: 3px solid var(--brand-primary); padding-left: 0.75rem; }
.card-modern    { background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); transition: box-shadow 0.3s ease, transform 0.3s ease; overflow: hidden; margin-bottom: 2.5rem; }
.card-modern:hover { box-shadow: var(--shadow-md); }
.featured-article { padding: 0; }
.featured-grid    { display: grid; grid-template-columns: 1.2fr 1fr; min-height: 400px; }
.featured-image-wrapper { position: relative; margin: 0; height: 100%; overflow: hidden; }
.featured-image-wrapper img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
.featured-article:hover .featured-image-wrapper img { transform: scale(1.03); }
.category-badge-overlay { position: absolute; top: 1.5rem; left: 1.5rem; background: rgba(255,255,255,0.95); color: var(--brand-primary); padding: 0.35rem 1rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; box-shadow: var(--shadow-md); text-decoration: none; transition: background 0.2s; }
.category-badge-overlay:hover { background: #fff; }
.featured-content { padding: 2.5rem; display: flex; flex-direction: column; justify-content: center; }
.article-header h1 { font-size: 2.25rem; font-weight: 800; color: var(--text-main); line-height: 1.1; margin: 0.5rem 0 1rem 0; letter-spacing: -0.5px; }
.article-meta     { color: var(--text-muted); font-size: 0.85rem; font-weight: 500; text-transform: uppercase; margin-bottom: 0.5rem; }
.lead             { font-size: 1.05rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 2rem; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.author-name      { color: var(--text-muted); font-size: 0.9rem; }
.author-name strong { color: var(--text-main); }
.btn-text         { color: var(--brand-primary); font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; font-size: 1rem; transition: gap 0.2s; }
.btn-text:hover   { gap: 0.75rem; color: var(--brand-primary-hover); }
.sidebar-widget   { padding: 1.5rem; margin-bottom: 2rem; background: var(--bg-card); }
.widget-title     { font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin: 0 0 1.25rem 0; padding-bottom: 0.75rem; border-bottom: 2px solid var(--border-color); }
.category-list    { list-style: none; padding: 0; margin: 0; }
.category-item    { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0.5rem; color: var(--text-secondary); text-decoration: none; border-radius: var(--radius-sm); transition: all 0.2s; border-bottom: 1px solid var(--border-color); }
.category-item:hover { background-color: var(--bg-hover); color: var(--brand-primary); padding-left: 1rem; }
.cat-count        { background-color: var(--bg-hover); color: var(--text-muted); font-size: 0.75rem; padding: 0.15rem 0.6rem; border-radius: 99px; font-weight: 600; }
.stats-list       { display: flex; flex-direction: column; gap: 1rem; }
.stat-card        { background: var(--bg-hover); padding: 1rem; border-radius: var(--radius-md); border-left: 4px solid var(--border-color); }
.stat-card.highlight { border-left-color: var(--brand-primary); background: rgba(99,102,241,0.1); }
.stat-label       { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem; text-transform: uppercase; font-weight: 600; }
.stat-number      { font-size: 1.5rem; color: var(--text-main); font-weight: 700; display: block; }
.newsletter-widget { background: var(--bg-footer); color: white; text-align: center; padding: 2rem; }
.widget-title.inverted { color: white; border-color: rgba(255,255,255,0.1); }
.newsletter-content p { color: var(--text-muted); margin-bottom: 1.5rem; font-size: 0.95rem; }
.subscribe-form { display: flex; flex-direction: column; gap: 0.75rem; }
.subscribe-form input { padding: 0.85rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); border-radius: 6px; color: white; text-align: center; }
.subscribe-form input:focus { outline: none; background: rgba(255,255,255,0.1); border-color: var(--brand-primary); }
.btn-subscribe { padding: 0.85rem; border-radius: 6px; border: none; font-weight: 700; cursor: pointer; background-color: var(--brand-primary); color: white; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.5px; transition: background 0.2s; }
.btn-subscribe:hover { background-color: var(--brand-primary-hover); }
@keyframes spin { to { transform: rotate(360deg); } }
.spinner-badge    { width: 16px; height: 16px; border: 2px solid var(--border-color); border-top-color: var(--brand-primary); border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
.spinner-large    { width: 40px; height: 40px; border: 4px solid var(--border-color); border-top-color: var(--brand-primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem auto; }
.status-message   { padding: 3rem; text-align: center; color: var(--text-muted); }
.status-message.error { color: var(--sys-danger); }
@media (max-width: 992px) { .hero-canvas-container { height: 90vh; } .featured-grid { grid-template-columns: 1fr; } .featured-image-wrapper { height: 250px; } .hero-content h1 { font-size: 3.5rem; } .page-container { flex-direction: column; } }
@media (max-width: 768px) { .hero-content h1 { font-size: 2.5rem; } .hero-content p { font-size: 1.1rem; } .featured-content { padding: 1.5rem; } }
</style>
