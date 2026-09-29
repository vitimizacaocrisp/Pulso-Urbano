import type { AutoResize, GraphicStudioNode } from '../core/index.js'

export type NodeFrame = GraphicStudioNode['frame']
export type NodeStyle = GraphicStudioNode['style']
export type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

export interface Vector {
  x: number
  y: number
}

/**
 * Transformação visual do nó além da rotação: `style.scale`, `skewX`, `skewY`.
 *
 * O ponteiro anda no espaço da tela, mas largura e altura vivem no espaço do
 * layout. Sem desfazer a transformação, arrastar a alça de um nó com escala 2
 * cresce o dobro do que o ponteiro andou, e num nó inclinado a alça foge na
 * diagonal.
 */
export interface VisualTransform {
  scale?: number
  skewX?: number
  skewY?: number
}

/** Matriz 2x2 na convenção do CSS: x' = a·x + c·y, y' = b·x + d·y. */
interface Matrix2D {
  a: number
  b: number
  c: number
  d: number
}

const IDENTITY: Matrix2D = { a: 1, b: 0, c: 0, d: 1 }

function multiply(left: Matrix2D, right: Matrix2D): Matrix2D {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
  }
}

function applyMatrix(matrix: Matrix2D, vector: Vector): Vector {
  return {
    x: matrix.a * vector.x + matrix.c * vector.y,
    y: matrix.b * vector.x + matrix.d * vector.y,
  }
}

function invert(matrix: Matrix2D): Matrix2D {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c
  // Determinante zero = transformação que achata o nó num segmento. Não há
  // inversa; seguir com a identidade é melhor que devolver NaN para a geometria.
  if (!determinant) return IDENTITY
  return {
    a: matrix.d / determinant,
    b: -matrix.b / determinant,
    c: -matrix.c / determinant,
    d: matrix.a / determinant,
  }
}

/**
 * Matriz equivalente a `rotate() scale() skewX() skewY()`, na mesma ordem que o
 * renderer emite. Ordem diferente dá composição diferente.
 */
function visualMatrix(rotation: number, visual: VisualTransform | undefined): Matrix2D {
  const radians = rotation * DEGREES
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  let matrix: Matrix2D = { a: cos, b: sin, c: -sin, d: cos }
  const scale = visual?.scale ?? 1
  if (scale !== 1) matrix = multiply(matrix, { a: scale, b: 0, c: 0, d: scale })
  if (visual?.skewX) matrix = multiply(matrix, { a: 1, b: 0, c: Math.tan(visual.skewX * DEGREES), d: 1 })
  if (visual?.skewY) matrix = multiply(matrix, { a: 1, b: Math.tan(visual.skewY * DEGREES), c: 0, d: 1 })
  return matrix
}

export interface ResizeOptions {
  /** Shift: trava a proporção original. */
  aspect?: boolean
  /** Alt: cresce para os dois lados, mantendo o centro parado. */
  fromCenter?: boolean
  minimum?: number
  /** Grade de encaixe aplicada ao TAMANHO. Nunca à posição. */
  grid?: number
  /** Escala e inclinação do nó, para converter o arraste corretamente. */
  visual?: VisualTransform
}

const DEGREES = Math.PI / 180

// ---------------------------------------------------------------------------
// Convenções de geometria (valem para todo este arquivo)
//
// - `x`/`y` são o canto superior-esquerdo NÃO rotacionado, no espaço do pai.
// - A rotação do CSS gira em torno do centro, logo o centro é INVARIANTE.
// - O eixo y aponta para baixo, e `Math.atan2` cresce no mesmo sentido em que o
//   CSS gira. Por isso não existe inversão de sinal em lugar nenhum aqui — é
//   exatamente onde a maioria das implementações erra: alguém "corrige" um sinal,
//   acerta em 90° e erra em 45°.
// ---------------------------------------------------------------------------

export function rotateVector(vector: Vector, degrees: number): Vector {
  if (!degrees) return { x: vector.x, y: vector.y }
  const radians = degrees * DEGREES
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  }
}

export function frameCenter(frame: NodeFrame): Vector {
  return { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 }
}

/**
 * Mover não depende da rotação: uma translação é a mesma no espaço da tela e no
 * espaço local. Não "conserte" isto acrescentando `rotateVector`.
 */
export function moveFrame(frame: NodeFrame, deltaX: number, deltaY: number): NodeFrame {
  return {
    ...frame,
    x: Math.round(frame.x + deltaX),
    y: Math.round(frame.y + deltaY),
  }
}

