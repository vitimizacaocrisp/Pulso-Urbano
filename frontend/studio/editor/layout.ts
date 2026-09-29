import type { NodeFrame } from './interaction.js'

export type Alignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
export type DistributionAxis = 'horizontal' | 'vertical'

export interface MeasuredLayoutNode {
  id: string
  frame: NodeFrame
  width: number
  height: number
}

export interface GroupLayout {
  frame: NodeFrame
  children: Record<string, NodeFrame>
}

export function snapFrame(frame: NodeFrame, grid = 8): NodeFrame {
  const step = Math.max(1, grid)
  const snap = (value: number) => Math.round(value / step) * step
  return {
    ...frame,
    x: snap(frame.x),
    y: snap(frame.y),
    width: typeof frame.width === 'number' ? Math.max(24, snap(frame.width)) : frame.width,
    height: typeof frame.height === 'number' ? Math.max(24, snap(frame.height)) : frame.height,
  }
}

/** Linha de apoio desenhada no canvas durante o arraste. */
export interface AlignmentGuide {
  axis: 'x' | 'y'
  /** Posição da linha em coordenadas do canvas. */
  position: number
  /** Extensão da linha, para ela cobrir os dois objetos alinhados. */
  from: number
  to: number
}

export interface SnapResult {
  frame: NodeFrame
  guides: AlignmentGuide[]
}

interface SnapCandidate {
  /** Deslocamento que o objeto arrastado precisa sofrer para encostar. */
  delta: number
  guide: AlignmentGuide
}

function bestCandidate(candidates: SnapCandidate[], tolerance: number): SnapCandidate | null {
  let best: SnapCandidate | null = null
  for (const candidate of candidates) {
    const distance = Math.abs(candidate.delta)
    if (distance > tolerance) continue
    if (!best || distance < Math.abs(best.delta)) best = candidate
  }
  return best
}

/**
 * Encosta o objeto arrastado nas bordas e nos centros dos irmãos.
 *
 * É o que faz posicionar à mão parecer preciso: sem isso, alinhar dois blocos
 * depende de acertar o pixel. A tolerância é em pixels de tela, então dividir
 * pelo zoom mantém a sensação igual em qualquer ampliação.
 *
 * Só entra quando o objeto não está girado: com rotação, as bordas na tela não
 * são as do `frame`, e a linha apontaria para o lugar errado.
 */
export function snapToSiblings(
  frame: NodeFrame,
  siblings: MeasuredLayoutNode[],
  tolerance = 6,
): SnapResult {
  if (frame.rotation || !siblings.length) return { frame, guides: [] }

  const alvo = {
    x: [frame.x, frame.x + frame.width / 2, frame.x + frame.width],
    y: [frame.y, frame.y + frame.height / 2, frame.y + frame.height],
  }
  const candidatosX: SnapCandidate[] = []
  const candidatosY: SnapCandidate[] = []

  for (const sibling of siblings) {
    if (sibling.frame.rotation) continue
    const bordasX = [sibling.frame.x, sibling.frame.x + sibling.width / 2, sibling.frame.x + sibling.width]
    const bordasY = [sibling.frame.y, sibling.frame.y + sibling.height / 2, sibling.frame.y + sibling.height]

    for (const borda of bordasX) {
      for (const ponto of alvo.x) {
        candidatosX.push({
          delta: borda - ponto,
          guide: {
            axis: 'x',
            position: borda,
            from: Math.min(sibling.frame.y, frame.y),
            to: Math.max(sibling.frame.y + sibling.height, frame.y + frame.height),
          },
        })
      }
    }
    for (const borda of bordasY) {
      for (const ponto of alvo.y) {
        candidatosY.push({
          delta: borda - ponto,
          guide: {
            axis: 'y',
            position: borda,
            from: Math.min(sibling.frame.x, frame.x),
            to: Math.max(sibling.frame.x + sibling.width, frame.x + frame.width),
          },
        })
      }
    }
  }

  const melhorX = bestCandidate(candidatosX, tolerance)
  const melhorY = bestCandidate(candidatosY, tolerance)
  const guides: AlignmentGuide[] = []
  if (melhorX) guides.push(melhorX.guide)
  if (melhorY) guides.push(melhorY.guide)

  return {
    frame: {
      ...frame,
      x: frame.x + (melhorX?.delta ?? 0),
      y: frame.y + (melhorY?.delta ?? 0),
    },
    guides,
  }
}

/**
 * Encosta as bordas que estão sendo arrastadas nas bordas dos irmãos.
 *
 * Diferente do arraste, aqui só as bordas puxadas se movem: a oposta é a âncora
 * e tem de ficar parada. Por isso o ajuste altera `width`/`height` junto com
 * `x`/`y`, em vez de deslocar o objeto inteiro.
 */
