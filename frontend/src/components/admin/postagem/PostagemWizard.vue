<template>
  <div class="wizard">
    <!-- barra de passos -->
    <ol v-if="draftId" class="steps">
      <li v-for="(s, i) in STEPS" :key="s.key" :class="{ done: i < step, active: i === step }">
        <span class="num">{{ i }}</span>{{ s.label }}
      </li>
    </ol>

    <div class="painel">
      <StepTipo v-if="step === 0" :criando="saving" @escolher="escolherTipo" />

      <template v-else>
        <header class="painel-head">
          <span class="tipo-chip">{{ tipoLabel }}</span>
          <h2>{{ STEPS[step].label }} <small>· passo {{ step }} de {{ STEPS.length - 1 }}</small></h2>
        </header>

        <FieldsIdentidade v-if="atual === 'identidade'" />
        <FieldsEspecifico v-else-if="atual === 'especifico'" :tipo="tipo" />
        <FieldsTaxonomia v-else-if="atual === 'taxonomia'" />
        <div v-else-if="atual === 'conteudo'">
          <label class="wz-field"><span>{{ isMedia ? 'Descrição / show notes' : 'Conteúdo (HTML)' }}<em v-if="!isMedia" class="req">*</em></span>
            <textarea class="wz-input mono" rows="14" v-model="form.conteudo" placeholder="Conteúdo da publicação…"></textarea>
          </label>
          <p class="hint">O HTML é sanitizado no servidor ao salvar.</p>
        </div>
        <FieldsMidia v-else-if="atual === 'midia'" :anexos="anexos" :subindo="subindo" :progresso="progresso" :nome-atual="nomeAtual" @remover="removerAnexo" @upload="subirAnexo" />
        <FieldsPublicacao v-else-if="atual === 'publicacao'" :tipo="tipo" />

        <p v-if="erro" class="wz-erro"><Icon icon="mdi:alert-circle" /> {{ erro }}</p>

        <div class="acoes">
          <button class="btn ghost" :disabled="saving" @click="anterior"><Icon icon="mdi:arrow-left" /> Voltar</button>
          <span class="saved" v-if="lastSaved">salvo automaticamente</span>
          <button v-if="atual !== 'publicacao'" class="btn" :disabled="saving" @click="proximo">Avançar <Icon icon="mdi:arrow-right" /></button>
          <button v-else class="btn primary" :disabled="publishing" @click="publicar">
            <span v-if="publishing" class="spinner"></span><span v-else>Publicar</span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount, provide } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import api, { errorMessage } from '@/services/api';
import { useToast } from '@/composables/useToast';
import { uploadToR2, MAX_UPLOAD_BYTES, formatBytes } from '@/utils/uploadR2.js';
import StepTipo from './StepTipo.vue';
import FieldsIdentidade from './FieldsIdentidade.vue';
import FieldsEspecifico from './FieldsEspecifico.vue';
import FieldsTaxonomia from './FieldsTaxonomia.vue';
import FieldsMidia from './FieldsMidia.vue';
import FieldsPublicacao from './FieldsPublicacao.vue';

const router = useRouter();
const toast = useToast();

const STEPS = [
  { key: 'tipo', label: 'Tipo' },
  { key: 'identidade', label: 'Identidade' },
  { key: 'especifico', label: 'Específico' },
  { key: 'taxonomia', label: 'Taxonomia' },
  { key: 'conteudo', label: 'Conteúdo' },
  { key: 'midia', label: 'Mídia' },
  { key: 'publicacao', label: 'Publicação' },
];

const tipo = ref('');
const draftId = ref(null);
const step = ref(0);
const saving = ref(false);
const publishing = ref(false);
const erro = ref('');
const lastSaved = ref(false);
const anexos = ref([]);
const subindo = ref(false);
const progresso = ref(0);
const nomeAtual = ref('');

const form = reactive({
  titulo: '', subtitulo: '', resumo: '', conteudo: '',
  destaque: false, is_crisp: false, periodo_estudo: '', nacionalidade: '',
  with_header: false, with_footer: false,
  categorias: [], tags: [], autores: [], fontes: [], ufs: [], municipios: [],
});
const sub = reactive({});

// Compartilha os objetos reativos com os Fields* (evita mutação de props).
provide('wizForm', form);
provide('wizSub', sub);

const atual = computed(() => STEPS[step.value]?.key);
const isMedia = computed(() => ['podcast', 'video'].includes(tipo.value));
const LABELS = { analise: 'Análise', academico: 'Produção Científica', dado: 'Dados', podcast: 'Podcast', livro: 'Livro', video: 'Vídeo' };
const tipoLabel = computed(() => LABELS[tipo.value] || 'Publicação');