/**
 * Ângulo a partir do arraste da alça de rotação.
 *
 * O ângulo inicial do ponteiro é capturado junto com o ângulo inicial do nó, o
 * que preserva o ponto de pega — sem isso a alça "pula" para o ponteiro no clique.
 * Com shift, trava o ângulo ABSOLUTO em passos de 15°: travar o delta deixaria um
 * nó que está em 7° preso fora da grade para sempre.
 */
export function rotationFromPointer(
  startRotation: number,
  center: Vector,
  startPointer: Vector,
  pointer: Vector,
  snapToStep = false,
  step = 15,
): number {
  const startAngle = Math.atan2(startPointer.y - center.y, startPointer.x - center.x)
  const angle = Math.atan2(pointer.y - center.y, pointer.x - center.x)
  let rotation = startRotation + (angle - startAngle) / DEGREES
  if (snapToStep) rotation = Math.round(rotation / step) * step
  return ((rotation % 360) + 360) % 360
}

/**
 * Redimensionar mantendo a âncora oposta PARADA NA TELA, mesmo com o nó rotacionado.
 *
 * `frame` é sempre o frame capturado no início do arraste, e `delta` é o
 * deslocamento total do ponteiro desde então — nunca o incremento entre dois
 * eventos. Recomputar do zero a cada movimento evita acúmulo de erro.
 */
export function resizeRotatedFrame(
  frame: NodeFrame,
  direction: ResizeDirection,
  delta: Vector,
  options: ResizeOptions = {},
): NodeFrame {
  const { aspect = false, fromCenter = false, minimum = 8, grid = 0, visual } = options

  // Tela -> local. É este passo que quase toda implementação esquece; sem ele o
  // resize de um nó rotacionado "foge" na diagonal. A matriz cobre rotação,
  // escala e inclinação de uma vez; sem escala nem inclinação ela é exatamente
  // a rotação inversa de antes.
  const matrix = visualMatrix(frame.rotation, visual)
  const local = applyMatrix(invert(matrix), delta)

  const signX = direction.includes('e') ? 1 : direction.includes('w') ? -1 : 0
  const signY = direction.includes('s') ? 1 : direction.includes('n') ? -1 : 0
  // Alt ancora no centro, então cada pixel de ponteiro vale o dobro de tamanho.
  const reach = fromCenter ? 2 : 1

  let width = frame.width + local.x * signX * reach
  let height = frame.height + local.y * signY * reach

  if (aspect && frame.width > 0 && frame.height > 0) {
    // Eixo dominante medido em PROPORÇÃO, não em pixels: num nó largo e baixo,
    // comparar deltas absolutos escolheria o eixo errado.
    const drivenByWidth = signX !== 0
      && (signY === 0 || Math.abs(local.x) / frame.width >= Math.abs(local.y) / frame.height)
    const rawRatio = drivenByWidth ? width / frame.width : height / frame.height
    // Clampar a PROPORÇÃO, e não cada lado, mantém o formato no limite mínimo.
    const minimumRatio = Math.max(minimum / frame.width, minimum / frame.height)
    const ratio = Math.max(rawRatio, minimumRatio)
    width = frame.width * ratio
    height = frame.height * ratio
  } else {
    if (grid > 0 && signX !== 0) width = Math.round(width / grid) * grid
    if (grid > 0 && signY !== 0) height = Math.round(height / grid) * grid
    width = Math.max(minimum, width)
    height = Math.max(minimum, height)
  }

  // Âncora em coordenadas unitárias locais. Para alça de aresta o valor é 0.5:
  // arrastar o topo de um nó rotacionado mantém a aresta de baixo parada e a
  // caixa não desliza de lado.
  const anchorX = fromCenter ? 0.5 : direction.includes('w') ? 1 : direction.includes('e') ? 0 : 0.5
  const anchorY = fromCenter ? 0.5 : direction.includes('n') ? 1 : direction.includes('s') ? 0 : 0.5

  // O centro precisa andar para compensar a mudança de tamanho, senão a âncora
  // se move. Deduzido de: âncora_antes == âncora_depois, na tela.
  const offset = applyMatrix(matrix, {
    x: (anchorX - 0.5) * (frame.width - width),
    y: (anchorY - 0.5) * (frame.height - height),
  })

  const x = frame.x + (frame.width - width) / 2 + offset.x
  const y = frame.y + (frame.height - height) / 2 + offset.y
  // Arredondar posição só sem rotação: com rotação isso deslocaria a âncora.
  const round = (value: number) => frame.rotation ? value : Math.round(value)

  return {
    ...frame,
    x: round(x),
    y: round(y),
    width: Math.round(width),
    height: Math.round(height),
    autoResize: nextAutoResize(frame.autoResize, signX !== 0, signY !== 0),
  }
}

