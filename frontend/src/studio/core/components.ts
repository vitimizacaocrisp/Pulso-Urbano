import {
  parseGraphicStudioDocument,
  type GraphicStudioDocument,
  type GraphicStudioNode,
} from './document.js'

/**
 * Componentes reutilizáveis: um nó é o mestre, e as instâncias são cópias vivas.
 *
 * O modelo é deliberadamente simples: a instância é reconstruída a partir do
 * mestre a cada edição, guardando só a própria posição. A alternativa — deixar
 * cada instância divergir e depois reconciliar campo a campo — é o que torna
 * componentes difíceis de prever nas ferramentas que fazem isso.
 *
 * O que a instância mantém como seu:
 *
 * - `x` e `y`, senão todas as cópias empilhariam no mesmo lugar;
 * - `parentId` e `order`, que dizem onde ela vive no documento;
 * - `name` e `groups`, que viram `id` e `class` no HTML e precisam ser únicos.
 *
 * Todo o resto — tipo, conteúdo, estilo, tamanho, rotação, animação e a subárvore
 * inteira — vem do mestre.
 */

function collectDescendants(
  document: GraphicStudioDocument,
  rootId: string,
): GraphicStudioNode[] {
  const children = new Map<string, GraphicStudioNode[]>()
  for (const node of Object.values(document.nodes)) {
    if (!node.parentId) continue
    const siblings = children.get(node.parentId) ?? []
    siblings.push(node)
    children.set(node.parentId, siblings)
  }
  const found: GraphicStudioNode[] = []
  // Largura primeiro, ordenado: o pai sempre aparece antes dos filhos, então o
  // mapa de ids já está pronto quando um filho precisa dele.
  const queue = [rootId]
  while (queue.length) {
    const current = queue.shift()!
    for (const child of (children.get(current) ?? []).sort((a, b) => a.order - b.order)) {
      found.push(child)
      queue.push(child.id)
    }
  }
  return found
}

/**
 * Id estável para o filho de uma instância.
 *
 * Precisa ser determinístico: a sincronização roda a cada edição, e ids novos a
 * cada passagem quebrariam a seleção e o histórico. O corte em 100 respeita o
 * limite de 128 caracteres do schema.
 */
export function instanceChildId(instanceRootId: string, index: number): string {
  return `${instanceRootId.slice(0, 100)}_c${index}`
}

/** Chave usada em `overrides` para um nó dentro da instância. */
export const INSTANCE_ROOT_KEY = 'root'

/**
 * Descobre a qual sobrescrita um nó corresponde.
 *
 * Devolve `null` quando o nó não faz parte de uma instância. O índice sai do
 * próprio id, que `instanceChildId` monta — a alternativa seria recalcular a
 * subárvore do mestre só para achar a posição.
 */
export function overrideKeyOf(nodeId: string, instanceRootId: string): string | null {
  if (nodeId === instanceRootId) return INSTANCE_ROOT_KEY
  const prefix = `${instanceRootId.slice(0, 100)}_c`
  if (!nodeId.startsWith(prefix)) return null
  const index = nodeId.slice(prefix.length)
  return /^\d+$/.test(index) ? index : null
}

/** Sobe a árvore até achar a instância que contém o nó, se houver. */
export function instanceRootOf(
  document: GraphicStudioDocument,
  nodeId: string,
): GraphicStudioNode | null {
  let current: GraphicStudioNode | undefined = document.nodes[nodeId]
  while (current) {
    if (current.instanceOf) return current
    current = current.parentId ? document.nodes[current.parentId] : undefined
  }
  return null
}

function withOverride(
  node: GraphicStudioNode,
  overrides: GraphicStudioNode['overrides'],
  key: string,
): GraphicStudioNode {
  const patch = overrides?.[key]?.content
  if (!patch) return node
  return { ...node, content: { ...node.content, ...patch } } as GraphicStudioNode
}

export function syncComponentInstances(
  document: GraphicStudioDocument,
): GraphicStudioDocument {
  const components = Object.entries(document.components)
  if (!components.length) return document

  const nodes: Record<string, GraphicStudioNode> = { ...document.nodes }
  let changed = false

  for (const [componentId, component] of components) {
    const master = document.nodes[component.masterNodeId]
    if (!master) continue
    const masterChildren = collectDescendants(document, master.id)

    const instances = Object.values(document.nodes)
      .filter((node) => node.instanceOf === componentId && node.id !== master.id)

    for (const instance of instances) {
      for (const stale of collectDescendants(document, instance.id)) {
        delete nodes[stale.id]
        changed = true
      }

      nodes[instance.id] = withOverride({
        ...structuredClone(master),
        id: instance.id,
        parentId: instance.parentId,
        order: instance.order,
        instanceOf: componentId,
        ...(instance.overrides ? { overrides: instance.overrides } : {}),
        // `name` e `groups` são do documento HTML, não do desenho: mantidos.
        ...(instance.name === undefined ? { name: undefined } : { name: instance.name }),
        ...(instance.groups === undefined ? { groups: undefined } : { groups: instance.groups }),
        frame: { ...master.frame, x: instance.frame.x, y: instance.frame.y },
      } as GraphicStudioNode, instance.overrides, INSTANCE_ROOT_KEY)
      // `name: undefined` continuaria sendo uma chave presente para o Zod
      // `.strict()`, e nome vazio é diferente de nome ausente.
      if (instance.name === undefined) delete (nodes[instance.id] as { name?: string }).name
      if (instance.groups === undefined) delete (nodes[instance.id] as { groups?: string[] }).groups
      changed = true

      const idByMasterChild = new Map<string, string>()
      masterChildren.forEach((child, index) => {
        idByMasterChild.set(child.id, instanceChildId(instance.id, index))
      })

      for (const child of masterChildren) {
        const clone = structuredClone(child) as GraphicStudioNode & { name?: string }
        // `name` vira o `id` do HTML e precisa ser único na página; copiar o do
        // mestre invalidaria o documento assim que existisse uma segunda cópia.
        delete clone.name
        const cloneId = idByMasterChild.get(child.id)!
        nodes[cloneId] = withOverride({
          ...clone,
          id: cloneId,
          parentId: child.parentId === master.id
            ? instance.id
            : idByMasterChild.get(child.parentId ?? '') ?? instance.id,
        } as GraphicStudioNode, instance.overrides, overrideKeyOf(cloneId, instance.id) ?? '')
      }
    }
  }

  if (!changed) return document
  return parseGraphicStudioDocument({ ...document, nodes })
}
