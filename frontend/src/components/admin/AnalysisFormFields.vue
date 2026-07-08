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

      <!-- Tipo de entrada -->
      <div class="field-group">
        <label class="field-label">Tipo de Entrada</label>
        <div class="entry-type-seg">
          <button v-for="t in ENTRY_TYPES" :key="t.value" type="button"
            class="seg-btn" :class="{ active: entryType === t.value }"
            @click="setEntryType(t.value)">
            <Icon :icon="t.icon" width="16" /> {{ t.label }}
          </button>
        </div>
        <span class="field-hint">
          Produção acadêmica e dado primário ganham um formato próprio na página pública.
        </span>
      </div>

      <!-- Metadados acadêmicos -->
      <div v-if="entryType === 'academic'" class="meta-block">
        <div class="meta-block-title"><Icon icon="mdi:school-outline" width="15" /> Metadados acadêmicos</div>
        <div class="field-row two-col">
          <div class="field-group">
            <label class="field-label">Tipo de produção</label>
            <select class="field-input" :value="metaVal('academicType')"
              @change="updateMeta('academicType', $event.target.value)">
              <option value="" disabled>Selecione...</option>
              <option v-for="t in ACADEMIC_TYPES" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Ano</label>
            <input type="text" class="field-input" :value="metaVal('year')"
              @input="updateMeta('year', $event.target.value)" placeholder="Ex: 2024" />
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Veículo / Instituição / Evento</label>
          <input type="text" class="field-input" :value="metaVal('venue')"
            @input="updateMeta('venue', $event.target.value)"
            placeholder="Ex: Revista Brasileira de Sociologia; UFMG; ANPOCS" />
        </div>
        <div class="field-row two-col">
          <div class="field-group">
            <label class="field-label">DOI / Link</label>
            <input type="text" class="field-input" :value="metaVal('doi')"
              @input="updateMeta('doi', $event.target.value)" placeholder="https://doi.org/..." />
          </div>
          <div class="field-group">
            <label class="field-label">Link do PDF</label>
            <input type="text" class="field-input" :value="metaVal('pdfUrl')"
              @input="updateMeta('pdfUrl', $event.target.value)" placeholder="Link para baixar o documento" />
          </div>
        </div>
      </div>

      <!-- Ficha de dado primário -->
      <div v-else-if="entryType === 'dataset'" class="meta-block">
        <div class="meta-block-title"><Icon icon="mdi:database-outline" width="15" /> Ficha técnica do dado</div>
        <div class="field-row two-col">
          <div class="field-group">
            <label class="field-label">Instrumento</label>
            <select class="field-input" :value="metaVal('instrument')"
              @change="updateMeta('instrument', $event.target.value)">
              <option value="" disabled>Selecione...</option>
              <option v-for="t in DATASET_INSTRUMENTS" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Formato dos dados</label>
            <input type="text" class="field-input" :value="metaVal('dataFormat')"
              @input="updateMeta('dataFormat', $event.target.value)" placeholder="Ex: CSV, SPSS, PDF" />
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Amostra / cobertura</label>
          <input type="text" class="field-input" :value="metaVal('sampleSize')"
            @input="updateMeta('sampleSize', $event.target.value)" placeholder="Ex: 2.500 domicílios, 27 UFs" />
        </div>
        <span class="field-hint">
          Coloque os links de download dos arquivos em "Links de Referência" (aba Publicação).
        </span>
      </div>

      <!-- Episódio de podcast -->
      <div v-else-if="entryType === 'podcast'" class="meta-block">
        <div class="meta-block-title"><Icon icon="mdi:podcast" width="15" /> Episódio de podcast</div>
        <div class="field-row two-col">
          <div class="field-group">
            <label class="field-label">Número do episódio</label>
            <input type="text" class="field-input" :value="metaVal('episodeNumber')"
              @input="updateMeta('episodeNumber', $event.target.value)" placeholder="Ex: 12" />
          </div>
          <div class="field-group">
            <label class="field-label">Duração</label>
            <input type="text" class="field-input" :value="metaVal('duration')"
              @input="updateMeta('duration', $event.target.value)" placeholder="Ex: 34 min" />
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Link do episódio (Spotify, Apple Podcasts ou YouTube)</label>
          <input type="text" class="field-input" :value="metaVal('embedUrl')"
            @input="updateMeta('embedUrl', $event.target.value)"
            placeholder="https://open.spotify.com/episode/..." />
          <span class="field-hint">Cole o link da página do episódio — o player é embutido automaticamente.</span>
        </div>
      </div>

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
        <label class="field-label">Imagem de Capa</label>
        <label :for="coverInputId" class="file-drop" :class="{ 'has-file': hasCover }">
          <Icon :icon="hasCover ? 'mdi:image-check-outline' : 'mdi:image-plus-outline'" width="28" />
          <span class="file-drop-text">{{ coverLabel }}</span>
          <span class="file-drop-hint">PNG, JPG, WEBP — máx 10 MB · opcional</span>
        </label>
        <input type="file" :id="coverInputId" accept="image/*" class="file-hidden"
          @change="$emit('cover-change', $event)" />
        <img v-if="imagePreviewUrl" :src="imagePreviewUrl" alt="Pré-visualização" class="cover-preview" />
        <div v-else class="auto-cover-block">
          <div class="auto-cover-frame"><AnalysisCover :analysis="autoCoverAnalysis" /></div>
          <span class="field-hint auto-cover-hint">
            <Icon icon="mdi:auto-fix" width="14" />
            Sem imagem? Uma capa automática é gerada a partir da categoria, tag e título.
          </span>
        </div>
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
import AnalysisCover from '@/components/AnalysisCover.vue';
import { ENTRY_TYPES, ACADEMIC_TYPES, DATASET_INSTRUMENTS } from '@/utils/analysisUtils.js';

