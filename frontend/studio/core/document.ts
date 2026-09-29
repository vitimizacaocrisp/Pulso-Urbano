import { z } from 'zod'

export const MAX_DOCUMENT_NODES = 1_000
export const MAX_DOCUMENT_DEPTH = 32

type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
)

const identifierSchema = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/)
const nodeTypeSchema = z.string().min(3).max(128).regex(/^[a-z0-9-]+\/[a-z0-9-]+$/)

// Slug reaproveitável como `id` de HTML e como classe CSS: precisa começar com
// letra minúscula, porque seletores como `#1bloco` ou `.1bloco` são inválidos.
const SLUG_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

function slugSchema(message: string) {
  return z.string().min(1).max(64).regex(SLUG_PATTERN, message)
}

/** Nome público do bloco. Vira o atributo `id` do elemento HTML renderizado. */
export const nodeNameSchema = slugSchema('Node name must be a slug usable as an HTML id')

/** Nome de um grupo de blocos. Vira uma classe CSS do elemento renderizado. */
export const nodeGroupSchema = slugSchema('Group name must be a slug usable as a CSS class')

export const nodeGroupsSchema = z
  .array(nodeGroupSchema)
  .max(16)
  .refine((groups) => new Set(groups).size === groups.length, 'Group names must be unique')
/**
 * Como o Figma: o tamanho no documento é SEMPRE número. Este campo diz apenas se
 * o número se recalcula sozinho conforme o conteúdo muda (o `textAutoResize` do
 * Figma). Assim o servidor renderiza sem precisar medir nada.
 */
export const autoResizeSchema = z.enum(['none', 'height', 'width-and-height'])

const tokenOrValueSchema = z.union([
  z.object({ token: z.string().min(1).max(128) }).strict(),
  z.object({ value: z.string().min(1).max(128) }).strict(),
])

/**
 * Parada de cor de um gradiente: mesma cor token-ou-valor do resto do estilo,
 * mais a posição (0-100%) onde ela pega no degradê.
 */
const gradientStopSchema = z.object({
  color: tokenOrValueSchema,
  offset: z.number().finite().min(0).max(100),
}).strict()

/**
 * Preenchimento em gradiente — alternativa ao `tokenOrValueSchema` de cor
 * sólida em `backgroundColor`. `angle` só vale pro `linear`; o `radial`
 * sempre parte do centro (mesma limitação do Figma pra manter o controle
 * simples).
 *
 * Animado: o renderer não anima os `stops` em si (CSS não interpola gradiente
 * de forma confiável entre navegadores) — desloca o próprio degradê por baixo
 * de uma caixa maior (`background-size`/`background-position`), o mesmo truque
 * clássico de "gradiente animado" em CSS puro, sem JS na página publicada.
 */
const gradientFillSchema = z.object({
  kind: z.literal('gradient'),
  type: z.enum(['linear', 'radial']),
  angle: z.number().finite().min(0).max(360).default(180),
  stops: z.array(gradientStopSchema).min(2).max(8),
  animated: z.boolean().default(false),
  animationDuration: z.number().int().min(500).max(30_000).default(6_000),
}).strict()

const backgroundFillSchema = z.union([tokenOrValueSchema, gradientFillSchema])

const fontFamilySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9 ._-]+$/, 'Font family contains unsupported characters')

const shadowSchema = z.object({
  x: z.number().finite().min(-500).max(500),
  y: z.number().finite().min(-500).max(500),
  blur: z.number().finite().min(0).max(500),
  spread: z.number().finite().min(-200).max(200).default(0),
  color: tokenOrValueSchema,
  inset: z.boolean().default(false),
}).strict()

const textShadowSchema = z.object({
  x: z.number().finite().min(-200).max(200),
  y: z.number().finite().min(-200).max(200),
  blur: z.number().finite().min(0).max(200),
  color: tokenOrValueSchema,
}).strict()

const filterSchema = z.object({
  blur: z.number().finite().min(0).max(100).default(0),
  brightness: z.number().finite().min(0).max(3).default(1),
  contrast: z.number().finite().min(0).max(3).default(1),
  saturate: z.number().finite().min(0).max(5).default(1),
  grayscale: z.number().finite().min(0).max(1).default(0),
}).strict()

