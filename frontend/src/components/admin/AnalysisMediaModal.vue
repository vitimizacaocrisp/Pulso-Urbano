<template>
  <!-- Resource type menu -->
  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="showResourceMenu" class="modal-backdrop" @click.self="emit('close-menu')">
        <div class="modal-box menu-box">
          <div class="modal-head">
            <h3>Adicionar Recurso</h3>
            <button class="modal-close" @click="emit('close-menu')"><Icon icon="mdi:close" width="20" /></button>
          </div>
          <p class="modal-hint">Escolha o tipo de recurso a inserir no conteúdo:</p>
          <div class="resource-grid">
            <button v-for="res in resourceTypes" :key="res.type"
              class="res-btn" :class="res.colorClass"
              @click="emit('select-type', res.type)">
              <span class="res-icon">{{ res.emoji }}</span>
              <span class="res-label">{{ res.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Media input modal -->
    <transition name="modal-fade">
      <div v-if="showMediaInput" class="modal-backdrop" @click.self="emit('close-media')">
        <div class="modal-box">
          <div class="modal-head">
            <h3>Inserir {{ mediaTypeLabels[activeType] }}</h3>
            <button class="modal-close" @click="emit('close-media')"><Icon icon="mdi:close" width="20" /></button>
          </div>

          <div class="tab-switch">
            <button :class="['tab-sw-btn', { active: inputMode === 'url' }]" @click="inputMode = 'url'">
              <Icon icon="mdi:link-variant" width="15" /> Via URL
            </button>
            <button v-if="activeType !== 'link'"
              :class="['tab-sw-btn', { active: inputMode === 'file' }]" @click="inputMode = 'file'">
              <Icon icon="mdi:upload-outline" width="15" /> Upload
            </button>
          </div>

          <div class="modal-body">
            <div v-if="inputMode === 'url'" class="input-section">
              <label class="inp-label">URL do recurso</label>
              <input type="text" class="inp-field" v-model="urlValue"
                placeholder="https://..." @keyup.enter="confirm" />
            </div>

            <div v-if="inputMode === 'file' && activeType !== 'link'" class="input-section">
              <label class="inp-label">Arquivo(s)</label>
              <label :for="fileInputId" class="file-drop-sm" :class="{ 'has-files': localFiles.length }">
                <Icon :icon="localFiles.length ? 'mdi:check-circle-outline' : 'mdi:file-upload-outline'" width="22" />
                <span>{{ localFiles.length ? `${localFiles.length} arquivo(s) selecionado(s)` : 'Clique para selecionar' }}</span>
              </label>
              <input type="file" :id="fileInputId" multiple ref="fileInputRef"
                :accept="acceptFor(activeType)" class="file-hidden" @change="handleFileChange" />
              <ul v-if="localFiles.length" class="file-list">
                <li v-for="(f, i) in localFiles" :key="i">
                  <Icon icon="mdi:file-outline" width="14" /> {{ f.name }}
                </li>
              </ul>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-back" @click="emit('back-to-menu')">
              <Icon icon="mdi:arrow-left" width="16" /> Voltar
            </button>
            <button class="btn-confirm" @click="confirm" :disabled="confirming">
              <Icon v-if="confirming" icon="mdi:loading" width="16" class="spin" />
              {{ confirming ? 'Processando...' : 'Inserir' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { mediaTypeLabels, getAcceptAttribute } from '@/assets/js/analysisUtils.js';

const props = defineProps({
  showResourceMenu: Boolean,
  showMediaInput:   Boolean,
  activeType:       String,
  fileInputId:      { type: String, default: 'mediaFileInput' }
});

const emit = defineEmits([
  'close-menu', 'close-media', 'select-type', 'back-to-menu', 'confirm'
]);

const inputMode   = ref('url');
const urlValue    = ref('');
const localFiles  = ref([]);
const fileInputRef = ref(null);
const confirming  = ref(false);

const resourceTypes = [
  { type: 'image',    emoji: '🖼️',  label: 'Imagem',        colorClass: '' },
  { type: 'audio',    emoji: '🎵',  label: 'Áudio',         colorClass: '' },
  { type: 'video',    emoji: '🎥',  label: 'Vídeo',         colorClass: '' },
  { type: 'notebook', emoji: '🐍',  label: 'Notebook',      colorClass: 'purple' },
  { type: 'script',   emoji: '📜',  label: 'Script',        colorClass: 'purple' },
  { type: 'document', emoji: '📄',  label: 'Documento',     colorClass: 'blue' },
  { type: 'data',     emoji: '📊',  label: 'Dados CSV/XLS', colorClass: 'green' },
  { type: 'link',     emoji: '🔗',  label: 'Link Card',     colorClass: '' },
];

const acceptFor = (type) => getAcceptAttribute(type);

// Reset when modal opens
watch(() => props.showMediaInput, (v) => {
  if (v) { inputMode.value = 'url'; urlValue.value = ''; localFiles.value = []; }
});

const handleFileChange = (e) => {
  localFiles.value = Array.from(e.target.files || []);
};

const confirm = async () => {
  if (inputMode.value === 'url' && !urlValue.value.trim()) {
    alert('Insira uma URL válida.');
    return;
  }
  if (inputMode.value === 'file' && localFiles.value.length === 0) {
    alert('Selecione pelo menos um arquivo.');
    return;
  }
  confirming.value = true;
  emit('confirm', {
    mode:  inputMode.value,
    url:   urlValue.value.trim(),
    files: localFiles.value,
    type:  props.activeType
  });
  confirming.value = false;
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0; z-index: 9000;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.modal-box {
  background: var(--bg-card, #fff); border-radius: 14px;
  width: 100%; max-width: 520px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.25);
  overflow: hidden;
}
.menu-box { max-width: 480px; }

.modal-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color);
}
.modal-head h3 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-main); }
.modal-close { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 6px; }
.modal-close:hover { background: var(--bg-hover); color: var(--text-main); }
.modal-hint { padding: 0.75rem 1.5rem 0; font-size: 0.85rem; color: var(--text-secondary); margin: 0; }

.resource-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 1.25rem 1.5rem; }
.res-btn {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 1rem 0.5rem; border-radius: 10px; border: 1px solid var(--border-color);
  background: var(--bg-hover); cursor: pointer;
  font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);
  transition: all 0.15s;
}
.res-btn:hover { border-color: var(--brand-primary); background: rgba(99,102,241,0.08); color: var(--brand-primary); }
.res-btn.purple:hover { border-color: #8b5cf6; background: rgba(139,92,246,0.08); color: #8b5cf6; }
.res-btn.blue:hover   { border-color: #3b82f6; background: rgba(59,130,246,0.08); color: #3b82f6; }
.res-btn.green:hover  { border-color: #10b981; background: rgba(16,185,129,0.08); color: #10b981; }
.res-icon { font-size: 1.5rem; }

.tab-switch { display: flex; gap: 0; border-bottom: 1px solid var(--border-color); }
.tab-sw-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 16px; background: none; border: none;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  font-size: 0.83rem; font-weight: 600; color: var(--text-muted);
  cursor: pointer; transition: color 0.15s, border-color 0.15s;
}
.tab-sw-btn:hover { color: var(--brand-primary); }
.tab-sw-btn.active { color: var(--brand-primary); border-bottom-color: var(--brand-primary); }

.modal-body { padding: 1.25rem 1.5rem; }
.input-section { display: flex; flex-direction: column; gap: 8px; }
.inp-label { font-size: 0.82rem; font-weight: 600; color: var(--text-main); }
.inp-field {
  padding: 9px 12px; border: 1px solid var(--border-color);
  border-radius: 8px; background: var(--bg-input-form, var(--bg-body));
  color: var(--text-main); font-size: 0.9rem;
}
.inp-field:focus { outline: none; border-color: var(--brand-primary); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }

.file-drop-sm {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border: 1px dashed var(--border-color); border-radius: 8px;
  cursor: pointer; color: var(--text-muted); font-size: 0.875rem;
  transition: border-color 0.2s, color 0.2s;
}
.file-drop-sm:hover, .file-drop-sm.has-files { border-color: var(--brand-primary); color: var(--brand-primary); }
.file-hidden { display: none; }
.file-list { list-style: none; padding: 0; margin: 6px 0 0; display: flex; flex-direction: column; gap: 3px; }
.file-list li { font-size: 0.78rem; color: var(--text-secondary); display: flex; align-items: center; gap: 5px; }

.modal-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 1.5rem; border-top: 1px solid var(--border-color);
  background: var(--bg-hover, #f8fafc);
}
.btn-back {
  display: flex; align-items: center; gap: 6px;
  background: none; border: 1px solid var(--border-color);
  border-radius: 8px; padding: 8px 14px;
  font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);
  cursor: pointer; transition: all 0.15s;
}
.btn-back:hover { border-color: var(--text-main); color: var(--text-main); }
.btn-confirm {
  display: flex; align-items: center; gap: 6px;
  background: var(--brand-primary); color: #fff;
  border: none; border-radius: 8px; padding: 8px 20px;
  font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.15s;
}
.btn-confirm:hover:not(:disabled) { filter: brightness(1.08); }
.btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
