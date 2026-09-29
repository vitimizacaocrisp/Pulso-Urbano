import {
  graphicStudioDocumentSchema,
  type BlockNode,
  type EmbedNode,
  type GraphicStudioDocument,
  type GraphicStudioNode,
  type HeadingNode,
  type IconNode,
  type ImageNode,
  type LinkNode,
  type ListNode,
  type PageNode,
  type QuoteNode,
  type ShapeNode,
  type TextNode,
  type VideoNode,
  type AudioNode,
  type FileNode,
  type ChartNode,
  isGradientFill,
} from '../core/index.js'
import { Icon } from '@iconify/vue'
import { defineAsyncComponent, defineComponent, h, type CSSProperties, type PropType, type VNode } from 'vue'
// Reaproveitados do leitor de postagens (mesmos componentes, mesma lógica de
// parse) — evita duas implementações de "abrir CSV/planilha/notebook/PDF".
// `defineAsyncComponent`, não import estático: cada um puxa uma lib pesada
// client-only (papaparse/xlsx/sql.js/mammoth) por trás de um `import()`
// dinâmico; um import estático aqui arrasta essas libs pro bundle do servidor
// (Nitro) e a build quebra tentando "entender" o CJS gerado do papaparse.
const ResourceDataViewer = defineAsyncComponent(() => import('../../components/postagens/ResourceDataViewer.vue'))
const CodeNotebookViewer = defineAsyncComponent(() => import('../../components/postagens/CodeNotebookViewer.vue'))
const DocumentMiniReader = defineAsyncComponent(() => import('../../components/postagens/DocumentMiniReader.vue'))
const ChartViewer = defineAsyncComponent(() => import('../../components/ChartViewer.vue'))
import { ClientOnly } from '#components'

function cssValue(value: { token: string } | { value: string } | undefined): string | undefined {
  if (!value) return undefined
  if ('value' in value) return value.value
  return `var(--gs-${value.token.replaceAll('.', '-')})`
}

function boxShadowValue(shadows: GraphicStudioNode['style']['boxShadow']) {
  if (!shadows || !shadows.length) return undefined
  return shadows
    .map((shadow) => `${shadow.inset ? 'inset ' : ''}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${cssValue(shadow.color)}`)
    .join(', ')
}

/**
 * `backgroundColor` aceita cor sólida OU gradiente (`{ kind: 'gradient' }`) —
 * ver `backgroundFillSchema` em core/document.ts. Sólido continua saindo em
 * `background-color`; gradiente sai em `background-image`, porque é assim que
 * o CSS separa os dois (não dá pra animar um gradiente de verdade entre
 * navegadores, então o `animated` desloca o próprio degradê numa caixa maior —
 * ver gs-gradient-flow no CSS).
 */
function backgroundValue(fill: GraphicStudioNode['style']['backgroundColor']): {
  backgroundColor?: string
  backgroundImage?: string
  backgroundSize?: string
} {
  if (!fill) return {}
  if (isGradientFill(fill)) {
    const stops = [...fill.stops]
      .sort((a, b) => a.offset - b.offset)
      .map((stop) => `${cssValue(stop.color)} ${stop.offset}%`)
      .join(', ')
    const image = fill.type === 'linear'
      ? `linear-gradient(${fill.angle}deg, ${stops})`
      : `radial-gradient(circle, ${stops})`
    return { backgroundImage: image, backgroundSize: fill.animated ? '200% 200%' : undefined }
  }
  return { backgroundColor: cssValue(fill) }
}

function gradientAnimationValue(fill: GraphicStudioNode['style']['backgroundColor']): string | undefined {
  if (!isGradientFill(fill) || !fill.animated) return undefined
  return `gs-gradient-flow ${fill.animationDuration}ms ease infinite`
}

function textShadowValue(shadow: GraphicStudioNode['style']['textShadow']) {
  if (!shadow) return undefined
  return `${shadow.x}px ${shadow.y}px ${shadow.blur}px ${cssValue(shadow.color)}`
}

function filterValue(filter: GraphicStudioNode['style']['filter']) {
  if (!filter) return undefined
  return `blur(${filter.blur}px) brightness(${filter.brightness}) contrast(${filter.contrast}) saturate(${filter.saturate}) grayscale(${filter.grayscale})`
}