export const animationPresetSchema = z.enum([
  'fade-up',
  'fade-in',
  'scale-in',
  'slide-left',
  'bounce-soft',
])

/**
 * Um quadro-chave da animação.
 *
 * `offset` é a posição no tempo, de 0 a 100 por cento. As propriedades são as
 * mesmas que o CSS sabe animar de forma barata (composição na GPU), e usam
 * `translate`/`scale`/`rotate` individuais em vez de `transform`, para compor
 * com a rotação do próprio nó em vez de apagá-la.
 */
export const keyframeSchema = z
  .object({
    offset: z.number().min(0).max(100),
    opacity: z.number().min(0).max(1).optional(),
    x: z.number().finite().min(-5_000).max(5_000).optional(),
    y: z.number().finite().min(-5_000).max(5_000).optional(),
    scale: z.number().finite().min(0).max(10).optional(),
    rotate: z.number().finite().min(-1_440).max(1_440).optional(),
  })
  .strict()

export const animationSchema = z
  .object({
    /** Animação pronta. Ignorado quando há `keyframes`. */
    preset: animationPresetSchema.optional(),
    /** Animação quadro a quadro, montada no editor. */
    keyframes: z.array(keyframeSchema).min(2).max(40).optional(),
    duration: z.number().int().min(100).max(30_000),
    delay: z.number().int().min(0).max(5_000),
    easing: z.enum(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']).default('ease-out'),
    /** 0 = repete para sempre. */
    iterations: z.number().int().min(0).max(1_000).default(1),
    direction: z.enum(['normal', 'reverse', 'alternate', 'alternate-reverse']).default('normal'),
  })
  .strict()
  .refine(
    (animation) => Boolean(animation.preset) || Boolean(animation.keyframes),
    'Animation needs either a preset or keyframes',
  )

// `x`/`y` são o canto superior-esquerdo NÃO rotacionado, em coordenadas do pai.
// A rotação gira em torno do centro, então o centro é invariante.
export const frameSchema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().finite().min(0),
    height: z.number().finite().min(0),
    rotation: z.number().finite().min(-360).max(360),
    autoResize: autoResizeSchema.default('none'),
  })
  .strict()

const pageFrameSchema = frameSchema.extend({
  width: z.number().finite().min(240).max(10_000),
  height: z.number().finite().min(200).max(10_000),
  // Um artboard nunca se auto-dimensiona.
  autoResize: z.literal('none').default('none'),
})

