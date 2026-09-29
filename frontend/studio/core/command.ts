import { z } from 'zod'
import {
  graphicStudioDocumentSchema,
  graphicStudioNodeSchema,
  jsonValueSchema,
  animationSchema,
  frameSchema,
  styleSchema,
  nodeNameSchema,
  nodeGroupsSchema,
  type GraphicStudioDocument,
} from './document.js'

const commandEnvelopeShape = {
  commandId: z.string().min(1).max(128),
  documentId: z.string().min(1).max(128),
  baseVersion: z.number().int().nonnegative(),
  actorId: z.string().min(1).max(128),
  timestamp: z.iso.datetime(),
}

export const patchMetadataCommandSchema = z
  .object({
    ...commandEnvelopeShape,
    type: z.literal('document.patchMetadata'),
    payload: z
      .object({
        title: z.string().min(1).max(500).optional(),
        slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
        description: z.string().max(2_000).optional(),
        status: z.enum(['draft', 'published']).optional(),
      })
      .strict()
      .refine((payload) => Object.keys(payload).length > 0, 'Metadata patch cannot be empty'),
  })
  .strict()

/**
 * Nome de token do tema. Vira a variável CSS `--gs-<nome com pontos virando
 * hífens>`, então precisa ser um identificador seguro de CSS.
 */
export const themeTokenNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/, 'Theme token must be lowercase, dot or dash separated')

/**
 * Cria, altera e remove tokens do tema numa tacada.
 *
 * Mexer no tema é uma edição de documento como qualquer outra: entra no mesmo
 * histórico e no mesmo `undo` das edições de nó. Valor `null` remove o token.
 */
export const setThemeTokensCommandSchema = z
  .object({
    ...commandEnvelopeShape,
    type: z.literal('document.setThemeTokens'),
    payload: z
      .object({
        tokens: z.record(themeTokenNameSchema, z.string().min(1).max(200).nullable()),
      })
      .strict()
      .refine((payload) => Object.keys(payload.tokens).length > 0, 'Theme patch cannot be empty'),
  })
  .strict()

/**
 * Registra ou remove um componente. Valor `null` remove — as instâncias viram
 * nós comuns, e não somem: apagar o trabalho de quem usou o componente seria
 * uma surpresa desagradável.
 */
export const setComponentCommandSchema = z
  .object({
    ...commandEnvelopeShape,
    type: z.literal('document.setComponent'),
    payload: z
      .object({
        componentId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
        component: z
          .object({
            name: z.string().min(1).max(200),
            masterNodeId: z.string().min(1).max(128),
          })
          .strict()
          .nullable(),
      })
      .strict(),
  })
  .strict()

export const createNodeCommandSchema = z
  .object({
    ...commandEnvelopeShape,
    type: z.literal('node.create'),
    payload: z
      .object({
        node: graphicStudioNodeSchema.refine(
          (node) => node.type !== 'core/page' && node.parentId !== null,
          'Created nodes must belong to an existing page tree',
        ),
      })
      .strict(),
  })
  .strict()

export const updateNodeCommandSchema = z
  .object({
    ...commandEnvelopeShape,
    type: z.literal('node.update'),
    payload: z
      .object({
        nodeId: z.string().min(1).max(128),
        // `null` remove o campo do nó, seguindo a mesma convenção de `animation`.
        name: nodeNameSchema.nullable().optional(),
        groups: nodeGroupsSchema.nullable().optional(),
        /** `null` desvincula a instância do componente. */
        instanceOf: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/).nullable().optional(),
        /** Conteúdo que esta cópia sobrescreve do mestre; `null` limpa tudo. */
        overrides: z
          .record(
            z.string().max(64),
            z.object({ content: z.record(z.string(), jsonValueSchema) }).strict(),
          )
          .nullable()
          .optional(),
        parentId: z.string().min(1).max(128).optional(),
        content: z.record(z.string(), jsonValueSchema).optional(),
        style: styleSchema.optional(),
        frame: frameSchema.optional(),
        animation: animationSchema.nullable().optional(),
        order: z.number().int().nonnegative().optional(),
        hidden: z.boolean().optional(),
        locked: z.boolean().optional(),
      })
      .strict()
      .refine((payload) => Object.keys(payload).length > 1, 'Node update cannot be empty'),
  })
  .strict()

export const deleteNodeCommandSchema = z
  .object({
    ...commandEnvelopeShape,
    type: z.literal('node.delete'),
    payload: z.object({ nodeId: z.string().min(1).max(128) }).strict(),
  })
  .strict()

export const graphicStudioCommandSchema = z.discriminatedUnion('type', [
  patchMetadataCommandSchema,
  setThemeTokensCommandSchema,
  setComponentCommandSchema,
  createNodeCommandSchema,
  updateNodeCommandSchema,
  deleteNodeCommandSchema,
])

export type PatchMetadataCommand = z.infer<typeof patchMetadataCommandSchema>
export type SetThemeTokensCommand = z.infer<typeof setThemeTokensCommandSchema>
export type SetComponentCommand = z.infer<typeof setComponentCommandSchema>
export type CreateNodeCommand = z.infer<typeof createNodeCommandSchema>
export type UpdateNodeCommand = z.infer<typeof updateNodeCommandSchema>
export type DeleteNodeCommand = z.infer<typeof deleteNodeCommandSchema>
export type GraphicStudioCommand = z.infer<typeof graphicStudioCommandSchema>

