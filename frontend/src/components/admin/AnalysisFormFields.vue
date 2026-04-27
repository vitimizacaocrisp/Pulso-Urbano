<template>
  <div class="form-fields">

    <!-- Tab Bar -->
    <div class="tab-bar">
      <button v-for="tab in tabs" :key="tab.id" type="button"
        class="tab-btn" :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id">
        <Icon :icon="tab.icon" width="15" />
        {{ tab.label }}
        <span v-if="tab.hasError" class="tab-error-dot"></span>
      </button>
    </div>

    <!-- TAB: Identificação -->
    <div v-show="activeTab === 'identity'" class="tab-pane">
      <div class="field-row two-col">
        <div class="field-group">
          <label class="field-label">Título <span class="req">*</span></label>
          <input type="text" class="field-input" :value="modelValue.title"
            @input="emit('update:modelValue', { ...modelValue, title: $event.target.value })"
            placeholder="Título da análise" />
        </div>
        <div class="field-group">
          <label class="field-label">Subtítulo</label>
          <input type="text" class="field-input" :value="modelValue.subtitle"
            @input="emit('update:modelValue', { ...modelValue, subtitle: $event.target.value })"
            placeholder="Subtítulo opcional" />
        </div>
      </div>

      <div class="field-row three-col">
        <div class="field-group">
          <label class="field-label">Autor(es) <span class="req">*</span></label>
          <input type="text" class="field-input" :value="modelValue.author"
            @input="emit('update:modelValue', { ...modelValue, author: $event.target.value })"
            placeholder="Nome do autor" />
        </div>
        <div class="field-group">
          <label class="field-label">Fonte</label>
          <input type="text" class="field-input" :value="modelValue.source"
            @input="emit('update:modelValue', { ...modelValue, source: $event.target.value })"
            placeholder="Ex: IBGE, Datafolha" />
        </div>
        <div class="field-group">
          <label class="field-label">Período de Estudo</label>
          <input type="text" class="field-input" :value="modelValue.studyPeriod"
            @input="emit('update:modelValue', { ...modelValue, studyPeriod: $event.target.value })"
            placeholder="Ex: 2022–2023" />
        </div>
      </div>

      <div class="field-row two-col">
        <div class="field-group">
          <label class="field-label">Tag <span class="req">*</span></label>
          <input type="text" class="field-input" :value="modelValue.tag"
            @input="emit('update:modelValue', { ...modelValue, tag: $event.target.value })"
            placeholder="Ex: Vitimização, Drogas" />
        </div>
        <div class="field-group">
          <label class="field-label">Categoria <span class="req">*</span></label>
          <select class="field-input" :value="modelValue.category"
            @change="emit('update:modelValue', { ...modelValue, category: $event.target.value })">
            <option value="" disabled>Selecione...</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
      </div>

      <div class="field-group">
        <label class="field-label">Descrição Curta <span class="req">*</span></label>
        <textarea class="field-input field-textarea" rows="3"
          :value="modelValue.description"
          @input="emit('update:modelValue', { ...modelValue, description: $event.target.value })"
          placeholder="Resumo para exibição no card de listagem"></textarea>
      </div>
    </div>

    <!-- TAB: Localização -->
    <div v-show="activeTab === 'location'" class="tab-pane">
      <div class="field-row two-col">
        <div class="field-group">
          <label class="field-label">Nacionalidade <span class="req">*</span></label>
          <input type="text" class="field-input" :value="modelValue.nationality"
            @input="emit('update:modelValue', { ...modelValue, nationality: $event.target.value })"
            maxlength="100" placeholder="Ex: Brasileira" />
          <span class="field-hint char-count">{{ modelValue.nationality?.length || 0 }}/100</span>
        </div>
      </div>

      <!-- Estados -->
      <div class="field-group">
        <label class="field-label">Estados</label>
        <div class="tag-box">
          <div class="tag-list">
            <span v-for="(s, i) in statesLocal" :key="i" class="tag-pill state-pill">
              {{ s }}
              <button type="button" @click="removeState(i)" class="tag-x">×</button>
            </span>
          </div>
          <input type="text" class="tag-input" v-model="stateInput"
            @keydown.enter.prevent="addState"
            placeholder="Estado + Enter para adicionar" />
        </div>
        <span class="field-hint">Pressione Enter ou vírgula para adicionar</span>
      </div>

      <!-- Cidades -->
      <div class="field-group">
        <label class="field-label">Cidades</label>
        <div class="tag-box">
          <div class="tag-list">
            <span v-for="(c, i) in citiesLocal" :key="i" class="tag-pill city-pill">
              {{ c }}
              <button type="button" @click="removeCity(i)" class="tag-x">×</button>
            </span>
          </div>
          <input type="text" class="tag-input" v-model="cityInput"
            @keydown.enter.prevent="addCity"
            placeholder="Cidade + Enter para adicionar" />
        </div>
        <span class="field-hint">Pressione Enter ou vírgula para adicionar</span>
      </div>
    </div>

    <!-- TAB: Publicação -->
    <div v-show="activeTab === 'publish'" class="tab-pane">
      <div class="field-group">
        <label class="field-label">Imagem de Capa <span class="req">*</span></label>
        <label :for="coverInputId" class="file-drop" :class="{ 'has-file': hasCover }">
          <Icon :icon="hasCover ? 'mdi:image-check-outline' : 'mdi:image-plus-outline'" width="28" />
          <span class="file-drop-text">{{ coverLabel }}</span>
          <span class="file-drop-hint">PNG, JPG, WEBP — máx 10 MB</span>
        </label>
        <input type="file" :id="coverInputId" accept="image/*" class="file-hidden"
          @change="$emit('cover-change', $event)" />
        <img v-if="imagePreviewUrl" :src="imagePreviewUrl" alt="Pré-visualização" class="cover-preview" />
      </div>

      <div class="field-group">
        <label class="field-label">Links de Referência</label>
        <textarea class="field-input field-textarea" rows="4"
          :value="modelValue.referenceLinks"
          @input="emit('update:modelValue', { ...modelValue, referenceLinks: $event.target.value })"
          placeholder="Um link por linha&#10;https://exemplo.com"></textarea>
      </div>

      <div class="toggle-row">
        <label class="toggle-label">
          <span class="toggle-wrap">
            <input type="checkbox" class="toggle-chk" :checked="modelValue.with_header"
              @change="emit('update:modelValue', { ...modelValue, with_header: $event.target.checked })" />
            <span class="toggle-slider"></span>
          </span>
          <span>
            <strong>Com Cabeçalho</strong>
            <small>Exibe cabeçalho padrão na postagem pública</small>
          </span>
        </label>
        <label class="toggle-label">
          <span class="toggle-wrap">
            <input type="checkbox" class="toggle-chk" :checked="modelValue.with_footer"
              @change="emit('update:modelValue', { ...modelValue, with_footer: $event.target.checked })" />
            <span class="toggle-slider"></span>
          </span>
          <span>
            <strong>Com Rodapé</strong>
            <small>Exibe seção de referências e rodapé</small>
          </span>
        </label>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps({
  modelValue: { type: Object, required: true },
  imagePreviewUrl: { type: String, default: '' },
  coverInputId: { type: String, default: 'coverImageInput' }
});
const emit = defineEmits(['update:modelValue', 'cover-change']);

