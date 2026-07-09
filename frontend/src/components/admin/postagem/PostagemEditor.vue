<template>
  <div class="editor">
    <!-- Busca / seleção -->
    <div v-if="!sel" class="picker">
      <h2>Editar publicação</h2>
      <div class="busca-bar">
        <Icon icon="mdi:magnify" class="busca-icon" />
        <input class="wz-input busca-input" v-model="busca" placeholder="Buscar por título, resumo…" autofocus />
        <span v-if="carregando" class="busca-spin"></span>
        <button v-else-if="busca" class="busca-x" @click="limparBusca" aria-label="Limpar"><Icon icon="mdi:close" /></button>
      </div>
      <ul v-if="resultados.length" class="res">
        <li v-for="r in resultados" :key="r.id" @click="abrir(r.id)">
          <span class="res-tipo">{{ r.tipo }}</span>
          <span class="res-tit">{{ r.titulo || '(sem título)' }}</span>
          <span class="res-status" :class="r.status">{{ r.status }}</span>
        </li>
      </ul>
      <p v-else-if="buscou && !carregando && busca.trim()" class="vazio">Nenhuma publicação encontrada.</p>
      <p v-else-if="!busca.trim()" class="vazio dica">Digite para buscar entre as publicações.</p>
    </div>

    <!-- Formulário morph -->
    <div v-else class="form-morph">
      <div class="topo">
        <button class="btn ghost" @click="fechar"><Icon icon="mdi:arrow-left" /> Trocar</button>
        <span class="tipo-fixo">Tipo: <strong>{{ tipo }}</strong> <em>(imutável)</em></span>
        <span class="saved" v-if="lastSaved">salvo</span>
      </div>

      <nav class="abas">
        <button v-for="a in ABAS" :key="a.key" :class="{ active: aba === a.key }" @click="aba = a.key">{{ a.label }}</button>
      </nav>

      <div class="painel">
        <FieldsIdentidade v-show="aba === 'identidade'" />
        <FieldsEspecifico v-show="aba === 'especifico'" :tipo="tipo" />
        <FieldsTaxonomia v-show="aba === 'taxonomia'" />
        <div v-show="aba === 'conteudo'">
          <label class="wz-field"><span>Conteúdo (HTML)</span>
            <textarea class="wz-input mono" rows="14" v-model="form.conteudo"></textarea>
          </label>
        </div>
        <FieldsMidia v-show="aba === 'midia'" :anexos="anexos" :subindo="subindo" :progresso="progresso" :nome-atual="nomeAtual" @remover="removerAnexo" @upload="subirAnexo" />
        <FieldsPublicacao v-show="aba === 'config'" :tipo="tipo" />
      </div>

      <p v-if="erro" class="wz-erro"><Icon icon="mdi:alert-circle" /> {{ erro }}</p>

      <div class="acoes">
        <button class="btn" :disabled="saving" @click="salvar"><Icon icon="mdi:content-save-outline" /> Salvar</button>
        <button class="btn ghost" :disabled="publishing" @click="publicar"><Icon icon="mdi:earth" /> Publicar</button>
        <button class="btn ghost" @click="arquivar"><Icon icon="mdi:archive-outline" /> Arquivar</button>
        <button class="btn danger" @click="deletar"><Icon icon="mdi:trash-can-outline" /> Excluir</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, provide, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';
import api, { errorMessage } from '@/services/api';
import { useToast } from '@/composables/useToast';
import { uploadToR2, MAX_UPLOAD_BYTES, formatBytes } from '@/utils/uploadR2.js';
import FieldsIdentidade from './FieldsIdentidade.vue';
import FieldsEspecifico from './FieldsEspecifico.vue';
import FieldsTaxonomia from './FieldsTaxonomia.vue';
import FieldsMidia from './FieldsMidia.vue';
import FieldsPublicacao from './FieldsPublicacao.vue';

const router = useRouter();
const route = useRoute();
const toast = useToast();

const ABAS = [
  { key: 'identidade', label: 'Identidade' },
  { key: 'especifico', label: 'Específico' },
  { key: 'taxonomia', label: 'Taxonomia' },
  { key: 'conteudo', label: 'Conteúdo' },
  { key: 'midia', label: 'Mídia' },
  { key: 'config', label: 'Config' },
];

const busca = ref('');
const buscou = ref(false);
const resultados = ref([]);
const carregando = ref(false);
const sel = ref(null);
const tipo = ref('');
const aba = ref('identidade');
const saving = ref(false);
const publishing = ref(false);
const subindo = ref(false);
const progresso = ref(0);
const nomeAtual = ref('');
const lastSaved = ref(false);
const erro = ref('');
const anexos = ref([]);

