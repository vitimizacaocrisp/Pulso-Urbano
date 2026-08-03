<template>
  <div class="media-field">
    <div class="section-intro">
      <div>
        <span class="eyebrow">Biblioteca da publicação</span>
        <h3>Arquivos e mídia</h3>
      </div>
      <span class="limit-badge"><Icon icon="mdi:shield-check-outline" /> até 2 GB por arquivo</span>
    </div>

    <div class="upload-grid">
      <template v-for="item in uploads" :key="item.tipo">
        <label class="upload-card" :class="{ disabled: subindo }" :for="`upload-${item.tipo}`">
          <span class="upload-icon"><Icon :icon="item.icon" /></span>
          <span><strong>{{ item.label }}</strong><small>{{ item.help }}</small></span>
          <Icon icon="mdi:plus" class="plus" />
        </label>
        <input :id="`upload-${item.tipo}`" type="file" :accept="item.accept" :aria-label="`Enviar ${item.label}`" :disabled="subindo" @change="pick($event, item.tipo)" hidden />
      </template>
    </div>

    <UploadProgress v-if="subindo" :percent="progresso" :label="`Enviando ${nomeAtual || 'arquivo'}…`" sub="A confirmação de integridade acontece ao terminar." class="progress" />
    <p class="hint"><Icon icon="mdi:information-outline" /> O arquivo vai direto ao armazenamento privado; tamanho e tipo são conferidos antes de ele ficar disponível.</p>

    <div class="library">
      <div class="library-head"><strong>Arquivos enviados</strong><span>{{ anexos?.length || 0 }}</span></div>
      <div v-if="anexos && anexos.length" class="anexo-list">
        <div v-for="ax in anexos" :key="ax.id" class="anexo-row">
          <span class="file-icon"><Icon :icon="iconFor(ax.tipo)" /></span>
          <span class="file-meta">
            <strong>{{ ax.nome || ('arquivo #' + ax.id) }}</strong>
            <small>{{ labelFor(ax.tipo) }}<template v-if="ax.tamanho"> · {{ formatBytes(ax.tamanho) }}</template></small>
          </span>
          <button class="del" type="button" :disabled="subindo" :aria-label="`Remover ${ax.nome || 'arquivo'}`" @click="$emit('remover', ax.id)"><Icon icon="mdi:trash-can-outline" /></button>
        </div>
      </div>
      <div v-else class="empty"><Icon icon="mdi:tray-arrow-up" /><span>Nenhum arquivo enviado ainda.</span></div>
    </div>

    <div class="display-options">
      <span class="eyebrow">Apresentação</span>
      <label class="option"><input type="checkbox" v-model="form.with_header" /><span><strong>Exibir cabeçalho editorial</strong><small>Mantém capa, título, autoria e contexto da publicação.</small></span></label>
      <label class="option"><input type="checkbox" v-model="form.with_footer" /><span><strong>Exibir rodapé padrão</strong><small>Mantém navegação institucional e créditos ao final.</small></span></label>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue';
import { Icon } from '@iconify/vue';
import UploadProgress from '@/components/UploadProgress.vue';
import { formatBytes } from '@/utils/uploadR2.js';

defineProps({
  anexos: { type: Array, default: () => [] },
  subindo: Boolean,
  progresso: { type: Number, default: 0 },
  nomeAtual: { type: String, default: '' },
});
const emit = defineEmits(['remover', 'upload']);
const form = inject('wizForm');

const uploads = [
  { tipo: 'cover', label: 'Capa', help: 'JPG, PNG ou WebP', icon: 'mdi:image-outline', accept: 'image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/heic,image/heif' },
  { tipo: 'imagem', label: 'Imagem', help: 'Gráficos e fotografias', icon: 'mdi:image-multiple-outline', accept: 'image/*' },
  { tipo: 'audio', label: 'Áudio', help: 'MP3, WAV, OGG e mais', icon: 'mdi:waveform', accept: 'audio/*' },
  { tipo: 'video', label: 'Vídeo', help: 'MP4, WebM, MOV e mais', icon: 'mdi:video-outline', accept: 'video/*' },
  { tipo: 'notebook', label: 'Notebook Python', help: 'Jupyter Notebook (.ipynb)', icon: 'mdi:notebook-outline', accept: '.ipynb,application/x-ipynb+json,application/json' },
  { tipo: 'codigo', label: 'Código-fonte', help: 'Python, R, SQL, JS e outros', icon: 'mdi:code-tags', accept: '.py,.pyw,.R,.r,.sql,.js,.jsx,.ts,.tsx,.css,.scss,.sh,.bash,.ps1,.java,.c,.h,.cpp,.hpp,.cs,.go,.rs,.rb,.php,.swift,.kt,.kts,.lua,.yaml,.yml,.toml' },
  { tipo: 'dado', label: 'Planilha ou dados', help: 'CSV, Excel, JSON e SQLite', icon: 'mdi:table-large', accept: '.csv,.tsv,.xls,.xlsx,.json,.geojson,.db,.sqlite,.sqlite3,.parquet' },
  { tipo: 'documento', label: 'Documento', help: 'PDF, DOCX, TXT e Markdown', icon: 'mdi:file-document-outline', accept: '.pdf,.doc,.docx,.rtf,.txt,.md' },
  { tipo: 'anexo', label: 'Outro arquivo', help: 'Compactados e materiais diversos', icon: 'mdi:paperclip', accept: '.zip,.7z,.rar,.gz,.tar' },
];
const byType = Object.fromEntries(uploads.map((x) => [x.tipo, x]));
const iconFor = (tipo) => byType[tipo]?.icon || 'mdi:file-outline';
const labelFor = (tipo) => byType[tipo]?.label || 'Anexo';

