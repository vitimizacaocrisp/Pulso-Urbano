import { parseGraphicStudioDocument } from './core/index.js'
import exemploAnalise from './exemploAnalise.json'

/**
 * Documento inicial do Editor Alpha: a análise de exemplo do documento do
 * GraphicStudio (docs/GraphicStudio/exemplo-analise.json).
 *
 * Abrir o editor com uma análise pronta mostra de cara o que dá para fazer —
 * cartões feitos com componente, cor da marca no tema, gráfico montado com
 * formas — em vez de uma tela quase vazia. Os números são ilustrativos, e a
 * própria página avisa isso no rodapé.
 *
 * Não vem do backend: enquanto o editor for experimental, o ponto de partida é
 * local. `parse` devolve um objeto novo a cada chamada, então "Recomeçar" nunca
 * reaproveita um documento já editado.
 */
export function createSeedDocument() {
  return parseGraphicStudioDocument(structuredClone(exemploAnalise))
}