export function applyCommand(
  documentInput: GraphicStudioDocument,
  commandInput: GraphicStudioCommand,
): GraphicStudioDocument {
  const document = graphicStudioDocumentSchema.parse(documentInput)
  const command = graphicStudioCommandSchema.parse(commandInput)

  if (command.documentId !== document.documentId) {
    throw new Error('Command documentId does not match the document')
  }

  if (command.type === 'document.patchMetadata') {
    return graphicStudioDocumentSchema.parse({
      ...document,
      metadata: {
        ...document.metadata,
        ...command.payload,
      },
    })
  }

  if (command.type === 'document.setThemeTokens') {
    const overrides = { ...document.theme.overrides }
    for (const [token, value] of Object.entries(command.payload.tokens)) {
      if (value === null) delete overrides[token]
      else overrides[token] = value
    }
    return graphicStudioDocumentSchema.parse({
      ...document,
      theme: { ...document.theme, overrides },
    })
  }

  if (command.type === 'document.setComponent') {
    const components = { ...document.components }
    const nodes = { ...document.nodes }
    if (command.payload.component === null) {
      delete components[command.payload.componentId]
      // Instâncias órfãs voltam a ser nós comuns em vez de invalidar o
      // documento inteiro na próxima validação.
      for (const [nodeId, node] of Object.entries(nodes)) {
        if (node.instanceOf === command.payload.componentId) {
          const { instanceOf: _removed, ...rest } = node
          nodes[nodeId] = rest as typeof node
        }
      }
    } else {
      components[command.payload.componentId] = command.payload.component
    }
    return graphicStudioDocumentSchema.parse({ ...document, components, nodes })
  }

  if (command.type === 'node.create') {
    if (document.nodes[command.payload.node.id]) {
      throw new Error(`Node already exists: ${command.payload.node.id}`)
    }

    return graphicStudioDocumentSchema.parse({
      ...document,
      nodes: {
        ...document.nodes,
        [command.payload.node.id]: command.payload.node,
      },
    })
  }

  if (command.type === 'node.update') {
    const node = document.nodes[command.payload.nodeId]
    if (!node) throw new Error(`Node does not exist: ${command.payload.nodeId}`)

    const nextNode: Record<string, unknown> = { ...node }
    if (command.payload.content) nextNode.content = command.payload.content
    if (command.payload.parentId !== undefined) nextNode.parentId = command.payload.parentId
    if (command.payload.style) nextNode.style = command.payload.style
    if (command.payload.frame) nextNode.frame = command.payload.frame
    if (command.payload.order !== undefined) nextNode.order = command.payload.order
    if (command.payload.hidden !== undefined) nextNode.hidden = command.payload.hidden
    if (command.payload.locked !== undefined) nextNode.locked = command.payload.locked
    if ('animation' in command.payload) {
      if (command.payload.animation === null) delete nextNode.animation
      else nextNode.animation = command.payload.animation
    }
    if ('name' in command.payload) {
      if (command.payload.name === null) delete nextNode.name
      else nextNode.name = command.payload.name
    }
    if ('groups' in command.payload) {
      if (command.payload.groups === null) delete nextNode.groups
      else nextNode.groups = command.payload.groups
    }
    if ('instanceOf' in command.payload) {
      if (command.payload.instanceOf === null) {
        delete nextNode.instanceOf
        // Sem componente não há o que sobrescrever; deixar o campo para trás
        // guardaria um patch que nunca mais seria aplicado.
        delete nextNode.overrides
      } else {
        nextNode.instanceOf = command.payload.instanceOf
      }
    }
    if ('overrides' in command.payload) {
      if (command.payload.overrides === null) delete nextNode.overrides
      else nextNode.overrides = command.payload.overrides
    }

    return graphicStudioDocumentSchema.parse({
      ...document,
      nodes: {
        ...document.nodes,
        [node.id]: nextNode,
      },
    })
  }

  const pageRoots = new Set(document.pages.map((page) => page.rootNodeId))
  if (pageRoots.has(command.payload.nodeId)) {
    throw new Error('Page root nodes cannot be deleted')
  }
  if (!document.nodes[command.payload.nodeId]) {
    throw new Error(`Node does not exist: ${command.payload.nodeId}`)
  }

  const nodeIdsToDelete = new Set([command.payload.nodeId])
  let foundChild = true
  while (foundChild) {
    foundChild = false
    for (const node of Object.values(document.nodes)) {
      if (node.parentId && nodeIdsToDelete.has(node.parentId) && !nodeIdsToDelete.has(node.id)) {
        nodeIdsToDelete.add(node.id)
        foundChild = true
      }
    }
  }

  return graphicStudioDocumentSchema.parse({
    ...document,
    nodes: Object.fromEntries(
      Object.entries(document.nodes).filter(([nodeId]) => !nodeIdsToDelete.has(nodeId)),
    ),
  })
}