function pick(e, tipo) {
  const file = e.target.files?.[0];
  if (file) emit('upload', { file, tipo });
  e.target.value = '';
}
</script>

<style scoped>
.media-field { color: var(--text-main); }
.section-intro { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.eyebrow { display: block; color: var(--brand-primary); font-size: .68rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.section-intro h3 { margin: .2rem 0 0; font-size: 1.2rem; }
.limit-badge { display: inline-flex; align-items: center; gap: .35rem; padding: .4rem .65rem; border-radius: 999px; background: color-mix(in srgb, var(--brand-primary) 10%, transparent); color: var(--brand-primary); font-size: .72rem; font-weight: 700; white-space: nowrap; }
.upload-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; }
.upload-card { min-width: 0; display: grid; grid-template-columns: 38px 1fr auto; align-items: center; gap: .7rem; padding: .8rem; border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-input-form); cursor: pointer; transition: border-color .16s, transform .16s, box-shadow .16s; }
.upload-card:hover { border-color: var(--brand-primary); transform: translateY(-1px); box-shadow: 0 8px 22px rgba(20, 35, 80, .08); }
.upload-card.disabled { opacity: .55; pointer-events: none; }
.upload-icon, .file-icon { display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; background: color-mix(in srgb, var(--brand-primary) 10%, var(--bg-card)); color: var(--brand-primary); }
.upload-icon { width: 38px; height: 38px; font-size: 1.2rem; }
.upload-card strong, .upload-card small, .file-meta strong, .file-meta small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.upload-card strong { font-size: .86rem; }
.upload-card small, .file-meta small { margin-top: .15rem; color: var(--text-muted); font-size: .72rem; }
.plus { color: var(--text-muted); }
.progress { margin: 1rem 0; }
.hint { display: flex; gap: .4rem; align-items: flex-start; color: var(--text-muted); font-size: .78rem; line-height: 1.5; }
.library { margin-top: 1.35rem; border-top: 1px solid var(--border-color); padding-top: 1rem; }
.library-head { display: flex; align-items: center; gap: .5rem; margin-bottom: .7rem; font-size: .84rem; }
.library-head span { display: inline-flex; min-width: 20px; height: 20px; align-items: center; justify-content: center; border-radius: 999px; background: var(--bg-hover); color: var(--text-muted); font-size: .7rem; }
.anexo-list { display: flex; flex-direction: column; gap: .45rem; }
.anexo-row { display: grid; grid-template-columns: 34px minmax(0, 1fr) 32px; align-items: center; gap: .7rem; padding: .55rem .65rem; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-card); }
.file-icon { width: 34px; height: 34px; }
.file-meta { min-width: 0; }
.file-meta strong { font-size: .82rem; }
.del { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 8px; background: transparent; color: var(--text-muted); cursor: pointer; }
.del:hover { color: var(--sys-danger); background: color-mix(in srgb, var(--sys-danger) 10%, transparent); }
.empty { min-height: 86px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .35rem; border: 1px dashed var(--border-color); border-radius: 10px; color: var(--text-muted); font-size: .8rem; }
.empty svg { font-size: 1.35rem; }
.display-options { margin-top: 1.4rem; padding-top: 1rem; border-top: 1px solid var(--border-color); display: grid; gap: .55rem; }
.option { display: flex; align-items: flex-start; gap: .65rem; padding: .65rem .75rem; border-radius: 9px; cursor: pointer; }
.option:hover { background: var(--bg-hover); }
.option input { margin-top: .2rem; accent-color: var(--brand-primary); }
.option strong, .option small { display: block; }
.option strong { font-size: .82rem; }
.option small { color: var(--text-muted); font-size: .72rem; margin-top: .12rem; }
@media (max-width: 640px) {
  .section-intro { flex-direction: column; }
  .upload-grid { grid-template-columns: 1fr; }
}
</style>
