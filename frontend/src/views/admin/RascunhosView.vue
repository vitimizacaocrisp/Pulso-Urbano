<template>
  <div class="rascunhos">
    <header class="page-head">
      <div>
        <h1>Rascunhos</h1>
        <p class="sub">Publicações ainda não publicadas.</p>
      </div>
      <button class="btn ghost" @click="carregar" :disabled="carregando">
        <Icon icon="mdi:refresh" /> Atualizar
      </button>
    </header>

    <!-- Aviso de expiração (certificação dos 30 dias) -->
    <div class="aviso">
      <Icon icon="mdi:clock-alert-outline" width="20" />
      <span>Rascunhos são <strong>apagados automaticamente 30 dias após a criação</strong>. Publique ou edite antes disso para mantê-los.</span>
    </div>

    <div v-if="carregando" class="estado"><span class="spin"></span> Carregando…</div>
    <div v-else-if="!itens.length" class="estado vazio">
      <Icon icon="mdi:file-outline" width="32" />
      <p>Nenhum rascunho no momento.</p>
      <RouterLink class="btn" :to="{ name: 'CriarPostagem' }"><Icon icon="mdi:plus" /> Nova publicação</RouterLink>
    </div>

    <ul v-else class="lista">
      <li v-for="r in itens" :key="r.id">
        <div class="info">
          <div class="linha1">
            <span class="tipo">{{ LABELS[r.tipo] || r.tipo }}</span>
            <span class="tit">{{ r.titulo || '(sem título)' }}</span>
          </div>
          <div class="linha2">
            <span>Criado {{ fmtData(r.created_at) }}</span>
            <span class="prazo" :class="{ urgente: diasRestantes(r) <= 7 }">
              <Icon icon="mdi:timer-sand" width="14" />
              {{ prazoLabel(r) }}
            </span>
          </div>
        </div>
        <div class="acoes">
          <button class="btn sm" @click="editar(r.id)"><Icon icon="mdi:pencil" /> Editar</button>
          <button class="btn sm danger" @click="excluir(r)" :disabled="excluindo === r.id">
            <Icon icon="mdi:trash-can-outline" /> Excluir
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import api, { errorMessage } from '@/services/api';
import { useToast } from '@/composables/useToast';

const router = useRouter();
const toast = useToast();

const LABELS = { analise: 'Análise', academico: 'Produção Científica', dado: 'Dados', podcast: 'Podcast', livro: 'Livro', video: 'Vídeo' };
const TTL_DIAS = 30;

const itens = ref([]);
const carregando = ref(false);
const excluindo = ref(null);

async function carregar() {
  carregando.value = true;
  try {
    const { data } = await api.get('/api/admin/postagens', { params: { status: 'rascunho', limit: 100 } });
    itens.value = data.data.itens;
  } catch (e) { toast.error(errorMessage(e)); }
  finally { carregando.value = false; }
}

// dias já decorridos desde a criação
function idade(r) {
  const dias = (Date.now() - new Date(r.created_at).getTime()) / 86400000;
  return Math.floor(dias);
}
function diasRestantes(r) { return Math.max(0, TTL_DIAS - idade(r)); }
function prazoLabel(r) {
  const d = diasRestantes(r);
  if (d <= 0) return 'expira em breve';
  return `apaga em ${d} dia${d === 1 ? '' : 's'}`;
}
function fmtData(d) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function editar(id) { router.push({ name: 'EditarPostagem', query: { id } }); }

async function excluir(r) {
  if (!confirm(`Excluir o rascunho "${r.titulo || 'sem título'}"?`)) return;
  excluindo.value = r.id;
  try {
    await api.delete(`/api/admin/postagens/${r.id}`);
    itens.value = itens.value.filter((x) => x.id !== r.id);
    toast.success('Rascunho excluído.');
  } catch (e) { toast.error(errorMessage(e)); }
  finally { excluindo.value = null; }
}

onMounted(carregar);
</script>

<style scoped>
.rascunhos { max-width: 860px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
.page-head h1 { font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin: 0; }
.page-head .sub { color: var(--text-secondary); margin: 4px 0 0; font-size: 0.9rem; }

.aviso { display: flex; align-items: center; gap: 0.6rem; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); color: var(--text-main); border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.88rem; margin-bottom: 1.5rem; }
.aviso :deep(svg) { color: #f59e0b; flex-shrink: 0; }

.estado { text-align: center; color: var(--text-muted); padding: 3rem 1rem; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
.spin { width: 22px; height: 22px; border: 2px solid var(--border-color); border-top-color: var(--brand-primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.lista { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem; }
.lista li { display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem 1rem; }
.info { min-width: 0; flex: 1; }
.linha1 { display: flex; align-items: center; gap: 0.6rem; }
.tipo { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; color: var(--brand-primary); background: rgba(47,84,235,0.1); padding: 2px 8px; border-radius: 999px; flex-shrink: 0; }
.tit { font-weight: 600; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.linha2 { display: flex; align-items: center; gap: 1rem; margin-top: 4px; font-size: 0.78rem; color: var(--text-muted); }
.prazo { display: inline-flex; align-items: center; gap: 4px; }
.prazo.urgente { color: #ef4444; font-weight: 600; }
.acoes { display: flex; gap: 0.4rem; flex-shrink: 0; }

.btn { display: inline-flex; align-items: center; gap: 5px; background: var(--brand-primary); color: #fff; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; text-decoration: none; }
.btn.sm { padding: 6px 10px; font-size: 0.8rem; }
.btn.ghost { background: var(--bg-hover); color: var(--text-main); }
.btn.danger { background: var(--bg-hover); color: #ef4444; }
.btn.danger:hover { background: rgba(239,68,68,0.12); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 640px) {
  .lista li { flex-direction: column; align-items: stretch; }
  .acoes { justify-content: flex-end; }
  .tit { white-space: normal; }
}
</style>