const categories = [
  'Metodologia e Amostra', 'Crimes Contra o Patrimônio', 'Crimes Contra a Pessoa',
  'Sensação de Segurança', 'Subnotificação (Cifras Ocultas)', 'Perfil das Vítimas',
  'Violência Doméstica e Gênero', 'Outras Categorias'
];

const activeTab = ref('identity');
const tabs = [
  { id: 'identity', label: 'Identificação', icon: 'mdi:card-text-outline' },
  { id: 'location', label: 'Localização',   icon: 'mdi:map-marker-outline' },
  { id: 'publish',  label: 'Publicação',    icon: 'mdi:upload-outline' }
];

// Sync local arrays with modelValue
const statesLocal = ref([...(props.modelValue.states || [])]);
const citiesLocal = ref([...(props.modelValue.cities || [])]);
const stateInput  = ref('');
const cityInput   = ref('');

watch(() => props.modelValue.states, (v) => { if (v) statesLocal.value = [...v]; }, { immediate: true });
watch(() => props.modelValue.cities, (v) => { if (v) citiesLocal.value = [...v]; }, { immediate: true });

const addState = () => {
  const v = stateInput.value.trim().replace(/,$/, '');
  if (v && !statesLocal.value.includes(v)) {
    statesLocal.value.push(v);
    emit('update:modelValue', { ...props.modelValue, states: [...statesLocal.value] });
  }
  stateInput.value = '';
};
const removeState = (i) => {
  statesLocal.value.splice(i, 1);
  emit('update:modelValue', { ...props.modelValue, states: [...statesLocal.value] });
};
const addCity = () => {
  const v = cityInput.value.trim().replace(/,$/, '');
  if (v && !citiesLocal.value.includes(v)) {
    citiesLocal.value.push(v);
    emit('update:modelValue', { ...props.modelValue, cities: [...citiesLocal.value] });
  }
  cityInput.value = '';
};
const removeCity = (i) => {
  citiesLocal.value.splice(i, 1);
  emit('update:modelValue', { ...props.modelValue, cities: [...citiesLocal.value] });
};

