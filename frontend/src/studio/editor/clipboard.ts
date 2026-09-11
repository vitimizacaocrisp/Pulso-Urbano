import type { GraphicStudioDocument, GraphicStudioNode } from '../core/index.js'

export interface NodeClipboard {
  rootIds: string[]
  nodes: GraphicStudioNode[]
}

function topLevelSelection(document: GraphicStudioDocument, selectedIds: string[]) {
  const selected = new Set(selectedIds.filter((nodeId) => Boolean(document.nodes[nodeId])))
  return [...selected].filter((nodeId) => {
    let parentId = document.nodes[nodeId]?.parentId ?? null
    while (parentId) {
      if (selected.has(parentId)) return false
      parentId = document.nodes[parentId]?.parentId ?? null
    }
    return true
  })
}

export function copyNodeSelection(
  document: GraphicStudioDocument,
  selectedIds: string[],
): NodeClipboard | null {
  const rootIds = topLevelSelection(document, selectedIds)
  if (!rootIds.length) return null

  const nodes: GraphicStudioNode[] = []
  const visit = (nodeId: string) => {
    const node = document.nodes[nodeId]
    if (!node) return
    nodes.push(structuredClone(node))
    Object.values(document.nodes)
      .filter((candidate) => candidate.parentId === nodeId)
      .sort((left, right) => left.order - right.order)
      .forEach((child) => { visit(child.id) })
  }
  rootIds.forEach(visit)

  return { rootIds, nodes }
}

export function materializeNodeClipboard(
  document: GraphicStudioDocument,
  clipboard: NodeClipboard,
  makeId: (sourceId: string) => string,
  offset = 16,
) {
  const idMap = new Map(clipboard.nodes.map((node) => [node.id, makeId(node.id)]))
  const roots = new Set(clipboard.rootIds)
  const rootOrder = new Map<string, number>()
  const fallbackParentId = document.pages[0]?.rootNodeId

  const nodes = clipboard.nodes.map((node): GraphicStudioNode => {
    const mappedParent = node.parentId ? idMap.get(node.parentId) : undefined
    const parentId = mappedParent
      ?? (node.parentId && document.nodes[node.parentId] ? node.parentId : fallbackParentId)
    if (!parentId) throw new Error('Cannot paste nodes without a page root')

    const isRoot = roots.has(node.id)
    let order = node.order
    if (isRoot) {
      const current = rootOrder.get(parentId)
        ?? Math.max(-1, ...Object.values(document.nodes)
          .filter((candidate) => candidate.parentId === parentId)
          .map((candidate) => candidate.order)) + 1
      order = current
      rootOrder.set(parentId, current + 1)
    }

    return {
      ...structuredClone(node),
      id: idMap.get(node.id) ?? makeId(node.id),
      parentId,
      order,
      frame: isRoot
        ? { ...node.frame, x: node.frame.x + offset, y: node.frame.y + offset }
        : { ...node.frame },
    } as GraphicStudioNode
  })

  return {
    nodes,
    rootIds: clipboard.rootIds.flatMap((nodeId) => {
      const mapped = idMap.get(nodeId)
      return mapped ? [mapped] : []
    }),
  }
}
