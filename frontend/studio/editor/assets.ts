export type LocalAssetKind = 'image' | 'video' | 'audio' | 'pdf' | 'data' | 'notebook' | 'code' | 'file'

/**
 * Estado do upload real pro R2 (ver useMediaUpload, reaproveitado do fluxo de
 * mídia de análise já existente). 'uploading': arquivo aceito, subindo em
 * segundo plano — só pode ir pro canvas depois de 'ready' (publicUrl real).
 */
export type LocalAssetStatus = 'uploading' | 'ready' | 'error'

export interface LocalAsset {
  id: string
  name: string
  mediaType: string
  size: number
  kind: LocalAssetKind
  /** Preview imediata (blob: local) — nunca é o que vai pro documento. */
  url: string
  status: LocalAssetStatus
  /** URL pública real no R2. Só existe quando status === 'ready'. */
  publicUrl?: string
  error?: string
}

const CODE_EXTENSIONS = new Set([
  'c', 'cpp', 'css', 'go', 'html', 'java', 'js', 'jsx', 'md', 'php', 'py',
  'rb', 'rs', 'sh', 'sql', 'ts', 'tsx', 'vue', 'xml', 'yaml', 'yml',
])
const DATA_EXTENSIONS = new Set([
  'csv', 'tsv', 'xls', 'xlsx', 'json', 'geojson', 'db', 'sqlite', 'sqlite3', 'parquet',
])

/**
 * Classificação do arquivo local → tipo de nó e pasta de upload no R2 (ver
 * FOLDER_MAP em backend/src/services/storage.ts — as categorias já existem).
 */
export function classifyLocalAsset(name: string, mediaType: string): LocalAssetKind {
  const extension = name.toLowerCase().split('.').pop() ?? ''
  if (mediaType.startsWith('image/')) return 'image'
  if (mediaType.startsWith('video/')) return 'video'
  if (mediaType.startsWith('audio/')) return 'audio'
  if (mediaType === 'application/pdf' || extension === 'pdf') return 'pdf'
  if (extension === 'ipynb' || mediaType === 'application/x-ipynb+json') return 'notebook'
  if (DATA_EXTENSIONS.has(extension)) return 'data'
  if (mediaType.startsWith('text/') || CODE_EXTENSIONS.has(extension)) return 'code'
  return 'file'
}

/** Categoria de upload (backend/src/services/storage.ts FOLDER_MAP) por tipo de nó. */
export function uploadCategoryFor(kind: LocalAssetKind): string {
  const map: Record<LocalAssetKind, string> = {
    image: 'image', video: 'video', audio: 'audio', pdf: 'document',
    notebook: 'notebook', data: 'data', code: 'script', file: 'document',
  }
  return map[kind]
}

export function formatAssetSize(bytes: number) {
  if (bytes < 1_024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}