const hasCover = computed(() =>
  !!props.imagePreviewUrl || !!(props.modelValue.coverImage)
);
const coverLabel = computed(() => {
  if (props.modelValue.coverImage instanceof File) return props.modelValue.coverImage.name;
  if (props.modelValue.coverImage?.serverPath) return 'Imagem atual mantida — clique para trocar';
  return 'Clique para selecionar a imagem de capa';
});
</script>

<style scoped>
.form-fields { display: flex; flex-direction: column; }

/* Tabs */
.tab-bar {
  display: flex; gap: 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 1.5rem;
  flex-wrap: nowrap;          /* nunca quebra linha */
  overflow-x: auto;           /* scroll horizontal em telas muito pequenas */
  scrollbar-width: none;      /* Firefox */
}
.tab-bar::-webkit-scrollbar { display: none; }
.tab-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 16px; background: none; border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  font-size: 0.85rem; font-weight: 600; color: var(--text-muted);
  cursor: pointer; transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;        /* impede quebra de texto dentro do botão */
  flex-shrink: 0;             /* impede encolhimento */
  position: relative;
}
.tab-btn:hover { color: var(--brand-primary); }
.tab-btn.active { color: var(--brand-primary); border-bottom-color: var(--brand-primary); }
.tab-error-dot { position: absolute; top: 6px; right: 4px; width: 6px; height: 6px; background: #ef4444; border-radius: 50%; }

.tab-pane { display: flex; flex-direction: column; gap: 1.25rem; }

/* Fields */
.field-row { display: grid; gap: 1rem; }
.field-row.two-col   { grid-template-columns: 1fr 1fr; }
.field-row.three-col { grid-template-columns: 1fr 1fr 1fr; }

.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 0.82rem; font-weight: 600; color: var(--text-main); }
.req { color: #ef4444; margin-left: 2px; }

.field-input {
  padding: 9px 12px; border: 1px solid var(--border-color);
  border-radius: 8px; background: var(--bg-input-form, var(--bg-body));
  color: var(--text-main); font-size: 0.9rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.field-input:focus { outline: none; border-color: var(--brand-primary); box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
.field-textarea { resize: vertical; line-height: 1.5; }

.field-hint { font-size: 0.75rem; color: var(--text-muted); }
.char-count { text-align: right; }

/* Tag box */
.tag-box { border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; background: var(--bg-input-form, var(--bg-body)); min-height: 44px; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.tag-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 99px; font-size: 0.82rem; font-weight: 600; }
.state-pill { background: rgba(59,130,246,0.12); color: #3b82f6; border: 1px solid rgba(59,130,246,0.2); }
.city-pill  { background: rgba(139,92,246,0.12); color: #8b5cf6; border: 1px solid rgba(139,92,246,0.2); }
.tag-x { background: none; border: none; cursor: pointer; font-size: 1rem; line-height: 1; padding: 0 1px; color: inherit; opacity: 0.6; }
.tag-x:hover { opacity: 1; }
.tag-input { border: none; outline: none; background: transparent; font-size: 0.875rem; color: var(--text-main); width: 100%; padding: 2px 4px; }

/* File drop */
.file-drop {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 2rem 1rem;
  border: 2px dashed var(--border-color); border-radius: 10px;
  cursor: pointer; transition: border-color 0.2s, background 0.2s;
  color: var(--text-muted); text-align: center;
}
.file-drop:hover, .file-drop.has-file { border-color: var(--brand-primary); background: rgba(99,102,241,0.04); color: var(--brand-primary); }
.file-drop-text { font-weight: 600; font-size: 0.9rem; }
.file-drop-hint { font-size: 0.75rem; opacity: 0.7; }
.file-hidden { display: none; }
.cover-preview { width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-top: 8px; }

/* Toggles */
.toggle-row { display: flex; flex-direction: column; gap: 12px; }
.toggle-label { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.toggle-label strong { display: block; font-size: 0.875rem; color: var(--text-main); }
.toggle-label small  { display: block; font-size: 0.75rem; color: var(--text-muted); }
.toggle-wrap { position: relative; flex-shrink: 0; }
.toggle-chk  { opacity: 0; width: 0; height: 0; position: absolute; }
.toggle-slider {
  display: block; width: 44px; height: 24px;
  background: var(--border-color); border-radius: 99px;
  transition: background 0.2s;
  cursor: pointer; position: relative;
}
.toggle-slider::after {
  content: ''; position: absolute; top: 3px; left: 3px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #fff; transition: transform 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}
.toggle-chk:checked + .toggle-slider { background: var(--brand-primary); }
.toggle-chk:checked + .toggle-slider::after { transform: translateX(20px); }

@media (max-width: 640px) {
  .field-row.two-col, .field-row.three-col { grid-template-columns: 1fr; }
}
</style>
