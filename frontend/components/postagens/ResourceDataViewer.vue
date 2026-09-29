<template>
  <div class="data-viewer" :aria-busy="loading">
    <div v-if="loading" class="viewer-state"><Icon icon="mdi:loading" class="spin" /> Lendo a estrutura dos dados…</div>
    <div v-else-if="error" class="viewer-state error"><Icon icon="mdi:alert-circle-outline" /> {{ error }}</div>
    <template v-else-if="headers.length">
      <div v-if="tables.length > 1" class="table-selector">
        <label for="sqlite-table">Tabela</label>
        <select id="sqlite-table" v-model="selectedTable" @change="readSqliteTable"><option v-for="table in tables" :key="table" :value="table">{{ table }}</option></select>
      </div>
      <div class="table-scroll">
        <table>
          <thead><tr><th v-for="header in headers" :key="header">{{ header }}</th></tr></thead>
          <tbody><tr v-for="(row, index) in rows" :key="index"><td v-for="header in headers" :key="header">{{ row[header] }}</td></tr></tbody>
        </table>
      </div>
      <footer><span>Prévia de {{ rows.length }} linhas</span><span>{{ headers.length }} colunas</span></footer>
    </template>
    <div v-else class="viewer-state">Nenhuma linha encontrada.</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { fileExtension, type AttachmentFile } from '@/utils/attachmentResources'

const props = withDefaults(defineProps<{
  url?: string
  file?: AttachmentFile
}>(), {
  url: '',
  file: () => ({}),
})

const loading = ref(false)
const error = ref('')
const headers = ref<string[]>([])
const rows = ref<Record<string, any>[]>([])
const tables = ref<string[]>([])
const selectedTable = ref('')
let sqliteDb: any = null

function setRows(items: any[]) {
  const safeRows = Array.isArray(items) ? items.slice(0, 100) : []
  const keys = [...new Set(safeRows.flatMap((row) => Object.keys(row || {})))].slice(0, 60)
  headers.value = keys
  rows.value = safeRows.map((row) => Object.fromEntries(keys.map((key) => [key, formatCell(row?.[key])])))
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 500)
  return String(value).slice(0, 500)
}

function readSqliteTable() {
  if (!sqliteDb || !selectedTable.value) return
  const safeName = selectedTable.value.replace(/"/g, '""')
  const result = sqliteDb.exec(`SELECT * FROM "${safeName}" LIMIT 100`)[0]
  if (!result) return setRows([])
  setRows(result.values.map((values: any[]) => Object.fromEntries(result.columns.map((column: string, i: number) => [column, values[i]]))))
}

async function load() {
  error.value = ''
  headers.value = []
  rows.value = []
  tables.value = []
  selectedTable.value = ''
  sqliteDb?.close()
  sqliteDb = null
  if (!props.url) return
  loading.value = true
  try {
    const response = await fetch(props.url)
    if (!response.ok) throw new Error('Não foi possível carregar os dados.')
    const ext = fileExtension(props.file)
    if (ext === 'csv' || ext === 'tsv') {
      const { default: Papa } = await import('papaparse')
      const parsed = Papa.parse(await response.text(), { header: true, skipEmptyLines: true, delimiter: ext === 'tsv' ? '\t' : '' })
      if (parsed.errors?.length && !parsed.data?.length) throw new Error(parsed.errors[0].message)
      setRows(parsed.data as any[])
    } else if (['xls', 'xlsx'].includes(ext)) {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(await response.arrayBuffer(), { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      setRows(XLSX.utils.sheet_to_json(sheet, { defval: '' }))
    } else if (ext === 'json' || ext === 'geojson') {
      const json = JSON.parse(await response.text())
      setRows(Array.isArray(json) ? json : json.features || json.rows || [json])
    } else if (['db', 'sqlite', 'sqlite3'].includes(ext)) {
      const [{ default: initSqlJs }, { default: sqlWasmUrl }] = await Promise.all([
        import('sql.js'), import('sql.js/dist/sql-wasm.wasm?url'),
      ])
      const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl })
      sqliteDb = new SQL.Database(new Uint8Array(await response.arrayBuffer()))
      const found = sqliteDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")[0]
      tables.value = found?.values?.map((row: any[]) => String(row[0])) || []
      selectedTable.value = tables.value[0] || ''
      readSqliteTable()
    } else if (ext === 'parquet') {
      throw new Error('A prévia de Parquet ainda não é suportada no navegador; use o download.')
    } else {
      throw new Error('Formato de dados sem leitor disponível.')
    }
  } catch (err: any) {
    error.value = err.message || 'Não foi possível ler o arquivo.'
  } finally {
    loading.value = false
  }
}

watch(() => [props.url, props.file?.id], load, { immediate: true })
</script>

<style scoped>
.data-viewer { min-height: 180px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border-color)); border-radius: 14px; background: var(--bg-card); }
.viewer-state { min-height: 180px; display: flex; align-items: center; justify-content: center; gap: .5rem; color: var(--text-muted); padding: 1.5rem; text-align: center; }
.viewer-state.error { color: var(--sys-danger); }
.table-selector { display: flex; align-items: center; gap: .65rem; padding: .7rem .85rem; border-bottom: 1px solid var(--border-color); }
.table-selector label { color: var(--text-muted); font-size: .72rem; font-weight: 800; text-transform: uppercase; }
.table-selector select { min-width: 180px; border: 1px solid var(--border-color); border-radius: 8px; padding: .45rem .6rem; background: var(--bg-input-form); color: var(--text-main); }
.table-scroll { max-height: 430px; overflow: auto; }
table { width: 100%; border-collapse: collapse; font-size: .78rem; color: var(--text-main); }
th { position: sticky; top: 0; z-index: 1; padding: .7rem .8rem; background: color-mix(in srgb, var(--accent) 10%, var(--bg-card)); color: var(--text-secondary); text-align: left; white-space: nowrap; }
td { max-width: 280px; padding: .58rem .8rem; border-top: 1px solid var(--border-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
tbody tr:hover { background: var(--bg-hover); }
footer { display: flex; justify-content: space-between; padding: .55rem .8rem; border-top: 1px solid var(--border-color); color: var(--text-muted); font-size: .68rem; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
