import {
  applyCommand,
  instanceRootOf,
  overrideKeyOf,
  parseGraphicStudioDocument,
  syncComponentInstances,
  type GraphicStudioCommand,
  type GraphicStudioDocument,
  type GraphicStudioNode,
  type HeadingNode,
  type LinkNode,
  type EmbedNode,
  type ListNode,
  type PageNode,
  type QuoteNode,
  type ShapeNode,
  type TextNode,
  type UpdateNodeCommand,
} from '../core/index.js'
import { GraphicStudioRenderer } from '../renderer/index.js'
import { Icon } from '@iconify/vue'
import {
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  toRaw,
  watch,
  type PropType,
  type VNode,
} from 'vue'
import {
  ANIMATION_PRESETS,
  EDITOR_FONTS,
  googleFontsStylesheetUrl,
  searchIconifyIcons,
  searchOpenverseImages,
  type IconifySearchResult,
  type OpenverseImage,
} from './catalog.js'
import { classifyLocalAsset, formatAssetSize, type LocalAsset, type LocalAssetKind } from './assets.js'
import { copyNodeSelection, materializeNodeClipboard, type NodeClipboard } from './clipboard.js'
import { createEditorHistory, recordEditorHistory, redoEditorHistory, undoEditorHistory } from './history.js'
import {
  frameCenter,
  moveFrame,
  resizeRotatedFrame,
  rotationFromPointer,
  scaleFrame,
  scaleStyle,
  type NodeFrame,
  type NodeStyle,
  type ResizeDirection,
  type Vector,
} from './interaction.js'
import {
  alignNodeFrames,
  createGroupLayout,
  distributeNodeFrames,
  snapFrame,
  snapResizeEdges,
  snapToSiblings,
  type AlignmentGuide,
  type Alignment,
  type DistributionAxis,
  type MeasuredLayoutNode,
} from './layout.js'

type Panel = 'insert' | 'layers' | 'theme' | 'files' | 'images' | 'icons'
/** O que o painel Inserir sabe criar. `asset` cobre vídeo e arquivo local. */
type NodeKind =
  | 'heading' | 'text' | 'link' | 'block' | 'icon' | 'image' | 'asset'
  | 'rectangle' | 'ellipse' | 'triangle' | 'line' | 'list' | 'quote' | 'embed'
type Viewport = 'desktop' | 'tablet' | 'mobile'
type NodeUpdatePatch = Omit<UpdateNodeCommand['payload'], 'nodeId'>

const SHAPE_LABELS: Record<'rectangle' | 'ellipse' | 'triangle' | 'line', string> = {
  rectangle: 'Retângulo',
  ellipse: 'Elipse',
  triangle: 'Triângulo',
  line: 'Linha',
}
type BoxShadowStyle = NonNullable<NodeStyle['boxShadow']>
type TextShadowStyle = NonNullable<NodeStyle['textShadow']>
type FilterStyle = NonNullable<NodeStyle['filter']>
type TextualNode = HeadingNode | TextNode | LinkNode
type InteractionMode = 'move' | 'rotate' | ResizeDirection
type HistoryDirection = 'undo' | 'redo'
/** `move` é o V do Figma; `scale` é o K, que leva fonte e bordas junto. */
type Tool = 'move' | 'scale'

interface SelectionBox {
  left: number
  top: number
  width: number
  height: number
  rotation: number
  /**
   * Mesma cadeia de `transform` que o renderer aplica ao nó. Guardada inteira
   * porque `rotation` sozinha não descreve um nó com `scale` ou `skew`: a caixa
   * ficaria do tamanho do layout, e o objeto na tela, de outro.
   */
  transform?: string
  transformOrigin?: string
}

interface ActiveInteraction {
  mode: InteractionMode
  /** Ferramenta Scale ativa no início do arraste. */
  scaling: boolean
  pointerX: number
  pointerY: number
  /** Ponteiro no início do arraste, em coordenadas do canvas. */
  startPoint: Vector
  frame: NodeFrame
  /** Centro do nó em coordenadas do canvas — invariante sob rotação. */
  center: Vector
  /** Estado congelado no pointerdown, para a Scale tool não acumular erro. */
  styles: Record<string, NodeStyle>
  frames: Record<string, NodeFrame>
}

const VIEWPORTS: Record<Viewport, { label: string, width: number, height: number }> = {
  desktop: { label: 'Desktop', width: 1200, height: 900 },
  tablet: { label: 'Tablet', width: 768, height: 1024 },
  mobile: { label: 'Mobile', width: 390, height: 844 },
}

function isTextualNode(node: GraphicStudioNode | undefined): node is TextualNode {
  return node?.type === 'core/heading' || node?.type === 'core/text' || node?.type === 'core/link'
}

/*
 * Guardas explícitas em vez de comparar `node.type` direto: o nó de plugin tem
 * `type: string`, então uma comparação com literal deixa o tipo do plugin dentro
 * da união e o conteúdo continua sendo JSON solto.
 */
function isShapeNode(node: GraphicStudioNode | undefined): node is ShapeNode {
  return node?.type === 'core/shape'
}

function isListNode(node: GraphicStudioNode | undefined): node is ListNode {
  return node?.type === 'core/list'
}

function isQuoteNode(node: GraphicStudioNode | undefined): node is QuoteNode {
  return node?.type === 'core/quote'
}

function isEmbedNode(node: GraphicStudioNode | undefined): node is EmbedNode {
  return node?.type === 'core/embed'
}

function styleValue(value: { token: string } | { value: string } | undefined, fallback: string) {
  return value && 'value' in value ? value.value : fallback
}

function numericStyleValue(value: { token: string } | { value: string } | undefined, fallback = 0) {
  const parsed = Number.parseFloat(styleValue(value, String(fallback)))
  return Number.isFinite(parsed) ? parsed : fallback
}

