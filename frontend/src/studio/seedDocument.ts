import { parseGraphicStudioDocument } from './core/index.js'

/**
 * Documento inicial do Editor Alpha — só um ponto de partida para teste.
 * Não vem do backend: enquanto o editor for experimental, tudo é local.
 */
export function createSeedDocument() {
  return parseGraphicStudioDocument({
    schemaVersion: 2,
    documentId: 'doc_alpha_pulso',
    metadata: {
      title: 'Rascunho do Editor Alpha',
      slug: 'rascunho-alpha',
      description: 'Documento de teste do editor visual.',
      status: 'draft',
    },
    theme: { id: 'default', version: 1, overrides: {} },
    breakpoints: { mobile: 390, tablet: 768, desktop: 1440 },
    pages: [{ id: 'page_alpha', name: 'Tela 1', rootNodeId: 'node_root' }],
    nodes: {
      node_root: {
        id: 'node_root',
        name: 'pagina',
        type: 'core/page',
        parentId: null,
        order: 0,
        frame: { x: 0, y: 0, width: 1200, height: 900, rotation: 0 },
        style: { backgroundColor: { value: '#ffffff' } },
        content: {},
        locked: false,
        hidden: false,
        accessibility: { label: 'Área de edição' },
      },
      node_titulo: {
        id: 'node_titulo',
        name: 'titulo',
        groups: ['titulo'],
        type: 'core/heading',
        parentId: 'node_root',
        order: 0,
        frame: { x: 64, y: 72, width: 1072, height: 90, rotation: 0, autoResize: 'height' },
        style: {
          color: { value: '#0f172a' },
          fontFamily: 'Manrope',
          fontSize: 64,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: -2,
        },
        content: { text: 'Comece a editar por aqui.', level: 1 },
        locked: false,
        hidden: false,
      },
      node_texto: {
        id: 'node_texto',
        name: 'apoio',
        groups: ['texto-apoio'],
        type: 'core/text',
        parentId: 'node_root',
        order: 1,
        frame: { x: 64, y: 190, width: 720, height: 60, rotation: 0, autoResize: 'height' },
        style: {
          color: { value: '#475569' },
          fontFamily: 'Manrope',
          fontSize: 18,
          lineHeight: 1.6,
        },
        content: {
          text: 'Duplo clique edita o texto no canvas. Botão direito abre as ações.',
        },
        locked: false,
        hidden: false,
      },
    },
  })
}
