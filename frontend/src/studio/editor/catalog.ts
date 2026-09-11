export interface OpenverseImage {
  id: string
  title: string
  thumbnail: string
  creator: string
  license: string
  sourceUrl: string
  licenseUrl?: string
}

export interface IconifySearchResult {
  name: string
}

export interface EditorFont {
  family: string
  category: 'sans-serif' | 'serif' | 'monospace'
}

export const EDITOR_FONTS: EditorFont[] = [
  { family: 'Manrope', category: 'sans-serif' },
  { family: 'DM Sans', category: 'sans-serif' },
  { family: 'Outfit', category: 'sans-serif' },
  { family: 'Instrument Sans', category: 'sans-serif' },
  { family: 'IBM Plex Sans', category: 'sans-serif' },
  { family: 'Newsreader', category: 'serif' },
  { family: 'Fraunces', category: 'serif' },
  { family: 'IBM Plex Mono', category: 'monospace' },
]

export const ANIMATION_PRESETS = [
  { id: 'fade-up', label: 'Fade up' },
  { id: 'fade-in', label: 'Fade in' },
  { id: 'scale-in', label: 'Scale in' },
  { id: 'slide-left', label: 'Slide left' },
  { id: 'bounce-soft', label: 'Bounce soft' },
] as const

function safeQuery(query: string) {
  const normalized = query.trim().slice(0, 200)
  if (!normalized) throw new Error('Digite um termo para buscar')
  return normalized
}

export async function searchOpenverseImages(
  query: string,
  fetcher: typeof fetch = fetch,
): Promise<OpenverseImage[]> {
  const url = new URL('https://api.openverse.org/v1/images/')
  url.searchParams.set('q', safeQuery(query))
  url.searchParams.set('page_size', '18')
  url.searchParams.set('mature', 'false')

  const response = await fetcher(url)
  if (!response.ok) throw new Error(`Openverse respondeu com ${response.status}`)
  const payload = await response.json() as {
    results?: Array<Record<string, unknown>>
  }

  return (payload.results ?? []).flatMap((result) => {
    if (
      typeof result.id !== 'string'
      || typeof result.thumbnail !== 'string'
      || typeof result.foreign_landing_url !== 'string'
      || !result.thumbnail.startsWith('https://')
      || !result.foreign_landing_url.startsWith('https://')
    ) return []

    return [{
      id: result.id,
      title: typeof result.title === 'string' && result.title ? result.title : 'Imagem sem título',
      thumbnail: result.thumbnail,
      creator: typeof result.creator === 'string' && result.creator ? result.creator : 'Autor desconhecido',
      license: typeof result.license === 'string' ? result.license.toUpperCase() : 'Licença aberta',
      sourceUrl: result.foreign_landing_url,
      ...(typeof result.license_url === 'string' && result.license_url.startsWith('https://')
        ? { licenseUrl: result.license_url }
        : {}),
    }]
  })
}

export async function searchIconifyIcons(
  query: string,
  fetcher: typeof fetch = fetch,
): Promise<IconifySearchResult[]> {
  const url = new URL('https://api.iconify.design/search')
  url.searchParams.set('query', safeQuery(query))
  url.searchParams.set('limit', '48')

  const response = await fetcher(url)
  if (!response.ok) throw new Error(`Iconify respondeu com ${response.status}`)
  const payload = await response.json() as { icons?: unknown[] }

  return (payload.icons ?? [])
    .filter((icon): icon is string => typeof icon === 'string' && /^[a-z0-9-]+:[a-z0-9-]+$/.test(icon))
    .map((name) => ({ name }))
}

export function googleFontsStylesheetUrl(fonts = EDITOR_FONTS) {
  const url = new URL('https://fonts.googleapis.com/css2')
  for (const font of fonts) {
    url.searchParams.append('family', `${font.family}:wght@300;400;500;600;700;800`)
  }
  url.searchParams.set('display', 'swap')
  return url.toString()
}
