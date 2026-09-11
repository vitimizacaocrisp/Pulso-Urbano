export type LocalAssetKind = 'image' | 'video' | 'pdf' | 'code' | 'file'

export interface LocalAsset {
  id: string
  name: string
  mediaType: string
  size: number
  kind: LocalAssetKind
  url: string
}

const CODE_EXTENSIONS = new Set([
  'c', 'cpp', 'css', 'go', 'html', 'java', 'js', 'json', 'jsx', 'md', 'php', 'py',
  'rb', 'rs', 'sh', 'sql', 'ts', 'tsx', 'vue', 'xml', 'yaml', 'yml',
])

export function classifyLocalAsset(name: string, mediaType: string): LocalAssetKind {
  const extension = name.toLowerCase().split('.').pop() ?? ''
  if (mediaType.startsWith('image/')) return 'image'
  if (mediaType.startsWith('video/')) return 'video'
  if (mediaType === 'application/pdf' || extension === 'pdf') return 'pdf'
  if (mediaType.startsWith('text/') || CODE_EXTENSIONS.has(extension)) return 'code'
  return 'file'
}

export function formatAssetSize(bytes: number) {
  if (bytes < 1_024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}