/**
 * Remove as chaves sem valor do objeto de estilo.
 *
 * Não é cosmético: o Vue traduz `undefined` em "apague esta propriedade". Como
 * `borderRadius` é uma abreviação que se expande nos quatro cantos, emitir
 * `borderTopLeftRadius: undefined` logo depois dela apagava o arredondamento
 * inteiro. Um nó com `style.borderRadius` simplesmente saía com canto reto.
 */
function compactStyle(style: Record<string, unknown>): CSSProperties {
  const compacted: Record<string, unknown> = {}
  for (const [property, value] of Object.entries(style)) {
    if (value !== undefined) compacted[property] = value
  }
  return compacted as CSSProperties
}

function nodeStyle(node: GraphicStudioNode, measureAuto: boolean, animate: boolean): CSSProperties {
  const transforms = [
    node.frame.rotation ? `rotate(${node.frame.rotation}deg)` : '',
    node.style.scale !== undefined && node.style.scale !== 1 ? `scale(${node.style.scale})` : '',
    node.style.skewX ? `skewX(${node.style.skewX}deg)` : '',
    node.style.skewY ? `skewY(${node.style.skewY}deg)` : '',
  ].filter(Boolean)
  // Só o editor deixa o CSS dimensionar nós automáticos, para poder medi-los.
  // A página publicada emite sempre o número gravado: determinístico, sem salto
  // quando a fonte termina de carregar.
  const fluidWidth = measureAuto && node.frame.autoResize === 'width-and-height'
  const fluidHeight = measureAuto && node.frame.autoResize !== 'none'
  const background = backgroundValue(node.style.backgroundColor)
  return compactStyle({
    // Tudo absoluto. Uma página é um artboard posicionado na prancheta; os
    // demais nós se posicionam dentro do artboard que os contém.
    position: 'absolute',
    // Precisa emitir mesmo quando é 0: `left: auto` cairia na posição estática.
    left: `${node.frame.x}px`,
    top: `${node.frame.y}px`,
    width: fluidWidth ? 'max-content' : `${node.frame.width}px`,
    height: fluidHeight ? 'auto' : `${node.frame.height}px`,
    color: cssValue(node.style.color),
    backgroundColor: background.backgroundColor,
    backgroundImage: background.backgroundImage,
    backgroundSize: background.backgroundSize,
    borderRadius: cssValue(node.style.borderRadius),
    borderTopLeftRadius: cssValue(node.style.borderTopLeftRadius),
    borderTopRightRadius: cssValue(node.style.borderTopRightRadius),
    borderBottomRightRadius: cssValue(node.style.borderBottomRightRadius),
    borderBottomLeftRadius: cssValue(node.style.borderBottomLeftRadius),
    borderWidth: node.style.borderWidth !== undefined ? `${node.style.borderWidth}px` : undefined,
    borderStyle: node.style.borderStyle,
    borderColor: cssValue(node.style.borderColor),
    boxShadow: boxShadowValue(node.style.boxShadow),
    boxSizing: 'border-box',
    paddingTop: node.style.paddingTop !== undefined ? `${node.style.paddingTop}px` : undefined,
    paddingRight: node.style.paddingRight !== undefined ? `${node.style.paddingRight}px` : undefined,
    paddingBottom: node.style.paddingBottom !== undefined ? `${node.style.paddingBottom}px` : undefined,
    paddingLeft: node.style.paddingLeft !== undefined ? `${node.style.paddingLeft}px` : undefined,
    opacity: node.style.opacity,
    fontFamily: node.style.fontFamily,
    fontSize: node.style.fontSize ? `${node.style.fontSize}px` : undefined,
    fontWeight: node.style.fontWeight,
    fontStyle: node.style.fontStyle,
    lineHeight: node.style.lineHeight,
    letterSpacing: node.style.letterSpacing ? `${node.style.letterSpacing}px` : undefined,
    wordSpacing: node.style.wordSpacing ? `${node.style.wordSpacing}px` : undefined,
    textAlign: node.style.textAlign,
    textTransform: node.style.textTransform,
    textDecoration: node.style.textDecoration,
    textShadow: textShadowValue(node.style.textShadow),
    transform: transforms.length ? transforms.join(' ') : undefined,
    transformOrigin: node.style.transformOrigin,
    // Sem recorte implícito: um objeto com a ponta para fora da página continua
    // visível. Para recortar, declare `style.overflow: 'hidden'`.
    overflow: node.style.overflow,
    mixBlendMode: node.style.mixBlendMode,
    filter: filterValue(node.style.filter),
    zIndex: node.style.zIndex,
    // As duas animações (entrada do nó + fluxo do gradiente) são independentes
    // e o CSS `animation` aceita lista separada por vírgula — não precisa
    // escolher uma.
    animation: [animationValue(node, animate), gradientAnimationValue(node.style.backgroundColor)]
      .filter((value): value is string => Boolean(value))
      .join(', ') || undefined,
  })
}

