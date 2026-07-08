<template>
  <div class="conta-page">
    <header class="conta-header">
      <div class="conta-actions">
        <button class="btn btn-ghost" @click="router.push('/')"><Icon icon="mdi:arrow-left" /> Voltar ao Início</button>
      </div>
      <h1><Icon icon="mdi:account-circle-outline" /> Minha Conta</h1>
      <p v-if="me">{{ me.email }} · <span class="badge">{{ papelLabel }}</span></p>
    </header>

    <div v-if="!auth.state.carregado" class="loading">Carregando…</div>

    <div v-else-if="me" class="cards">
      <!-- Foto de perfil -->
      <section class="card avatar-card">
        <div class="avatar-preview">
          <img v-if="me.avatar_url" :src="me.avatar_url" alt="Foto de perfil" />
          <div v-else class="avatar-ph">{{ (me.nome || me.email || '?').charAt(0).toUpperCase() }}</div>
        </div>
        <div class="avatar-actions">
          <h2>Foto de perfil</h2>
          <p class="hint">JPG/PNG/WebP até 2 MB.</p>
          <div class="avatar-btns">
            <label class="btn">
              <Icon icon="mdi:camera-outline" /> {{ subindoAvatar ? 'Enviando…' : 'Enviar foto' }}
              <input type="file" accept="image/*" hidden :disabled="subindoAvatar" @change="escolherAvatar" />
            </label>
            <button v-if="me.avatar_url" class="btn btn-ghost" :disabled="subindoAvatar" @click="removerAvatar">Remover</button>
          </div>
          <UploadProgress v-if="subindoAvatar" :percent="progressoAvatar" label="Enviando foto…" class="av-prog" />
        </div>
      </section>

      <!-- Perfil -->
      <section class="card">
        <h2>Perfil</h2>
        <label class="fld"><span>Nome</span>
          <input v-model="nome" type="text" maxlength="120" placeholder="Seu nome" />
        </label>
        <button class="btn" :disabled="busy.perfil" @click="salvarNome">Salvar nome</button>
      </section>

      <!-- Senha -->
      <section class="card">
        <h2>Senha</h2>
        <label class="fld"><span>Senha atual</span>
          <input v-model="pw.atual" type="password" autocomplete="current-password" />
        </label>
        <label class="fld"><span>Nova senha (mín. 10)</span>
          <input v-model="pw.nova" type="password" autocomplete="new-password" />
        </label>
        <button class="btn" :disabled="busy.senha" @click="trocarSenha">Trocar senha</button>
        <p class="hint">Trocar a senha encerra as sessões nos outros dispositivos.</p>
      </section>

      <!-- E-mail -->
      <section class="card">
        <h2>E-mail</h2>
        <p v-if="me.email_pendente" class="pendente">
          <Icon icon="mdi:clock-alert-outline" /> Troca pendente para <strong>{{ me.email_pendente }}</strong> — confirme no e-mail enviado.
        </p>
        <label class="fld"><span>Novo e-mail</span>
          <input v-model="email.novo" type="email" placeholder="novo@email.com" />
        </label>
        <label class="fld"><span>Senha atual</span>
          <input v-model="email.senha" type="password" autocomplete="current-password" />
        </label>
        <button class="btn" :disabled="busy.email" @click="trocarEmail">Solicitar troca</button>
      </section>

      <!-- 2FA (só admin) -->
      <section v-if="me.tipo === 'admin'" class="card">
        <h2>Verificação em duas etapas (2FA)</h2>

        <template v-if="dois.view === 'status'">
          <p v-if="me.totp_enabled" class="ok-2fa"><Icon icon="mdi:shield-check" /> 2FA está <strong>ativo</strong> nesta conta.</p>
          <p v-else class="hint">Proteja sua conta exigindo um código do app autenticador (Google Authenticator, Authy…) no login.</p>
          <button v-if="!me.totp_enabled" class="btn" :disabled="dois.busy" @click="setup2fa"><Icon icon="mdi:shield-plus-outline" /> Ativar 2FA</button>
          <template v-else>
            <label class="fld"><span>Senha atual (para desativar)</span>
              <input v-model="dois.senha" type="password" autocomplete="current-password" />
            </label>
            <button class="btn btn-danger" :disabled="dois.busy" @click="disable2fa">Desativar 2FA</button>
          </template>
        </template>

        <template v-else-if="dois.view === 'setup'">
          <p class="hint">Escaneie o QR no app autenticador e digite o código gerado.</p>
          <img v-if="dois.qr" :src="dois.qr" alt="QR code 2FA" class="qr" />
          <p class="secret">Ou insira a chave manualmente: <code>{{ dois.secret }}</code></p>
          <label class="fld"><span>Código de 6 dígitos</span>
            <input v-model="dois.code" inputmode="numeric" maxlength="6" placeholder="123456" />
          </label>
          <div class="two-btns">
            <button class="btn" :disabled="dois.busy" @click="enable2fa">Confirmar e ativar</button>
            <button class="btn btn-ghost" @click="dois.view = 'status'">Cancelar</button>
          </div>
        </template>

        <template v-else-if="dois.view === 'recovery'">
          <p class="ok-2fa"><Icon icon="mdi:check-circle-outline" /> 2FA ativado! Guarde estes códigos de recuperação — <strong>só aparecem agora</strong>:</p>
          <ul class="recovery"><li v-for="c in dois.recovery" :key="c">{{ c }}</li></ul>
          <button class="btn" @click="fecharRecovery">Concluir</button>
        </template>
      </section>

      <!-- Sessões / perigo -->
      <section class="card">
        <h2>Sessões</h2>
        <button class="btn btn-ghost" :disabled="busy.logoutAll" @click="sairTodos">
          <Icon icon="mdi:logout-variant" /> Sair de todos os dispositivos
        </button>
        <template v-if="me.tipo === 'user'">
          <h2 class="danger-title">Zona de perigo</h2>
          <button class="btn btn-danger" @click="confirmarExclusao = true">Excluir minha conta</button>
        </template>
      </section>
    </div>

    <!-- modal exclusão -->
    <div v-if="confirmarExclusao" class="modal-overlay" @click.self="confirmarExclusao = false">
      <div class="modal">
        <h3>Excluir conta</h3>
        <p>Ação irreversível. Seus dados serão anonimizados. Digite sua senha para confirmar.</p>
        <input v-model="exclusaoSenha" type="password" placeholder="Senha" class="fld-input" />
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="confirmarExclusao = false">Cancelar</button>
          <button class="btn btn-danger" :disabled="busy.excluir" @click="excluirConta">Excluir</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import api, { errorMessage } from '@/services/api';