async function escolherTipo(t) {
  saving.value = true; erro.value = '';
  try {
    const { data } = await api.post('/api/admin/postagens', { tipo: t });
    draftId.value = data.data.id;
    tipo.value = t;
    step.value = 1;
  } catch (e) { erro.value = errorMessage(e); toast.error(erro.value); }
  finally { saving.value = false; }
}

// Monta o PATCH sem clobbers: omite strings vazias e arrays vazios; booleans sempre.
function patchBody() {
  const b = {};
  const comuns = ['titulo', 'subtitulo', 'resumo', 'conteudo', 'periodo_estudo', 'nacionalidade'];
  for (const k of comuns) if (form[k] !== '' && form[k] != null) b[k] = form[k];
  for (const k of ['destaque', 'is_crisp', 'with_header', 'with_footer']) b[k] = form[k];
  for (const k of ['categorias', 'tags', 'autores', 'fontes', 'ufs', 'municipios']) if (form[k]?.length) b[k] = form[k];
  const s = {};
  for (const [k, v] of Object.entries(sub)) if (v !== '' && v != null) s[k] = v;
  if (Object.keys(s).length) b.subtipo = s;
  return b;
}

async function salvar() {
  if (!draftId.value) return true;
  saving.value = true; erro.value = '';
  try {
    await api.patch(`/api/admin/postagens/${draftId.value}`, patchBody());
    lastSaved.value = true;
    return true;
  } catch (e) { erro.value = errorMessage(e); toast.error(erro.value); return false; }
  finally { saving.value = false; }
}

// Validação do passo ATUAL antes de avançar (evita postagem vazia).
function validarAtual() {
  if (atual.value === 'identidade') {
    if (!form.titulo || !form.titulo.trim()) return 'Informe o título da publicação.';
    if (!form.resumo || !form.resumo.trim()) return 'Informe o resumo (aparece na prévia pública).';
  }
  if (atual.value === 'conteudo') {
    const precisaConteudo = ['analise', 'academico', 'livro', 'dado'].includes(tipo.value);
    if (precisaConteudo && (!form.conteudo || !form.conteudo.trim())) return 'O conteúdo é obrigatório para este tipo.';
  }
  return null;
}

async function proximo() {
  const falta = validarAtual();
  if (falta) { erro.value = falta; return; }
  erro.value = '';
  if (!(await salvar())) return;
  if (atual.value === 'taxonomia') await carregarAnexos(); // pré-carrega p/ o passo Mídia
  step.value = Math.min(step.value + 1, STEPS.length - 1);
}
function anterior() { step.value = Math.max(step.value - 1, 1); }

async function carregarAnexos() {
  try {
    const { data } = await api.get(`/api/admin/postagens/${draftId.value}`);
    anexos.value = data.data.anexos || [];
  } catch { /* silencioso */ }
}
async function removerAnexo(id) {
  try { await api.delete(`/api/admin/anexos/${id}`); await carregarAnexos(); toast.success('Anexo removido.'); }
  catch (e) { toast.error(errorMessage(e)); }
}
async function subirAnexo({ file, tipo }) {
  if (file.size > MAX_UPLOAD_BYTES) {
    toast.error(`Arquivo muito grande (${formatBytes(file.size)}). Limite: 2 GB.`);
    return;
  }
  subindo.value = true; progresso.value = 0; nomeAtual.value = file.name;
  try {
    // 1) presign (cria a linha em anexos) → 2) PUT direto no R2 (com progresso).
    const { data } = await api.post(`/api/admin/postagens/${draftId.value}/anexos/presign`,
      { fileName: file.name, fileType: file.type, fileSize: file.size, tipo });
    await uploadToR2(data.data.uploadUrl, file, { onProgress: (p) => { progresso.value = p; } });
    await carregarAnexos();
    toast.success('Arquivo enviado.');
  } catch (e) { toast.error(errorMessage(e)); }
  finally { subindo.value = false; nomeAtual.value = ''; }
}