const props = defineProps({
  modelValue: { type: Object, required: true },
  imagePreviewUrl: { type: String, default: '' },
  coverInputId: { type: String, default: 'coverImageInput' }
});
const emit = defineEmits(['update:modelValue', 'cover-change']);

// ── Tipo de entrada + metadados específicos ──
const entryType = computed(() => props.modelValue.entry_type || 'analysis');
const setEntryType = (val) =>
  emit('update:modelValue', { ...props.modelValue, entry_type: val });
const metaVal = (key) => (props.modelValue.meta || {})[key] || '';
const updateMeta = (key, val) =>
  emit('update:modelValue', {
    ...props.modelValue,
    meta: { ...(props.modelValue.meta || {}), [key]: val }
  });

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

// Capa automática (preview) — gerada da categoria/tag/título quando não há imagem.
const autoCoverAnalysis = computed(() => ({
  title:    props.modelValue.title,
  category: props.modelValue.category,
  tag:      props.modelValue.tag,
  source:   props.modelValue.source,
}));
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

/* Seletor de tipo de entrada */
.entry-type-seg { display: flex; gap: 8px; flex-wrap: wrap; }
.seg-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border: 1px solid var(--border-color); border-radius: 8px;
  background: var(--bg-input-form, var(--bg-body)); color: var(--text-secondary);
  font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.15s;
}
.seg-btn:hover { border-color: var(--brand-primary); color: var(--brand-primary); }
.seg-btn.active { background: var(--brand-primary); border-color: var(--brand-primary); color: #fff; }
.meta-block {
  display: flex; flex-direction: column; gap: 1.25rem;
  padding: 1rem; border: 1px dashed var(--border-color); border-radius: 10px;
  background: var(--bg-hover);
}
.meta-block-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.78rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.6px; color: var(--brand-primary);
}

.field-input {
  padding: 9px 12px; border: 1px solid var(--border-color);
  border-radius: 8px; background: var(--bg-input-form, var(--bg-body));
  color: var(--text-main); font-size: 0.9rem;
  font-family: inherit; /* evita o monospace padrão da textarea */
  transition: border-color 0.2s, box-shadow 0.2s;
}
.field-input:focus { outline: none; border-color: var(--brand-primary); box-shadow: 0 0 0 3px rgba(47, 84, 235,0.12); }
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
.file-drop:hover, .file-drop.has-file { border-color: var(--brand-primary); background: rgba(47, 84, 235,0.04); color: var(--brand-primary); }
.file-drop-text { font-weight: 600; font-size: 0.9rem; }
.file-drop-hint { font-size: 0.75rem; opacity: 0.7; }
.file-hidden { display: none; }
.cover-preview { width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-top: 8px; }
.auto-cover-block { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.auto-cover-frame { width: 100%; height: 180px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); }
.auto-cover-hint { display: flex; align-items: center; gap: 5px; }

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