export function snapResizeEdges(
  frame: NodeFrame,
  direction: string,
  siblings: MeasuredLayoutNode[],
  tolerance = 6,
  minimum = 8,
): SnapResult {
  if (frame.rotation || !siblings.length) return { frame, guides: [] }

  const bordasX: number[] = []
  const bordasY: number[] = []
  for (const sibling of siblings) {
    if (sibling.frame.rotation) continue
    bordasX.push(sibling.frame.x, sibling.frame.x + sibling.width / 2, sibling.frame.x + sibling.width)
    bordasY.push(sibling.frame.y, sibling.frame.y + sibling.height / 2, sibling.frame.y + sibling.height)
  }

  const maisProxima = (valor: number, bordas: number[]) => {
    let melhor: number | null = null
    for (const borda of bordas) {
      const distancia = Math.abs(borda - valor)
      if (distancia > tolerance) continue
      if (melhor === null || distancia < Math.abs(melhor - valor)) melhor = borda
    }
    return melhor
  }

  const extensao = (eixo: 'x' | 'y'): [number, number] => eixo === 'x'
    ? [Math.min(...siblings.map((s) => s.frame.y), frame.y),
      Math.max(...siblings.map((s) => s.frame.y + s.height), frame.y + frame.height)]
    : [Math.min(...siblings.map((s) => s.frame.x), frame.x),
      Math.max(...siblings.map((s) => s.frame.x + s.width), frame.x + frame.width)]

  let { x, y, width, height } = frame
  const guides: AlignmentGuide[] = []

  if (direction.includes('e')) {
    const alvo = maisProxima(x + width, bordasX)
    if (alvo !== null && alvo - x >= minimum) {
      width = alvo - x
      const [de, ate] = extensao('x')
      guides.push({ axis: 'x', position: alvo, from: de, to: ate })
    }
  } else if (direction.includes('w')) {
    const alvo = maisProxima(x, bordasX)
    if (alvo !== null && x + width - alvo >= minimum) {
      width = x + width - alvo
      x = alvo
      const [de, ate] = extensao('x')
      guides.push({ axis: 'x', position: alvo, from: de, to: ate })
    }
  }

  if (direction.includes('s')) {
    const alvo = maisProxima(y + height, bordasY)
    if (alvo !== null && alvo - y >= minimum) {
      height = alvo - y
      const [de, ate] = extensao('y')
      guides.push({ axis: 'y', position: alvo, from: de, to: ate })
    }
  } else if (direction.includes('n')) {
    const alvo = maisProxima(y, bordasY)
    if (alvo !== null && y + height - alvo >= minimum) {
      height = y + height - alvo
      y = alvo
      const [de, ate] = extensao('y')
      guides.push({ axis: 'y', position: alvo, from: de, to: ate })
    }
  }

  return { frame: { ...frame, x, y, width, height }, guides }
}

export function alignNodeFrames(nodes: MeasuredLayoutNode[], alignment: Alignment): Record<string, NodeFrame> {
  if (nodes.length < 2) return {}
  const left = Math.min(...nodes.map((node) => node.frame.x))
  const right = Math.max(...nodes.map((node) => node.frame.x + node.width))
  const top = Math.min(...nodes.map((node) => node.frame.y))
  const bottom = Math.max(...nodes.map((node) => node.frame.y + node.height))
  const center = (left + right) / 2
  const middle = (top + bottom) / 2

  return Object.fromEntries(nodes.map((node) => {
    const frame = { ...node.frame }
    if (alignment === 'left') frame.x = left
    if (alignment === 'center') frame.x = center - node.width / 2
    if (alignment === 'right') frame.x = right - node.width
    if (alignment === 'top') frame.y = top
    if (alignment === 'middle') frame.y = middle - node.height / 2
    if (alignment === 'bottom') frame.y = bottom - node.height
    return [node.id, { ...frame, x: Math.round(frame.x), y: Math.round(frame.y) }]
  }))
}

export function distributeNodeFrames(nodes: MeasuredLayoutNode[], axis: DistributionAxis): Record<string, NodeFrame> {
  if (nodes.length < 3) return {}
  const horizontal = axis === 'horizontal'
  const sorted = [...nodes].sort((left, right) => horizontal
    ? left.frame.x - right.frame.x
    : left.frame.y - right.frame.y)
  const first = sorted[0]
  const last = sorted.at(-1)
  if (!first || !last) return {}
  const start = horizontal ? first.frame.x : first.frame.y
  const end = horizontal ? last.frame.x + last.width : last.frame.y + last.height
  const occupied = sorted.reduce((total, node) => total + (horizontal ? node.width : node.height), 0)
  const gap = (end - start - occupied) / (sorted.length - 1)
  let cursor = start

  return Object.fromEntries(sorted.map((node) => {
    const frame = { ...node.frame, [horizontal ? 'x' : 'y']: Math.round(cursor) }
    cursor += (horizontal ? node.width : node.height) + gap
    return [node.id, frame]
  }))
}

export function createGroupLayout(nodes: MeasuredLayoutNode[]): GroupLayout | undefined {
  if (nodes.length < 2) return undefined
  const x = Math.min(...nodes.map((node) => node.frame.x))
  const y = Math.min(...nodes.map((node) => node.frame.y))
  const right = Math.max(...nodes.map((node) => node.frame.x + node.width))
  const bottom = Math.max(...nodes.map((node) => node.frame.y + node.height))
  return {
    frame: {
      x,
      y,
      width: Math.max(24, right - x),
      height: Math.max(24, bottom - y),
      rotation: 0,
      autoResize: 'none' as const,
    },
    children: Object.fromEntries(nodes.map((node) => [node.id, {
      ...node.frame,
      x: node.frame.x - x,
      y: node.frame.y - y,
      width: typeof node.frame.width === 'number' ? node.frame.width : node.width,
      height: typeof node.frame.height === 'number' ? node.frame.height : node.height,
    }])),
  }
}
