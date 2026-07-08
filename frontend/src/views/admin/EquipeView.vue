<template>
  <div class="equipe">
    <header>
      <h1><Icon icon="mdi:account-group-outline" /> Equipe e Usuários</h1>
      <p v-if="!podeGerir" class="ro">Somente leitura — apenas superadmins gerenciam contas.</p>
    </header>

    <div class="tabs">
      <button :class="{ active: aba === 'admins' }" @click="aba = 'admins'">Administradores</button>
      <button :class="{ active: aba === 'usuarios' }" @click="aba = 'usuarios'">Usuários</button>
    </div>

    <!-- ADMINS -->
    <section v-if="aba === 'admins'">
      <button v-if="podeGerir" class="btn add" @click="novoAdmin = true"><Icon icon="mdi:plus" /> Novo admin</button>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Ativo</th><th>Último login</th><th v-if="podeGerir"></th></tr></thead>
          <tbody>
            <tr v-for="a in admins" :key="a.id">
              <td>{{ a.nome }}</td><td>{{ a.email }}</td>
              <td><span class="badge" :class="a.role">{{ a.role }}</span></td>
              <td>{{ a.is_active ? 'sim' : 'não' }}</td>
              <td class="muted">{{ fmt(a.ultimo_login) }}</td>
              <td v-if="podeGerir" class="acts">
                <select :value="a.role" @change="mudarRole(a, $event.target.value)">
                  <option value="editor">editor</option>
                  <option value="superadmin">superadmin</option>
                </select>
                <button class="mini" @click="toggleAtivo('admins', a)">{{ a.is_active ? 'Desativar' : 'Ativar' }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- USUÁRIOS -->
    <section v-else>
      <input v-model="buscaUser" class="busca" placeholder="Buscar por nome/e-mail…" @keyup.enter="carregarUsuarios" />
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Verificado</th><th>Ativo</th><th>Criado</th><th v-if="podeGerir"></th></tr></thead>
          <tbody>
            <tr v-for="u in usuarios" :key="u.id">
              <td>{{ u.nome || '—' }}</td><td>{{ u.email }}</td>
              <td>{{ u.email_verificado ? 'sim' : 'não' }}</td>
              <td>{{ u.is_active ? 'sim' : 'não' }}</td>
              <td class="muted">{{ fmt(u.created_at) }}</td>
              <td v-if="podeGerir" class="acts">
                <button class="mini" @click="toggleAtivo('usuarios', u)">{{ u.is_active ? 'Desativar' : 'Ativar' }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- modal novo admin -->
    <div v-if="novoAdmin" class="modal-overlay" @click.self="novoAdmin = false">
      <div class="modal">
        <h3>Novo administrador</h3>
        <p>Um convite é enviado por e-mail para definir a senha.</p>
        <input v-model="form.nome" placeholder="Nome" class="mfld" />
        <input v-model="form.email" type="email" placeholder="e-mail" class="mfld" />
        <select v-model="form.role" class="mfld"><option value="editor">editor</option><option value="superadmin">superadmin</option></select>
        <div class="modal-actions">
          <button class="btn ghost" @click="novoAdmin = false">Cancelar</button>
          <button class="btn" :disabled="criando" @click="criarAdmin">Criar e convidar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { Icon } from '@iconify/vue';
import api, { errorMessage } from '@/services/api';
import { useAuth } from '@/composables/useAuth';
import { useToast } from '@/composables/useToast';

const auth = useAuth();
const toast = useToast();
const podeGerir = computed(() => auth.isSuperadmin.value);

const aba = ref('admins');
const admins = ref([]);
const usuarios = ref([]);
const buscaUser = ref('');
const novoAdmin = ref(false);
const criando = ref(false);
const form = reactive({ nome: '', email: '', role: 'editor' });

const fmt = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

async function carregarAdmins() {
  try { admins.value = (await api.get('/api/admin/admins')).data.data.itens; }
  catch (e) { toast.error(errorMessage(e)); }
}
async function carregarUsuarios() {
  try {
    const params = buscaUser.value ? { q: buscaUser.value } : {};
    usuarios.value = (await api.get('/api/admin/usuarios', { params })).data.data.itens;
  } catch (e) { toast.error(errorMessage(e)); }
}
async function mudarRole(a, role) {
  if (role === a.role) return;
  try { await api.patch(`/api/admin/admins/${a.id}`, { role }); toast.success('Papel atualizado.'); await carregarAdmins(); }
  catch (e) { toast.error(errorMessage(e)); await carregarAdmins(); }
}
async function toggleAtivo(tipo, row) {
  try { await api.patch(`/api/admin/${tipo === 'admins' ? 'admins' : 'usuarios'}/${row.id}`, { is_active: !row.is_active });
    toast.success('Conta atualizada.');
    tipo === 'admins' ? await carregarAdmins() : await carregarUsuarios();
  } catch (e) { toast.error(errorMessage(e)); }
}
async function criarAdmin() {
  criando.value = true;
  try {
    await api.post('/api/admin/admins', { nome: form.nome, email: form.email, role: form.role });
    toast.success('Admin criado. Convite enviado.');
    novoAdmin.value = false; form.nome = ''; form.email = ''; form.role = 'editor';
    await carregarAdmins();
  } catch (e) { toast.error(errorMessage(e)); }
  finally { criando.value = false; }
}

onMounted(async () => { await carregarAdmins(); await carregarUsuarios(); });
</script>

<style scoped>
.equipe { max-width: 960px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
h1 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.5rem; font-weight: 800; color: var(--text-main); }
.ro { color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem; }
.tabs { display: flex; gap: 0.5rem; margin: 1.5rem 0 1rem; border-bottom: 1px solid var(--border-color); }
.tabs button { background: none; border: none; padding: 0.6rem 1rem; font-weight: 600; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; }
.tabs button.active { color: var(--brand-primary); border-bottom-color: var(--brand-primary); }
.btn { background: var(--brand-primary); color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
.btn.ghost { background: var(--bg-hover); color: var(--text-main); }
.btn:disabled { opacity: 0.6; }
.add { margin-bottom: 1rem; }
.busca { width: 100%; max-width: 320px; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1rem; background: var(--bg-input-form); color: var(--text-main); }
.tbl-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.tbl { width: 100%; min-width: 520px; border-collapse: collapse; font-size: 0.88rem; }
.tbl th, .tbl td { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border-color); }
.tbl th { color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1px; }
.tbl td { color: var(--text-main); }
.muted { color: var(--text-muted); }
.badge { padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; background: var(--bg-hover); }
.badge.superadmin { background: rgba(112,72,232,0.15); color: #7048e8; }
.acts { display: flex; gap: 6px; align-items: center; }
.acts select, .mini { font-size: 0.78rem; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input-form); color: var(--text-main); cursor: pointer; }
.modal-overlay { position: fixed; inset: 0; background: var(--overlay-color); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 1rem; }
.modal { background: var(--bg-card); border-radius: 12px; padding: 1.75rem; max-width: 420px; width: 100%; }
.modal h3 { margin: 0 0 0.5rem; color: var(--text-main); }
.modal p { color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1rem; }
.mfld { width: 100%; padding: 9px 12px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 0.75rem; background: var(--bg-input-form); color: var(--text-main); }
.modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem; }
</style>