async function publicar() {
  const faltam = [];
  if (!form.titulo || !form.titulo.trim()) faltam.push('Título');
  if (!form.resumo || !form.resumo.trim()) faltam.push('Resumo');

  const precisaConteudo = ['analise', 'academico', 'livro', 'dado'].includes(tipo.value);
  if (precisaConteudo && (!form.conteudo || !form.conteudo.trim())) faltam.push('Conteúdo');

  const temMedia = (t) => anexos.value.some(a => a.tipo === t);
  if (tipo.value === 'podcast' && !sub.embed_url && !temMedia('audio') && !temMedia('video')) {
    faltam.push('Mídia (URL ou Upload)');
  }
  if (tipo.value === 'video' && !sub.embed_url && !temMedia('video')) {
    faltam.push('Vídeo (URL ou Upload)');
  }

  if (faltam.length > 0) {
    erro.value = 'Campos obrigatórios para publicar: ' + faltam.join(', ') + '.';
    toast.error('Preencha os dados pendentes antes de publicar.');
    if (!form.titulo || !form.resumo) step.value = STEPS.findIndex(s => s.key === 'identidade');
    else if (precisaConteudo && !form.conteudo) step.value = STEPS.findIndex(s => s.key === 'conteudo');
    else step.value = STEPS.findIndex(s => s.key === 'midia');
    return;
  }

  if (!(await salvar())) return;
  publishing.value = true; erro.value = '';
  try {
    const { data } = await api.put(`/api/admin/postagens/${draftId.value}/publicar`);
    toast.success('Publicado!');
    router.push(`/postagem/${data.data.slug}`);
  } catch (e) { erro.value = errorMessage(e); toast.error(erro.value); }
  finally { publishing.value = false; }
}

// autosave com debounce em edições
let t = null;
watch([form, sub], () => {
  if (!draftId.value) return;
  lastSaved.value = false;
  clearTimeout(t);
  t = setTimeout(salvar, 1200);
}, { deep: true });
onBeforeUnmount(() => clearTimeout(t));
</script>

<style scoped>
.wizard { max-width: 760px; margin: 0 auto; padding: 1rem 0.5rem 3rem; }
.steps { display: flex; flex-wrap: wrap; gap: 0.4rem; list-style: none; padding: 0; margin: 0 0 1.5rem; }
.steps li { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-muted); padding: 4px 10px; border-radius: 999px; }
.steps li .num { display: inline-flex; width: 20px; height: 20px; border-radius: 50%; background: var(--bg-hover); align-items: center; justify-content: center; font-weight: 700; }
.steps li.active { color: var(--brand-primary); font-weight: 700; }
.steps li.active .num, .steps li.done .num { background: var(--brand-primary); color: #fff; }
.painel { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 1.75rem; }
.painel-head { margin: 0 0 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); }
.painel-head .tipo-chip { display: inline-block; background: rgba(47,84,235,0.12); color: var(--brand-primary); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; padding: 3px 10px; border-radius: 999px; margin-bottom: 0.5rem; }
.painel-head h2 { font-size: 1.2rem; font-weight: 800; color: var(--text-main); margin: 0; }
.painel-head h2 small { font-weight: 500; color: var(--text-muted); font-size: 0.8rem; }
.hint { color: var(--text-muted); font-size: 0.82rem; margin: 0.4rem 0 0; }
:deep(.req), .req { color: var(--sys-danger); margin-left: 2px; font-style: normal; }
.wz-erro { color: var(--sys-danger); display: flex; align-items: center; gap: 6px; margin: 1rem 0 0; font-size: 0.9rem; }
.acoes { display: flex; align-items: center; gap: 0.75rem; margin-top: 1.75rem; }
.acoes .saved { margin-left: auto; font-size: 0.78rem; color: var(--text-muted); }
.btn { background: var(--brand-primary); color: #fff; border: none; padding: 9px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.btn.ghost { background: var(--bg-hover); color: var(--text-main); }
.btn.primary { min-width: 120px; justify-content: center; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.spinner { width: 18px; height: 18px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* estilos de campo compartilhados com os Fields* filhos */
:deep(.wz-field) { display: flex; flex-direction: column; gap: 5px; margin-bottom: 1rem; }
:deep(.wz-field > span) { font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); }
:deep(.wz-input) { width: 100%; padding: 0.65rem 0.8rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-input-form); color: var(--text-main); font-size: 0.95rem; font-family: inherit; }
:deep(.wz-input:focus) { outline: none; border-color: var(--brand-primary); }
:deep(.wz-input.mono) { font-family: ui-monospace, monospace; font-size: 0.88rem; }

@media (max-width: 640px) {
  .wizard { padding: 0.75rem 0.75rem 3rem; }
  .steps { gap: 0.25rem; overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; scrollbar-width: none; padding-bottom: 4px; }
  .steps::-webkit-scrollbar { display: none; }
  .steps li { flex: 0 0 auto; font-size: 0.72rem; padding: 4px 8px; }
  .painel { padding: 1.1rem; border-radius: 12px; }
  .painel-head h2 { font-size: 1.05rem; }
  .acoes { flex-wrap: wrap; gap: 0.5rem; position: sticky; bottom: 0; background: var(--bg-card); padding-top: 0.75rem; margin-top: 1.25rem; }
  .acoes .saved { order: -1; width: 100%; margin: 0 0 0.25rem; }
  .acoes .btn { flex: 1 1 40%; justify-content: center; }
}
</style>