/**
 * Junta as classes internas do renderer (`gs-rendered-*`) com os grupos
 * declarados no documento, que existem justamente para virar classes CSS.
 */
function nodeClass(node: GraphicStudioNode, ...rendererClasses: string[]): string | undefined {
  const classes = [...rendererClasses, ...(node.groups ?? [])]
  return classes.length ? classes.join(' ') : undefined
}

/**
 * Animação de entrada como CSS puro (`animation`), e não via biblioteca JS.
 *
 * Assim a animação roda sem depender de JavaScript, e o `both` garante o estado
 * final — um elemento nunca fica preso invisível no estado inicial.
 *
 * Os keyframes usam as propriedades individuais `translate`/`scale`, nunca
 * `transform` — assim a animação compõe com a rotação do nó em vez de sobrescrevê-la.
 * Definição em `src/assets/css/studio.css`.
 */
function animationValue(node: GraphicStudioNode, animate: boolean): string | undefined {
  const animation = node.animation
  if (!animate || !animation) return undefined
  const custom = Boolean(animation.keyframes?.length)
  const name = custom ? keyframesName(node.id) : `gs-${animation.preset}`
  const easing = custom
    ? animation.easing
    : animation.preset === 'bounce-soft' ? 'ease-in-out' : 'ease-out'
  const count = animation.iterations === 0 ? 'infinite' : animation.iterations
  return `${name} ${animation.duration}ms ${easing} ${animation.delay}ms ${count} ${animation.direction} both`
}

function keyframesName(nodeId: string): string {
  return `gs-kf-${nodeId}`
}

/**
 * Monta a regra `@keyframes` de um nó com animação quadro a quadro.
 *
 * Nasce como CSS de verdade, e não como Web Animations API, por dois motivos: o
 * HTML exportado precisa animar sem JavaScript, e a composição fica na GPU.
 */
function keyframesRule(node: GraphicStudioNode): string | null {
  const frames = node.animation?.keyframes
  if (!frames?.length) return null
  const body = [...frames]
    .sort((left, right) => left.offset - right.offset)
    .map((frame) => {
      const declarations: string[] = []
      if (frame.opacity !== undefined) declarations.push(`opacity:${frame.opacity}`)
      if (frame.x !== undefined || frame.y !== undefined) {
        declarations.push(`translate:${frame.x ?? 0}px ${frame.y ?? 0}px`)
      }
      if (frame.scale !== undefined) declarations.push(`scale:${frame.scale}`)
      if (frame.rotate !== undefined) declarations.push(`rotate:${frame.rotate}deg`)
      return `${frame.offset}%{${declarations.join(';')}}`
    })
    .join('')
  return `@keyframes ${keyframesName(node.id)}{${body}}`
}

function renderElement(
  tag: string,
  attributes: Record<string, unknown>,
  children: string | VNode | (string | VNode)[],
): VNode {
  return h(tag, attributes, children)
}

// `**negrito**` e `*itálico*`/`_itálico_` dentro do texto puro do nó — não é
// rich text de verdade (`content.text` continua uma string só), é a marcação
// mais simples que dá pra interpretar na hora de renderizar, sem mexer no
// schema nem virar um editor de seleção de trechos. `**` processa primeiro
// pra `*ênfase dentro de **negrito*** também funcionar.
const BOLD_PATTERN = new RegExp(String.raw`\*\*(.+?)\*\*`, 'g')
const ITALIC_PATTERN = new RegExp(String.raw`\*(.+?)\*|_(.+?)_`, 'g')