import { useAuth } from '@/composables/useAuth';
import { useToast } from '@/composables/useToast';
import { uploadToR2 } from '@/utils/uploadR2.js';
import UploadProgress from '@/components/UploadProgress.vue';

const auth = useAuth();
const toast = useToast();
const router = useRouter();

const me = computed(() => auth.state.me);
const papelLabel = computed(() =>
  me.value?.tipo === 'admin' ? (me.value.role === 'superadmin' ? 'Superadmin' : 'Editor') : 'Usuário');

const nome = ref('');
const pw = reactive({ atual: '', nova: '' });
const email = reactive({ novo: '', senha: '' });
const busy = reactive({ perfil: false, senha: false, email: false, logoutAll: false, excluir: false });
const confirmarExclusao = ref(false);
const exclusaoSenha = ref('');
const subindoAvatar = ref(false);
const progressoAvatar = ref(0);

async function escolherAvatar(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast.error('A imagem excede 2 MB.'); return; }
  subindoAvatar.value = true; progressoAvatar.value = 0;
  try {
    const { data } = await api.post('/api/me/avatar/presign', { fileName: file.name, fileType: file.type, fileSize: file.size });
    await uploadToR2(data.data.uploadUrl, file, { onProgress: (p) => { progressoAvatar.value = p; } });
    await api.put('/api/me/avatar', { anexoId: data.data.anexoId });
    await auth.fetchMe();
    toast.success('Foto atualizada.');
  } catch (err) { toast.error(errorMessage(err)); }
  finally { subindoAvatar.value = false; }
}
async function removerAvatar() {
  try { await api.delete('/api/me/avatar'); await auth.fetchMe(); toast.success('Foto removida.'); }
  catch (e) { toast.error(errorMessage(e)); }
}

// ── 2FA (admin) ──────────────────────────────────────────────────────
const dois = reactive({ view: 'status', busy: false, qr: '', secret: '', code: '', senha: '', recovery: [] });
async function setup2fa() {
  dois.busy = true;
  try { const { data } = await api.post('/api/admin/2fa/setup'); dois.qr = data.data.qr; dois.secret = data.data.secret; dois.code = ''; dois.view = 'setup'; }
  catch (e) { toast.error(errorMessage(e)); }
  finally { dois.busy = false; }
}
async function enable2fa() {
  dois.busy = true;
  try {
    const { data } = await api.post('/api/admin/2fa/enable', { code: dois.code });
    dois.recovery = data.data.recovery; dois.view = 'recovery';
    await auth.fetchMe();
  } catch (e) { toast.error(errorMessage(e)); }
  finally { dois.busy = false; }
}
function fecharRecovery() { dois.view = 'status'; dois.recovery = []; dois.qr = ''; dois.secret = ''; dois.code = ''; }
async function disable2fa() {
  dois.busy = true;
  try { await api.post('/api/admin/2fa/disable', { senha: dois.senha }); dois.senha = ''; await auth.fetchMe(); toast.success('2FA desativado.'); }
  catch (e) { toast.error(errorMessage(e)); }
  finally { dois.busy = false; }
}

onMounted(async () => {
  if (!auth.state.carregado) await auth.fetchMe();
  nome.value = me.value?.nome || '';
});