function targetValue(event: Event) {
  return (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value
}

export const GraphicStudioEditor = defineComponent({
  name: 'GraphicStudioEditor',
  props: {
    document: {
      type: Object as PropType<GraphicStudioDocument>,
      required: true,
    },
    homeHref: {
      type: String,
      default: '/',
    },
    previewHref: {
      type: String,
      default: '/preview',
    },
    messages: {
      type: Object as PropType<Record<string, string>>,
      default: () => ({}),
    },
  },
  emits: {
    'update:document': (_document: GraphicStudioDocument) => true,
  },
  setup(props, { emit }) {
    const message = (key: string, fallback: string, replacements: Record<string, string | number> = {}) =>
      Object.entries(replacements).reduce(
        (value, [name, replacement]) => value.replaceAll(`{${name}}`, String(replacement)),
        props.messages[key] ?? fallback,
      )
    // Sem alternador de tema próprio aqui: quem monta o editor (a view do admin)
    // é que espelha o tema do app na raiz do documento. Dois controles disputando
    // o mesmo estado dessincronizam.
    // Sincronizado desde o primeiro render, pelo mesmo motivo do watch abaixo.
    const workingDocument = shallowRef(syncComponentInstances(parseGraphicStudioDocument(props.document)))
    const history = shallowRef(createEditorHistory<GraphicStudioDocument>())
    const selectedNodeId = ref<string | null>(null)
    const selectedNodeIds = ref<string[]>([])
    const viewport = ref<Viewport>('desktop')
    const zoom = ref(75)
    const snapEnabled = ref(true)
    const activePanel = ref<Panel>('insert')
    const mobileTray = ref<'library' | 'inspector' | null>(null)
    const imageQuery = ref('arquitetura moderna')
    const iconQuery = ref('sparkles')
    const imageResults = ref<OpenverseImage[]>([])
    const iconResults = ref<IconifySearchResult[]>([])
    const imageStatus = ref('')
    const iconStatus = ref('')
    const isSearchingImages = ref(false)
    const isSearchingIcons = ref(false)
    const localAssets = ref<LocalAsset[]>([])
    const assetFilter = ref<'all' | LocalAssetKind>('all')
    const assetQuery = ref('')
    const assetStatus = ref('')
    const canvasElement = ref<HTMLElement | null>(null)
    const stageElement = ref<HTMLElement | null>(null)
    const activeTool = ref<Tool>('move')
    const historyLimit = ref(50)
    const contextMenu = ref<{ x: number, y: number, nodeId: string | null } | null>(null)
    const isPanning = ref(false)
    const spaceHeld = ref(false)
    /** Nó em edição de texto no canvas (contenteditable ativo). */
    const editingNodeId = ref<string | null>(null)
    const interactionFrame = shallowRef<NodeFrame | null>(null)
    /** Estilos em pré-visualização durante um arraste da Scale tool. */
    const interactionStyles = shallowRef<Record<string, NodeStyle> | null>(null)
    /** Frames em pré-visualização (subárvore escalada, ou cópia do alt+arrastar). */
    const interactionFrames = shallowRef<Record<string, NodeFrame> | null>(null)
    let activeInteraction: ActiveInteraction | null = null
    let commandNumber = 0
    /** Edição em curso que ainda deve cair no mesmo passo de histórico. */
    let coalescing: { key: string, at: number } | null = null
    const COALESCE_WINDOW_MS = 900
    let clipboard: NodeClipboard | null = null
    let pasteNumber = 0
    let lastEmittedDocument: GraphicStudioDocument | null = null

    watch(
      () => props.document,
      (document) => {
        // Sincroniza já na entrada: um documento importado ou aberto do servidor
        // pode trazer cópias de componente ainda sem os filhos materializados,
        // e elas apareceriam vazias até a primeira edição.
        const parsed = syncComponentInstances(parseGraphicStudioDocument(document))
        // Só zera o histórico quando o documento vem DE FORA (troca de arquivo).
        // `lastEmittedDocument` não é limpo aqui de propósito: este watcher é
        // `deep` e pode rodar mais de uma vez para o mesmo documento emitido —
        // limpar na primeira passada fazia a segunda apagar o histórico inteiro.
        // `toRaw` é essencial: o pai guarda o documento num `ref`, que devolve um
        // PROXY reativo. Comparar o proxy com o objeto cru emitido nunca batia, e
        // o histórico era zerado a cada alteração.
        if (toRaw(document) !== lastEmittedDocument) history.value = createEditorHistory<GraphicStudioDocument>(historyLimit.value)
        workingDocument.value = parsed
        setSelection(selectedNodeIds.value.filter((nodeId) => Boolean(parsed.nodes[nodeId])))
      },
      { deep: true },
    )

    onMounted(() => {
      if (!document.querySelector('link[data-graphicstudio-fonts]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = googleFontsStylesheetUrl()
        link.dataset.graphicstudioFonts = ''
        document.head.append(link)
      }
      window.addEventListener('resize', reconcileAutoSizes)
      window.addEventListener('keydown', handleEditorShortcut)
      window.addEventListener('keyup', handleEditorKeyUp)
      window.addEventListener('pointerdown', closeContextMenu)
      try {
        const saved = Number(window.localStorage.getItem(HISTORY_LIMIT_KEY))
        if (Number.isFinite(saved) && saved > 0) setHistoryLimit(saved)
      } catch {
        // Sem acesso ao storage: segue com o padrão de 50 passos.
      }
      // Primeira medição: os tamanhos gravados podem vir de uma estimativa da
      // migração ou de outra fonte de fonte. Uma segunda passada roda quando a
      // fonte do Google termina de carregar e muda o tamanho do texto.
      void nextTick(reconcileAutoSizes)
      document.fonts?.ready.then(() => reconcileAutoSizes())
    })

    onBeforeUnmount(() => {
      window.removeEventListener('resize', reconcileAutoSizes)
      window.removeEventListener('keydown', handleEditorShortcut)
      window.removeEventListener('keyup', handleEditorKeyUp)
      window.removeEventListener('pointerdown', closeContextMenu)
      stopPointerListeners()
      for (const asset of localAssets.value) URL.revokeObjectURL(asset.url)
    })

    /**
     * Camadas em ÁRVORE, não em lista plana.
     *
     * Antes tudo era ordenado por `order` global, o que embaralhava nós de pais
     * diferentes — e com várias telas ficava impossível saber a quem cada nó
     * pertencia. Aqui cada nível é ordenado entre irmãos, e o de maior `order`
     * (o que fica na frente no canvas) aparece no topo, como no Figma.
     */
    const layerRows = computed<Array<{ node: GraphicStudioNode, depth: number }>>(() => {
      const childrenOf = new Map<string | null, GraphicStudioNode[]>()
      for (const node of Object.values(workingDocument.value.nodes)) {
        const siblings = childrenOf.get(node.parentId) ?? []
        siblings.push(node)
        childrenOf.set(node.parentId, siblings)
      }
      for (const siblings of childrenOf.values()) {
        siblings.sort((left, right) => right.order - left.order)
      }
      const rows: Array<{ node: GraphicStudioNode, depth: number }> = []
      const walk = (parentId: string | null, depth: number) => {
        for (const node of childrenOf.get(parentId) ?? []) {
          rows.push({ node, depth })
          walk(node.id, depth + 1)
        }
      }
      walk(null, 0)
      return rows
    })
    const selectedNode = computed(() =>
      selectedNodeId.value ? workingDocument.value.nodes[selectedNodeId.value] : undefined,
    )
    /** Todos os artboards do documento, na ordem em que aparecem em `pages`. */
    const artboards = computed(() => workingDocument.value.pages
      .map((page) => ({ page, node: workingDocument.value.nodes[page.rootNodeId] }))
      .filter((entry): entry is { page: typeof entry.page, node: PageNode } =>
        entry.node?.type === 'core/page'))

    /** O artboard que contém o nó selecionado; senão o escolhido na barra. */
    const activePageId = ref<string | null>(null)
    const canvasNode = computed(() => {
      const node = selectedNode.value
      if (node) {
        let current: GraphicStudioNode | undefined = node
        while (current && current.type !== 'core/page') {
          current = current.parentId ? workingDocument.value.nodes[current.parentId] : undefined
        }
        if (current?.type === 'core/page') return current as PageNode
      }
      const chosen = artboards.value.find((entry) => entry.page.id === activePageId.value)
      return (chosen ?? artboards.value[0])?.node
    })
    const canvasWidth = computed(() => canvasNode.value?.frame.width ?? 1200)
    const canvasHeight = computed(() => canvasNode.value?.frame.height ?? 900)

    /** Área total ocupada pelos artboards — é o tamanho da prancheta. */
    const boardExtent = computed(() => artboards.value.reduce((size, { node }) => ({
      width: Math.max(size.width, node.frame.x + node.frame.width),
      height: Math.max(size.height, node.frame.y + node.frame.height),
    }), { width: 1200, height: 900 }))

    /**
     * Posição de um nó em coordenadas do canvas, somando os pais.
     *
     * Assume que os ancestrais não estão rotacionados — o caso comum. Sob um pai
     * rotacionado a caixa fica deslocada; a alternativa seria compor matrizes,
     * o que só vale a pena quando existir aninhamento rotacionado de verdade.
     */
    function absoluteOffset(node: GraphicStudioNode, source = previewDocument.value) {
      let x = node.frame.x
      let y = node.frame.y
      let rotation = node.frame.rotation
      let parentId = node.parentId
      while (parentId) {
        const parent = source.nodes[parentId]
        if (!parent) break
        // Inclui o artboard: com várias telas, a página também tem posição.
        x += parent.frame.x
        y += parent.frame.y
        rotation += parent.frame.rotation
        parentId = parent.parentId
      }
      return { x, y, rotation }
    }

    function boxOf(node: GraphicStudioNode, source = previewDocument.value): SelectionBox {
      const offset = absoluteOffset(node, source)
      // A ordem espelha `nodeStyle()` do renderer. Ordem diferente daria uma
      // composição diferente, e a caixa deixaria de coincidir com o objeto.
      const transforms = [
        offset.rotation ? `rotate(${offset.rotation}deg)` : '',
        node.style.scale !== undefined && node.style.scale !== 1 ? `scale(${node.style.scale})` : '',
        node.style.skewX ? `skewX(${node.style.skewX}deg)` : '',
        node.style.skewY ? `skewY(${node.style.skewY}deg)` : '',
      ].filter(Boolean)
      return {
        left: offset.x,
        top: offset.y,
        width: node.frame.width,
        height: node.frame.height,
        rotation: offset.rotation,
        transform: transforms.length ? transforms.join(' ') : undefined,
        transformOrigin: node.style.transformOrigin,
      }
    }

    /**
     * A caixa vem do documento, não do DOM. `getBoundingClientRect()` devolvia a
     * caixa alinhada aos eixos, que para um nó rotacionado é maior que o nó —
     * era essa a "caixa de seleção bugada".
     */
    const selectionBox = computed<SelectionBox | null>(() => {
      const node = selectedNode.value
      if (!node) return null
      const preview = previewDocument.value.nodes[node.id] ?? node
      return boxOf(preview)
    })

    /** Caixa que envolve toda a multi-seleção, em coordenadas do canvas. */
    const multiSelectionBox = computed<SelectionBox | null>(() => {
      const nodes = selectedNodes.value.filter((node) => node.type !== 'core/page')
      if (nodes.length < 2) return null
      const boxes = nodes.map((node) => boxOf(previewDocument.value.nodes[node.id] ?? node))
      const left = Math.min(...boxes.map((box) => box.left))
      const top = Math.min(...boxes.map((box) => box.top))
      const right = Math.max(...boxes.map((box) => box.left + box.width))
      const bottom = Math.max(...boxes.map((box) => box.top + box.height))
      return { left, top, width: right - left, height: bottom - top, rotation: 0 }
    })
    const selectedNodes = computed(() => selectedNodeIds.value
      .map((nodeId) => workingDocument.value.nodes[nodeId])
      .filter((node): node is GraphicStudioNode => node !== undefined))
    const hasMultiSelection = computed(() => selectedNodes.value.length > 1)
    const selectionHasCommonParent = computed(() => selectedNodes.value.length > 1
      && selectedNodes.value.every((node) => node.parentId === selectedNodes.value[0]?.parentId))
    const canUndo = computed(() => history.value.past.length > 0)
    const canRedo = computed(() => history.value.future.length > 0)
    const previewDocument = computed<GraphicStudioDocument>(() => {
      const nodeId = selectedNodeId.value
      if (!nodeId || !interactionFrame.value) return workingDocument.value
      const node = workingDocument.value.nodes[nodeId]
      if (!node || node.type === 'core/page') return workingDocument.value
      const nodes: GraphicStudioDocument['nodes'] = {
        ...workingDocument.value.nodes,
        [nodeId]: { ...node, frame: interactionFrame.value } as GraphicStudioNode,
      }
      if (activeInteraction?.mode === 'move' && selectedNodeIds.value.length > 1) {
        const deltaX = interactionFrame.value.x - activeInteraction.frame.x
        const deltaY = interactionFrame.value.y - activeInteraction.frame.y
        for (const selectedId of selectedNodeIds.value) {
          if (selectedId === nodeId) continue
          const selected = workingDocument.value.nodes[selectedId]
          if (selected && selected.type !== 'core/page' && !selected.locked) {
            nodes[selectedId] = { ...selected, frame: moveFrame(selected.frame, deltaX, deltaY) } as GraphicStudioNode
          }
        }
      }
      // Scale tool: a subárvore inteira acompanha, geometria e estilo.
      for (const [id, frame] of Object.entries(interactionFrames.value ?? {})) {
        const target = nodes[id]
        if (target) nodes[id] = { ...target, frame } as GraphicStudioNode
      }
      for (const [id, style] of Object.entries(interactionStyles.value ?? {})) {
        const target = nodes[id]
        if (target) nodes[id] = { ...target, style } as GraphicStudioNode
      }
      return {
        ...workingDocument.value,
        nodes,
      }
    })
    const assetUrls = computed(() => Object.fromEntries(localAssets.value.map((asset) => [asset.id, asset.url])))
    const visibleAssets = computed(() => {
      const query = assetQuery.value.trim().toLocaleLowerCase('pt-BR')
      return localAssets.value.filter((asset) =>
        (assetFilter.value === 'all' || asset.kind === assetFilter.value)
        && (!query || asset.name.toLocaleLowerCase('pt-BR').includes(query)),
      )
    })

    // Texto e estilo mudam o tamanho renderizado dos nós automáticos.
    watch(() => workingDocument.value.nodes, () => { void nextTick(reconcileAutoSizes) }, { deep: true })

    function commandEnvelope() {
      commandNumber += 1
      return {
        commandId: `editor_${Date.now().toString(36)}_${commandNumber}`,
        documentId: workingDocument.value.documentId,
        baseVersion: 0,
        actorId: 'playground_user',
        timestamp: new Date().toISOString(),
      }
    }

    function publishDocument(document: GraphicStudioDocument) {
      // As instâncias de componente são derivadas do mestre, não editadas à mão.
      // Reconciliar aqui, e não dentro de cada comando, garante que qualquer
      // caminho de edição — inclusive desfazer — chegue ao mesmo resultado.
      const reconciled = syncComponentInstances(document)
      workingDocument.value = reconciled
      lastEmittedDocument = reconciled
      emit('update:document', reconciled)
    }

    function setSelection(nodeIds: string[], primaryId = nodeIds.at(-1) ?? null) {
      selectedNodeIds.value = [...new Set(nodeIds)].filter((nodeId) => Boolean(workingDocument.value.nodes[nodeId]))
      selectedNodeId.value = primaryId && selectedNodeIds.value.includes(primaryId)
        ? primaryId
        : selectedNodeIds.value.at(-1) ?? null
    }

    function selectNode(nodeId: string, additive = false) {
      if (!additive) {
        setSelection([nodeId], nodeId)
        return
      }
      const exists = selectedNodeIds.value.includes(nodeId)
      setSelection(
        exists ? selectedNodeIds.value.filter((selectedId) => selectedId !== nodeId) : [...selectedNodeIds.value, nodeId],
        exists ? selectedNodeIds.value.filter((selectedId) => selectedId !== nodeId).at(-1) ?? null : nodeId,
      )
    }

    /**
     * `coalesceKey` agrupa alterações seguidas da mesma origem num único passo
     * de histórico: digitar um texto ou arrastar um campo numérico virava um
     * passo POR TECLA, e desfazer levava dezenas de Ctrl+Z para voltar.
     * Alterações de origem diferente (ou depois de uma pausa) abrem passo novo.
     */
    function commit(command: GraphicStudioCommand, record = true, coalesceKey?: string) {
      if (record) {
        // Edição de verdade do usuário: a medição automática volta a ter
        // crédito para se ajustar ao que mudou.
        passadasSemEdicao = 0
        const now = Date.now()
        const continuingSameEdit = coalesceKey !== undefined
          && coalescing?.key === coalesceKey
          && now - coalescing.at < COALESCE_WINDOW_MS
        if (!continuingSameEdit) history.value = recordEditorHistory(history.value, workingDocument.value)
        coalescing = coalesceKey === undefined ? null : { key: coalesceKey, at: now }
      }
      publishDocument(applyCommand(workingDocument.value, command))
    }

    const HISTORY_LIMIT_KEY = 'graphicstudio:history-limit'
    const HISTORY_LIMIT_MIN = 5
    const HISTORY_LIMIT_MAX = 500

    /**
     * Quantas alterações ficam guardadas para desfazer. Cada passo guarda uma
     * cópia do documento, então o limite é o que controla o uso de memória.
     * Fica no localStorage: é preferência da máquina, não do documento.
     */
    function setHistoryLimit(value: number | string) {
      const parsed = Math.round(Number(value))
      if (!Number.isFinite(parsed)) return
      const limit = Math.min(HISTORY_LIMIT_MAX, Math.max(HISTORY_LIMIT_MIN, parsed))
      historyLimit.value = limit
      history.value = {
        ...history.value,
        limit,
        // Corta o excedente na hora, senão o novo limite só valeria daqui pra frente.
        past: history.value.past.slice(-limit),
        future: history.value.future.slice(-limit),
      }
      try {
        window.localStorage.setItem(HISTORY_LIMIT_KEY, String(limit))
      } catch {
        // Modo privativo pode bloquear a escrita; o limite ainda vale na sessão.
      }
    }

    function travelHistory(direction: HistoryDirection) {
      // Encerra qualquer edição em curso: a próxima alteração precisa abrir um
      // passo novo, e não se fundir com o estado que acabou de ser restaurado.
      coalescing = null
      const step = direction === 'undo'
        ? undoEditorHistory(history.value, workingDocument.value)
        : redoEditorHistory(history.value, workingDocument.value)
      if (!step.value) return
      history.value = step.history
      publishDocument(step.value)
      setSelection(selectedNodeIds.value.filter((nodeId) => Boolean(step.value?.nodes[nodeId])))
    }

    function setZoom(nextZoom: number) {
      zoom.value = Math.min(200, Math.max(25, Math.round(nextZoom / 25) * 25))
    }

    /**
     * Ajusta o zoom para uma área caber na tela e rola até ela.
     *
     * Sem isto, um documento maior que a janela obriga a caçar o conteúdo no
     * scroll. `Shift+1` enquadra tudo e `Shift+2` a seleção, como no Figma.
     */
    function fitToArea(area: { left: number, top: number, width: number, height: number }) {
      const stage = stageElement.value
      if (!stage || area.width <= 0 || area.height <= 0) return
      const margem = 64
      const disponivel = {
        width: Math.max(1, stage.clientWidth - margem),
        height: Math.max(1, stage.clientHeight - margem),
      }
      const fator = Math.min(disponivel.width / area.width, disponivel.height / area.height)
      // `setZoom` arredonda para múltiplos de 25; arredondar para BAIXO garante
      // que a área realmente caiba, em vez de faltar alguns pixels.
      const passos = Math.floor((fator * 100) / 25) * 25
      zoom.value = Math.min(200, Math.max(25, passos))

      void nextTick(() => {
        const escala = zoom.value / 100
        stage.scrollTo({
          left: area.left * escala - (stage.clientWidth - area.width * escala) / 2,
          top: area.top * escala - (stage.clientHeight - area.height * escala) / 2,
        })
      })
    }

    function zoomToFit() {
      fitToArea({ left: 0, top: 0, width: boardExtent.value.width, height: boardExtent.value.height })
    }

    function zoomToSelection() {
      const caixas = selectedNodes.value.map((node) => boxOf(node, workingDocument.value))
      if (!caixas.length) return zoomToFit()
      const left = Math.min(...caixas.map((caixa) => caixa.left))
      const top = Math.min(...caixas.map((caixa) => caixa.top))
      const right = Math.max(...caixas.map((caixa) => caixa.left + caixa.width))
      const bottom = Math.max(...caixas.map((caixa) => caixa.top + caixa.height))
      fitToArea({ left, top, width: right - left, height: bottom - top })
    }

    function updateCanvasSize(width: number, height: number) {
      const node = canvasNode.value
      if (!node) return
      commit({
        ...commandEnvelope(),
        type: 'node.update',
        payload: {
          nodeId: node.id,
          frame: {
            ...node.frame,
            width: Math.min(10_000, Math.max(240, Math.round(width))),
            height: Math.min(10_000, Math.max(200, Math.round(height))),
          },
        },
      })
    }

    function updateCanvasDimension(dimension: 'width' | 'height', value: string) {
      const next = Number(value)
      if (!Number.isFinite(next)) return
      updateCanvasSize(
        dimension === 'width' ? next : canvasWidth.value,
        dimension === 'height' ? next : canvasHeight.value,
      )
    }

    function updateCanvasBackground(value: string) {
      const node = canvasNode.value
      if (!node) return
      commit({
        ...commandEnvelope(),
        type: 'node.update',
        payload: { nodeId: node.id, style: { ...node.style, backgroundColor: { value } } },
      })
    }

    function setCanvasPreset(id: Viewport) {
      viewport.value = id
      updateCanvasSize(VIEWPORTS[id].width, VIEWPORTS[id].height)
    }

    // ----- artboards ---------------------------------------------------

    /** Cria uma tela nova à direita da última, com um vão de 120px. */
    function addArtboard(preset: Viewport = 'desktop') {
      const size = VIEWPORTS[preset]
      const right = artboards.value.reduce(
        (edge, { node }) => Math.max(edge, node.frame.x + node.frame.width),
        0,
      )
      const stamp = Date.now().toString(36)
      const nodeId = `node_page_${stamp}`
      const pageId = `page_${stamp}`
      const index = artboards.value.length + 1
      const next: GraphicStudioDocument = {
        ...workingDocument.value,
        pages: [...workingDocument.value.pages, {
          id: pageId,
          name: message('artboardName', 'Tela {n}', { n: index }),
          rootNodeId: nodeId,
        }],
        nodes: {
          ...workingDocument.value.nodes,
          [nodeId]: {
            id: nodeId,
            type: 'core/page',
            parentId: null,
            order: index - 1,
            frame: {
              x: right ? right + 120 : 0,
              y: 0,
              width: size.width,
              height: size.height,
              rotation: 0,
              autoResize: 'none',
            },
            style: { backgroundColor: { value: '#ffffff' } },
            content: {},
            locked: false,
            hidden: false,
          } as PageNode,
        },
      }
      // `node.create` recusa `core/page`, então a página entra pelo documento.
      history.value = recordEditorHistory(history.value, workingDocument.value)
      publishDocument(parseGraphicStudioDocument(next))
      activePageId.value = pageId
      setSelection([])
    }

    function removeArtboard(pageId: string) {
      if (workingDocument.value.pages.length < 2) return
      const page = workingDocument.value.pages.find((entry) => entry.id === pageId)
      if (!page) return
      const doomed = new Set([page.rootNodeId])
      let growing = true
      while (growing) {
        growing = false
        for (const node of Object.values(workingDocument.value.nodes)) {
          if (node.parentId && doomed.has(node.parentId) && !doomed.has(node.id)) {
            doomed.add(node.id)
            growing = true
          }
        }
      }
      history.value = recordEditorHistory(history.value, workingDocument.value)
      publishDocument(parseGraphicStudioDocument({
        ...workingDocument.value,
        pages: workingDocument.value.pages.filter((entry) => entry.id !== pageId),
        nodes: Object.fromEntries(
          Object.entries(workingDocument.value.nodes).filter(([id]) => !doomed.has(id)),
        ),
      }))
      activePageId.value = null
      setSelection([])
    }

    function renameArtboard(pageId: string, name: string) {
      const trimmed = name.trim().slice(0, 200)
      if (!trimmed) return
      history.value = recordEditorHistory(history.value, workingDocument.value)
      publishDocument(parseGraphicStudioDocument({
        ...workingDocument.value,
        pages: workingDocument.value.pages.map((entry) =>
          entry.id === pageId ? { ...entry, name: trimmed } : entry),
      }))
    }

    function viewportLabel(id: Viewport) {
      return message(id, VIEWPORTS[id].label)
    }

    function handleEditorShortcut(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      const modifier = event.ctrlKey || event.metaKey
      const key = event.key.toLocaleLowerCase()
      if (modifier && key === 'z') {
        event.preventDefault()
        travelHistory(event.shiftKey ? 'redo' : 'undo')
      } else if (modifier && key === 'y') {
        event.preventDefault()
        travelHistory('redo')
      } else if (modifier && key === 'a') {
        event.preventDefault()
        selectSiblingNodes()
      } else if (modifier && key === 'c') {
        event.preventDefault()
        copySelectedNodes()
      } else if (modifier && key === 'x') {
        event.preventDefault()
        cutSelectedNodes()
      } else if (modifier && key === 'v') {
        event.preventDefault()
        pasteCopiedNodes()
      } else if (modifier && key === 'd') {
        event.preventDefault()
        duplicateSelectedNodes()
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        if (!selectedNodeIds.value.length) return
        event.preventDefault()
        deleteSelectedNode()
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        setZoom(zoom.value + 25)
      } else if (event.key === '-') {
        event.preventDefault()
        setZoom(zoom.value - 25)
      } else if (event.key === '0') {
        event.preventDefault()
        setZoom(100)
      } else if (event.key === '!' || (event.shiftKey && event.key === '1')) {
        // Shift+1 e Shift+2 como no Figma. Em teclado ABNT o shift já entrega
        // `!` e `@`, então os dois caminhos precisam existir.
        event.preventDefault()
        zoomToFit()
      } else if (event.key === '@' || (event.shiftKey && event.key === '2')) {
        event.preventDefault()
        zoomToSelection()
      } else if (event.key === '?') {
        event.preventDefault()
        showShortcuts.value = !showShortcuts.value
      } else if (event.key === 'Escape') {
        closeContextMenu()
        if (showShortcuts.value) {
          showShortcuts.value = false
          return
        }
        setSelection([])
        mobileTray.value = null
      } else if (modifier && key === 'g') {
        event.preventDefault()
        if (event.shiftKey) ungroupSelection()
        else groupSelection()
      } else if (modifier && (event.key === ']' || event.key === '[')) {
        // Ordem de empilhamento: com shift vai direto para o topo/fundo.
        event.preventDefault()
        const forward = event.key === ']'
        restack(event.shiftKey ? (forward ? 'front' : 'back') : (forward ? 'forward' : 'backward'))
      } else if (event.key.startsWith('Arrow')) {
        nudgeSelected(event)
      } else if (event.key === ' ') {
        // Espaço segurado = ferramenta mão, como no Figma.
        event.preventDefault()
        spaceHeld.value = true
      } else if (!modifier && key === 'v') {
        // Ferramentas, como no Figma: V move a caixa, K escala o conteúdo junto.
        activeTool.value = 'move'
      } else if (!modifier && key === 'k') {
        activeTool.value = 'scale'
      } else if (!modifier && ['t', 'r', 'f', 'l'].includes(key)) {
        event.preventDefault()
        activeTool.value = 'move'
        addNode(key === 't' ? 'text' : key === 'r' ? 'block' : key === 'l' ? 'link' : 'heading')
      }
    }

    function handleEditorKeyUp(event: KeyboardEvent) {
      if (event.key === ' ') spaceHeld.value = false
    }

    /** Pan e zoom da prancheta, como em qualquer editor gráfico. */
    function handleStageWheel(event: WheelEvent) {
      const stage = stageElement.value
      if (!stage) return
      if (event.ctrlKey || event.metaKey) {
        // Ctrl+roda = zoom, convenção herdada do gesto de pinça do trackpad.
        event.preventDefault()
        setZoom(zoom.value + (event.deltaY < 0 ? 25 : -25))
        return
      }
      event.preventDefault()
      stage.scrollLeft += event.shiftKey ? event.deltaY : event.deltaX
      stage.scrollTop += event.shiftKey ? 0 : event.deltaY
    }

    function beginPan(event: PointerEvent) {
      // Espaço+arrastar ou botão do meio.
      if (!spaceHeld.value && event.button !== 1) return
      const stage = stageElement.value
      if (!stage) return
      event.preventDefault()
      isPanning.value = true
      const startX = event.clientX
      const startY = event.clientY
      const scrollLeft = stage.scrollLeft
      const scrollTop = stage.scrollTop
      const move = (moveEvent: PointerEvent) => {
        stage.scrollLeft = scrollLeft - (moveEvent.clientX - startX)
        stage.scrollTop = scrollTop - (moveEvent.clientY - startY)
      }
      const stop = () => {
        isPanning.value = false
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', stop)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', stop, { once: true })
    }

    /**
     * Grava no documento o tamanho real dos nós com `frame.autoResize`.
     *
     * Usa `offsetWidth`/`offsetHeight` de propósito: é o border-box do layout,
     * imune a `transform`, logo imune tanto à rotação quanto ao zoom do canvas.
     * Com `getBoundingClientRect()` seria preciso dividir pelo zoom — e esquecer
     * disso multiplicaria todos os tamanhos por 0,75 no zoom padrão.
     *
     * Vai para o histórico como `record: false`: reconciliar não é uma ação do
     * usuário e não deve virar um passo de desfazer.
     */
    /**
     * Passadas seguidas em que a medição mudou algo sem nenhuma edição do
     * usuário no meio. Uma ou duas são normais (a fonte carrega, o texto
     * quebra de outro jeito); dezenas significam dois mecanismos brigando.
     */
    let passadasSemEdicao = 0
    const LIMITE_PASSADAS = 8

    function reconcileAutoSizes() {
      const canvas = canvasElement.value
      // Durante um arraste ou uma edição de texto o tamanho ainda está mudando:
      // gravar agora brigaria com o que o usuário está fazendo.
      if (!canvas || activeInteraction || editingNodeId.value) return
      // Trava de segurança: sem ela, qualquer par medição/derivação que se
      // desfaça mutuamente congela a aba num laço de microtarefas, sem nunca
      // devolver o controle ao navegador.
      if (passadasSemEdicao >= LIMITE_PASSADAS) {
        console.warn('[GraphicStudio] medição automática interrompida: tamanhos não estabilizaram.')
        return
      }
      let changed = false
      for (const node of Object.values(workingDocument.value.nodes)) {
        if (node.frame.autoResize === 'none' || node.hidden) continue
        // Cópias de componente têm geometria derivada do mestre: a próxima
        // sincronização sobrescreve o que for gravado aqui. Medir e gravar
        // nelas criava um laço infinito — a medição gravava, a sincronização
        // revertia, o documento mudava, a medição rodava de novo. Quem é medido
        // é o mestre, e o tamanho dele chega às cópias pela sincronização.
        if (instanceRootOf(workingDocument.value, node.id)) continue
        const element = canvas.querySelector<HTMLElement>(`[data-gs-node-id="${node.id}"]`)
        if (!element) continue
        const width = node.frame.autoResize === 'width-and-height'
          ? element.offsetWidth
          : node.frame.width
        const height = element.offsetHeight
        if (Math.abs(width - node.frame.width) < 0.5 && Math.abs(height - node.frame.height) < 0.5) continue
        commit({
          ...commandEnvelope(),
          type: 'node.update',
          payload: { nodeId: node.id, frame: { ...node.frame, width, height } },
        }, false)
        changed = true
      }
      passadasSemEdicao = changed ? passadasSemEdicao + 1 : 0
      return changed
    }

    function stopPointerListeners() {
      window.removeEventListener('pointermove', continueInteraction)
      window.removeEventListener('pointerup', finishInteraction)
      window.removeEventListener('pointercancel', cancelInteraction)
    }

    /** Todos os descendentes de um nó, incluindo ele mesmo. */
    function subtreeIds(rootId: string): string[] {
      const ids = [rootId]
      for (let index = 0; index < ids.length; index += 1) {
        const currentId = ids[index]
        for (const node of Object.values(workingDocument.value.nodes)) {
          if (node.parentId === currentId && !ids.includes(node.id)) ids.push(node.id)
        }
      }
      return ids
    }

    function beginInteraction(event: PointerEvent, mode: InteractionMode) {
      const node = selectedNode.value
      const box = selectionBox.value
      if (!node || !box || node.locked || node.type === 'core/page') return
      event.preventDefault()
      event.stopPropagation()

      // Alt + arrastar duplica, como no Figma: a cópia é que se move.
      let target = node
      if (mode === 'move' && event.altKey) {
        const duplicated = duplicateSelectedNodes()
        if (duplicated) target = duplicated
      }

      const scaling = activeTool.value === 'scale' && mode !== 'move' && mode !== 'rotate'
      const ids = scaling ? subtreeIds(target.id) : [target.id]
      const styles: Record<string, NodeStyle> = {}
      const frames: Record<string, NodeFrame> = {}
      for (const id of ids) {
        const current = workingDocument.value.nodes[id]
        if (!current) continue
        styles[id] = current.style
        frames[id] = current.frame
      }

      const offset = absoluteOffset(target, workingDocument.value)
      activeInteraction = {
        mode,
        scaling,
        pointerX: event.clientX,
        pointerY: event.clientY,
        startPoint: canvasPoint(event),
        frame: target.frame,
        // O centro é capturado uma vez: rotação preserva x/y/w/h, então ele não
        // muda durante o arraste. Reler o DOM aqui criaria laço de realimentação
        // com a pré-visualização.
        center: {
          x: offset.x + target.frame.width / 2,
          y: offset.y + target.frame.height / 2,
        },
        styles,
        frames,
      }
      interactionFrame.value = target.frame
      window.addEventListener('pointermove', continueInteraction)
      window.addEventListener('pointerup', finishInteraction, { once: true })
      window.addEventListener('pointercancel', cancelInteraction, { once: true })
    }

    /** Ponteiro em coordenadas do canvas (o canvas é escalado pelo zoom). */
    function canvasPoint(event: PointerEvent): Vector {
      const canvas = canvasElement.value
      const scale = zoom.value / 100
      if (!canvas) return { x: event.clientX / scale, y: event.clientY / scale }
      const rect = canvas.getBoundingClientRect()
      return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale }
    }

    /** Linhas de apoio visíveis no arraste atual, em coordenadas da prancheta. */
    const activeGuides = ref<AlignmentGuide[]>([])

    /**
     * Irmãos contra os quais o objeto arrastado se alinha.
     *
     * Só irmãos diretos: alinhar com um bloco dentro de outro container daria uma
     * linha que não corresponde a nada que o usuário veja como "mesma coluna".
     * Os demais selecionados ficam de fora, porque se movem junto.
     */
    function siblingsForSnapping(): MeasuredLayoutNode[] {
      const node = selectedNode.value
      if (!node) return []
      const movendo = new Set(selectedNodeIds.value)
      const irmaos = Object.values(workingDocument.value.nodes)
        .filter((candidate) => candidate.parentId === node.parentId
          && !movendo.has(candidate.id)
          && !candidate.hidden
          && candidate.type !== 'core/page')
        .map((candidate) => ({
          id: candidate.id,
          frame: candidate.frame,
          width: candidate.frame.width,
          height: candidate.frame.height,
        }))

      // O próprio container entra como referência, nas suas coordenadas locais.
      // É o que permite encostar na margem da tela e, principalmente, centralizar
      // — a ação mais comum e a mais chata de acertar no olho.
      const parent = node.parentId ? workingDocument.value.nodes[node.parentId] : undefined
      if (parent) {
        irmaos.push({
          id: parent.id,
          frame: { ...parent.frame, x: 0, y: 0, rotation: 0 },
          width: parent.frame.width,
          height: parent.frame.height,
        })
      }
      return irmaos
    }

    function parentOffsetOfSelection() {
      const node = selectedNode.value
      const parent = node?.parentId ? workingDocument.value.nodes[node.parentId] : undefined
      if (!parent) return { x: 0, y: 0 }
      const offset = absoluteOffset(parent, workingDocument.value)
      return { x: offset.x, y: offset.y }
    }

    function continueInteraction(event: PointerEvent) {
      const interaction = activeInteraction
      if (!interaction) return
      const scale = zoom.value / 100
      const delta = {
        x: (event.clientX - interaction.pointerX) / scale,
        y: (event.clientY - interaction.pointerY) / scale,
      }

      if (interaction.mode === 'rotate') {
        interactionFrame.value = {
          ...interaction.frame,
          rotation: rotationFromPointer(
            interaction.frame.rotation,
            interaction.center,
            interaction.startPoint,
            canvasPoint(event),
            event.shiftKey,
          ),
        }
        return
      }

      if (interaction.mode === 'move') {
        const moved = moveFrame(interaction.frame, delta.x, delta.y)
        if (!snapEnabled.value) {
          interactionFrame.value = moved
          activeGuides.value = []
          return
        }
        // Alinhar com os irmãos vem antes da grade: encostar no bloco vizinho é
        // o que o usuário quer ver acontecer; a grade é só o resto.
        const { frame: alinhado, guides } = snapToSiblings(
          moved,
          siblingsForSnapping(),
          // Tolerância em pixels de TELA: dividir pelo zoom mantém a sensação
          // igual ampliado ou reduzido.
          8 / scale,
        )
        // As guias saem em coordenadas do pai; o overlay desenha em coordenadas
        // da prancheta.
        const origem = parentOffsetOfSelection()
        activeGuides.value = guides.map((guia) => guia.axis === 'x'
          ? { ...guia, position: guia.position + origem.x, from: guia.from + origem.y, to: guia.to + origem.y }
          : { ...guia, position: guia.position + origem.y, from: guia.from + origem.x, to: guia.to + origem.x })
        interactionFrame.value = guides.length ? alinhado : snapFrame(alinhado)
        return
      }

      // Escala e inclinação mudam o nó na tela sem mudar a caixa de layout que
      // estamos redimensionando. A matemática do arraste desfaz as duas.
      const style = selectedNode.value?.style
      const nextFrame = resizeRotatedFrame(interaction.frame, interaction.mode, delta, {
        aspect: event.shiftKey,
        fromCenter: event.altKey,
        minimum: 8,
        grid: snapEnabled.value ? 8 : 0,
        visual: { scale: style?.scale, skewX: style?.skewX, skewY: style?.skewY },
      })

      // Redimensionar também encosta nos vizinhos, mas só a borda puxada: a
      // oposta é a âncora. Com proporção travada o ajuste fica de fora, senão
      // encostar numa borda quebraria a proporção que o shift promete manter.
      let frameFinal = nextFrame
      if (snapEnabled.value && !event.shiftKey) {
        const { frame: encaixado, guides } = snapResizeEdges(
          nextFrame, interaction.mode, siblingsForSnapping(), 8 / scale, 8,
        )
        frameFinal = encaixado
        const origem = parentOffsetOfSelection()
        activeGuides.value = guides.map((guia) => guia.axis === 'x'
          ? { ...guia, position: guia.position + origem.x, from: guia.from + origem.y, to: guia.to + origem.y }
          : { ...guia, position: guia.position + origem.y, from: guia.from + origem.x, to: guia.to + origem.x })
      }
      interactionFrame.value = frameFinal

      if (!interaction.scaling) {
        interactionStyles.value = null
        interactionFrames.value = null
        return
      }

      // Scale tool: o fator sai do próprio resize, e é aplicado aos valores
      // CONGELADOS no pointerdown — multiplicar os valores vivos a cada evento
      // acumularia erro de ponto flutuante.
      // Usa o frame já encaixado: senão o conteúdo escalaria por um fator
      // diferente do tamanho que a caixa realmente assumiu.
      const factor = interaction.frame.width > 0 ? frameFinal.width / interaction.frame.width : 1
      const styles: Record<string, NodeStyle> = {}
      const frames: Record<string, NodeFrame> = {}
      for (const [id, style] of Object.entries(interaction.styles)) {
        styles[id] = scaleStyle(style, factor)
      }
      for (const [id, frame] of Object.entries(interaction.frames)) {
        if (id === selectedNodeId.value) continue
        frames[id] = scaleFrame(frame, factor)
      }
      interactionStyles.value = styles
      interactionFrames.value = frames
    }

    function finishInteraction() {
      const node = selectedNode.value
      const frame = interactionFrame.value
      const interaction = activeInteraction
      const styles = interactionStyles.value
      const frames = interactionFrames.value
      stopPointerListeners()
      activeInteraction = null
      interactionFrame.value = null
      interactionStyles.value = null
      interactionFrames.value = null
      activeGuides.value = []
      if (node && frame) {
        commit({ ...commandEnvelope(), type: 'node.update', payload: { nodeId: node.id, frame } })
        // Scale tool: grava estilo e subárvore no MESMO passo de histórico
        // (`record: false` agrupa tudo num único desfazer).
        if (styles) {
          for (const [id, style] of Object.entries(styles)) {
            commit({ ...commandEnvelope(), type: 'node.update', payload: { nodeId: id, style } }, false)
          }
        }
        if (frames) {
          for (const [id, childFrame] of Object.entries(frames)) {
            if (id === node.id) continue
            commit({ ...commandEnvelope(), type: 'node.update', payload: { nodeId: id, frame: childFrame } }, false)
          }
        }
        if (interaction?.mode === 'move' && selectedNodeIds.value.length > 1) {
          const deltaX = frame.x - interaction.frame.x
          const deltaY = frame.y - interaction.frame.y
          for (const selectedId of selectedNodeIds.value) {
            if (selectedId === node.id) continue
            const selected = workingDocument.value.nodes[selectedId]
            if (selected && !selected.locked) {
              commit({
                ...commandEnvelope(),
                type: 'node.update',
                payload: { nodeId: selected.id, frame: moveFrame(selected.frame, deltaX, deltaY) },
              }, false)
            }
          }
        }
      }
    }

    function cancelInteraction() {
      stopPointerListeners()
      activeInteraction = null
      interactionFrame.value = null
      interactionStyles.value = null
      interactionFrames.value = null
      activeGuides.value = []
    }

    function nudgeSelected(event: KeyboardEvent) {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
      const node = selectedNode.value
      if (!node || node.locked) return
      event.preventDefault()
      const distance = event.shiftKey ? 10 : 1
      const deltaX = event.key === 'ArrowLeft' ? -distance : event.key === 'ArrowRight' ? distance : 0
      const deltaY = event.key === 'ArrowUp' ? -distance : event.key === 'ArrowDown' ? distance : 0
      if (selectedNodeIds.value.length > 1) {
        commitFrames(Object.fromEntries(selectedNodes.value
          .filter((selected) => !selected.locked)
          .map((selected) => [selected.id, moveFrame(selected.frame, deltaX, deltaY)])))
      } else {
        patchSelected({ frame: moveFrame(node.frame, deltaX, deltaY) })
      }
    }

    function selectedParentId() {
      const node = selectedNode.value
      if (node?.type === 'core/block') return node.id
      return workingDocument.value.pages[0]?.rootNodeId
    }

    function addNode(
      type: NodeKind,
      source?: OpenverseImage | IconifySearchResult | LocalAsset,
    ) {
      const parentId = selectedParentId()
      if (!parentId) return

      const siblings = Object.values(workingDocument.value.nodes)
        .filter((node) => node.parentId === parentId)
      const id = `node_${type}_${Date.now().toString(36)}_${commandNumber + 1}`
      // Geometria absoluta: o novo nó precisa nascer com posição e tamanho reais.
      // Ele entra abaixo do irmão mais baixo, para não empilhar tudo no canto.
      const parentNode = workingDocument.value.nodes[parentId]
      const parentWidth = parentNode?.frame.width ?? canvasWidth.value
      const parentHeight = parentNode?.frame.height ?? canvasHeight.value
      const margin = 48
      const defaultWidth = Math.max(64, Math.round(Math.min(parentWidth - margin * 2, 720)))
      const lowestSibling = siblings.reduce(
        (bottom, sibling) => Math.max(bottom, sibling.frame.y + sibling.frame.height),
        0,
      )
      const startY = lowestSibling ? lowestSibling + 24 : margin
      const common = {
        id,
        parentId,
        order: siblings.length,
        frame: {
          x: margin,
          y: Math.min(startY, Math.max(margin, parentHeight - 80)),
          width: defaultWidth,
          height: 80,
          rotation: 0,
          autoResize: 'height' as const,
        },
        style: {},
        locked: false,
        hidden: false,
      }
      let node: GraphicStudioNode

      if (type === 'heading') {
        node = {
          ...common,
          type: 'core/heading',
          style: { fontFamily: 'Manrope', fontSize: 64, fontWeight: 700, lineHeight: 0.98 },
          content: { text: message('newTitle', 'Novo título visual'), level: 2 },
        }
      } else if (type === 'text') {
        node = {
          ...common,
          type: 'core/text',
          style: { fontFamily: 'Manrope', fontSize: 18, lineHeight: 1.6 },
          content: { text: message('newText', 'Escreva algo claro, útil e memorável.') },
        }
      } else if (type === 'link') {
        node = {
          ...common,
          type: 'core/link',
          frame: { ...common.frame, width: 160, height: 44, autoResize: 'width-and-height' as const },
          style: { fontFamily: 'Manrope', fontSize: 16, fontWeight: 700 },
          content: { text: message('newLink', 'Novo link'), href: 'https://example.com' },
        }
      } else if (type === 'block') {
        node = {
          ...common,
          type: 'core/block',
          frame: { ...common.frame, height: 220, autoResize: 'none' as const },
          style: { backgroundColor: { value: '#c8ff3d' }, borderRadius: { value: '24px' } },
          content: { label: message('colorBlock', 'Bloco de cor') },
        }
      } else if (type === 'rectangle' || type === 'ellipse' || type === 'triangle' || type === 'line') {
        const isLine = type === 'line'
        node = {
          ...common,
          type: 'core/shape',
          frame: {
            ...common.frame,
            width: isLine ? defaultWidth : 240,
            height: isLine ? 4 : 240,
            autoResize: 'none' as const,
          },
          style: { backgroundColor: { value: isLine ? '#0f172a' : '#c8ff3d' } },
          content: {
            kind: type === 'rectangle' ? 'rectangle' : type,
            label: message(`shape_${type}`, SHAPE_LABELS[type]),
          },
        }
      } else if (type === 'list') {
        node = {
          ...common,
          type: 'core/list',
          frame: { ...common.frame, height: 120 },
          style: { fontFamily: 'Manrope', fontSize: 18, lineHeight: 1.6 },
          content: {
            ordered: false,
            items: [
              message('listItem1', 'Primeiro item'),
              message('listItem2', 'Segundo item'),
            ],
          },
        }
      } else if (type === 'quote') {
        node = {
          ...common,
          type: 'core/quote',
          frame: { ...common.frame, height: 120 },
          style: { fontFamily: 'Manrope', fontSize: 22, lineHeight: 1.5, paddingLeft: 20 },
          content: { text: message('newQuote', 'Uma frase que vale destaque.'), citation: '' },
        }
      } else if (type === 'embed') {
        node = {
          ...common,
          type: 'core/embed',
          frame: { ...common.frame, width: 560, height: 315, autoResize: 'none' as const },
          style: { borderRadius: { value: '12px' } },
          // Endereço de exemplo: o campo do inspetor só aceita HTTPS, então
          // nascer com um valor válido evita um nó inválido no documento.
          content: { src: 'https://www.youtube.com/embed/dQw4w9WgXcQ', title: message('newEmbed', 'Conteúdo incorporado'), allowFullscreen: true },
        }
      } else if (type === 'icon') {
        const icon = source && 'name' in source ? source : { name: 'lucide:sparkles' }
        node = {
          ...common,
          type: 'core/icon',
          frame: { ...common.frame, width: 72, height: 72, autoResize: 'none' as const },
          style: { color: { value: '#0adf83' }, fontSize: 72 },
          content: { name: icon.name, label: icon.name.split(':')[1]?.replaceAll('-', ' ') ?? message('icon', 'Ícone') },
        }
      } else if (type === 'image') {
        const image = source && 'thumbnail' in source ? source : undefined
        if (!image) return
        node = {
          ...common,
          type: 'core/image',
          frame: { ...common.frame, height: 360, autoResize: 'none' as const },
          style: { borderRadius: { value: '24px' } },
          content: {
            src: image.thumbnail,
            alt: image.title,
            fit: 'cover',
            attribution: `${image.creator} · ${image.license}`,
            sourceUrl: image.sourceUrl,
            ...(image.licenseUrl ? { licenseUrl: image.licenseUrl } : {}),
          },
        }
      } else {
        const asset = source && 'url' in source ? source : undefined
        if (!asset) return
        node = (asset.kind === 'video'
          ? {
              ...common,
              type: 'core/video',
              frame: { ...common.frame, height: 360, autoResize: 'none' as const },
              style: { borderRadius: { value: '18px' } },
              content: { assetId: asset.id, name: asset.name, mediaType: asset.mediaType || 'video/*', controls: true },
            }
          : {
              ...common,
              type: 'core/file',
              frame: { ...common.frame, width: 260, height: 84, autoResize: 'none' as const },
              style: {},
              content: {
                assetId: asset.id,
                name: asset.name,
                mediaType: asset.mediaType,
                size: asset.size,
                kind: asset.kind,
              },
            }) as GraphicStudioNode
      }

      commit({ ...commandEnvelope(), type: 'node.create', payload: { node } })
      setSelection([id], id)
      activePanel.value = 'layers'
    }

    const components = computed(() => Object.entries(workingDocument.value.components)
      .map(([id, component]) => ({ id, ...component }))
      .sort((left, right) => left.name.localeCompare(right.name)))

    /**
     * Promove o nó selecionado a mestre de um componente.
     *
     * O próprio nó vira o mestre em vez de ser copiado para uma biblioteca
     * separada: editar o componente é editar o bloco que já está na página, sem
     * uma segunda tela de edição.
     */
    function createComponentFromSelection() {
      const node = selectedNode.value
      if (!node || node.type === 'core/page' || node.instanceOf) return
      commandNumber += 1
      const componentId = `cmp_${Date.now().toString(36)}_${commandNumber}`
      commit({
        ...commandEnvelope(),
        type: 'document.setComponent',
        payload: {
          componentId,
          component: {
            name: layerLabel(node).slice(0, 200) || message('component', 'Componente'),
            masterNodeId: node.id,
          },
        },
      })
      activePanel.value = 'insert'
    }

    function insertComponentInstance(componentId: string) {
      const parentId = selectedParentId()
      const component = workingDocument.value.components[componentId]
      const master = component && workingDocument.value.nodes[component.masterNodeId]
      if (!parentId || !master || master.type === 'core/page') return

      const siblings = Object.values(workingDocument.value.nodes)
        .filter((node) => node.parentId === parentId)
      commandNumber += 1
      const id = `node_inst_${Date.now().toString(36)}_${commandNumber}`
      const node = structuredClone(master) as GraphicStudioNode & { name?: string; groups?: string[] }
      // `name` e `groups` viram `id` e `class` no HTML: duplicá-los invalidaria
      // o documento. A cópia nasce sem eles.
      delete node.name
      delete node.groups
      commit({
        ...commandEnvelope(),
        type: 'node.create',
        payload: {
          node: {
            ...node,
            id,
            parentId,
            order: siblings.length,
            instanceOf: componentId,
            frame: { ...master.frame, x: master.frame.x + 24, y: master.frame.y + 24 },
          } as GraphicStudioNode,
        },
      })
      setSelection([id], id)
    }

    function detachInstance() {
      const node = selectedNode.value
      const instance = node && instanceRootOf(workingDocument.value, node.id)
      if (!instance) return
      commit({
        ...commandEnvelope(),
        type: 'node.update',
        payload: { nodeId: instance.id, instanceOf: null },
      })
      setSelection([instance.id], instance.id)
    }

    /** Descarta as sobrescritas e faz a cópia voltar a ser igual ao mestre. */
    function clearOverrides() {
      const node = selectedNode.value
      const instance = node && instanceRootOf(workingDocument.value, node.id)
      if (!instance?.overrides) return
      commit({
        ...commandEnvelope(),
        type: 'node.update',
        payload: { nodeId: instance.id, overrides: null },
      })
    }

    function removeComponent(componentId: string) {
      commit({
        ...commandEnvelope(),
        type: 'document.setComponent',
        payload: { componentId, component: null },
      })
    }

    function importFiles(files: FileList | File[]) {
      const accepted: LocalAsset[] = []
      for (const file of Array.from(files)) {
        if (file.size > 25 * 1_048_576) {
          assetStatus.value = message('fileTooLarge', '{name} excede o limite local de 25 MB.', { name: file.name })
          continue
        }
        accepted.push({
          id: `asset_${Date.now().toString(36)}_${localAssets.value.length + accepted.length + 1}`,
          name: file.name,
          mediaType: file.type,
          size: file.size,
          kind: classifyLocalAsset(file.name, file.type),
          url: URL.createObjectURL(file),
        })
      }
      localAssets.value = [...localAssets.value, ...accepted]
      if (accepted.length) assetStatus.value = message('filesAdded', '{count} arquivo(s) adicionado(s) à sessão local.', { count: accepted.length })
    }

    function handleFileInput(event: Event) {
      const input = event.target as HTMLInputElement
      if (input.files) importFiles(input.files)
      input.value = ''
    }

    function removeLocalAsset(asset: LocalAsset) {
      const inUse = Object.values(workingDocument.value.nodes).some((node) =>
        (node.type === 'core/video' || node.type === 'core/file') && node.content.assetId === asset.id,
      )
      if (inUse) {
        assetStatus.value = message('fileInUse', '{name} está em uso no canvas. Exclua a camada primeiro.', { name: asset.name })
        return
      }
      URL.revokeObjectURL(asset.url)
      localAssets.value = localAssets.value.filter((candidate) => candidate.id !== asset.id)
      assetStatus.value = message('fileRemoved', '{name} removido da sessão.', { name: asset.name })
    }

    /**
     * Grava conteúdo de um nó que vive dentro de uma cópia de componente.
     *
     * Alterar o nó direto não adianta: a próxima sincronização o reconstrói a
     * partir do mestre. A mudança vira sobrescrita na raiz da cópia, que
     * sobrevive. Devolve `false` quando o nó não faz parte de uma cópia — aí
     * quem chamou grava do jeito normal.
     */
    function commitNodeContent(
      nodeId: string,
      content: NonNullable<NodeUpdatePatch['content']>,
      coalesceKey?: string,
    ): boolean {
      const instance = instanceRootOf(workingDocument.value, nodeId)
      if (!instance) return false
      const key = overrideKeyOf(nodeId, instance.id)
      if (!key) return false
      commit({
        ...commandEnvelope(),
        type: 'node.update',
        payload: {
          nodeId: instance.id,
          overrides: { ...(instance.overrides ?? {}), [key]: { content } },
        },
      }, true, coalesceKey)
      return true
    }

    function patchSelected(patch: NodeUpdatePatch, coalesceKey?: string) {
      const node = selectedNode.value
      if (!node) return

      if (patch.content && commitNodeContent(node.id, patch.content, coalesceKey)) {
        const { content: _tratado, ...resto } = patch
        // O resto do patch (geometria, estilo) segue para o nó, onde continua
        // valendo até a próxima sincronização.
        if (Object.keys(resto).length === 0) return
        patch = resto
      }

      commit({
        ...commandEnvelope(),
        type: 'node.update',
        payload: { nodeId: node.id, ...patch },
      }, true, coalesceKey)
    }

    /*
     * Título e endereço do documento.
     *
     * O `slug` é o endereço da página publicada, então precisa ser editável:
     * sem isto toda página publicada herdaria o nome do rascunho inicial e a
     * segunda colidiria com a primeira.
     */
    const metadataError = ref('')

    function updateDocumentTitle(value: string) {
      const titulo = value.trim().slice(0, 500)
      if (!titulo) {
        metadataError.value = message('titleRequired', 'O documento precisa de um título.')
        return
      }
      metadataError.value = ''
      commit({
        ...commandEnvelope(),
        type: 'document.patchMetadata',
        payload: { title: titulo },
      }, true, 'metadata:titulo')
    }

    function updateDocumentSlug(value: string) {
      const slug = value.trim().toLowerCase()
      // Mesmo padrão do schema: sem acento, sem espaço, sem barra.
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        metadataError.value = message('slugInvalidDoc',
          'O endereço usa minúsculas, números e hífen. Ex.: relatorio-2026')
        return
      }
      metadataError.value = ''
      commit({
        ...commandEnvelope(),
        type: 'document.patchMetadata',
        payload: { slug },
      }, true, 'metadata:slug')
    }

    /*
     * Identidade no HTML: `name` vira o `id` do elemento e `groups` viram as
     * classes. É o contrato de tradução do documento, e sem estes campos o
     * editor produzia markup anônimo, impossível de estilizar ou referenciar
     * por fora.
     */
    const SLUG_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
    const identityError = ref('')

    function updateNodeName(value: string) {
      const node = selectedNode.value
      if (!node) return
      const limpo = value.trim().toLowerCase()
      if (!limpo) {
        identityError.value = ''
        patchSelected({ name: null })
        return
      }
      if (!SLUG_PATTERN.test(limpo)) {
        // Validado aqui porque o schema rejeitaria dentro do commit, e uma
        // exceção no meio da digitação derrubaria o editor.
        identityError.value = message('slugInvalid',
          'Use minúsculas, começando por letra, separando com hífen. Ex.: titulo-principal')
        return
      }
      const emUso = Object.values(workingDocument.value.nodes)
        .some((outro) => outro.id !== node.id && outro.name === limpo)
      if (emUso) {
        identityError.value = message('slugTaken', 'Já existe outro bloco com esse identificador.')
        return
      }
      identityError.value = ''
      patchSelected({ name: limpo }, `identidade:${node.id}`)
    }

    function updateNodeGroups(value: string) {
      const node = selectedNode.value
      if (!node) return
      const lista = value.split(/[\s,]+/).filter(Boolean).map((grupo) => grupo.toLowerCase())
      if (lista.some((grupo) => !SLUG_PATTERN.test(grupo))) {
        identityError.value = message('groupInvalid',
          'Cada grupo usa minúsculas e hífen. Separe por espaço ou vírgula.')
        return
      }
      identityError.value = ''
      patchSelected({ groups: lista.length ? [...new Set(lista)] : null }, `grupos:${node.id}`)
    }

    /** Prévia do markup que este nó vai gerar, para o contrato ficar visível. */
    function htmlPreview(node: GraphicStudioNode): string {
      const tag = node.type === 'core/heading'
        ? `h${(node.content as { level?: number }).level ?? 2}`
        : node.type === 'core/text' ? 'p'
          : node.type === 'core/link' ? 'a'
            : node.type === 'core/list' ? 'ul'
              : node.type === 'core/quote' ? 'blockquote'
                : node.type === 'core/image' ? 'figure' : 'div'
      const id = node.name ? ` id="${node.name}"` : ''
      const classes = node.groups?.length ? ` class="${node.groups.join(' ')}"` : ''
      return `<${tag}${id}${classes}>`
    }

    function patchSelectedStyle(style: GraphicStudioNode['style'], coalesceKey?: string) {
      const node = selectedNode.value
      if (!node) return
      patchSelected({ style: { ...node.style, ...style } }, coalesceKey)
    }

    function toggleBoxShadow(enabled: boolean) {
      patchSelectedStyle({
        boxShadow: enabled
          ? { x: 0, y: 12, blur: 32, spread: 0, color: { value: '#00000033' }, inset: false }
          : undefined,
      })
    }

    function updateBoxShadow(key: keyof BoxShadowStyle, value: number | boolean | { value: string }) {
      const shadow = selectedNode.value?.style.boxShadow
      if (!shadow) return
      patchSelectedStyle({ boxShadow: { ...shadow, [key]: value } as BoxShadowStyle })
    }

    function toggleTextShadow(enabled: boolean) {
      patchSelectedStyle({
        textShadow: enabled
          ? { x: 0, y: 3, blur: 8, color: { value: '#00000055' } }
          : undefined,
      })
    }

    function updateTextShadow(key: keyof TextShadowStyle, value: number | { value: string }) {
      const shadow = selectedNode.value?.style.textShadow
      if (!shadow) return
      patchSelectedStyle({ textShadow: { ...shadow, [key]: value } as TextShadowStyle })
    }

    function updateFilter(key: keyof FilterStyle, value: number) {
      const current = selectedNode.value?.style.filter ?? {
        blur: 0, brightness: 1, contrast: 1, saturate: 1, grayscale: 0,
      }
      patchSelectedStyle({ filter: { ...current, [key]: value } })
    }

    function updateSelectedText(event: Event) {
      const node = selectedNode.value
      if (!isTextualNode(node)) return
      patchSelected({ content: { ...node.content, text: targetValue(event) } }, `texto:${node.id}`)
    }

    function updateImageContent(key: 'alt' | 'fit' | 'src', value: string) {
      const node = selectedNode.value
      if (node?.type !== 'core/image') return
      if (key === 'src' && !/^https:\/\/\S+$/i.test(value.trim())) {
        // O schema recusa qualquer coisa fora de HTTPS, e a exceção cairia dentro
        // do commit.
        imageStatus.value = message('imageUrlInvalid', 'Use um endereço começando com https://')
        return
      }
      patchSelected({
        content: {
          src: key === 'src' ? value.trim() : node.content.src,
          alt: key === 'alt' ? value : node.content.alt,
          fit: key === 'fit' ? value : node.content.fit,
          ...(node.content.attribution ? { attribution: node.content.attribution } : {}),
          ...(node.content.sourceUrl ? { sourceUrl: node.content.sourceUrl } : {}),
          ...(node.content.licenseUrl ? { licenseUrl: node.content.licenseUrl } : {}),
        },
      })
    }

    function updateIconContent(key: 'name' | 'label', value: string) {
      const node = selectedNode.value
      if (node?.type !== 'core/icon') return
      patchSelected({ content: { ...node.content, [key]: value } })
    }

    function updateBlockLabel(value: string) {
      const node = selectedNode.value
      if (node?.type !== 'core/block') return
      patchSelected({ content: { ...node.content, label: value } })
    }

    function updateQuoteContent(key: 'text' | 'citation', value: string) {
      const node = selectedNode.value
      if (!isQuoteNode(node)) return
      patchSelected({ content: { ...node.content, [key]: value } }, `citacao:${key}:${node.id}`)
    }

    /**
     * Uma linha do textarea = um item da lista.
     *
     * O schema exige pelo menos um item, então uma lista vazia vira um item em
     * branco em vez de um documento inválido no meio da digitação.
     */
    function updateListItems(value: string) {
      const node = selectedNode.value
      if (!isListNode(node)) return
      const items = value.split('\n').map((line) => line.slice(0, 2_000)).slice(0, 200)
      patchSelected({
        content: { ...node.content, items: items.length ? items : [''] },
      }, `lista:${node.id}`)
    }

    function updateListOrdered(ordered: boolean) {
      const node = selectedNode.value
      if (!isListNode(node)) return
      patchSelected({ content: { ...node.content, ordered } })
    }

    function updateEmbedContent(key: 'src' | 'title', value: string) {
      const node = selectedNode.value
      if (!isEmbedNode(node)) return
      patchSelected({ content: { ...node.content, [key]: value } })
    }

    function updateShapeKind(kind: string) {
      const node = selectedNode.value
      if (!isShapeNode(node)) return
      patchSelected({ content: { ...node.content, kind: kind as ShapeNode['content']['kind'] } })
    }

    function updateLinkContent(key: 'text' | 'href', value: string) {
      const node = selectedNode.value
      if (node?.type !== 'core/link') return
      patchSelected({ content: { ...node.content, [key]: value } })
    }

    function updateFrameNumber(key: 'x' | 'y' | 'width' | 'height', value: string) {
      const node = selectedNode.value
      if (!node) return
      patchSelected({ frame: { ...node.frame, [key]: Number(value) } }, `geometria:${key}`)
    }

    function updateRotation(value: string) {
      const node = selectedNode.value
      if (!node) return
      const rotation = ((Number(value) % 360) + 360) % 360
      patchSelected({ frame: { ...node.frame, rotation } }, 'rotacao')
    }

    function toggleNodeLock(node: GraphicStudioNode) {
      setSelection([node.id], node.id)
      patchSelected({ locked: !node.locked })
    }

    type NodeAnimation = NonNullable<GraphicStudioNode['animation']>
    type Keyframe = NonNullable<NodeAnimation['keyframes']>[number]

    /** Base comum a preset e keyframes, para não repetir os defaults. */
    function animationBase(): Omit<NodeAnimation, 'preset' | 'keyframes'> {
      const current = selectedNode.value?.animation
      return {
        duration: current?.duration ?? 600,
        delay: current?.delay ?? 0,
        easing: current?.easing ?? 'ease-out',
        iterations: current?.iterations ?? 1,
        direction: current?.direction ?? 'normal',
      }
    }

    function setAnimation(preset: string) {
      if (!preset) {
        patchSelected({ animation: null })
        return
      }
      patchSelected({
        animation: { ...animationBase(), preset: preset as NodeAnimation['preset'] },
      })
    }

    /**
     * Troca entre animação pronta e quadro a quadro.
     *
     * Os dois modos não convivem no mesmo nó: `preset` e `keyframes` gerariam
     * duas regras concorrentes para a mesma propriedade. Ao entrar no modo
     * quadro a quadro, nasce um par de quadros — o mínimo que o schema aceita e
     * o suficiente para já ver algo se mexendo.
     */
    function setAnimationMode(mode: 'none' | 'preset' | 'keyframes') {
      if (mode === 'none') {
        patchSelected({ animation: null })
        return
      }
      if (mode === 'preset') {
        patchSelected({ animation: { ...animationBase(), preset: 'fade-up' } })
        return
      }
      patchSelected({
        animation: {
          ...animationBase(),
          keyframes: selectedNode.value?.animation?.keyframes ?? [
            { offset: 0, opacity: 0, y: 24 },
            { offset: 100, opacity: 1, y: 0 },
          ],
        },
      })
    }

    function updateAnimationNumber(key: 'duration' | 'delay' | 'iterations', value: string) {
      const animation = selectedNode.value?.animation
      if (!animation) return
      patchSelected({ animation: { ...animation, [key]: Number(value) } })
    }

    function updateAnimationChoice(key: 'easing' | 'direction', value: string) {
      const animation = selectedNode.value?.animation
      if (!animation) return
      patchSelected({ animation: { ...animation, [key]: value as never } })
    }

    function patchKeyframes(frames: Keyframe[], coalesceKey?: string) {
      const animation = selectedNode.value?.animation
      if (!animation) return
      // Ordenados por tempo: o CSS aceita fora de ordem, mas a lista na tela
      // ficaria embaralhada a cada edição de `offset`.
      const sorted = [...frames].sort((left, right) => left.offset - right.offset)
      patchSelected({ animation: { ...animation, keyframes: sorted } }, coalesceKey)
    }

    function addKeyframe() {
      const frames = selectedNode.value?.animation?.keyframes
      if (!frames) return
      const last = frames[frames.length - 1]
      const previous = frames[frames.length - 2]
      // Novo quadro no meio do último intervalo: sempre cabe, e não colide com
      // um `offset` existente.
      const offset = Math.round(((previous?.offset ?? 0) + (last?.offset ?? 100)) / 2)
      patchKeyframes([...frames, { offset, opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }])
    }

    function updateKeyframe(index: number, key: keyof Keyframe, value: string) {
      const frames = selectedNode.value?.animation?.keyframes
      if (!frames?.[index]) return
      const next = frames.map((frame, position) => (
        position === index ? { ...frame, [key]: Number(value) } : frame
      ))
      patchKeyframes(next, `quadro:${index}:${key}`)
    }

    function removeKeyframe(index: number) {
      const frames = selectedNode.value?.animation?.keyframes
      // O schema exige no mínimo dois quadros: com um só não há o que interpolar.
      if (!frames || frames.length <= 2) return
      patchKeyframes(frames.filter((_, position) => position !== index))
    }

    /**
     * Reinicia a animação do nó selecionado.
     *
     * Trocar a chave do renderer o remonta, e uma animação CSS só recomeça em um
     * elemento novo. É o mesmo truque que o Figma faz ao dar "play".
     */
    const previewNonce = ref(0)
    const animationPreview = ref(false)
    let previewTimer: number | undefined

    function replayAnimation() {
      const animation = selectedNode.value?.animation
      if (!animation) return
      window.clearTimeout(previewTimer)
      animationPreview.value = true
      previewNonce.value += 1
      // Volta ao estado final quando termina, para não deixar o canvas em
      // movimento durante a edição. Animação infinita fica rodando até o próximo
      // Prever ou até trocar de seleção.
      if (animation.iterations !== 0) {
        const total = animation.delay + animation.duration * animation.iterations + 100
        previewTimer = window.setTimeout(() => { animationPreview.value = false }, total)
      }
    }

    watch(selectedNodeId, () => {
      window.clearTimeout(previewTimer)
      animationPreview.value = false
    })

    /** Tamanhos vêm do documento agora — nada de medir o DOM. */
    function measuredSelection(): MeasuredLayoutNode[] {
      return selectedNodes.value.map((node) => ({
        id: node.id,
        frame: node.frame,
        width: node.frame.width,
        height: node.frame.height,
      }))
    }

    function commitFrames(frames: Record<string, NodeFrame>) {
      let record = true
      for (const [nodeId, frame] of Object.entries(frames)) {
        const node = workingDocument.value.nodes[nodeId]
        if (!node || node.locked) continue
        commit({ ...commandEnvelope(), type: 'node.update', payload: { nodeId, frame } }, record)
        record = false
      }
    }

    function alignSelection(alignment: Alignment) {
      if (!selectionHasCommonParent.value || selectedNodes.value.some((node) => node.locked)) return
      commitFrames(alignNodeFrames(measuredSelection(), alignment))
    }

    function distributeSelection(axis: DistributionAxis) {
      if (!selectionHasCommonParent.value || selectedNodes.value.length < 3 || selectedNodes.value.some((node) => node.locked)) return
      commitFrames(distributeNodeFrames(measuredSelection(), axis))
    }

    function groupSelection() {
      if (!selectionHasCommonParent.value || selectedNodes.value.some((node) => node.locked)) return
      const selected = [...selectedNodes.value]
      const parentId = selected[0]?.parentId
      const layout = createGroupLayout(measuredSelection())
      if (!parentId || !layout) return
      const groupId = `node_group_${Date.now().toString(36)}_${commandNumber + 1}`
      const group: GraphicStudioNode = {
        id: groupId,
        type: 'core/block',
        parentId,
        order: Math.min(...selected.map((node) => node.order)),
        frame: layout.frame,
        style: {},
        content: { label: message('groupLabel', 'Grupo') },
        locked: false,
        hidden: false,
      }
      commit({ ...commandEnvelope(), type: 'node.create', payload: { node: group } })
      selected.forEach((node, index) => {
        const frame = layout.children[node.id]
        if (!frame) return
        commit({
          ...commandEnvelope(),
          type: 'node.update',
          payload: { nodeId: node.id, parentId: groupId, order: index, frame },
        }, false)
      })
      setSelection([groupId], groupId)
    }

    /** Na v2 não existe mais `layout: 'free'`: grupo é um bloco com filhos. */
    const canUngroup = computed(() => {
      const node = selectedNode.value
      return node?.type === 'core/block'
        && Boolean(node.parentId)
        && Object.values(workingDocument.value.nodes).some((child) => child.parentId === node.id)
    })

    function ungroupSelection() {
      const group = selectedNode.value
      if (!canUngroup.value || group?.type !== 'core/block' || !group.parentId) return
      const children = Object.values(workingDocument.value.nodes)
        .filter((node) => node.parentId === group.id)
        .sort((left, right) => left.order - right.order)
      let record = true
      for (const [index, child] of children.entries()) {
        commit({
          ...commandEnvelope(),
          type: 'node.update',
          payload: {
            nodeId: child.id,
            parentId: group.parentId,
            order: group.order + index,
            frame: { ...child.frame, x: group.frame.x + child.frame.x, y: group.frame.y + child.frame.y },
          },
        }, record)
        record = false
      }
      commit({ ...commandEnvelope(), type: 'node.delete', payload: { nodeId: group.id } }, record)
      setSelection(children.map((node) => node.id))
    }

    function deleteSelectedNode() {
      const selected = new Set(selectedNodeIds.value)
      const nodeIds = selectedNodeIds.value.filter((nodeId) => {
        let parentId = workingDocument.value.nodes[nodeId]?.parentId
        while (parentId) {
          if (selected.has(parentId)) return false
          parentId = workingDocument.value.nodes[parentId]?.parentId ?? null
        }
        return true
      })
      nodeIds.forEach((nodeId, index) => commit({
        ...commandEnvelope(),
        type: 'node.delete',
        payload: { nodeId },
      }, index === 0))
      setSelection([])
    }

    function selectSiblingNodes() {
      const parentId = selectedNode.value?.parentId ?? workingDocument.value.pages[0]?.rootNodeId
      if (!parentId) return
      setSelection(Object.values(workingDocument.value.nodes)
        .filter((node) => node.parentId === parentId && !node.hidden)
        .sort((left, right) => left.order - right.order)
        .map((node) => node.id))
    }

    function copySelectedNodes() {
      clipboard = copyNodeSelection(workingDocument.value, selectedNodeIds.value)
      pasteNumber = 0
    }

    function pasteNodes(source: NodeClipboard | null, offset = 16): GraphicStudioNode | undefined {
      if (!source) return undefined
      let cloneNumber = 0
      const stamp = Date.now().toString(36)
      const pasted = materializeNodeClipboard(
        workingDocument.value,
        source,
        () => `node_copy_${stamp}_${commandNumber + 1}_${cloneNumber += 1}`,
        offset,
      )
      pasted.nodes.forEach((node, index) => commit({
        ...commandEnvelope(),
        type: 'node.create',
        payload: { node },
      }, index === 0))
      setSelection(pasted.rootIds)
      const rootId = pasted.rootIds[0]
      return rootId ? workingDocument.value.nodes[rootId] : undefined
    }

    function pasteCopiedNodes() {
      if (!clipboard) return
      pasteNumber += 1
      pasteNodes(clipboard, Math.min(64, pasteNumber * 16))
    }

    /** Devolve o nó raiz da cópia, para o alt+arrastar poder mover a duplicata. */
    function duplicateSelectedNodes(): GraphicStudioNode | undefined {
      return pasteNodes(copyNodeSelection(workingDocument.value, selectedNodeIds.value))
    }

    function cutSelectedNodes() {
      copySelectedNodes()
      if (clipboard) deleteSelectedNode()
    }

    function updateSelectedNodes(key: 'hidden' | 'locked', value: boolean) {
      let record = true
      for (const node of selectedNodes.value) {
        if (node[key] === value) continue
        commit({
          ...commandEnvelope(),
          type: 'node.update',
          payload: key === 'hidden'
            ? { nodeId: node.id, hidden: value }
            : { nodeId: node.id, locked: value },
        }, record)
        record = false
      }
      if (key === 'hidden' && value) setSelection([])
    }

    function toggleSelectedLock() {
      updateSelectedNodes('locked', selectedNodes.value.some((node) => !node.locked))
    }

    function toggleSelectedVisibility() {
      updateSelectedNodes('hidden', selectedNodes.value.some((node) => !node.hidden))
    }

    function moveLayer(direction: -1 | 1) {
      const node = selectedNode.value
      if (!node) return
      const siblings = Object.values(workingDocument.value.nodes)
        .filter((candidate) => candidate.parentId === node.parentId)
        .sort((left, right) => left.order - right.order)
      const index = siblings.findIndex((candidate) => candidate.id === node.id)
      const neighbour = siblings[index + direction]
      if (!neighbour) return
      const currentOrder = node.order
      commit({ ...commandEnvelope(), type: 'node.update', payload: { nodeId: neighbour.id, order: currentOrder } })
      commit({ ...commandEnvelope(), type: 'node.update', payload: { nodeId: node.id, order: neighbour.order } }, false)
    }

    /**
     * Ordem de empilhamento entre irmãos. `order` é reescrito em sequência
     * (0,1,2…) para que a posição fique sempre sem ambiguidade — `zIndex` do
     * estilo continua existindo, mas é um ajuste manual à parte.
     */
    function restack(target: 'front' | 'back' | 'forward' | 'backward') {
      const node = selectedNode.value
      if (!node || node.type === 'core/page') return
      const siblings = Object.values(workingDocument.value.nodes)
        .filter((candidate) => candidate.parentId === node.parentId)
        .sort((left, right) => left.order - right.order)
      const index = siblings.findIndex((candidate) => candidate.id === node.id)
      if (index < 0) return
      const to = target === 'front' ? siblings.length - 1
        : target === 'back' ? 0
          : target === 'forward' ? Math.min(siblings.length - 1, index + 1)
            : Math.max(0, index - 1)
      if (to === index) return
      const reordered = [...siblings]
      const [moved] = reordered.splice(index, 1)
      if (moved) reordered.splice(to, 0, moved)
      let record = true
      reordered.forEach((sibling, position) => {
        if (sibling.order === position) return
        commit({
          ...commandEnvelope(),
          type: 'node.update',
          payload: { nodeId: sibling.id, order: position },
        }, record)
        record = false
      })
    }

    function openContextMenu(event: MouseEvent) {
      event.preventDefault()
      const target = event.target
      const element = target instanceof HTMLElement
        ? target.closest<HTMLElement>('[data-gs-node-id]')
        : null
      const nodeId = element?.dataset.gsNodeId ?? null
      // Clicar com o botão direito num nó fora da seleção seleciona ele antes.
      if (nodeId && !selectedNodeIds.value.includes(nodeId)) {
        const node = workingDocument.value.nodes[nodeId]
        if (node && node.type !== 'core/page') setSelection([nodeId])
      }
      contextMenu.value = { x: event.clientX, y: event.clientY, nodeId }
    }

    function closeContextMenu() {
      contextMenu.value = null
    }

    /**
     * Edição de texto direto no canvas, com duplo clique — como em qualquer
     * editor gráfico. Antes só dava para editar pelo textarea do inspector.
     *
     * O elemento vira `contenteditable` no lugar, sem passar por um input
     * paralelo: o texto é gravado só ao sair (blur/Enter/Escape), então não há
     * re-render durante a digitação e o cursor não pula.
     */
    function editSelectedText() {
      const node = selectedNode.value
      const canvas = canvasElement.value
      if (!node || !isTextualNode(node) || node.locked || !canvas) return
      const element = canvas.querySelector<HTMLElement>(`[data-gs-node-id="${node.id}"]`)
      if (!element) return

      const nodeId = node.id
      const originalText = node.content.text
      editingNodeId.value = nodeId
      element.contentEditable = 'plaintext-only'
      element.spellcheck = false
      element.focus()
      document.getSelection()?.selectAllChildren(element)

      const finish = (keepChanges: boolean) => {
        element.removeEventListener('blur', onBlur)
        element.removeEventListener('keydown', onKeydown)
        element.contentEditable = 'false'
        editingNodeId.value = null
        const current = workingDocument.value.nodes[nodeId]
        if (!isTextualNode(current)) return
        const text = element.textContent ?? ''
        if (keepChanges && text !== current.content.text) {
          const content = { ...current.content, text }
          // Mesma rota do inspetor: dentro de uma cópia isto vira sobrescrita.
          if (!commitNodeContent(nodeId, content)) {
            commit({
              ...commandEnvelope(),
              type: 'node.update',
              payload: { nodeId, content },
            })
          }
        } else {
          // Cancelado (ou sem mudança): devolve o DOM ao texto do documento.
          element.textContent = keepChanges ? current.content.text : originalText
        }
        void nextTick(reconcileAutoSizes)
      }
      const onBlur = () => { finish(true) }
      const onKeydown = (keyEvent: KeyboardEvent) => {
        // Enquanto edita, as teclas são do texto — não do editor.
        keyEvent.stopPropagation()
        if (keyEvent.key === 'Escape') {
          keyEvent.preventDefault()
          element.textContent = originalText
          finish(false)
        }
        // Em título e link, Enter encerra; em parágrafo, quebra linha.
        if (keyEvent.key === 'Enter' && !keyEvent.shiftKey && node.type !== 'core/text') {
          keyEvent.preventDefault()
          finish(true)
        }
      }
      element.addEventListener('blur', onBlur, { once: true })
      element.addEventListener('keydown', onKeydown)
    }

    /** Nó mais externo dentro do artboard — o que o Figma seleciona no 1º clique. */
    function outermostAncestor(nodeId: string): string {
      let current = workingDocument.value.nodes[nodeId]
      while (current) {
        const parent = current.parentId ? workingDocument.value.nodes[current.parentId] : undefined
        if (!parent || parent.type === 'core/page') return current.id
        current = parent
      }
      return nodeId
    }

    function editFromCanvas(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      const nodeId = target.closest<HTMLElement>('[data-gs-node-id]')?.dataset.gsNodeId
      if (!nodeId) return
      event.preventDefault()
      event.stopPropagation()
      const node = workingDocument.value.nodes[nodeId]
      if (!node || node.type === 'core/page') return
      // Duplo clique entra no grupo. Se já estava no nó de texto, edita.
      if (selectedNodeId.value === nodeId && isTextualNode(node)) {
        editSelectedText()
        return
      }
      setSelection([nodeId], nodeId)
      if (isTextualNode(node) && outermostAncestor(nodeId) === nodeId) editSelectedText()
    }

    function selectFromCanvas(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      const nodeElement = target.closest<HTMLElement>('[data-gs-node-id]')
      if (!nodeElement?.dataset.gsNodeId || nodeElement.dataset.gsNodeType === 'core/page') {
        if (!event.shiftKey) setSelection([])
        return
      }
      event.preventDefault()
      const hitId = nodeElement.dataset.gsNodeId
      // Como no Figma: o clique pega o bloco mais externo. Só depois de já estar
      // dentro dele (ou com duplo clique) é que se seleciona o filho. Antes o
      // clique sempre pegava o nó mais fundo, e não havia como pegar o grupo.
      const container = outermostAncestor(hitId)
      const alreadyInside = selectedNodeIds.value.some((id) => outermostAncestor(id) === container)
      selectNode(alreadyInside ? hitId : container, event.shiftKey)
      // Não força mais a troca de painel: trocava para "Camadas" a cada clique,
      // tirando o usuário do painel em que ele estava trabalhando.
    }

    async function searchImages() {
      isSearchingImages.value = true
      imageStatus.value = message('searchingOpenverse', 'Buscando no Openverse…')
      try {
        imageResults.value = await searchOpenverseImages(imageQuery.value)
        imageStatus.value = message('imageResults', '{count} imagens abertas encontradas.', { count: imageResults.value.length })
      } catch {
        imageStatus.value = message('imageSearchError', 'Não foi possível buscar imagens.')
      } finally {
        isSearchingImages.value = false
      }
    }

    async function searchIcons() {
      isSearchingIcons.value = true
      iconStatus.value = message('searchingIconify', 'Buscando no Iconify…')
      try {
        iconResults.value = await searchIconifyIcons(iconQuery.value)
        iconStatus.value = message('iconResults', '{count} ícones encontrados.', { count: iconResults.value.length })
      } catch {
        iconStatus.value = message('iconSearchError', 'Não foi possível buscar ícones.')
      } finally {
        isSearchingIcons.value = false
      }
    }

    function layerLabel(node: GraphicStudioNode): string {
      if (node.type === 'core/page') {
        const page = workingDocument.value.pages.find((entry) => entry.rootNodeId === node.id)
        return page?.name ?? message('artboard', 'Tela')
      }
      if (isTextualNode(node)) return String(node.content.text || message('noText', 'Sem texto'))
      if (node.type === 'core/icon') return String(node.content.name)
      if (node.type === 'core/image') return String(node.content.alt || message('image', 'Imagem'))
      if (node.type === 'core/block') return String(node.content.label)
      if (isShapeNode(node)) return node.content.label
      if (isQuoteNode(node)) return node.content.text || message('quote', 'Citação')
      if (isListNode(node)) return node.content.items[0] || message('list', 'Lista')
      if (isEmbedNode(node)) return node.content.title
      if (node.type === 'core/video' || node.type === 'core/file') return String(node.content.name)
      return String(node.type)
    }

    function nodeIcon(node: GraphicStudioNode) {
      const names: Partial<Record<GraphicStudioNode['type'], string>> = {
        'core/heading': 'lucide:heading',
        'core/text': 'lucide:text',
        'core/link': 'lucide:link',
        'core/icon': 'lucide:smile',
        'core/image': 'lucide:image',
        'core/block': 'lucide:layout-panel-top',
        'core/shape': 'lucide:square',
        'core/list': 'lucide:list',
        'core/quote': 'lucide:quote',
        'core/embed': 'lucide:code-2',
        'core/video': 'lucide:video',
        'core/file': 'lucide:file',
        'core/page': 'lucide:frame',
      }
      return names[node.type] ?? 'lucide:box'
    }

    function panelButton(panel: Panel, icon: string, label: string) {
      return h('button', {
        type: 'button',
        class: { 'is-active': activePanel.value === panel && mobileTray.value !== 'inspector' },
        'aria-pressed': activePanel.value === panel && mobileTray.value !== 'inspector',
        title: label,
        onClick: () => {
          const shouldClose = activePanel.value === panel && mobileTray.value === 'library'
          activePanel.value = panel
          mobileTray.value = shouldClose ? null : 'library'
        },
      }, [h(Icon, { icon }), h('span', label)])
    }

    function renderInsertPanel() {
      const texto: Array<[string, string, () => void]> = [
        ['lucide:heading-1', message('heading', 'Título'), () => { addNode('heading') }],
        ['lucide:text', message('text', 'Texto'), () => { addNode('text') }],
        ['lucide:list', message('list', 'Lista'), () => { addNode('list') }],
        ['lucide:quote', message('quote', 'Citação'), () => { addNode('quote') }],
        ['lucide:link', message('link', 'Link'), () => { addNode('link') }],
        ['lucide:sparkles', message('quickIcon', 'Ícone rápido'), () => { addNode('icon') }],
      ]
      const formas: Array<[string, string, () => void]> = [
        ['lucide:square', message('rectangle', 'Retângulo'), () => { addNode('rectangle') }],
        ['lucide:circle', message('ellipse', 'Elipse'), () => { addNode('ellipse') }],
        ['lucide:triangle', message('triangle', 'Triângulo'), () => { addNode('triangle') }],
        ['lucide:minus', message('line', 'Linha'), () => { addNode('line') }],
        ['lucide:layout-panel-top', message('colorBlock', 'Bloco de cor'), () => { addNode('block') }],
        ['lucide:code-2', message('embed', 'Incorporar'), () => { addNode('embed') }],
      ]
      const grade = (tools: Array<[string, string, () => void]>) =>
        h('div', { class: 'gs-tool-grid' }, tools.map(([icon, label, action]) =>
          h('button', { type: 'button', onClick: action }, [h(Icon, { icon }), h('span', label)]),
        ))
      return h('div', { class: 'gs-library__content' }, [
        h('div', { class: 'gs-panel-heading' }, [h('strong', message('insert', 'Inserir')), h('small', message('textElements', 'Texto'))]),
        grade(texto),
        h('div', { class: 'gs-panel-heading' }, [h('strong', message('shapes', 'Formas e mídia')), h('small', message('basicElements', 'Elementos básicos'))]),
        grade(formas),
        h('div', { class: 'gs-panel-heading' }, [
          h('strong', message('components', 'Componentes')),
          h('small', message('reusableBlocks', 'Blocos reutilizáveis')),
        ]),
        h('div', { class: 'gs-token-new' }, [
          h('button', {
            type: 'button',
            class: 'gs-component-create',
            disabled: !selectedNode.value
              || selectedNode.value.type === 'core/page'
              || Boolean(selectedNode.value.instanceOf),
            onClick: createComponentFromSelection,
          }, [h(Icon, { icon: 'lucide:component' }), message('createComponent', 'Criar da seleção')]),
        ]),
        components.value.length
          ? h('ul', { class: 'gs-token-list' }, components.value.map((component) => h('li', { key: component.id }, [
            h(Icon, { icon: 'lucide:component' }),
            h('code', component.name),
            h('div', { class: 'gs-token-actions' }, [
              h('button', {
                type: 'button',
                title: message('insertInstance', 'Inserir cópia'),
                onClick: () => { insertComponentInstance(component.id) },
              }, h(Icon, { icon: 'lucide:copy-plus' })),
              h('button', {
                type: 'button',
                title: message('removeComponent', 'Deixar de ser componente'),
                onClick: () => { removeComponent(component.id) },
              }, h(Icon, { icon: 'lucide:trash-2' })),
            ]),
          ])))
          : h('div', { class: 'gs-panel-callout' }, [
            h(Icon, { icon: 'lucide:component' }),
            h('p', message('componentHint', 'Selecione um bloco e crie um componente. Editar o original atualiza todas as cópias.')),
          ]),
        h('div', { class: 'gs-panel-callout' }, [
          h(Icon, { icon: 'lucide:mouse-pointer-2' }),
          h('p', message('insertHint', 'Selecione um bloco antes de inserir para criar conteúdo dentro dele.')),
        ]),
      ])
    }

    function renderFilesPanel() {
      const filters: Array<['all' | LocalAssetKind, string]> = [
        ['all', message('all', 'Todos')], ['image', message('images', 'Imagens')], ['video', message('videos', 'Vídeos')], ['pdf', 'PDF'], ['code', message('code', 'Código')], ['file', message('others', 'Outros')],
      ]
      return h('div', {
        class: 'gs-library__content',
        onDragover: (event: DragEvent) => { event.preventDefault() },
        onDrop: (event: DragEvent) => {
          event.preventDefault()
          if (event.dataTransfer?.files) importFiles(event.dataTransfer.files)
        },
      }, [
        h('div', { class: 'gs-panel-heading' }, [h('strong', message('files', 'Arquivos')), h('small', message('localSession', 'Sessão local'))]),
        h('label', { class: 'gs-file-drop' }, [
          h(Icon, { icon: 'lucide:upload-cloud' }),
          h('strong', message('addFiles', 'Adicionar arquivos')),
          h('span', message('fileKinds', 'Vídeo, PDF, imagem, .py e outros · até 25 MB')),
          h('input', { type: 'file', multiple: true, onChange: handleFileInput }),
        ]),
        h('label', { class: 'gs-asset-search' }, [
          h(Icon, { icon: 'lucide:search' }),
          h('input', {
            value: assetQuery.value,
            placeholder: message('searchByName', 'Buscar por nome…'),
            'aria-label': message('searchByName', 'Buscar por nome…'),
            onInput: (event: Event) => { assetQuery.value = targetValue(event) },
          }),
        ]),
        h('div', { class: 'gs-asset-filters' }, filters.map(([id, label]) =>
          h('button', {
            type: 'button',
            class: { 'is-active': assetFilter.value === id },
            onClick: () => { assetFilter.value = id },
          }, label),
        )),
        h('p', { class: 'gs-catalog-status', role: 'status' }, assetStatus.value || message('assetSessionHint', 'Arquivos ficam somente nesta sessão.')),
        localAssets.value.length === 0
          ? h('div', { class: 'gs-assets-empty' }, [h(Icon, { icon: 'lucide:folder-open' }), h('span', message('dragFiles', 'Arraste arquivos para esta área.'))])
          : h('div', { class: 'gs-asset-list' }, visibleAssets.value.map((asset) =>
              h('article', { class: 'gs-asset-card' }, [
                h('div', { class: ['gs-asset-card__preview', `is-${asset.kind}`] }, [
                  asset.kind === 'image'
                    ? h('img', { src: asset.url, alt: '' })
                    : h(Icon, { icon: asset.kind === 'video' ? 'lucide:video' : asset.kind === 'pdf' ? 'lucide:file-text' : asset.kind === 'code' ? 'lucide:file-code-2' : 'lucide:file' }),
                ]),
                h('div', { class: 'gs-asset-card__body' }, [
                  h('strong', { title: asset.name }, asset.name),
                  h('small', `${asset.kind.toUpperCase()} · ${formatAssetSize(asset.size)}`),
                  h('div', [
                    h('button', { type: 'button', onClick: () => { addNode('asset', asset) } }, [h(Icon, { icon: 'lucide:plus' }), message('canvas', 'Canvas')]),
                    h('button', { type: 'button', title: message('removeSession', 'Remover da sessão'), onClick: () => { removeLocalAsset(asset) } }, h(Icon, { icon: 'lucide:trash-2' })),
                  ]),
                ]),
              ]),
            )),
      ])
    }

    function renderLayersPanel() {
      return h('div', { class: 'gs-library__content' }, [
        h('div', { class: 'gs-panel-heading' }, [h('strong', message('layers', 'Camadas')), h('small', message('items', '{count} itens', { count: layerRows.value.length }))]),
        h('div', { class: 'gs-layer-list' }, layerRows.value.map(({ node, depth }) =>
          h('div', {
            class: [
              'gs-layer-row',
              {
                'is-selected': selectedNodeIds.value.includes(node.id),
                'is-artboard': node.type === 'core/page',
              },
            ],
          }, [
            h('button', {
              type: 'button',
              class: 'gs-layer-row__select',
              // Recuo mostra a hierarquia real: filho de bloco fica dentro dele.
              style: { paddingLeft: `${0.55 + depth * 0.8}rem` },
              onClick: (event: MouseEvent) => { selectNode(node.id, event.shiftKey) },
            }, [h(Icon, { icon: nodeIcon(node) }), h('span', layerLabel(node))]),
            h('button', {
              type: 'button',
              class: 'gs-layer-row__visibility',
              title: node.hidden ? message('show', 'Mostrar') : message('hide', 'Ocultar'),
              onClick: () => {
                setSelection([node.id], node.id)
                patchSelected({ hidden: !node.hidden })
              },
            }, h(Icon, { icon: node.hidden ? 'lucide:eye-off' : 'lucide:eye' })),
            h('button', {
              type: 'button',
              class: 'gs-layer-row__lock',
              title: node.locked ? message('unlock', 'Desbloquear') : message('lock', 'Bloquear'),
              'aria-pressed': node.locked,
              onClick: () => { toggleNodeLock(node) },
            }, h(Icon, { icon: node.locked ? 'lucide:lock-keyhole' : 'lucide:unlock-keyhole' })),
          ]),
        )),
      ])
    }

    const imageUrl = ref('')

    /**
     * Insere uma imagem a partir de um endereço colado.
     *
     * Só HTTPS, o mesmo limite do schema: uma imagem em HTTP quebraria numa
     * página servida por HTTPS, e o documento seria recusado na validação.
     */
    function addImageByUrl() {
      const url = imageUrl.value.trim()
      if (!/^https:\/\/\S+$/i.test(url)) {
        imageStatus.value = message('imageUrlInvalid', 'Use um endereço começando com https://')
        return
      }
      imageStatus.value = ''
      imageUrl.value = ''
      addNode('image', {
        thumbnail: url,
        title: message('imageFromUrl', 'Imagem'),
        creator: '',
        license: '',
        sourceUrl: url,
      } as OpenverseImage)
    }

    function renderImagesPanel() {
      return h('div', { class: 'gs-library__content' }, [
        h('div', { class: 'gs-panel-heading' }, [h('strong', message('onlineImages', 'Imagens online')), h('small', 'Openverse')]),
        h('form', { class: 'gs-search', onSubmit: (event: Event) => { event.preventDefault(); void searchImages() } }, [
          h(Icon, { icon: 'lucide:search' }),
          h('input', {
            value: imageQuery.value,
            'aria-label': message('searchImages', 'Buscar imagens'),
            placeholder: message('naturePlaceholder', 'Natureza, arquitetura…'),
            onInput: (event: Event) => { imageQuery.value = targetValue(event) },
          }),
          h('button', { type: 'submit', disabled: isSearchingImages.value }, message('search', 'Buscar')),
        ]),
        // Nem toda imagem vem de banco aberto: muita coisa já está publicada no
        // próprio site, e sem este campo não haveria como usá-la.
        h('form', { class: 'gs-search', onSubmit: (event: Event) => { event.preventDefault(); addImageByUrl() } }, [
          h(Icon, { icon: 'lucide:link' }),
          h('input', {
            type: 'url',
            value: imageUrl.value,
            'aria-label': message('imageByUrl', 'Endereço da imagem'),
            placeholder: 'https://…/foto.jpg',
            onInput: (event: Event) => { imageUrl.value = targetValue(event) },
          }),
          h('button', { type: 'submit' }, message('add', 'Inserir')),
        ]),
        h('p', { class: 'gs-catalog-status', role: 'status' }, imageStatus.value || message('imageSearchHint', 'Busque imagens com licença aberta ou cole um endereço HTTPS.')),
        h('div', { class: 'gs-image-results' }, imageResults.value.map((image) =>
          h('button', { type: 'button', title: message('addImage', 'Adicionar {name}', { name: image.title }), onClick: () => { addNode('image', image) } }, [
            h('img', { src: image.thumbnail, alt: '', loading: 'lazy' }),
            h('span', image.title),
            h('small', `${image.creator} · ${image.license}`),
          ]),
        )),
      ])
    }

    function renderIconsPanel() {
      return h('div', { class: 'gs-library__content' }, [
        h('div', { class: 'gs-panel-heading' }, [h('strong', message('icons', 'Ícones')), h('small', 'Iconify')]),
        h('form', { class: 'gs-search', onSubmit: (event: Event) => { event.preventDefault(); void searchIcons() } }, [
          h(Icon, { icon: 'lucide:search' }),
          h('input', {
            value: iconQuery.value,
            'aria-label': message('searchIcons', 'Buscar ícones'),
            placeholder: message('iconPlaceholder', 'Seta, usuário, estrela…'),
            onInput: (event: Event) => { iconQuery.value = targetValue(event) },
          }),
          h('button', { type: 'submit', disabled: isSearchingIcons.value }, message('search', 'Buscar')),
        ]),
        h('p', { class: 'gs-catalog-status', role: 'status' }, iconStatus.value || message('iconSearchHint', 'Busque entre os conjuntos públicos do Iconify.')),
        h('div', { class: 'gs-icon-results' }, iconResults.value.map((icon) =>
          h('button', { type: 'button', title: icon.name, onClick: () => { addNode('icon', icon) } }, [
            h(Icon, { icon: icon.name }),
            h('span', icon.name.split(':')[1]),
          ]),
        )),
      ])
    }

    function field(label: string, control: VNode) {
      return h('label', { class: 'gs-field' }, [h('span', label), control])
    }

    function keyframeInput(
      index: number,
      key: keyof Keyframe,
      value: number,
      min: number,
      max: number,
      step: number,
    ) {
      return h('input', {
        type: 'number',
        min,
        max,
        step,
        value,
        'aria-label': `${key} ${index + 1}`,
        onChange: (event: Event) => { updateKeyframe(index, key, targetValue(event)) },
      })
    }

    /**
     * Campo de cor com vínculo opcional a um token do tema.
     *
     * Vincular grava `{ token }` em vez de `{ value }`, então mudar o token no
     * painel Tema muda todos os nós vinculados de uma vez — que é o ponto de
     * existir tema. O seletor de cor continua ali para quem quer uma cor avulsa.
     */
    function colorField(
      label: string,
      current: { token: string } | { value: string } | undefined,
      fallback: string,
      apply: (value: { token: string } | { value: string }, coalesceKey?: string) => void,
      coalesceKey: string,
    ) {
      const boundToken = current && 'token' in current ? current.token : ''
      const tokens = themeTokens.value
      // Largo de propósito: seletor de cor e lista de tokens lado a lado não cabem
      // em meia coluna da grade, e invadiam o campo vizinho.
      return h('label', { class: 'gs-field gs-field--wide' }, [
        h('span', label),
        h('div', { class: 'gs-color-field' }, [
          h('input', {
            type: 'color',
            value: boundToken ? (tokens.find((entry) => entry.name === boundToken)?.value ?? fallback) : styleValue(current, fallback),
            disabled: Boolean(boundToken),
            onInput: (event: Event) => { apply({ value: targetValue(event) }, coalesceKey) },
          }),
          h('select', {
            value: boundToken,
            'aria-label': message('themeToken', 'Token do tema'),
            onChange: (event: Event) => {
              const token = targetValue(event)
              apply(token ? { token } : { value: styleValue(current, fallback) })
            },
          }, [
            h('option', { value: '' }, message('noToken', 'Cor avulsa')),
            ...tokens.map((entry) => h('option', { value: entry.name }, entry.name)),
          ]),
        ]),
      ])
    }

    const themeTokens = computed(() => Object.entries(workingDocument.value.theme.overrides)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => left.name.localeCompare(right.name)))

    function setThemeToken(name: string, value: string | null, coalesceKey?: string) {
      commit({
        ...commandEnvelope(),
        type: 'document.setThemeTokens',
        payload: { tokens: { [name]: value } },
      }, true, coalesceKey)
    }

    const newTokenName = ref('')
    const newTokenValue = ref('#00c27a')
    const themeStatus = ref('')

    function addThemeToken() {
      const name = newTokenName.value.trim().toLowerCase()
      // Mesma regra do schema: falhar aqui dá uma mensagem no painel, enquanto
      // deixar passar levantaria um ZodError no meio do commit.
      if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(name)) {
        themeStatus.value = message('tokenNameInvalid', 'Use letras minúsculas, números, ponto ou hífen. Ex.: cor.marca')
        return
      }
      if (themeTokens.value.some((entry) => entry.name === name)) {
        themeStatus.value = message('tokenExists', 'Já existe um token com esse nome.')
        return
      }
      themeStatus.value = ''
      newTokenName.value = ''
      setThemeToken(name, newTokenValue.value)
    }

    function renderThemePanel() {
      const tokens = themeTokens.value
      const node = selectedNode.value
      return h('div', { class: 'gs-library__content' }, [
        h('div', { class: 'gs-panel-heading' }, [
          h('strong', message('theme', 'Tema')),
          h('small', message('sharedTokens', 'Cores compartilhadas')),
        ]),
        h('div', { class: 'gs-token-new' }, [
          h('input', {
            value: newTokenName.value,
            placeholder: message('tokenNamePlaceholder', 'cor.marca'),
            'aria-label': message('tokenName', 'Nome do token'),
            onInput: (event: Event) => { newTokenName.value = targetValue(event) },
            onKeydown: (event: KeyboardEvent) => {
              event.stopPropagation()
              if (event.key === 'Enter') addThemeToken()
            },
          }),
          h('input', {
            type: 'color',
            value: newTokenValue.value,
            'aria-label': message('tokenValue', 'Cor do token'),
            onInput: (event: Event) => { newTokenValue.value = targetValue(event) },
          }),
          h('button', { type: 'button', onClick: addThemeToken }, [
            h(Icon, { icon: 'lucide:plus' }), message('add', 'Criar'),
          ]),
        ]),
        themeStatus.value ? h('p', { class: 'gs-panel-status' }, themeStatus.value) : null,
        tokens.length
          ? h('ul', { class: 'gs-token-list' }, tokens.map((entry) => h('li', { key: entry.name }, [
            h('input', {
              type: 'color',
              value: entry.value,
              'aria-label': message('tokenValueOf', 'Cor de {token}', { token: entry.name }),
              onInput: (event: Event) => { setThemeToken(entry.name, targetValue(event), `token:${entry.name}`) },
            }),
            h('code', entry.name),
            h('div', { class: 'gs-token-actions' }, [
              h('button', {
                type: 'button',
                disabled: !node || node.locked,
                title: message('applyToText', 'Aplicar na cor do texto'),
                onClick: () => { patchSelectedStyle({ color: { token: entry.name } }) },
              }, h(Icon, { icon: 'lucide:type' })),
              h('button', {
                type: 'button',
                disabled: !node || node.locked,
                title: message('applyToBackground', 'Aplicar no fundo'),
                onClick: () => { patchSelectedStyle({ backgroundColor: { token: entry.name } }) },
              }, h(Icon, { icon: 'lucide:paint-bucket' })),
              h('button', {
                type: 'button',
                title: message('removeToken', 'Remover token'),
                onClick: () => { setThemeToken(entry.name, null) },
              }, h(Icon, { icon: 'lucide:trash-2' })),
            ]),
          ])))
          : h('div', { class: 'gs-panel-callout' }, [
            h(Icon, { icon: 'lucide:palette' }),
            h('p', message('themeHint', 'Crie um token para reusar a mesma cor em vários blocos. Mudar o token muda todos de uma vez.')),
          ]),
      ])
    }

    function renderMultiSelectionToolbar() {
      if (!hasMultiSelection.value) return null
      const disabled = !selectionHasCommonParent.value || selectedNodes.value.some((node) => node.locked)
      const action = (icon: string, label: string, onClick: () => void, actionDisabled = disabled) => h('button', {
        type: 'button',
        title: label,
        'aria-label': label,
        disabled: actionDisabled,
        onClick,
      }, h(Icon, { icon }))
      return h('div', { class: 'gs-multi-toolbar', role: 'toolbar', 'aria-label': message('multiSelection', 'Seleção múltipla') }, [
        h('span', message('selectedCount', '{count} selecionados', { count: selectedNodes.value.length })),
        h('div', [
          action('lucide:align-start-vertical', message('alignLeft', 'Alinhar à esquerda'), () => { alignSelection('left') }),
          action('lucide:align-center-vertical', message('alignCenter', 'Centralizar horizontalmente'), () => { alignSelection('center') }),
          action('lucide:align-end-vertical', message('alignRight', 'Alinhar à direita'), () => { alignSelection('right') }),
        ]),
        h('div', [
          action('lucide:align-start-horizontal', message('alignTop', 'Alinhar ao topo'), () => { alignSelection('top') }),
          action('lucide:align-center-horizontal', message('alignMiddle', 'Centralizar verticalmente'), () => { alignSelection('middle') }),
          action('lucide:align-end-horizontal', message('alignBottom', 'Alinhar à base'), () => { alignSelection('bottom') }),
        ]),
        h('div', [
          action('lucide:columns-3', message('distributeHorizontal', 'Distribuir horizontalmente'), () => { distributeSelection('horizontal') }, disabled || selectedNodes.value.length < 3),
          action('lucide:rows-3', message('distributeVertical', 'Distribuir verticalmente'), () => { distributeSelection('vertical') }, disabled || selectedNodes.value.length < 3),
          action('lucide:group', message('group', 'Agrupar'), groupSelection),
        ]),
        h('div', [
          action('lucide:copy-plus', message('duplicate', 'Duplicar'), duplicateSelectedNodes, false),
          action(
            selectedNodes.value.some((node) => !node.locked) ? 'lucide:lock-keyhole' : 'lucide:unlock-keyhole',
            selectedNodes.value.some((node) => !node.locked) ? message('lock', 'Bloquear') : message('unlock', 'Desbloquear'),
            toggleSelectedLock,
            false,
          ),
          action('lucide:eye-off', message('hide', 'Ocultar'), toggleSelectedVisibility, false),
          action('lucide:trash-2', message('deleteLayers', 'Excluir camadas'), deleteSelectedNode, false),
        ]),
      ])
    }

    function renderInspector() {
      const node = selectedNode.value
      if (!node) {
        return h('div', { class: 'gs-inspector__empty' }, [
          h(Icon, { icon: 'lucide:mouse-pointer-2' }),
          h('strong', message('nothingSelected', 'Nada selecionado')),
          h('p', message('selectHint', 'Clique em um elemento no canvas ou abra Camadas.')),
        ])
      }
      if (hasMultiSelection.value) {
        return h('div', { class: 'gs-inspector__content gs-inspector__multi' }, [
          h('div', { class: 'gs-selection-summary' }, [
            h(Icon, { icon: 'lucide:mouse-pointer-2' }),
            h('div', [
              h('strong', message('selectedCount', '{count} selecionados', { count: selectedNodes.value.length })),
              h('small', message('multiSelection', 'Seleção múltipla')),
            ]),
          ]),
          h('p', message('selectionHint', 'Use Shift para adicionar ou remover elementos da seleção.')),
          renderMultiSelectionToolbar(),
        ])
      }

      const controls: VNode[] = []
      // Vale para a raiz da cópia e para qualquer nó dentro dela: o aviso e as
      // ações são os mesmos, e agem sempre sobre a raiz.
      const instanciaAtual = instanceRootOf(workingDocument.value, node.id)
      if (instanciaAtual) {
        // Editar uma instância não adianta: a próxima sincronização desfaz. Melhor
        // dizer isso do que deixar o usuário descobrir sozinho.
        controls.push(h('div', { class: 'gs-panel-callout' }, [
          h(Icon, { icon: 'lucide:component' }),
          h('div', [
            h('p', message('instanceHint', 'Cópia de componente. O texto pode ser trocado só nesta cópia; aparência e tamanho vêm do original.')),
            h('div', { class: 'gs-instance-actions' }, [
              h('button', { type: 'button', class: 'gs-detach-button', onClick: detachInstance }, [
                h(Icon, { icon: 'lucide:unlink' }), message('detach', 'Desvincular'),
              ]),
              ...(instanciaAtual.overrides && Object.keys(instanciaAtual.overrides).length
                ? [h('button', { type: 'button', class: 'gs-detach-button', onClick: clearOverrides }, [
                  h(Icon, { icon: 'lucide:rotate-ccw' }), message('resetOverrides', 'Voltar ao original'),
                ])]
                : []),
            ]),
          ]),
        ]))
      }
      if (node.type !== 'core/page') {
        controls.push(h('div', { class: 'gs-inspector__section' }, [
          h('strong', [h(Icon, { icon: 'lucide:code' }), ` ${message('htmlIdentity', 'Identidade no HTML')}`]),
          field(message('htmlId', 'Identificador (id)'), h('input', {
            value: node.name ?? '',
            placeholder: 'titulo-principal',
            onInput: (event: Event) => { updateNodeName(targetValue(event)) },
          })),
          field(message('htmlGroups', 'Grupos (class)'), h('input', {
            value: node.groups?.join(' ') ?? '',
            placeholder: 'cartao destaque',
            onInput: (event: Event) => { updateNodeGroups(targetValue(event)) },
          })),
          identityError.value
            ? h('p', { class: 'gs-panel-status' }, identityError.value)
            : h('code', { class: 'gs-html-preview' }, htmlPreview(node)),
        ]))
      }
      if (isTextualNode(node)) {
        controls.push(field(message('content', 'Conteúdo'), h('textarea', {
          value: node.content.text,
          rows: 5,
          onInput: updateSelectedText,
        })))
      }
      if (node.type === 'core/icon') {
        controls.push(field(message('iconifyIcon', 'Ícone Iconify'), h('input', {
          value: node.content.name,
          onChange: (event: Event) => { updateIconContent('name', targetValue(event)) },
        })))
        controls.push(field(message('accessibleName', 'Nome acessível'), h('input', {
          value: node.content.label,
          onInput: (event: Event) => { updateIconContent('label', targetValue(event)) },
        })))
      }
      if (node.type === 'core/link') {
        controls.push(field(message('destination', 'Destino'), h('input', {
          type: 'url',
          value: node.content.href,
          onChange: (event: Event) => { updateLinkContent('href', targetValue(event)) },
        })))
      }
      if (node.type === 'core/image') {
        controls.push(field(message('imageSource', 'Endereço (HTTPS)'), h('input', {
          type: 'url',
          value: node.content.src,
          onChange: (event: Event) => { updateImageContent('src', targetValue(event)) },
        })))
        controls.push(field(message('altText', 'Texto alternativo'), h('textarea', {
          value: node.content.alt,
          rows: 3,
          onInput: (event: Event) => { updateImageContent('alt', targetValue(event)) },
        })))
        controls.push(field(message('fit', 'Encaixe'), h('select', {
          value: node.content.fit,
          onChange: (event: Event) => { updateImageContent('fit', targetValue(event)) },
        }, [h('option', { value: 'cover' }, message('cover', 'Preencher')), h('option', { value: 'contain' }, message('contain', 'Conter'))])))
      }
      if (node.type === 'core/block') {
        controls.push(field(message('layerName', 'Nome da camada'), h('input', {
          value: node.content.label,
          onInput: (event: Event) => { updateBlockLabel(targetValue(event)) },
        })))
      }
      if (isQuoteNode(node)) {
        controls.push(field(message('content', 'Conteúdo'), h('textarea', {
          value: node.content.text,
          rows: 4,
          onInput: (event: Event) => { updateQuoteContent('text', targetValue(event)) },
        })))
        controls.push(field(message('citation', 'Autoria'), h('input', {
          value: node.content.citation,
          onInput: (event: Event) => { updateQuoteContent('citation', targetValue(event)) },
        })))
      }
      if (isListNode(node)) {
        controls.push(field(message('listItems', 'Itens (um por linha)'), h('textarea', {
          value: node.content.items.join('\n'),
          rows: 6,
          onInput: (event: Event) => { updateListItems(targetValue(event)) },
        })))
        controls.push(field(message('listStyle', 'Marcador'), h('select', {
          value: node.content.ordered ? 'ordered' : 'bullet',
          onChange: (event: Event) => { updateListOrdered(targetValue(event) === 'ordered') },
        }, [
          h('option', { value: 'bullet' }, message('bulletList', 'Pontos')),
          h('option', { value: 'ordered' }, message('orderedList', 'Números')),
        ])))
      }
      if (isShapeNode(node)) {
        controls.push(field(message('shapeKind', 'Forma'), h('select', {
          value: node.content.kind,
          onChange: (event: Event) => { updateShapeKind(targetValue(event)) },
        }, [
          h('option', { value: 'rectangle' }, message('rectangle', 'Retângulo')),
          h('option', { value: 'ellipse' }, message('ellipse', 'Elipse')),
          h('option', { value: 'triangle' }, message('triangle', 'Triângulo')),
          h('option', { value: 'line' }, message('line', 'Linha')),
        ])))
      }
      if (isEmbedNode(node)) {
        controls.push(field(message('embedSrc', 'Endereço (HTTPS)'), h('input', {
          type: 'url',
          value: node.content.src,
          onChange: (event: Event) => { updateEmbedContent('src', targetValue(event)) },
        })))
        controls.push(field(message('accessibleName', 'Nome acessível'), h('input', {
          value: node.content.title,
          onInput: (event: Event) => { updateEmbedContent('title', targetValue(event)) },
        })))
      }
      if (node.type === 'core/video' || node.type === 'core/file') {
        controls.push(h('div', { class: 'gs-asset-reference' }, [
          h(Icon, { icon: node.type === 'core/video' ? 'lucide:video' : 'lucide:paperclip' }),
          h('div', [h('strong', String(node.content.name)), h('small', `assetId · ${String(node.content.assetId)}`)]),
        ]))
      }

      if (isTextualNode(node)) {
        controls.push(field(message('googleFont', 'Google Font'), h('select', {
          value: node.style.fontFamily ?? 'Manrope',
          onChange: (event: Event) => { patchSelectedStyle({ fontFamily: targetValue(event) }) },
        }, EDITOR_FONTS.map((font) => h('option', { value: font.family }, font.family)))))
      }

      if (isTextualNode(node) || node.type === 'core/icon') {
        controls.push(field(message('size', 'Tamanho'), h('div', { class: 'gs-input-unit' }, [
          h('input', {
            type: 'number', min: 8, max: 240,
            value: node.style.fontSize ?? (node.type === 'core/icon' ? 64 : 18),
            onChange: (event: Event) => { patchSelectedStyle({ fontSize: Number(targetValue(event)) }) },
          }),
          h('span', 'px'),
        ])))
        controls.push(colorField(
          message('color', 'Cor'),
          node.style.color,
          '#111827',
          (color, key) => { patchSelectedStyle({ color }, key) },
          'cor-texto',
        ))
      }

      if (isTextualNode(node)) {
        controls.push(h('div', { class: 'gs-inspector__section' }, [
          h('strong', [h(Icon, { icon: 'lucide:type' }), ` ${message('typography', 'Tipografia')}`]),
          h('div', { class: 'gs-style-grid' }, [
            field(message('fontWeight', 'Peso'), h('select', {
              value: node.style.fontWeight ?? 400,
              onChange: (event: Event) => { patchSelectedStyle({ fontWeight: Number(targetValue(event)) }) },
            }, [100, 200, 300, 400, 500, 600, 700, 800, 900].map((weight) => h('option', { value: weight }, String(weight))))),
            field(message('fontStyle', 'Estilo'), h('select', {
              value: node.style.fontStyle ?? 'normal',
              onChange: (event: Event) => { patchSelectedStyle({ fontStyle: targetValue(event) as NodeStyle['fontStyle'] }) },
            }, [
              h('option', { value: 'normal' }, message('normal', 'Normal')),
              h('option', { value: 'italic' }, message('italic', 'Itálico')),
              h('option', { value: 'oblique' }, message('oblique', 'Oblíquo')),
            ])),
            field(message('textAlign', 'Alinhamento'), h('select', {
              value: node.style.textAlign ?? 'left',
              onChange: (event: Event) => { patchSelectedStyle({ textAlign: targetValue(event) as NodeStyle['textAlign'] }) },
            }, ['left', 'center', 'right', 'justify'].map((value) => h('option', { value }, message(value, value))))),
            field(message('textTransform', 'Capitalização'), h('select', {
              value: node.style.textTransform ?? 'none',
              onChange: (event: Event) => { patchSelectedStyle({ textTransform: targetValue(event) as NodeStyle['textTransform'] }) },
            }, ['none', 'uppercase', 'lowercase', 'capitalize'].map((value) => h('option', { value }, message(value, value))))),
            field(message('textDecoration', 'Decoração'), h('select', {
              value: node.style.textDecoration ?? 'none',
              onChange: (event: Event) => { patchSelectedStyle({ textDecoration: targetValue(event) as NodeStyle['textDecoration'] }) },
            }, ['none', 'underline', 'overline', 'line-through'].map((value) => h('option', { value }, message(value, value))))),
            field(message('lineHeight', 'Altura da linha'), h('input', {
              type: 'number', min: 0.5, max: 3, step: 0.1,
              value: node.style.lineHeight ?? 1.4,
              onChange: (event: Event) => { patchSelectedStyle({ lineHeight: Number(targetValue(event)) }) },
            })),
            field(message('letterSpacing', 'Espaço entre letras'), h('input', {
              type: 'number', min: -10, max: 30, step: 0.5,
              value: node.style.letterSpacing ?? 0,
              onChange: (event: Event) => { patchSelectedStyle({ letterSpacing: Number(targetValue(event)) }) },
            })),
            field(message('wordSpacing', 'Espaço entre palavras'), h('input', {
              type: 'number', min: -20, max: 100, step: 1,
              value: node.style.wordSpacing ?? 0,
              onChange: (event: Event) => { patchSelectedStyle({ wordSpacing: Number(targetValue(event)) }) },
            })),
          ]),
          h('label', { class: 'gs-toggle-field' }, [
            h('input', {
              type: 'checkbox', checked: Boolean(node.style.textShadow),
              onChange: (event: Event) => { toggleTextShadow((event.target as HTMLInputElement).checked) },
            }),
            h('span', message('textShadow', 'Sombra do texto')),
          ]),
          ...(node.style.textShadow ? [h('div', { class: 'gs-style-grid is-four' }, [
            ...(['x', 'y', 'blur'] as const).map((key) => field(key.toUpperCase(), h('input', {
              type: 'number', value: node.style.textShadow?.[key] ?? 0,
              onChange: (event: Event) => { updateTextShadow(key, Number(targetValue(event))) },
            }))),
            field(message('shadowColor', 'Cor da sombra'), h('input', {
              type: 'color', value: styleValue(node.style.textShadow.color, '#000000'),
              onInput: (event: Event) => { updateTextShadow('color', { value: targetValue(event) }) },
            })),
          ])] : []),
        ]))
      }

      controls.push(h('div', { class: 'gs-inspector__section' }, [
        h('strong', [h(Icon, { icon: 'lucide:palette' }), ` ${message('appearance', 'Aparência')}`]),
        h('div', { class: 'gs-style-grid' }, [
          colorField(
            message('backgroundColor', 'Fundo'),
            node.style.backgroundColor,
            '#ffffff',
            (backgroundColor, key) => { patchSelectedStyle({ backgroundColor }, key) },
            'cor-fundo',
          ),
          field(message('opacity', 'Opacidade'), h('input', {
            type: 'number', min: 0, max: 1, step: 0.05, value: node.style.opacity ?? 1,
            onChange: (event: Event) => { patchSelectedStyle({ opacity: Number(targetValue(event)) }) },
          })),
          field(message('borderWidth', 'Borda'), h('input', {
            type: 'number', min: 0, max: 100, value: node.style.borderWidth ?? 0,
            onChange: (event: Event) => { patchSelectedStyle({ borderWidth: Number(targetValue(event)) }) },
          })),
          field(message('borderStyle', 'Estilo da borda'), h('select', {
            value: node.style.borderStyle ?? 'none',
            onChange: (event: Event) => { patchSelectedStyle({ borderStyle: targetValue(event) as NodeStyle['borderStyle'] }) },
          }, ['none', 'solid', 'dashed', 'dotted', 'double'].map((value) => h('option', { value }, message(value, value))))),
          field(message('borderColor', 'Cor da borda'), h('input', {
            type: 'color', value: styleValue(node.style.borderColor, '#111827'),
            onInput: (event: Event) => { patchSelectedStyle({ borderColor: { value: targetValue(event) } }, 'cor-borda') },
          })),
          field(message('blendMode', 'Mistura'), h('select', {
            value: node.style.mixBlendMode ?? 'normal',
            onChange: (event: Event) => { patchSelectedStyle({ mixBlendMode: targetValue(event) as NodeStyle['mixBlendMode'] }) },
          }, ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'difference', 'exclusion'].map((value) => h('option', { value }, message(value, value))))),
        ]),
        h('small', { class: 'gs-section-label' }, message('corners', 'Cantos · superior esquerdo, superior direito, inferior direito, inferior esquerdo')),
        h('div', { class: 'gs-style-grid is-four' }, [
          ...([
            ['borderTopLeftRadius', 'TL'], ['borderTopRightRadius', 'TR'],
            ['borderBottomRightRadius', 'BR'], ['borderBottomLeftRadius', 'BL'],
          ] as const).map(([key, label]) => field(label, h('div', { class: 'gs-input-unit' }, [
            h('input', {
              type: 'number', min: 0, max: 1000,
              value: numericStyleValue(node.style[key], numericStyleValue(node.style.borderRadius)),
              onChange: (event: Event) => { patchSelectedStyle({ [key]: { value: `${Math.max(0, Number(targetValue(event)))}px` } }) },
            }), h('span', 'px'),
          ]))),
        ]),
        h('small', { class: 'gs-section-label' }, message('padding', 'Espaçamento interno · topo, direita, base, esquerda')),
        h('div', { class: 'gs-style-grid is-four' }, [
          ...([
            ['paddingTop', 'T'], ['paddingRight', 'R'], ['paddingBottom', 'B'], ['paddingLeft', 'L'],
          ] as const).map(([key, label]) => field(label, h('input', {
            type: 'number', min: 0, max: 1000, value: node.style[key] ?? 0,
            onChange: (event: Event) => { patchSelectedStyle({ [key]: Number(targetValue(event)) }) },
          }))),
        ]),
        h('label', { class: 'gs-toggle-field' }, [
          h('input', {
            type: 'checkbox', checked: Boolean(node.style.boxShadow),
            onChange: (event: Event) => { toggleBoxShadow((event.target as HTMLInputElement).checked) },
          }),
          h('span', message('boxShadow', 'Sombra da caixa')),
        ]),
        ...(node.style.boxShadow ? [h('div', { class: 'gs-style-grid is-four' }, [
          ...(['x', 'y', 'blur', 'spread'] as const).map((key) => field(key.toUpperCase(), h('input', {
            type: 'number', value: node.style.boxShadow?.[key] ?? 0,
            onChange: (event: Event) => { updateBoxShadow(key, Number(targetValue(event))) },
          }))),
          field(message('shadowColor', 'Cor da sombra'), h('input', {
            type: 'color', value: styleValue(node.style.boxShadow.color, '#000000'),
            onInput: (event: Event) => { updateBoxShadow('color', { value: targetValue(event) }) },
          })),
          h('label', { class: 'gs-toggle-field is-compact' }, [
            h('input', {
              type: 'checkbox', checked: node.style.boxShadow.inset,
              onChange: (event: Event) => { updateBoxShadow('inset', (event.target as HTMLInputElement).checked) },
            }), h('span', message('inset', 'Interna')),
          ]),
        ])] : []),
      ]))

      controls.push(h('div', { class: 'gs-inspector__section' }, [
        h('strong', [h(Icon, { icon: 'lucide:scan' }), ` ${message('effects', 'Efeitos e transformação')}`]),
        h('div', { class: 'gs-style-grid' }, [
          field(message('scale', 'Escala'), h('input', {
            type: 'number', min: 0.1, max: 10, step: 0.05, value: node.style.scale ?? 1,
            onChange: (event: Event) => { patchSelectedStyle({ scale: Number(targetValue(event)) }) },
          })),
          field(message('transformOrigin', 'Origem'), h('select', {
            value: node.style.transformOrigin ?? 'center',
            onChange: (event: Event) => { patchSelectedStyle({ transformOrigin: targetValue(event) as NodeStyle['transformOrigin'] }) },
          }, ['center', 'top', 'top right', 'right', 'bottom right', 'bottom', 'bottom left', 'left', 'top left'].map((value) => h('option', { value }, message(value, value))))),
          field(message('skewX', 'Inclinação X°'), h('input', {
            type: 'number', min: -89, max: 89, value: node.style.skewX ?? 0,
            onChange: (event: Event) => { patchSelectedStyle({ skewX: Number(targetValue(event)) }) },
          })),
          field(message('skewY', 'Inclinação Y°'), h('input', {
            type: 'number', min: -89, max: 89, value: node.style.skewY ?? 0,
            onChange: (event: Event) => { patchSelectedStyle({ skewY: Number(targetValue(event)) }) },
          })),
          field(message('overflow', 'Overflow'), h('select', {
            value: node.style.overflow ?? 'visible',
            onChange: (event: Event) => { patchSelectedStyle({ overflow: targetValue(event) as NodeStyle['overflow'] }) },
          }, ['visible', 'hidden', 'clip', 'auto'].map((value) => h('option', { value }, message(value, value))))),
          field(message('zIndex', 'Ordem Z'), h('input', {
            type: 'number', min: -1000, max: 1000, value: node.style.zIndex ?? 0,
            onChange: (event: Event) => { patchSelectedStyle({ zIndex: Number(targetValue(event)) }) },
          })),
          ...([
            ['blur', message('blur', 'Desfoque'), 0, 100, 1],
            ['brightness', message('brightness', 'Brilho'), 0, 3, 0.1],
            ['contrast', message('contrast', 'Contraste'), 0, 3, 0.1],
            ['saturate', message('saturate', 'Saturação'), 0, 5, 0.1],
            ['grayscale', message('grayscale', 'Cinza'), 0, 1, 0.05],
          ] as const).map(([key, label, min, max, step]) => field(label, h('input', {
            type: 'number', min, max, step,
            value: node.style.filter?.[key] ?? (key === 'blur' || key === 'grayscale' ? 0 : 1),
            onChange: (event: Event) => { updateFilter(key, Number(targetValue(event))) },
          }))),
        ]),
      ]))

      controls.push(h('div', { class: 'gs-inspector__section' }, [
        h('strong', [h(Icon, { icon: 'lucide:move' }), ` ${message('geometry', 'Geometria')}`]),
        h('div', { class: 'gs-geometry-grid' }, [
          ...(['x', 'y'] as const).map((key) => h('label', [h('span', key.toUpperCase()), h('input', {
            type: 'number', value: node.frame[key],
            onChange: (event: Event) => { updateFrameNumber(key, targetValue(event)) },
          })])),
          ...(['width', 'height'] as const).map((key) => h('label', [h('span', key === 'width' ? 'W' : 'H'), h('input', {
            type: 'number', min: 24,
            value: typeof node.frame[key] === 'number' ? node.frame[key] : key === 'width' ? 320 : 120,
            onChange: (event: Event) => { updateFrameNumber(key, targetValue(event)) },
          })])),
          h('label', [h('span', 'R°'), h('input', {
            type: 'number', step: 1,
            value: node.frame.rotation,
            onChange: (event: Event) => { updateRotation(targetValue(event)) },
          })]),
        ]),
        h('p', { class: 'gs-geometry-hint' }, message('geometryHint', 'Arraste o contorno azul. Setas movem 1 px; Shift + seta move 10 px. R° controla a rotação.')),
      ]))

      const animation = node.animation
      const animationMode = !animation ? 'none' : animation.keyframes?.length ? 'keyframes' : 'preset'
      controls.push(h('div', { class: 'gs-inspector__section' }, [
        h('strong', [h(Icon, { icon: 'lucide:sparkles' }), ` ${message('animation', 'Animação')}`]),
        field(message('animationMode', 'Modo'), h('select', {
          value: animationMode,
          onChange: (event: Event) => { setAnimationMode(targetValue(event) as 'none' | 'preset' | 'keyframes') },
        }, [
          h('option', { value: 'none' }, message('noAnimation', 'Sem animação')),
          h('option', { value: 'preset' }, message('presetMode', 'Animação pronta')),
          h('option', { value: 'keyframes' }, message('keyframeMode', 'Quadro a quadro')),
        ])),
        ...(animationMode === 'preset' && animation ? [
          field(message('motionPreset', 'Preset'), h('select', {
            value: animation.preset ?? '',
            onChange: (event: Event) => { setAnimation(targetValue(event)) },
          }, ANIMATION_PRESETS.map((preset) => h('option', { value: preset.id }, preset.label)))),
        ] : []),
        ...(animation ? [
          h('div', { class: 'gs-style-grid' }, [
            field(message('duration', 'Duração'), h('div', { class: 'gs-input-unit' }, [
              h('input', {
                type: 'number', min: 100, max: 30_000, step: 50,
                value: animation.duration,
                onChange: (event: Event) => { updateAnimationNumber('duration', targetValue(event)) },
              }), h('span', 'ms'),
            ])),
            field(message('delay', 'Atraso'), h('div', { class: 'gs-input-unit' }, [
              h('input', {
                type: 'number', min: 0, max: 5_000, step: 50,
                value: animation.delay,
                onChange: (event: Event) => { updateAnimationNumber('delay', targetValue(event)) },
              }), h('span', 'ms'),
            ])),
          ]),
        ] : []),
        ...(animationMode === 'keyframes' && animation?.keyframes ? [
          h('div', { class: 'gs-style-grid' }, [
            field(message('easing', 'Aceleração'), h('select', {
              value: animation.easing,
              onChange: (event: Event) => { updateAnimationChoice('easing', targetValue(event)) },
            }, ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'].map((option) =>
              h('option', { value: option }, option)))),
            field(message('direction', 'Sentido'), h('select', {
              value: animation.direction,
              onChange: (event: Event) => { updateAnimationChoice('direction', targetValue(event)) },
            }, [
              h('option', { value: 'normal' }, message('directionNormal', 'Normal')),
              h('option', { value: 'reverse' }, message('directionReverse', 'Invertido')),
              h('option', { value: 'alternate' }, message('directionAlternate', 'Vai e volta')),
              h('option', { value: 'alternate-reverse' }, message('directionAlternateReverse', 'Volta e vai')),
            ])),
          ]),
          field(message('iterations', 'Repetições (0 = sempre)'), h('input', {
            type: 'number', min: 0, max: 1_000,
            value: animation.iterations,
            onChange: (event: Event) => { updateAnimationNumber('iterations', targetValue(event)) },
          })),
          h('div', { class: 'gs-keyframes' }, [
            h('div', { class: 'gs-keyframes__head' }, [
              h('span', message('time', 'Tempo')),
              h('span', message('opacity', 'Opac.')),
              h('span', 'X'),
              h('span', 'Y'),
              h('span', message('scale', 'Escala')),
              h('span', message('rotation', 'Giro')),
              h('span', ''),
            ]),
            ...animation.keyframes.map((frame, index) => h('div', { class: 'gs-keyframes__row', key: index }, [
              keyframeInput(index, 'offset', frame.offset ?? 0, 0, 100, 1),
              keyframeInput(index, 'opacity', frame.opacity ?? 1, 0, 1, 0.05),
              keyframeInput(index, 'x', frame.x ?? 0, -5_000, 5_000, 1),
              keyframeInput(index, 'y', frame.y ?? 0, -5_000, 5_000, 1),
              keyframeInput(index, 'scale', frame.scale ?? 1, 0, 10, 0.05),
              keyframeInput(index, 'rotate', frame.rotate ?? 0, -1_440, 1_440, 1),
              h('button', {
                type: 'button',
                class: 'gs-keyframes__remove',
                disabled: animation.keyframes!.length <= 2,
                title: message('removeKeyframe', 'Remover quadro'),
                onClick: () => { removeKeyframe(index) },
              }, h(Icon, { icon: 'lucide:x' })),
            ])),
          ]),
          h('div', { class: 'gs-keyframes__actions' }, [
            h('button', { type: 'button', onClick: addKeyframe }, [
              h(Icon, { icon: 'lucide:plus' }), message('addKeyframe', 'Novo quadro'),
            ]),
          ]),
        ] : []),
        ...(animation ? [
          h('button', { type: 'button', class: 'gs-replay-button', onClick: replayAnimation }, [
            h(Icon, { icon: 'lucide:play' }), message('replay', 'Prever animação'),
          ]),
        ] : []),
      ]))

      return h('div', { class: 'gs-inspector__content' }, [
        h('div', { class: 'gs-selection-summary' }, [
          h(Icon, { icon: nodeIcon(node) }),
          h('div', [h('strong', layerLabel(node)), h('small', node.type)]),
        ]),
        ...controls,
        ...(canUngroup.value
          ? [h('button', { type: 'button', class: 'gs-ungroup-button', onClick: ungroupSelection }, [h(Icon, { icon: 'lucide:ungroup' }), message('ungroup', 'Desagrupar')])]
          : []),
        h('div', { class: 'gs-layer-actions' }, [
          h('button', { type: 'button', onClick: () => { moveLayer(-1) } }, [h(Icon, { icon: 'lucide:arrow-up' }), message('moveUp', 'Subir')]),
          h('button', { type: 'button', onClick: () => { moveLayer(1) } }, [h(Icon, { icon: 'lucide:arrow-down' }), message('moveDown', 'Descer')]),
          h('button', { type: 'button', onClick: () => { toggleNodeLock(node) } }, [
            h(Icon, { icon: node.locked ? 'lucide:unlock-keyhole' : 'lucide:lock-keyhole' }), node.locked ? message('unlock', 'Desbloquear') : message('lock', 'Bloquear'),
          ]),
          h('button', { type: 'button', onClick: toggleSelectedVisibility }, [
            h(Icon, { icon: node.hidden ? 'lucide:eye' : 'lucide:eye-off' }), node.hidden ? message('show', 'Mostrar') : message('hide', 'Ocultar'),
          ]),
          h('button', { type: 'button', onClick: duplicateSelectedNodes }, [
            h(Icon, { icon: 'lucide:copy-plus' }), message('duplicate', 'Duplicar'),
          ]),
          h('button', { type: 'button', onClick: copySelectedNodes }, [
            h(Icon, { icon: 'lucide:copy' }), message('copy', 'Copiar'),
          ]),
        ]),
        h('button', { type: 'button', class: 'gs-delete-button', onClick: deleteSelectedNode }, [
          h(Icon, { icon: 'lucide:trash-2' }), message('deleteLayer', 'Excluir camada'),
        ]),
      ])
    }

    // Cursor de cada alça em passos de 45°, para acompanhar a rotação do nó.
    const RESIZE_CURSORS = ['ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize']
    const HANDLE_ANGLE: Record<ResizeDirection, number> = {
      n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315,
    }

    function handleCursor(direction: ResizeDirection, rotation: number) {
      const angle = ((HANDLE_ANGLE[direction] + rotation) % 360 + 360) % 360
      return RESIZE_CURSORS[Math.round(angle / 45) % 4]
    }

    function renderContextMenu() {
      const menu = contextMenu.value
      if (!menu) return null
      const node = menu.nodeId ? workingDocument.value.nodes[menu.nodeId] : undefined
      const onNode = Boolean(node) && node?.type !== 'core/page'
      const run = (action: () => void) => (event: MouseEvent) => {
        event.stopPropagation()
        action()
        closeContextMenu()
      }
      const item = (icon: string, label: string, action: () => void, hint = '', enabled = true) =>
        h('button', {
          type: 'button',
          class: 'gs-context-menu__item',
          disabled: !enabled,
          onClick: run(action),
        }, [h(Icon, { icon }), h('span', label), hint ? h('kbd', hint) : null])
      const divider = () => h('div', { class: 'gs-context-menu__divider' })

      return h('div', {
        class: 'gs-context-menu',
        style: { left: `${menu.x}px`, top: `${menu.y}px` },
        role: 'menu',
        // O fechamento global escuta pointerdown; aqui ele é contido para o
        // clique chegar ao item antes de o menu sumir.
        onPointerdown: (event: PointerEvent) => { event.stopPropagation() },
        onContextmenu: (event: MouseEvent) => { event.preventDefault() },
      }, [
        item('lucide:copy', message('copy', 'Copiar'), copySelectedNodes, 'Ctrl+C', onNode),
        item('lucide:scissors', message('cut', 'Recortar'), cutSelectedNodes, 'Ctrl+X', onNode),
        item('lucide:clipboard', message('paste', 'Colar'), pasteCopiedNodes, 'Ctrl+V', Boolean(clipboard)),
        item('lucide:copy-plus', message('duplicate', 'Duplicar'), () => { duplicateSelectedNodes() }, 'Ctrl+D', onNode),
        divider(),
        item('lucide:bring-to-front', message('bringToFront', 'Trazer para a frente'), () => restack('front'), 'Ctrl+Shift+]', onNode),
        item('lucide:arrow-up', message('bringForward', 'Avançar'), () => restack('forward'), 'Ctrl+]', onNode),
        item('lucide:arrow-down', message('sendBackward', 'Recuar'), () => restack('backward'), 'Ctrl+[', onNode),
        item('lucide:send-to-back', message('sendToBack', 'Enviar para trás'), () => restack('back'), 'Ctrl+Shift+[', onNode),
        divider(),
        item('lucide:group', message('group', 'Agrupar'), groupSelection, 'Ctrl+G', selectionHasCommonParent.value),
        item('lucide:ungroup', message('ungroup', 'Desagrupar'), ungroupSelection, 'Ctrl+Shift+G', canUngroup.value),
        divider(),
        item(
          node?.locked ? 'lucide:lock-open' : 'lucide:lock',
          node?.locked ? message('unlock', 'Desbloquear') : message('lock', 'Bloquear'),
          () => updateSelectedNodes('locked', !node?.locked),
          '',
          onNode,
        ),
        item(
          node?.hidden ? 'lucide:eye' : 'lucide:eye-off',
          node?.hidden ? message('show', 'Mostrar') : message('hide', 'Ocultar'),
          () => updateSelectedNodes('hidden', !node?.hidden),
          '',
          onNode,
        ),
        divider(),
        // Úteis principalmente no clique com o botão direito em área vazia, onde
        // não há nó e o resto do menu fica desabilitado.
        item('lucide:maximize', message('zoomToFit', 'Enquadrar tudo'), zoomToFit, 'Shift+1'),
        item('lucide:keyboard', message('shortcuts', 'Atalhos do teclado'), () => { showShortcuts.value = true }, '?'),
        divider(),
        item('lucide:trash-2', message('delete', 'Excluir'), deleteSelectedNode, 'Del', onNode),
      ])
    }

    function renderArtboardBar() {
      return h('div', { class: 'gs-artboard-bar', 'aria-label': message('artboards', 'Telas') }, [
        ...artboards.value.map(({ page, node }) => h('div', {
          class: ['gs-artboard-chip', { 'is-active': canvasNode.value?.id === node.id }],
        }, [
          h('button', {
            type: 'button',
            class: 'gs-artboard-chip__select',
            onClick: () => { activePageId.value = page.id; setSelection([]) },
            onDblclick: (event: MouseEvent) => {
              const input = (event.currentTarget as HTMLElement).nextElementSibling
              if (input instanceof HTMLInputElement) { input.hidden = false; input.focus(); input.select() }
            },
          }, [h('span', page.name), h('small', `${node.frame.width}×${node.frame.height}`)]),
          h('input', {
            type: 'text',
            class: 'gs-artboard-chip__rename',
            hidden: true,
            value: page.name,
            'aria-label': message('renameArtboard', 'Renomear tela'),
            onBlur: (event: Event) => {
              const input = event.target as HTMLInputElement
              input.hidden = true
              renameArtboard(page.id, input.value)
            },
            onKeydown: (event: KeyboardEvent) => {
              if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
              if (event.key === 'Escape') {
                const input = event.target as HTMLInputElement
                input.value = page.name
                input.blur()
              }
            },
          }),
          artboards.value.length > 1
            ? h('button', {
                type: 'button',
                class: 'gs-artboard-chip__remove',
                title: message('removeArtboard', 'Remover tela'),
                'aria-label': message('removeArtboard', 'Remover tela'),
                onClick: () => removeArtboard(page.id),
              }, h(Icon, { icon: 'lucide:x' }))
            : null,
        ])),
        h('button', {
          type: 'button',
          class: 'gs-artboard-add',
          title: message('addArtboard', 'Nova tela'),
          onClick: () => addArtboard(viewport.value),
        }, [h(Icon, { icon: 'lucide:plus' }), message('addArtboard', 'Nova tela')]),
      ])
    }

    /**
     * Lista de atalhos.
     *
     * Um editor com vinte atalhos que ninguém descobre é um editor com zero
     * atalhos. A tabela fica ao lado do código que os trata, para as duas coisas
     * mudarem juntas.
     */
    const showShortcuts = ref(false)
    const SHORTCUTS: Array<[string, string]> = [
      ['V', 'Ferramenta mover'],
      ['K', 'Ferramenta escala (muda a fonte junto)'],
      ['F · T · R · L', 'Inserir título, texto, bloco, link'],
      ['Espaço + arrastar', 'Mão, para navegar na prancheta'],
      ['Setas', 'Mover 1 px · com Shift, 10 px'],
      ['Shift ao redimensionar', 'Trava a proporção'],
      ['Alt ao redimensionar', 'Cresce a partir do centro'],
      ['Alt + arrastar', 'Duplica o objeto'],
      ['Ctrl/Cmd + Z', 'Desfazer · com Shift, refazer'],
      ['Ctrl/Cmd + C · X · V', 'Copiar, recortar, colar'],
      ['Ctrl/Cmd + D', 'Duplicar'],
      ['Ctrl/Cmd + A', 'Selecionar os irmãos'],
      ['Ctrl/Cmd + G', 'Agrupar · com Shift, desagrupar'],
      ['Ctrl/Cmd + ] · [', 'Frente e trás · com Shift, topo e fundo'],
      ['Delete', 'Excluir a seleção'],
      ['+ · − · 0', 'Zoom mais, menos, 100%'],
      ['Shift + 1 · 2', 'Enquadrar tudo · enquadrar seleção'],
      ['Duplo clique', 'Editar o texto no canvas'],
      ['Botão direito', 'Ações do elemento'],
      ['Esc', 'Cancelar seleção'],
      ['?', 'Abrir e fechar esta lista'],
    ]

    function renderShortcuts() {
      if (!showShortcuts.value) return null
      return h('div', {
        class: 'gs-shortcuts',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': message('shortcuts', 'Atalhos do teclado'),
        onClick: () => { showShortcuts.value = false },
      }, h('div', { class: 'gs-shortcuts__panel', onClick: (event: MouseEvent) => { event.stopPropagation() } }, [
        h('header', [
          h('strong', message('shortcuts', 'Atalhos do teclado')),
          h('button', {
            type: 'button',
            'aria-label': message('closePanel', 'Fechar painel'),
            onClick: () => { showShortcuts.value = false },
          }, h(Icon, { icon: 'lucide:x' })),
        ]),
        h('dl', SHORTCUTS.flatMap(([tecla, descricao]) => [
          h('dt', h('kbd', tecla)),
          h('dd', descricao),
        ])),
      ]))
    }

    function renderAlignmentGuides() {
      if (!activeGuides.value.length) return null
      return activeGuides.value.map((guia, indice) => h('div', {
        key: `${guia.axis}-${indice}`,
        class: 'gs-alignment-guide',
        'aria-hidden': 'true',
        style: guia.axis === 'x'
          ? { left: `${guia.position}px`, top: `${guia.from}px`, height: `${guia.to - guia.from}px`, width: '1px' }
          : { top: `${guia.position}px`, left: `${guia.from}px`, width: `${guia.to - guia.from}px`, height: '1px' },
      }))
    }

    function renderSelectionOverlay() {
      const multi = multiSelectionBox.value
      if (multi) {
        // Multi-seleção: uma caixa envolvendo tudo. Antes só era desenhada a
        // caixa do nó primário, o que parecia bug.
        return h('div', {
          class: 'gs-selection-box is-multi',
          style: {
            left: `${multi.left}px`,
            top: `${multi.top}px`,
            width: `${multi.width}px`,
            height: `${multi.height}px`,
          },
          'aria-hidden': 'true',
        }, h('span', { class: 'gs-selection-box__label' },
          message('selectedCount', '{count} selecionados', { count: selectedNodes.value.length })))
      }

      const box = selectionBox.value
      const node = selectedNode.value
      if (!box || !node) return null
      const directions: ResizeDirection[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
      const corners: ResizeDirection[] = ['nw', 'ne', 'se', 'sw']
      return h('div', {
        class: ['gs-selection-box', {
          'is-locked': node.locked,
          'is-scaling': activeTool.value === 'scale',
          // Durante a edição a caixa não pode capturar o clique: ela cobre o nó
          // e o cursor de texto precisa chegar no elemento.
          'is-editing': editingNodeId.value === node.id,
        }],
        style: {
          left: `${box.left}px`,
          top: `${box.top}px`,
          width: `${box.width}px`,
          height: `${box.height}px`,
          // A caixa recebe a mesma transformação do nó, então as alças caem nos
          // cantos reais sem nenhuma trigonometria extra — inclusive quando o nó
          // tem `scale` ou `skew`, que antes deixavam a caixa fora de lugar.
          transform: box.transform,
          transformOrigin: box.transformOrigin ?? 'center',
        },
        role: 'group',
        tabindex: 0,
        'aria-label': message('transform', 'Transformar {name}', { name: layerLabel(node) }),
        onKeydown: nudgeSelected,
        onPointerdown: (event: PointerEvent) => { beginInteraction(event, 'move') },
        // A caixa fica por cima do nó, então o duplo clique cai aqui.
        onDblclick: (event: MouseEvent) => { event.stopPropagation(); editSelectedText() },
      }, [
        h('span', { class: 'gs-selection-box__label' },
          `${Math.round(box.width)} × ${Math.round(box.height)}${box.rotation ? ` · ${Math.round(box.rotation)}°` : ''}`),
        // Zonas de rotação: ficam por fora de cada canto, como no Figma.
        ...corners.map((corner) => h('button', {
          type: 'button',
          class: ['gs-rotate-handle', `is-${corner}`],
          'aria-label': message('rotate', 'Girar'),
          onPointerdown: (event: PointerEvent) => { beginInteraction(event, 'rotate') },
        })),
        ...directions.map((direction) => h('button', {
          type: 'button',
          class: ['gs-resize-handle', `is-${direction}`],
          style: { cursor: handleCursor(direction, box.rotation) },
          'aria-label': message('resize', 'Redimensionar {direction}', { direction }),
          onPointerdown: (event: PointerEvent) => { beginInteraction(event, direction) },
        })),
      ])
    }

    return () => h('section', { class: 'gs-editor', 'aria-label': message('visualEditor', 'Editor visual GraphicStudio') }, [
      h('header', { class: 'gs-editor__topbar' }, [
        h('div', { class: 'gs-editor__identity' }, [
          h('a', { href: props.homeHref, class: 'gs-editor__back', 'aria-label': message('backHome', 'Voltar para a home') }, h(Icon, { icon: 'lucide:arrow-left' })),
          h('span', { class: 'gs-editor__mark', 'aria-hidden': 'true' }, 'G'),
          h('div', { class: 'gs-editor__title' }, [
            h('input', {
              class: 'gs-document-title',
              value: workingDocument.value.metadata.title,
              'aria-label': message('documentTitle', 'Título do documento'),
              onInput: (event: Event) => { updateDocumentTitle(targetValue(event)) },
            }),
            h('label', { class: 'gs-document-slug', title: message('documentSlugHint', 'Endereço da página quando publicada') }, [
              h('span', '/p/'),
              h('input', {
                value: workingDocument.value.metadata.slug,
                'aria-label': message('documentSlug', 'Endereço da página'),
                onInput: (event: Event) => { updateDocumentSlug(targetValue(event)) },
              }),
            ]),
            metadataError.value ? h('small', { class: 'gs-document-error' }, metadataError.value) : null,
          ]),
        ]),
        h('div', { class: 'gs-editor__viewport', 'aria-label': message('previewViewport', 'Viewport da prévia') },
          (Object.entries(VIEWPORTS) as Array<[Viewport, typeof VIEWPORTS[Viewport]]>).map(([id, item]) =>
            h('button', {
              type: 'button',
              class: { 'is-active': viewport.value === id },
              'aria-pressed': viewport.value === id,
              title: viewportLabel(id),
              onClick: () => { setCanvasPreset(id) },
            }, h(Icon, { icon: id === 'desktop' ? 'lucide:monitor' : id === 'tablet' ? 'lucide:tablet' : 'lucide:smartphone' })),
          ),
        ),
        h('div', { class: 'gs-editor__top-actions' }, [
          h('div', { class: 'gs-history-actions', 'aria-label': message('history', 'Histórico') }, [
            h('button', { type: 'button', disabled: !canUndo.value, title: message('undo', 'Desfazer'), 'aria-label': message('undo', 'Desfazer'), onClick: () => { travelHistory('undo') } }, h(Icon, { icon: 'lucide:undo-2' })),
            h('button', { type: 'button', disabled: !canRedo.value, title: message('redo', 'Refazer'), 'aria-label': message('redo', 'Refazer'), onClick: () => { travelHistory('redo') } }, h(Icon, { icon: 'lucide:redo-2' })),
          ]),
          h('label', {
            class: 'gs-history-limit',
            title: message(
              'historyLimitHint',
              'Quantas alterações ficam guardadas para desfazer nesta máquina. Cada passo guarda uma cópia do documento.',
            ),
          }, [
            h(Icon, { icon: 'lucide:history' }),
            h('input', {
              type: 'number',
              min: HISTORY_LIMIT_MIN,
              max: HISTORY_LIMIT_MAX,
              step: 5,
              value: historyLimit.value,
              'aria-label': message('historyLimit', 'Passos de histórico guardados'),
              onChange: (event: Event) => { setHistoryLimit(targetValue(event)) },
            }),
            h('small', `${history.value.past.length}/${historyLimit.value}`),
          ]),
          h('span', [h('i'), message('savedLocally', 'Salvo localmente')]),
          h('button', {
            type: 'button',
            class: 'gs-shortcuts-button',
            title: message('shortcuts', 'Atalhos do teclado'),
            'aria-label': message('shortcuts', 'Atalhos do teclado'),
            onClick: () => { showShortcuts.value = !showShortcuts.value },
          }, h(Icon, { icon: 'lucide:keyboard' })),
          h('a', { href: props.previewHref, target: '_blank', rel: 'noopener', class: 'gs-preview-link', title: message('preview', 'Preview') }, [h(Icon, { icon: 'lucide:play' }), message('preview', 'Preview')]),
        ]),
      ]),
      h('div', { class: 'gs-editor__workspace' }, [
        h('nav', { class: 'gs-editor__rail', 'aria-label': message('editorTools', 'Ferramentas do editor') }, [
          panelButton('insert', 'lucide:plus', message('insert', 'Inserir')),
          panelButton('layers', 'lucide:layers-3', message('layers', 'Camadas')),
          panelButton('theme', 'lucide:palette', message('theme', 'Tema')),
          panelButton('files', 'lucide:folder-open', message('files', 'Arquivos')),
          panelButton('images', 'lucide:image-search', message('images', 'Imagens')),
          panelButton('icons', 'lucide:shapes', message('icons', 'Ícones')),
          h('button', {
            type: 'button',
            class: ['gs-mobile-properties', 'gs-mobile-only', { 'is-active': mobileTray.value === 'inspector' }],
            'aria-pressed': mobileTray.value === 'inspector',
            title: message('properties', 'Propriedades'),
            onClick: () => { mobileTray.value = mobileTray.value === 'inspector' ? null : 'inspector' },
          }, [h(Icon, { icon: 'lucide:sliders-horizontal' }), h('span', message('properties', 'Propriedades'))]),
          h('span', { class: 'gs-editor__rail-spacer' }),
          h('button', { type: 'button', disabled: true, title: message('aiUnavailable', 'IA ainda desabilitada') }, [h(Icon, { icon: 'lucide:wand-sparkles' }), h('span', 'IA')]),
        ]),
        mobileTray.value ? h('button', {
          type: 'button',
          class: 'gs-mobile-backdrop gs-mobile-only',
          'aria-label': message('closePanel', 'Fechar painel'),
          onClick: () => { mobileTray.value = null },
        }) : null,
        h('aside', { class: ['gs-editor__library', { 'is-mobile-open': mobileTray.value === 'library' }], 'aria-label': message('library', 'Biblioteca') }, [
          h('button', { type: 'button', class: 'gs-mobile-sheet-close gs-mobile-only', 'aria-label': message('closePanel', 'Fechar painel'), onClick: () => { mobileTray.value = null } }, h(Icon, { icon: 'lucide:x' })),
          activePanel.value === 'insert' ? renderInsertPanel()
            : activePanel.value === 'layers' ? renderLayersPanel()
              : activePanel.value === 'theme' ? renderThemePanel()
                : activePanel.value === 'files' ? renderFilesPanel()
                  : activePanel.value === 'images' ? renderImagesPanel()
                    : renderIconsPanel(),
        ]),
        h('div', {
          ref: stageElement,
          class: ['gs-editor__stage', { 'is-panning': isPanning.value, 'is-hand': spaceHeld.value }],
          onWheel: handleStageWheel,
          onPointerdown: beginPan,
          onContextmenu: openContextMenu,
        }, [
          h('div', { class: 'gs-editor__stage-bar' }, [
            h('span', `${message('canvas', 'Canvas')} · ${canvasWidth.value} × ${canvasHeight.value} px`),
            h('div', { class: 'gs-canvas-size', 'aria-label': message('canvasSize', 'Tamanho do canvas') }, [
              h('label', [h('span', 'W'), h('input', {
                type: 'number', min: 240, max: 10_000, value: canvasWidth.value,
                'aria-label': message('canvasWidth', 'Largura do canvas'),
                onChange: (event: Event) => { updateCanvasDimension('width', targetValue(event)) },
              })]),
              h('label', [h('span', 'H'), h('input', {
                type: 'number', min: 200, max: 10_000, value: canvasHeight.value,
                'aria-label': message('canvasHeight', 'Altura do canvas'),
                onChange: (event: Event) => { updateCanvasDimension('height', targetValue(event)) },
              })]),
              h('label', { title: message('canvasColor', 'Cor do canvas') }, [h('span', 'BG'), h('input', {
                type: 'color', value: styleValue(canvasNode.value?.style.backgroundColor, '#ffffff'),
                'aria-label': message('canvasColor', 'Cor do canvas'),
                onInput: (event: Event) => { updateCanvasBackground(targetValue(event)) },
              })]),
            ]),
            h('div', { class: 'gs-stage-actions' }, [
              h('button', {
                type: 'button',
                class: ['gs-snap-toggle', { 'is-active': snapEnabled.value }],
                title: message('snapGrid', 'Ajustar à grade de 8 px'),
                'aria-label': message('snapGrid', 'Ajustar à grade de 8 px'),
                'aria-pressed': snapEnabled.value,
                onClick: () => { snapEnabled.value = !snapEnabled.value },
              }, [h(Icon, { icon: 'lucide:magnet' }), '8']),
              h('button', {
                type: 'button',
                class: 'gs-fit-button',
                title: message('zoomToFit', 'Enquadrar tudo (Shift+1)'),
                'aria-label': message('zoomToFit', 'Enquadrar tudo'),
                onClick: zoomToFit,
              }, h(Icon, { icon: 'lucide:maximize' })),
              h('button', {
                type: 'button',
                class: 'gs-fit-button',
                disabled: !selectedNodeIds.value.length,
                title: message('zoomToSelection', 'Enquadrar seleção (Shift+2)'),
                'aria-label': message('zoomToSelection', 'Enquadrar seleção'),
                onClick: zoomToSelection,
              }, h(Icon, { icon: 'lucide:scan-search' })),
              h('div', { class: 'gs-zoom-control', 'aria-label': message('zoom', 'Zoom') }, [
                h('button', { type: 'button', title: message('zoomOut', 'Diminuir zoom'), 'aria-label': message('zoomOut', 'Diminuir zoom'), disabled: zoom.value <= 25, onClick: () => { setZoom(zoom.value - 25) } }, h(Icon, { icon: 'lucide:minus' })),
                h('button', { type: 'button', class: 'gs-zoom-control__value', title: message('resetZoom', 'Restaurar zoom'), onClick: () => { setZoom(100) } }, `${zoom.value}%`),
                h('button', { type: 'button', title: message('zoomIn', 'Aumentar zoom'), 'aria-label': message('zoomIn', 'Aumentar zoom'), disabled: zoom.value >= 200, onClick: () => { setZoom(zoom.value + 25) } }, h(Icon, { icon: 'lucide:plus' })),
              ]),
            ]),
          ]),
          renderArtboardBar(),
          renderMultiSelectionToolbar(),
          h('div', {
            class: 'gs-editor__canvas-shell',
            style: {
              // A prancheta cobre todos os artboards, não só o ativo.
              width: `${boardExtent.value.width}px`,
              height: `${boardExtent.value.height}px`,
              transform: `scale(${zoom.value / 100})`,
            },
          }, [
            h('div', {
              ref: canvasElement,
              class: 'gs-editor__canvas',
              onClickCapture: selectFromCanvas,
              onDblclickCapture: editFromCanvas,
            }, [h(GraphicStudioRenderer, {
              // Trocar a chave remonta o renderer, e animação CSS só recomeça em
              // elemento novo — é assim que o botão Prever reexecuta.
              key: previewNonce.value,
              document: previewDocument.value,
              assetUrls: assetUrls.value,
              // Deixa o CSS dimensionar os nós automáticos para poder medi-los.
              measureAuto: true,
              // Estado final, sem animação de entrada: durante a edição o
              // elemento precisa estar visível e no lugar certo. Só o Prever
              // liga a animação, e por tempo limitado.
              animate: animationPreview.value,
              ...(selectedNodeId.value ? { selectedNodeId: selectedNodeId.value } : {}),
              selectedNodeIds: selectedNodeIds.value,
            }), renderAlignmentGuides(), renderSelectionOverlay()]),
          ]),
        ]),
        h('aside', { class: ['gs-editor__inspector', { 'is-mobile-open': mobileTray.value === 'inspector' }], 'aria-label': message('properties', 'Propriedades') }, [
          h('button', { type: 'button', class: 'gs-mobile-sheet-close gs-mobile-only', 'aria-label': message('closePanel', 'Fechar painel'), onClick: () => { mobileTray.value = null } }, h(Icon, { icon: 'lucide:x' })),
          h('div', { class: 'gs-panel-heading' }, [h('strong', message('properties', 'Propriedades')), h('small', message('inspector', 'Inspector'))]),
          renderInspector(),
        ]),
      ]),
      renderContextMenu(),
      renderShortcuts(),
    ])
  },
})