function parseItalic(text: string): (string | VNode)[] {
  const parts: (string | VNode)[] = []
  let lastIndex = 0
  for (const match of text.matchAll(ITALIC_PATTERN)) {
    if (match.index === undefined) continue
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    parts.push(h('em', match[1] ?? match[2] ?? ''))
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length ? parts : [text]
}

function parseInlineMarkdown(text: string): (string | VNode)[] {
  const parts: (string | VNode)[] = []
  let lastIndex = 0
  for (const match of text.matchAll(BOLD_PATTERN)) {
    if (match.index === undefined) continue
    if (match.index > lastIndex) parts.push(...parseItalic(text.slice(lastIndex, match.index)))
    parts.push(h('strong', parseItalic(match[1])))
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(...parseItalic(text.slice(lastIndex)))
  return parts
}

function isPageNode(node: GraphicStudioNode): node is PageNode {
  return node.type === 'core/page'
}

function isHeadingNode(node: GraphicStudioNode): node is HeadingNode {
  return node.type === 'core/heading'
}

function isTextNode(node: GraphicStudioNode): node is TextNode {
  return node.type === 'core/text'
}

function isLinkNode(node: GraphicStudioNode): node is LinkNode {
  return node.type === 'core/link'
}

function isIconNode(node: GraphicStudioNode): node is IconNode {
  return node.type === 'core/icon'
}

function isImageNode(node: GraphicStudioNode): node is ImageNode {
  return node.type === 'core/image'
}

function isBlockNode(node: GraphicStudioNode): node is BlockNode {
  return node.type === 'core/block'
}

function isShapeNode(node: GraphicStudioNode): node is ShapeNode {
  return node.type === 'core/shape'
}

function isListNode(node: GraphicStudioNode): node is ListNode {
  return node.type === 'core/list'
}

function isQuoteNode(node: GraphicStudioNode): node is QuoteNode {
  return node.type === 'core/quote'
}

function isEmbedNode(node: GraphicStudioNode): node is EmbedNode {
  return node.type === 'core/embed'
}

function isVideoNode(node: GraphicStudioNode): node is VideoNode {
  return node.type === 'core/video'
}

function isAudioNode(node: GraphicStudioNode): node is AudioNode {
  return node.type === 'core/audio'
}

function isFileNode(node: GraphicStudioNode): node is FileNode {
  return node.type === 'core/file'
}

function isChartNode(node: GraphicStudioNode): node is ChartNode {
  return node.type === 'core/chart'
}

export const GraphicStudioRenderer = defineComponent({
  name: 'GraphicStudioRenderer',
  props: {
    document: {
      type: Object as PropType<GraphicStudioDocument>,
      required: true,
    },
    selectedNodeId: {
      type: String,
      default: undefined,
    },
    selectedNodeIds: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    pageTag: {
      type: String as PropType<'main' | 'div'>,
      default: 'main',
    },
    /**
     * Deixa o CSS dimensionar os nós com `frame.autoResize`, para o editor poder
     * medi-los e gravar o número de volta. Fora do editor, mantenha `false`.
     */
    measureAuto: {
      type: Boolean,
      default: false,
    },
    /**
     * Executa as animações de entrada. O editor desliga: durante a edição o
     * elemento precisa aparecer no estado FINAL, senão ele fica parado no
     * estado inicial da animação — invisível e deslocado, e a caixa de seleção
     * (que segue o documento) deixa de bater com o que está na tela.
     */
    animate: {
      type: Boolean,
      default: true,
    },
  },
  setup(props) {
    return () => {
      const parsed = graphicStudioDocumentSchema.safeParse(props.document)

      if (!parsed.success) {
        return h(
          'section',
          { role: 'alert', 'data-gs-invalid-document': '' },
          'Documento GraphicStudio inválido.',
        )
      }

      const document = parsed.data
      const childrenByParent = new Map<string, GraphicStudioNode[]>()

      for (const node of Object.values(document.nodes)) {
        if (node.parentId === null) continue
        const siblings = childrenByParent.get(node.parentId) ?? []
        siblings.push(node)
        childrenByParent.set(node.parentId, siblings)
      }

      for (const siblings of childrenByParent.values()) {
        siblings.sort((left, right) => left.order - right.order)
      }

      const renderNode = (node: GraphicStudioNode): VNode | null => {
        if (node.hidden) return null

        const children = (childrenByParent.get(node.id) ?? [])
          .map(renderNode)
          .filter((child): child is VNode => child !== null)
        const attributes: Record<string, unknown> = {
          id: node.name,
          class: nodeClass(node),
          style: nodeStyle(node, props.measureAuto, props.animate),
          'data-gs-node-id': node.id,
          'data-gs-node-type': node.type,
          'data-gs-animation': node.animation?.preset,
          'data-gs-selected': props.selectedNodeId === node.id || props.selectedNodeIds.includes(node.id) ? '' : undefined,
        }

        if (isPageNode(node)) {
          return renderElement(props.pageTag, {
            ...attributes,
            'aria-label': node.accessibility?.label,
          }, children)
        }

        if (isHeadingNode(node)) {
          return renderElement(`h${node.content.level}`, attributes, parseInlineMarkdown(node.content.text))
        }

        if (isTextNode(node)) {
          return renderElement('p', attributes, parseInlineMarkdown(node.content.text))
        }

        if (isLinkNode(node)) {
          return renderElement('a', { ...attributes, href: node.content.href }, parseInlineMarkdown(node.content.text))
        }

        if (isIconNode(node)) {
          return renderElement('span', {
            ...attributes,
            class: nodeClass(node, 'gs-rendered-icon'),
            role: 'img',
            'aria-label': node.content.label,
          }, h(Icon, { icon: node.content.name, 'aria-hidden': 'true' }))
        }

        if (isImageNode(node)) {
          const caption = node.content.attribution
            ? h('figcaption', [
                node.content.sourceUrl
                  ? h('a', {
                      href: node.content.sourceUrl,
                      target: '_blank',
                      rel: 'noreferrer',
                    }, node.content.attribution)
                  : node.content.attribution,
              ])
            : []
          return renderElement('figure', { ...attributes, class: nodeClass(node, 'gs-rendered-image') }, [
            h('img', {
              src: node.content.src,
              alt: node.content.alt,
              loading: 'lazy',
              style: { objectFit: node.content.fit },
            }),
            ...(Array.isArray(caption) ? caption : [caption]),
          ])
        }

        if (isBlockNode(node)) {
          return renderElement('section', {
            ...attributes,
            class: nodeClass(node, 'gs-rendered-block'),
            'aria-label': node.content.label,
          }, children)
        }

        if (isShapeNode(node)) {
          // Elipse e triângulo saem do retângulo por CSS, não por SVG: assim a
          // forma continua sendo uma caixa comum, com a mesma geometria, o mesmo
          // preenchimento e os mesmos filhos que qualquer outro nó.
          const shapeStyle: CSSProperties = {}
          if (node.content.kind === 'ellipse') shapeStyle.borderRadius = '50%'
          if (node.content.kind === 'triangle') shapeStyle.clipPath = 'polygon(50% 0%, 100% 100%, 0% 100%)'
          return renderElement('div', {
            ...attributes,
            class: nodeClass(node, 'gs-rendered-shape', `gs-shape-${node.content.kind}`),
            style: { ...(attributes.style as CSSProperties), ...shapeStyle },
            role: 'presentation',
            'aria-label': node.content.label,
          }, children)
        }

        if (isListNode(node)) {
          return renderElement(node.content.ordered ? 'ol' : 'ul', {
            ...attributes,
            class: nodeClass(node, 'gs-rendered-list'),
          }, node.content.items.map((item) => h('li', parseInlineMarkdown(item))))
        }

        if (isQuoteNode(node)) {
          return renderElement('blockquote', {
            ...attributes,
            class: nodeClass(node, 'gs-rendered-quote'),
          }, [
            h('p', parseInlineMarkdown(node.content.text)),
            node.content.citation ? h('cite', parseInlineMarkdown(node.content.citation)) : null,
          ].filter((child): child is VNode => child !== null))
        }

        if (isEmbedNode(node)) {
          return renderElement('iframe', {
            ...attributes,
            class: nodeClass(node, 'gs-rendered-embed'),
            src: node.content.src,
            title: node.content.title,
            loading: 'lazy',
            // Página de terceiro rodando dentro do documento: sem
            // `allow-top-navigation` ela não pode sequestrar a aba, e sem
            // referrer não vaza de onde o visitante veio.
            sandbox: 'allow-scripts allow-same-origin allow-presentation allow-popups',
            referrerpolicy: 'no-referrer',
            allowfullscreen: node.content.allowFullscreen || undefined,
          }, [])
        }

        if (isVideoNode(node)) {
          return renderElement('figure', {
            ...attributes,
            class: nodeClass(node, 'gs-rendered-video'),
            'aria-label': node.content.name,
          }, h('video', { src: node.content.src, controls: node.content.controls, preload: 'metadata' }))
        }

        if (isAudioNode(node)) {
          return renderElement('figure', {
            ...attributes,
            class: nodeClass(node, 'gs-rendered-audio'),
            'aria-label': node.content.name,
          }, h('audio', { src: node.content.src, controls: node.content.controls, preload: 'metadata' }))
        }

        if (isFileNode(node)) {
          const { src, name, kind } = node.content
          if (kind === 'image') {
            return renderElement('figure', {
              ...attributes,
              class: nodeClass(node, 'gs-rendered-image', 'gs-rendered-local-image'),
            }, h('img', {
              src,
              alt: name,
              loading: 'lazy',
              style: { objectFit: 'cover' },
            }))
          }
          // pdf/código/notebook/planilha ganham prévia real embutida — os
          // mesmos leitores já usados na página de postagem (ver imports no
          // topo do arquivo), só trocando a fonte pela URL do R2.
          if (kind === 'pdf') {
            return h('div', { ...attributes, class: nodeClass(node, 'gs-rendered-file-preview') }, [
              h(ClientOnly, {}, () => h(DocumentMiniReader, { url: src, file: { nome: name } })),
            ])
          }
          if (kind === 'code' || kind === 'notebook') {
            return h('div', { ...attributes, class: nodeClass(node, 'gs-rendered-file-preview') }, [
              h(ClientOnly, {}, () => h(CodeNotebookViewer, { url: src, kind })),
            ])
          }
          if (kind === 'data') {
            return h('div', { ...attributes, class: nodeClass(node, 'gs-rendered-file-preview') }, [
              h(ClientOnly, {}, () => h(ResourceDataViewer, { url: src, file: { nome: name } })),
            ])
          }
          return renderElement('a', {
            ...attributes,
            class: nodeClass(node, 'gs-rendered-file'),
            href: src,
            download: name,
          }, [
            h('span', { 'aria-hidden': 'true' }, 'FILE'),
            h('strong', name),
            h('small', node.content.mediaType || kind),
          ])
        }

        if (isChartNode(node)) {
          return h('div', { ...attributes, class: nodeClass(node, 'gs-rendered-chart') }, [
            h(ClientOnly, {}, () => h(ChartViewer, {
              kind: node.content.kind,
              data: node.content.data,
              title: node.content.title,
            })),
          ])
        }

        return h(
          'div',
          { ...attributes, role: 'note', 'data-gs-missing-node': node.type },
          `Conteúdo indisponível: ${node.type}`,
        )
      }

      const roots = document.pages
        .map((page) => document.nodes[page.rootNodeId])
        .filter((node): node is GraphicStudioNode => node !== undefined)
      const pages = roots
        .map(renderNode)
        .filter((node): node is VNode => node !== null)

      // A prancheta precisa ser o bloco de posicionamento dos artboards, e ter
      // tamanho suficiente para conter todos eles.
      const extent = roots.reduce((size, node) => ({
        width: Math.max(size.width, node.frame.x + node.frame.width),
        height: Math.max(size.height, node.frame.y + node.frame.height),
      }), { width: 0, height: 0 })

      // Tokens do tema viram variáveis CSS na raiz do documento. Ficam aqui, e
      // não numa folha de estilo, para que o HTML exportado carregue o tema
      // junto: `{ token: 'cor.marca' }` num nó resolve para `var(--gs-cor-marca)`.
      const themeVariables: Record<string, string> = {}
      for (const [token, value] of Object.entries(document.theme.overrides)) {
        if (typeof value === 'string' || typeof value === 'number') {
          themeVariables[`--gs-${token.replaceAll('.', '-')}`] = String(value)
        }
      }

      // As regras `@keyframes` das animações personalizadas viajam dentro da
      // raiz, e não numa folha externa, para que o HTML exportado leve a
      // animação junto — `outerHTML` da raiz é o arquivo inteiro.
      const rules = props.animate
        ? Object.values(document.nodes).map(keyframesRule).filter(Boolean).join('\n')
        : ''

      return h('div', {
        'data-graphicstudio-document': document.documentId,
        style: {
          position: 'relative',
          width: `${extent.width}px`,
          height: `${extent.height}px`,
          ...themeVariables,
        },
      }, [
        ...(rules ? [h('style', rules)] : []),
        ...pages,
      ])
    }
  },
})