/**
 * Redimensionar à mão desliga o auto-dimensionamento do eixo mexido — igual ao
 * Figma: arrastar a largura de um texto auto-width o converte em auto-height.
 */
function nextAutoResize(current: AutoResize, changedWidth: boolean, changedHeight: boolean): AutoResize {
  if (changedHeight) return 'none'
  if (changedWidth && current === 'width-and-height') return 'height'
  return current
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

/**
 * Escala os comprimentos de um estilo — a ferramenta Scale (K) do Figma, que
 * diferente do resize comum faz a fonte e as bordas acompanharem o tamanho.
 *
 * Os limites do schema são respeitados aqui porque `applyCommand` LANÇA se o
 * documento resultante for inválido, e isso aconteceria no meio de um arraste.
 */
const RADIUS_FIELDS = [
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
] as const

/** Unidades de comprimento absoluto que acompanham a escala do objeto. */
const SCALABLE_UNITS = new Set(['px', 'rem', 'em', 'pt', 'pc', 'in', 'cm', 'mm', 'ch', 'ex'])

/**
 * Escala os comprimentos dentro de um valor CSS, preservando o resto.
 *
 * Aceita a forma composta do `border-radius` ("12px 4px" ou "50% / 20px"), porque
 * o campo é uma string livre no schema. Porcentagens ficam intactas: já são
 * relativas à caixa, e escalá-las aplicaria a escala duas vezes.
 */
export function scaleCssLengths(value: string, factor: number): string {
  return value.replace(/(-?\d*\.?\d+)([a-z%]*)/gi, (todo, numero: string, unidade: string) => {
    const unit = unidade.toLowerCase()
    if (unit && !SCALABLE_UNITS.has(unit)) return todo
    const escalado = Number(numero) * factor
    if (!Number.isFinite(escalado)) return todo
    // Três casas bastam para o olho e mantêm a string curta: o schema limita o
    // campo a 128 caracteres, e uma dízima estouraria esse limite.
    return `${Math.round(escalado * 1000) / 1000}${unidade}`
  })
}

export function scaleStyle(style: NodeStyle, factor: number): NodeStyle {
  if (factor === 1) return style
  const next: NodeStyle = { ...style }

  if (next.fontSize !== undefined) next.fontSize = clamp(next.fontSize * factor, 8, 240)
  if (next.borderWidth !== undefined) next.borderWidth = clamp(next.borderWidth * factor, 0, 100)
  if (next.letterSpacing !== undefined) next.letterSpacing = clamp(next.letterSpacing * factor, -10, 30)
  if (next.wordSpacing !== undefined) next.wordSpacing = clamp(next.wordSpacing * factor, -20, 100)
  for (const side of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const) {
    const value = next[side]
    if (value !== undefined) next[side] = clamp(value * factor, 0, 1_000)
  }
  if (next.boxShadow) {
    next.boxShadow = next.boxShadow.map((shadow) => ({
      ...shadow,
      x: clamp(shadow.x * factor, -500, 500),
      y: clamp(shadow.y * factor, -500, 500),
      blur: clamp(shadow.blur * factor, 0, 500),
      spread: clamp(shadow.spread * factor, -200, 200),
    }))
  }
  if (next.textShadow) {
    next.textShadow = {
      ...next.textShadow,
      x: clamp(next.textShadow.x * factor, -200, 200),
      y: clamp(next.textShadow.y * factor, -200, 200),
      blur: clamp(next.textShadow.blur * factor, 0, 200),
    }
  }
  if (next.filter) {
    next.filter = { ...next.filter, blur: clamp(next.filter.blur * factor, 0, 100) }
  }

  // Cantos arredondados: o campo é token-ou-valor, então só o lado `value` pode
  // ser escalado. Um token aponta para o tema e o tema não muda porque um objeto
  // cresceu, então fica como está.
  for (const corner of RADIUS_FIELDS) {
    const radius = next[corner]
    if (radius && 'value' in radius) {
      next[corner] = { value: scaleCssLengths(radius.value, factor).slice(0, 128) }
    }
  }

  // Deliberadamente NÃO escalados: `lineHeight` é um multiplicador adimensional
  // (escalar duplicaria a escala), e `opacity`, `rotation`, `zIndex`,
  // `filter.brightness/contrast/saturate/grayscale` e `style.scale` não são
  // comprimentos.
  return next
}

/** Escala a geometria de um descendente. Coordenadas já são relativas ao pai. */
export function scaleFrame(frame: NodeFrame, factor: number): NodeFrame {
  return {
    ...frame,
    x: frame.x * factor,
    y: frame.y * factor,
    width: Math.max(1, frame.width * factor),
    height: Math.max(1, frame.height * factor),
  }
}