async function salvarNome() {
  busy.perfil = true;
  try { await api.put('/api/me', { nome: nome.value }); await auth.fetchMe(); toast.success('Nome atualizado.'); }
  catch (e) { toast.error(errorMessage(e)); }
  finally { busy.perfil = false; }
}
async function trocarSenha() {
  busy.senha = true;
  try {
    await api.put('/api/me/senha', { senhaAtual: pw.atual, novaSenha: pw.nova });
    pw.atual = ''; pw.nova = '';
    toast.success('Senha trocada. Outras sessões foram encerradas.');
  } catch (e) { toast.error(errorMessage(e)); }
  finally { busy.senha = false; }
}
async function trocarEmail() {
  busy.email = true;
  try {
    await api.put('/api/me/email', { novoEmail: email.novo, senhaAtual: email.senha });
    email.novo = ''; email.senha = '';
    await auth.fetchMe();
    toast.success('Confirme no e-mail enviado ao novo endereço.');
  } catch (e) { toast.error(errorMessage(e)); }
  finally { busy.email = false; }
}
async function sairTodos() {
  busy.logoutAll = true;
  try { await api.post('/api/me/logout-all'); auth.limparSessao(); router.push('/'); }
  catch (e) { toast.error(errorMessage(e)); }
  finally { busy.logoutAll = false; }
}
async function excluirConta() {
  busy.excluir = true;
  try {
    await api.delete('/api/me', { data: { senha: exclusaoSenha.value } });
    auth.limparSessao();
    toast.success('Conta excluída.');
    router.push({ name: 'Home' });
  } catch (e) { toast.error(errorMessage(e)); }
  finally { busy.excluir = false; confirmarExclusao.value = false; }
}
</script>

<style scoped>
.conta-page { max-width: 720px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
.conta-actions { margin-bottom: 1.5rem; }
.conta-header h1 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.6rem; font-weight: 800; color: var(--text-main); }
.conta-header p { color: var(--text-secondary); margin-top: 0.25rem; }
.badge { background: var(--bg-hover); color: var(--brand-primary); padding: 2px 10px; border-radius: 999px; font-size: 0.78rem; font-weight: 700; }
.cards { display: flex; flex-direction: column; gap: 1.25rem; margin-top: 1.5rem; }
.card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; }
.card h2 { font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin: 0 0 1rem; }
.fld { display: flex; flex-direction: column; gap: 4px; margin-bottom: 1rem; }
.fld span { font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); }
.fld input, .fld-input { padding: 9px 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-input-form); color: var(--text-main); font-size: 0.9rem; }
.fld input:focus, .fld-input:focus { outline: none; border-color: var(--brand-primary); }
.btn { background: var(--brand-primary); color: #fff; border: none; padding: 9px 18px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost { background: var(--bg-hover); color: var(--text-main); }
.btn-danger { background: var(--sys-danger); }
.hint { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.5rem; }
.pendente { background: var(--bg-hover); border-radius: 8px; padding: 0.6rem 0.8rem; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; display: flex; align-items: center; gap: 6px; }
.danger-title { margin-top: 1.5rem; color: var(--sys-danger); }
.loading { padding: 3rem; text-align: center; color: var(--text-muted); }
.avatar-card { display: flex; align-items: center; gap: 1.5rem; }
.avatar-preview { width: 84px; height: 84px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: var(--bg-hover); display: flex; align-items: center; justify-content: center; }
.avatar-preview img { width: 100%; height: 100%; object-fit: cover; }
.avatar-ph { font-size: 2rem; font-weight: 800; color: var(--brand-primary); }
.avatar-actions h2 { margin: 0 0 0.15rem; }
.avatar-btns { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
.avatar-card .btn { cursor: pointer; }
.ok-2fa { display: flex; align-items: center; gap: 0.5rem; color: var(--text-main); margin: 0 0 1rem; }
.qr { display: block; width: 180px; height: 180px; border-radius: 8px; background: #fff; padding: 8px; margin: 0.5rem 0; }
.secret { font-size: 0.85rem; color: var(--text-secondary); margin: 0.25rem 0 1rem; }
.secret code { background: var(--bg-hover); padding: 2px 6px; border-radius: 4px; color: var(--text-main); word-break: break-all; }
.two-btns { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.recovery { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.4rem; list-style: none; padding: 0; margin: 0 0 1rem; }
.recovery li { font-family: ui-monospace, monospace; background: var(--bg-hover); padding: 6px 10px; border-radius: 6px; color: var(--text-main); font-size: 0.9rem; text-align: center; }
.modal-overlay { position: fixed; inset: 0; background: var(--overlay-color); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 1rem; }
.modal { background: var(--bg-card); border-radius: 12px; padding: 1.75rem; max-width: 420px; width: 100%; }
.modal h3 { margin: 0 0 0.75rem; color: var(--text-main); }
.modal p { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem; }
.modal .fld-input { width: 100%; margin-bottom: 1rem; }
.modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
</style>