const form = reactive({
  titulo: '', subtitulo: '', resumo: '', conteudo: '',
  destaque: false, is_crisp: false, periodo_estudo: '', nacionalidade: '',
  with_header: false, with_footer: false,
  categorias: [], tags: [], autores: [], fontes: [], ufs: [], municipios: [],
});
const sub = reactive({});
provide('wizForm', form);
provide('wizSub', sub);

let seq = 0;
async function buscar() {
  const meu = ++seq;
  const termo = busca.value.trim();
  carregando.value = true; buscou.value = true;
  try {
    // termo vazio → lista as mais recentes (útil ao abrir a tela).
    const params = termo ? { q: termo, limit: 50 } : { limit: 30 };
    const { data } = await api.get('/api/admin/postagens', { params });
    if (meu === seq) resultados.value = data.data.itens; // ignora respostas fora de ordem
  } catch (e) { if (meu === seq) toast.error(errorMessage(e)); }
  finally { if (meu === seq) carregando.value = false; }
}

// Busca ao vivo com debounce — sem depender de botão.
let debounce = null;
watch(busca, () => {
  clearTimeout(debounce);
  debounce = setTimeout(buscar, 250);
});
function limparBusca() { busca.value = ''; }

onMounted(() => {
  // Deep-link vindo da lista de rascunhos (?id=123) → abre direto no editor.
  const id = parseInt(route.query.id, 10);
  if (Number.isInteger(id)) abrir(id);
  else buscar(); // senão, pré-carrega recentes
});
onBeforeUnmount(() => clearTimeout(debounce));

const nomes = (arr) => (arr || []).map((x) => x.nome);

async function abrir(id) {
  try {
    const { data } = await api.get(`/api/admin/postagens/${id}`);
    const p = data.data;
    tipo.value = p.tipo;
    Object.assign(form, {
      titulo: p.titulo || '', subtitulo: p.subtitulo || '', resumo: p.resumo || '', conteudo: p.conteudo || '',
      destaque: !!p.destaque, is_crisp: !!p.is_crisp, periodo_estudo: p.periodo_estudo || '', nacionalidade: p.nacionalidade || '',
      with_header: !!p.with_header, with_footer: !!p.with_footer,
      categorias: nomes(p.categorias), tags: nomes(p.tags), autores: nomes(p.autores),
      fontes: nomes(p.fontes), ufs: p.ufs || [], municipios: nomes(p.municipios),
    });
    for (const k of Object.keys(sub)) delete sub[k];
    for (const [k, v] of Object.entries(p.subtipo || {})) if (v != null) sub[k] = v;
    anexos.value = p.anexos || [];
    sel.value = id;
    aba.value = 'identidade';
  } catch (e) { toast.error(errorMessage(e)); }
}

function fechar() { sel.value = null; resultados.value = []; busca.value = ''; buscou.value = false; }

function patchBody() {
  const b = {};
  if (form.titulo?.trim()) b.titulo = form.titulo;
  for (const k of ['subtitulo', 'resumo', 'conteudo', 'periodo_estudo', 'nacionalidade']) b[k] = form[k];
  for (const k of ['destaque', 'is_crisp', 'with_header', 'with_footer']) b[k] = form[k];
  for (const k of ['categorias', 'tags', 'autores', 'fontes', 'ufs', 'municipios']) b[k] = form[k];
  const s = {};
  for (const [k, v] of Object.entries(sub)) if (v !== '' && v != null) s[k] = v;
  b.subtipo = s;
  return b;
}

async function salvar() {
  saving.value = true; erro.value = '';
  try { await api.patch(`/api/admin/postagens/${sel.value}`, patchBody()); lastSaved.value = true; toast.success('Salvo.'); return true; }
  catch (e) { erro.value = errorMessage(e); toast.error(erro.value); return false; }
  finally { saving.value = false; }
}
async function publicar() {
  if (!(await salvar())) return;
  publishing.value = true;
  try { const { data } = await api.put(`/api/admin/postagens/${sel.value}/publicar`); toast.success('Publicado.'); router.push(`/postagem/${data.data.slug}`); }
  catch (e) { erro.value = errorMessage(e); toast.error(erro.value); }
  finally { publishing.value = false; }
}
async function arquivar() {
  try { await api.put(`/api/admin/postagens/${sel.value}/arquivar`); toast.success('Arquivado.'); fechar(); }
  catch (e) { toast.error(errorMessage(e)); }
}
async function deletar() {
  if (!confirm('Excluir esta publicação?')) return;
  try { await api.delete(`/api/admin/postagens/${sel.value}`); toast.success('Excluído.'); fechar(); }
  catch (e) { toast.error(errorMessage(e)); }
}
async function recarregarAnexos() {
  try { const { data } = await api.get(`/api/admin/postagens/${sel.value}`); anexos.value = data.data.anexos || []; } catch { /* */ }
}
async function removerAnexo(id) {
  try { await api.delete(`/api/admin/anexos/${id}`); await recarregarAnexos(); toast.success('Anexo removido.'); }
  catch (e) { toast.error(errorMessage(e)); }
}
async function subirAnexo({ file, tipo: t }) {
  if (file.size > MAX_UPLOAD_BYTES) {
    toast.error(`Arquivo muito grande (${formatBytes(file.size)}). Limite: 2 GB.`);
    return;
  }
  subindo.value = true; progresso.value = 0; nomeAtual.value = file.name;
  try {
    const { data } = await api.post(`/api/admin/postagens/${sel.value}/anexos/presign`,
      { fileName: file.name, fileType: file.type, fileSize: file.size, tipo: t });
    await uploadToR2(data.data.uploadUrl, file, { onProgress: (p) => { progresso.value = p; } });
    await recarregarAnexos();
    toast.success('Arquivo enviado.');
  } catch (e) { toast.error(errorMessage(e)); }
  finally { subindo.value = false; nomeAtual.value = ''; }
}
</script>