export const styleSchema = z
  .object({
    color: tokenOrValueSchema.optional(),
    backgroundColor: backgroundFillSchema.optional(),
    opacity: z.number().finite().min(0).max(1).optional(),
    borderRadius: tokenOrValueSchema.optional(),
    borderTopLeftRadius: tokenOrValueSchema.optional(),
    borderTopRightRadius: tokenOrValueSchema.optional(),
    borderBottomRightRadius: tokenOrValueSchema.optional(),
    borderBottomLeftRadius: tokenOrValueSchema.optional(),
    borderWidth: z.number().finite().min(0).max(100).optional(),
    borderStyle: z.enum(['none', 'solid', 'dashed', 'dotted', 'double']).optional(),
    borderColor: tokenOrValueSchema.optional(),
    // Lista, não objeto único: Figma-style "Effects" empilha várias sombras
    // na mesma caixa (contorno + profundidade, por exemplo). O CSS junta com
    // vírgula na ordem em que aparecem aqui.
    boxShadow: z.array(shadowSchema).min(1).max(6).optional(),
    paddingTop: z.number().finite().min(0).max(1_000).optional(),
    paddingRight: z.number().finite().min(0).max(1_000).optional(),
    paddingBottom: z.number().finite().min(0).max(1_000).optional(),
    paddingLeft: z.number().finite().min(0).max(1_000).optional(),
    fontFamily: fontFamilySchema.optional(),
    fontSize: z.number().finite().min(8).max(240).optional(),
    fontWeight: z.number().int().min(100).max(900).multipleOf(100).optional(),
    fontStyle: z.enum(['normal', 'italic', 'oblique']).optional(),
    lineHeight: z.number().finite().min(0.5).max(3).optional(),
    letterSpacing: z.number().finite().min(-10).max(30).optional(),
    wordSpacing: z.number().finite().min(-20).max(100).optional(),
    textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
    textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
    textDecoration: z.enum(['none', 'underline', 'overline', 'line-through']).optional(),
    textShadow: textShadowSchema.optional(),
    scale: z.number().finite().min(0.1).max(10).optional(),
    skewX: z.number().finite().min(-89).max(89).optional(),
    skewY: z.number().finite().min(-89).max(89).optional(),
    transformOrigin: z.enum(['center', 'top', 'top right', 'right', 'bottom right', 'bottom', 'bottom left', 'left', 'top left']).optional(),
    overflow: z.enum(['visible', 'hidden', 'clip', 'auto']).optional(),
    mixBlendMode: z.enum(['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'difference', 'exclusion']).optional(),
    filter: filterSchema.optional(),
    zIndex: z.number().int().min(-1_000).max(1_000).optional(),
  })
  .strict()

const accessibilitySchema = z
  .object({
    label: z.string().max(500).optional(),
    alt: z.string().max(2_000).optional(),
  })
  .strict()

const commonNodeShape = {
  id: identifierSchema,
  name: nodeNameSchema.optional(),
  groups: nodeGroupsSchema.optional(),
  /**
   * Marca o nó como cópia viva de um componente.
   *
   * A raiz da instância guarda a própria posição; conteúdo, estilo e filhos são
   * espelhados do mestre a cada edição. Sem isso, "componente" seria só um
   * atalho de colar.
   */
  instanceOf: identifierSchema.optional(),
  /**
   * Conteúdo que esta cópia sobrescreve do mestre.
   *
   * Chave `root` para a própria raiz da instância; para um descendente, o índice
   * dele na subárvore do mestre. Só conteúdo é sobrescrevível: o ponto de um
   * componente é que a aparência venha de um lugar só, e o que muda de cópia
   * para cópia na prática é o texto.
   */
  overrides: z
    .record(
      z.string().max(64),
      z.object({ content: z.record(z.string(), jsonValueSchema) }).strict(),
    )
    .optional(),
  parentId: identifierSchema.nullable(),
  order: z.number().int().nonnegative(),
  frame: frameSchema,
  style: styleSchema.default({}),
  locked: z.boolean().default(false),
  hidden: z.boolean().default(false),
  accessibility: accessibilitySchema.optional(),
  animation: animationSchema.optional(),
}

export const pageNodeSchema = z
  .object({
    ...commonNodeShape,
    frame: pageFrameSchema,
    type: z.literal('core/page'),
    content: z.object({}).strict(),
  })
  .strict()

export const headingNodeSchema = z
  .object({
    ...commonNodeShape,
    type: z.literal('core/heading'),
    content: z
      .object({
        text: z.string().max(10_000),
        level: z.number().int().min(1).max(6),
      })
      .strict(),
  })
  .strict()

export const textNodeSchema = z
  .object({
    ...commonNodeShape,
    type: z.literal('core/text'),
    content: z.object({ text: z.string().max(50_000) }).strict(),
  })
  .strict()

const safeHrefSchema = z
  .string()
  .max(2_048)
  .refine(
    (href) => href.startsWith('/') || href.startsWith('#') || /^https?:\/\//i.test(href),
    'Link must use a relative, anchor, HTTP, or HTTPS URL',
  )

export const linkNodeSchema = z
  .object({
    ...commonNodeShape,
    type: z.literal('core/link'),
    content: z
      .object({
        text: z.string().max(10_000),
        href: safeHrefSchema,
      })
      .strict(),
  })
  .strict()

const safeRemoteUrlSchema = z
  .string()
  .url()
  .max(4_096)
  .refine((url) => url.startsWith('https://'), 'Remote assets must use HTTPS')

export const iconNodeSchema = z
  .object({
    ...commonNodeShape,
    type: z.literal('core/icon'),
    content: z
      .object({
        name: z.string().min(3).max(200).regex(/^[a-z0-9-]+:[a-z0-9-]+$/),
        label: z.string().min(1).max(500),
      })
      .strict(),
  })
  .strict()

export const imageNodeSchema = z
  .object({
    ...commonNodeShape,
    type: z.literal('core/image'),
    content: z
      .object({
        src: safeRemoteUrlSchema,
        alt: z.string().max(2_000),
        fit: z.enum(['cover', 'contain']).default('cover'),
        attribution: z.string().max(1_000).optional(),
        sourceUrl: safeRemoteUrlSchema.optional(),
        licenseUrl: safeRemoteUrlSchema.optional(),
      })
      .strict(),
  })
  .strict()

export const blockNodeSchema = z
  .object({
    ...commonNodeShape,
    type: z.literal('core/block'),
    // `layout` foi removido na v2: todo filho é posicionado de forma absoluta.
    // Para recortar o que sai do bloco, use `style.overflow: 'hidden'`.
    content: z
      .object({
        label: z.string().max(500).default('Bloco de cor'),
      })
      .strict(),
  })
  .strict()

export const videoNodeSchema = z
  .object({
    ...commonNodeShape,
    type: z.literal('core/video'),
    content: z
      .object({
        // URL pública real (R2), igual a core/image — não é mais um assetId
        // local (a v1 apontava pra um blob: só existente no navegador de quem
        // editou, que quebrava ao publicar ou recarregar).
        src: safeRemoteUrlSchema,
        name: z.string().min(1).max(500),
        mediaType: z.string().min(1).max(200),
        controls: z.boolean().default(true),
      })
      .strict(),
  })
  .strict()

export const audioNodeSchema = z
  .object({
    ...commonNodeShape,
    type: z.literal('core/audio'),
    content: z
      .object({
        src: safeRemoteUrlSchema,
        name: z.string().min(1).max(500),
        mediaType: z.string().min(1).max(200),
        controls: z.boolean().default(true),
      })
      .strict(),
  })
  .strict()

export const fileNodeSchema = z
  .object({
    ...commonNodeShape,
    type: z.literal('core/file'),
    content: z
      .object({
        src: safeRemoteUrlSchema,
        name: z.string().min(1).max(500),
        mediaType: z.string().max(200),
        size: z.number().int().nonnegative(),
        // 'pdf'/'code'/'notebook'/'data' ganham prévia inline no renderer
        // (leitor de PDF, código com destaque, células de notebook, tabela);
        // 'image' é fallback pra quando a imagem vem por upload em vez de URL
        // externa; 'file' é o download genérico.
        kind: z.enum(['image', 'pdf', 'code', 'notebook', 'data', 'file']),
      })
      .strict(),
  })
  .strict()

/**
 * Formas geométricas.
 *
 * Um só tipo com `kind` em vez de quatro tipos irmãos: todas compartilham frame,
 * preenchimento e borda, e o que muda é só como o renderer desenha o contorno.
 */
export const shapeNodeSchema = z
  .object({
    ...commonNodeShape,
    type: z.literal('core/shape'),
    content: z
      .object({
        kind: z.enum(['rectangle', 'ellipse', 'triangle', 'line']),
        label: z.string().max(500).default('Forma'),
      })
      .strict(),
  })
  .strict()

export const listNodeSchema = z
  .object({
    ...commonNodeShape,
    type: z.literal('core/list'),
    content: z
      .object({
        ordered: z.boolean().default(false),
        items: z.array(z.string().max(2_000)).min(1).max(200),
      })
      .strict(),
  })
  .strict()

export const quoteNodeSchema = z
  .object({
    ...commonNodeShape,
    type: z.literal('core/quote'),
    content: z
      .object({
        text: z.string().max(10_000),
        citation: z.string().max(500).default(''),
      })
      .strict(),
  })
  .strict()

/**
 * Conteúdo externo em `<iframe>` (vídeo, mapa, painel).
 *
 * A URL passa pelo mesmo filtro dos outros recursos remotos: só HTTPS. O
 * renderer ainda aplica `sandbox` e `referrerpolicy`, porque aqui entra página
 * de terceiro executando script dentro do documento.
 */
export const embedNodeSchema = z
  .object({
    ...commonNodeShape,
    type: z.literal('core/embed'),
    content: z
      .object({
        src: safeRemoteUrlSchema,
        title: z.string().min(1).max(500),
        allowFullscreen: z.boolean().default(true),
      })
      .strict(),
  })
  .strict()

export const pluginNodeSchema = z
  .object({
    ...commonNodeShape,
    type: nodeTypeSchema.refine((type) => !type.startsWith('core/'), 'Unknown core node type'),
    content: z.record(z.string(), jsonValueSchema),
    pluginVersion: z.number().int().positive(),
  })
  .strict()

/**
 * Um ponto de dado do gráfico. Um schema só pra todos os tipos (em vez de um
 * union por kind) porque trocar de tipo no editor (barra → 3D) não pode
 * invalidar os dados já digitados — `label`/`x`/`y`/`z` convivem, e cada
 * renderer usa só os campos que precisa (ver GraphicStudioRenderer.ts):
 *   - barra/linha/pizza: `label` (categoria) + `y` (valor)
 *   - dispersão 2D: `x` + `y`
 *   - barra 3D/dispersão 3D/superfície: `x` + `y` + `z`
 */
export const chartPointSchema = z
  .object({
    label: z.string().max(200).default(''),
    x: z.number().finite().default(0),
    y: z.number().finite().default(0),
    z: z.number().finite().default(0),
  })
  .strict()

export const chartKindSchema = z.enum(['bar', 'line', 'pie', 'scatter', 'bar3d', 'scatter3d', 'surface'])

export const chartNodeSchema = z
  .object({
    ...commonNodeShape,
    type: z.literal('core/chart'),
    content: z
      .object({
        kind: chartKindSchema,
        title: z.string().max(200).default(''),
        data: z.array(chartPointSchema).min(1).max(1_000),
      })
      .strict(),
  })
  .strict()

export const graphicStudioNodeSchema = z.union([
  pageNodeSchema,
  headingNodeSchema,
  textNodeSchema,
  linkNodeSchema,
  iconNodeSchema,
  imageNodeSchema,
  blockNodeSchema,
  shapeNodeSchema,
  listNodeSchema,
  quoteNodeSchema,
  embedNodeSchema,
  videoNodeSchema,
  audioNodeSchema,
  fileNodeSchema,
  chartNodeSchema,
  pluginNodeSchema,
])

const documentBaseSchema = z
  .object({
    // v2 = geometria absoluta. Documentos v1 passam por `loadGraphicStudioDocument`.
    schemaVersion: z.literal(2),
    documentId: identifierSchema,
    metadata: z
      .object({
        title: z.string().min(1).max(500),
        slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        description: z.string().max(2_000).default(''),
        status: z.enum(['draft', 'published']).default('draft'),
      })
      .strict(),
    theme: z
      .object({
        id: identifierSchema,
        version: z.number().int().positive(),
        overrides: z.record(z.string(), jsonValueSchema),
      })
      .strict(),
    breakpoints: z
      .object({
        mobile: z.number().int().positive(),
        tablet: z.number().int().positive(),
        desktop: z.number().int().positive(),
      })
      .strict(),
    pages: z
      .array(
        z
          .object({
            id: identifierSchema,
            name: z.string().min(1).max(200),
            rootNodeId: identifierSchema,
          })
          .strict(),
      )
      .min(1)
      .max(100),
    /**
     * Componentes reutilizáveis: um nome e o nó que serve de mestre. As cópias
     * são nós comuns com `instanceOf` apontando para a chave daqui.
     */
    components: z
      .record(
        identifierSchema,
        z
          .object({
            name: z.string().min(1).max(200),
            masterNodeId: identifierSchema,
          })
          .strict(),
      )
      .default({}),
    nodes: z.record(identifierSchema, graphicStudioNodeSchema),
  })
  .strict()

export const graphicStudioDocumentSchema = documentBaseSchema.superRefine((document, context) => {
  const entries = Object.entries(document.nodes)

  if (entries.length > MAX_DOCUMENT_NODES) {
    context.addIssue({
      code: 'custom',
      path: ['nodes'],
      message: `Document cannot contain more than ${MAX_DOCUMENT_NODES} nodes`,
    })
  }

  // `name` vira o atributo `id` do HTML, que precisa ser único na página.
  const nodeIdByName = new Map<string, string>()

  for (const [nodeId, node] of entries) {
    if (node.id !== nodeId) {
      context.addIssue({
        code: 'custom',
        path: ['nodes', nodeId, 'id'],
        message: 'Node id must match its record key',
      })
    }

    if (node.name !== undefined) {
      const owner = nodeIdByName.get(node.name)
      if (owner !== undefined) {
        context.addIssue({
          code: 'custom',
          path: ['nodes', nodeId, 'name'],
          message: `Node name must be unique because it becomes an HTML id (already used by "${owner}")`,
        })
      } else {
        nodeIdByName.set(node.name, nodeId)
      }
    }

    if (node.parentId !== null && !document.nodes[node.parentId]) {
      context.addIssue({
        code: 'custom',
        path: ['nodes', nodeId, 'parentId'],
        message: 'Parent node does not exist',
      })
    }

    const visited = new Set<string>([nodeId])
    let parentId = node.parentId
    let depth = 0

    while (parentId !== null) {
      if (visited.has(parentId)) {
        context.addIssue({
          code: 'custom',
          path: ['nodes', nodeId, 'parentId'],
          message: 'Node hierarchy cannot contain a cycle',
        })
        break
      }

      visited.add(parentId)
      depth += 1

      if (depth > MAX_DOCUMENT_DEPTH) {
        context.addIssue({
          code: 'custom',
          path: ['nodes', nodeId, 'parentId'],
          message: `Node hierarchy cannot exceed ${MAX_DOCUMENT_DEPTH} levels`,
        })
        break
      }

      parentId = document.nodes[parentId]?.parentId ?? null
    }
  }

  for (const [pageIndex, page] of document.pages.entries()) {
    const rootNode = document.nodes[page.rootNodeId]
    if (!rootNode || rootNode.type !== 'core/page' || rootNode.parentId !== null) {
      context.addIssue({
        code: 'custom',
        path: ['pages', pageIndex, 'rootNodeId'],
        message: 'Page root must reference a root core/page node',
      })
    }
  }

  for (const [componentId, component] of Object.entries(document.components)) {
    if (!document.nodes[component.masterNodeId]) {
      context.addIssue({
        code: 'custom',
        path: ['components', componentId, 'masterNodeId'],
        message: 'Component master must reference an existing node',
      })
    }
  }

  for (const [nodeId, node] of entries) {
    if (node.instanceOf && !document.components[node.instanceOf]) {
      context.addIssue({
        code: 'custom',
        path: ['nodes', nodeId, 'instanceOf'],
        message: 'Instance must reference an existing component',
      })
    }
  }
})

export type GraphicStudioNode = z.infer<typeof graphicStudioNodeSchema>
export type PageNode = z.infer<typeof pageNodeSchema>
export type HeadingNode = z.infer<typeof headingNodeSchema>
export type TextNode = z.infer<typeof textNodeSchema>
export type LinkNode = z.infer<typeof linkNodeSchema>
export type IconNode = z.infer<typeof iconNodeSchema>
export type ImageNode = z.infer<typeof imageNodeSchema>
export type BlockNode = z.infer<typeof blockNodeSchema>
export type ShapeNode = z.infer<typeof shapeNodeSchema>
export type ListNode = z.infer<typeof listNodeSchema>
export type QuoteNode = z.infer<typeof quoteNodeSchema>
export type EmbedNode = z.infer<typeof embedNodeSchema>
export type VideoNode = z.infer<typeof videoNodeSchema>
export type AudioNode = z.infer<typeof audioNodeSchema>
export type FileNode = z.infer<typeof fileNodeSchema>
export type ChartNode = z.infer<typeof chartNodeSchema>
export type ChartPoint = z.infer<typeof chartPointSchema>
export type ChartKind = z.infer<typeof chartKindSchema>
export type PluginNode = z.infer<typeof pluginNodeSchema>
export type GraphicStudioAnimation = z.infer<typeof animationSchema>
export type GraphicStudioStyle = z.infer<typeof styleSchema>
export type GradientFill = Extract<NonNullable<GraphicStudioStyle['backgroundColor']>, { kind: 'gradient' }>

export function isGradientFill(value: GraphicStudioStyle['backgroundColor']): value is GradientFill {
  return Boolean(value) && typeof value === 'object' && 'kind' in value && value.kind === 'gradient'
}
export type AutoResize = z.infer<typeof autoResizeSchema>
export type GraphicStudioDocument = z.infer<typeof graphicStudioDocumentSchema>

export function parseGraphicStudioDocument(input: unknown): GraphicStudioDocument {
  return graphicStudioDocumentSchema.parse(input)
}