<style scoped>
.editor { max-width: 760px; margin: 0 auto; padding: 1rem 0.5rem 3rem; }
.picker h2 { font-size: 1.4rem; font-weight: 800; color: var(--text-main); margin: 0 0 1rem; }
.busca-bar { position: relative; display: flex; align-items: center; margin-bottom: 1rem; }
.busca-icon { position: absolute; left: 0.85rem; color: var(--text-muted); font-size: 1.1rem; pointer-events: none; }
.busca-input { padding-left: 2.4rem !important; padding-right: 2.4rem !important; }
.busca-x { position: absolute; right: 0.6rem; background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; padding: 4px; }
.busca-x:hover { color: var(--brand-primary); }
.busca-spin { position: absolute; right: 0.75rem; width: 16px; height: 16px; border: 2px solid var(--border-color); border-top-color: var(--brand-primary); border-radius: 50%; animation: bspin 0.7s linear infinite; }
@keyframes bspin { to { transform: rotate(360deg); } }
.vazio.dica { font-size: 0.88rem; }
.res { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.res li { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.8rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-card); cursor: pointer; }
.res li:hover { border-color: var(--brand-primary); }
.res-tipo { font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; min-width: 74px; }
.res-tit { flex: 1; color: var(--text-main); font-weight: 600; }
.res-status { font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; background: var(--bg-hover); color: var(--text-secondary); }
.res-status.publicado { background: rgba(46,160,67,0.15); color: #2ea043; }
.vazio { color: var(--text-muted); }
.topo { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
.tipo-fixo { color: var(--text-secondary); font-size: 0.9rem; }
.tipo-fixo em { color: var(--text-muted); }
.topo .saved { margin-left: auto; font-size: 0.78rem; color: var(--text-muted); }
.abas { display: flex; flex-wrap: wrap; gap: 0.3rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1.25rem; }
.abas button { background: none; border: none; padding: 0.55rem 0.9rem; font-weight: 600; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; }
.abas button.active { color: var(--brand-primary); border-bottom-color: var(--brand-primary); }
.painel { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 1.75rem; }
.wz-erro { color: var(--sys-danger); display: flex; align-items: center; gap: 6px; margin: 1rem 0 0; font-size: 0.9rem; }
.acoes { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1.5rem; }
.btn { background: var(--brand-primary); color: #fff; border: none; padding: 9px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.btn.ghost { background: var(--bg-hover); color: var(--text-main); }
.btn.danger { background: var(--sys-danger); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

:deep(.wz-field) { display: flex; flex-direction: column; gap: 5px; margin-bottom: 1rem; }
:deep(.wz-field > span) { font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); }
:deep(.wz-input) { width: 100%; padding: 0.65rem 0.8rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-input-form); color: var(--text-main); font-size: 0.95rem; font-family: inherit; }
:deep(.wz-input:focus) { outline: none; border-color: var(--brand-primary); }
:deep(.wz-input.mono) { font-family: ui-monospace, monospace; font-size: 0.88rem; }

@media (max-width: 640px) {
  .editor { padding: 0.75rem 0.75rem 4rem; }
  .picker h2 { font-size: 1.2rem; }
  .topo { flex-wrap: wrap; gap: 0.5rem; }
  .tipo-fixo { font-size: 0.82rem; width: 100%; order: 3; }
  .topo .saved { margin-left: auto; }
  .abas { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .abas::-webkit-scrollbar { display: none; }
  .abas button { flex: 0 0 auto; padding: 0.55rem 0.7rem; font-size: 0.9rem; }
  .painel { padding: 1.1rem; border-radius: 12px; }
  .acoes { position: sticky; bottom: 0; background: var(--bg-body); padding: 0.75rem 0; margin-top: 1rem; border-top: 1px solid var(--border-color); }
  .acoes .btn { flex: 1 1 45%; justify-content: center; }
  .res-tipo { min-width: 58px; font-size: 0.62rem; }
}
</style>
