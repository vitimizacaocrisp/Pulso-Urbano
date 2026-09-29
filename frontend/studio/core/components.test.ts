// @ts-nocheck — testes nascidos em JS; a checagem estrita deles fica para depois (rodam normalmente no vitest).
import { describe, expect, it } from 'vitest';
import { parseGraphicStudioDocument } from './document';
import { instanceRootOf, overrideKeyOf, syncComponentInstances } from './components';

function documento({ overrides } = {}) {
  return parseGraphicStudioDocument({
    schemaVersion: 2,
    documentId: 'doc_teste',
    metadata: { title: 'Teste', slug: 'teste', description: '', status: 'draft' },
    theme: { id: 'default', version: 1, overrides: {} },
    breakpoints: { mobile: 390, tablet: 768, desktop: 1440 },
    pages: [{ id: 'pagina', name: 'Tela', rootNodeId: 'raiz' }],
    components: { cartao: { name: 'Cartão', masterNodeId: 'mestre' } },
    nodes: {
      raiz: {
        id: 'raiz', name: 'pagina', type: 'core/page', parentId: null, order: 0,
        frame: { x: 0, y: 0, width: 1200, height: 900, rotation: 0 },
        style: {}, content: {}, locked: false, hidden: false,
      },
      mestre: {
        id: 'mestre', name: 'cartao', type: 'core/block', parentId: 'raiz', order: 0,
        frame: { x: 10, y: 10, width: 300, height: 200, rotation: 0 },
        style: { backgroundColor: { value: '#ffffff' } },
        content: { label: 'Cartão' }, locked: false, hidden: false,
      },
      mestre_titulo: {
        id: 'mestre_titulo', type: 'core/heading', parentId: 'mestre', order: 0,
        frame: { x: 8, y: 8, width: 200, height: 40, rotation: 0 },
        style: {}, content: { text: 'Título do mestre', level: 2 },
        locked: false, hidden: false,
      },
      copia: {
        id: 'copia', type: 'core/block', parentId: 'raiz', order: 1,
        instanceOf: 'cartao',
        ...(overrides ? { overrides } : {}),
        frame: { x: 500, y: 300, width: 10, height: 10, rotation: 0 },
        style: {}, content: { label: 'desatualizado' }, locked: false, hidden: false,
      },
    },
  });
}

describe('syncComponentInstances', () => {
  it('reconstrói a cópia a partir do mestre', () => {
    const saida = syncComponentInstances(documento());
    expect(saida.nodes.copia.content.label).toBe('Cartão');
    expect(saida.nodes.copia.style.backgroundColor).toEqual({ value: '#ffffff' });
    expect(saida.nodes.copia.frame.width).toBe(300);
  });

  it('preserva a posição da cópia, senão todas empilhariam no mesmo lugar', () => {
    const saida = syncComponentInstances(documento());
    expect(saida.nodes.copia.frame.x).toBe(500);
    expect(saida.nodes.copia.frame.y).toBe(300);
  });

  it('clona os filhos do mestre com id estável', () => {
    const primeira = syncComponentInstances(documento());
    const segunda = syncComponentInstances(primeira);
    const filhos = Object.values(primeira.nodes).filter((n) => n.parentId === 'copia');
    expect(filhos).toHaveLength(1);
    expect(filhos[0].content.text).toBe('Título do mestre');
    // Id estável entre passagens: senão a seleção e o histórico quebrariam.
    expect(Object.keys(segunda.nodes).sort()).toEqual(Object.keys(primeira.nodes).sort());
  });

  it('não copia o `name`, que vira id do HTML e precisa ser único', () => {
    const saida = syncComponentInstances(documento());
    const filho = Object.values(saida.nodes).find((n) => n.parentId === 'copia');
    expect(filho.name).toBeUndefined();
    expect(saida.nodes.copia.name).toBeUndefined();
  });

  it('aplica sobrescrita de conteúdo na raiz da cópia', () => {
    const saida = syncComponentInstances(documento({
      overrides: { root: { content: { label: 'Só nesta cópia' } } },
    }));
    expect(saida.nodes.copia.content.label).toBe('Só nesta cópia');
    // O mestre não é afetado pela sobrescrita da cópia.
    expect(saida.nodes.mestre.content.label).toBe('Cartão');
  });

  it('aplica sobrescrita num descendente da cópia', () => {
    const saida = syncComponentInstances(documento({
      overrides: { 0: { content: { text: 'Título da cópia', level: 2 } } },
    }));
    const filho = Object.values(saida.nodes).find((n) => n.parentId === 'copia');
    expect(filho.content.text).toBe('Título da cópia');
    expect(saida.nodes.mestre_titulo.content.text).toBe('Título do mestre');
  });

  it('reverte qualquer geometria gravada direto num filho de cópia', () => {
    // É o fato que causava o congelamento do editor: a medição automática
    // gravava altura num filho de cópia, a sincronização revertia para a do
    // mestre, o documento mudava e a medição rodava de novo, sem fim. Por isso
    // o editor não mede filhos de cópia — este teste fixa o motivo.
    const sincronizado = syncComponentInstances(documento());
    const filho = Object.values(sincronizado.nodes).find((n) => n.parentId === 'copia');
    const alterado = parseGraphicStudioDocument({
      ...sincronizado,
      nodes: {
        ...sincronizado.nodes,
        [filho.id]: { ...filho, frame: { ...filho.frame, height: 999 } },
      },
    });
    const denovo = syncComponentInstances(alterado);
    expect(denovo.nodes[filho.id].frame.height).toBe(sincronizado.nodes.mestre_titulo.frame.height);
  });

  it('devolve o mesmo documento quando não há componentes', () => {
    const base = documento();
    const semComponentes = parseGraphicStudioDocument({
      ...base,
      components: {},
      nodes: Object.fromEntries(
        Object.entries(base.nodes).map(([id, node]) => {
          const { instanceOf: _fora, ...resto } = node;
          return [id, resto];
        }),
      ),
    });
    expect(syncComponentInstances(semComponentes)).toBe(semComponentes);
  });
});

describe('overrideKeyOf', () => {
  it('usa `root` para a própria raiz e o índice para descendentes', () => {
    expect(overrideKeyOf('copia', 'copia')).toBe('root');
    expect(overrideKeyOf('copia_c3', 'copia')).toBe('3');
    expect(overrideKeyOf('outro', 'copia')).toBeNull();
  });
});

describe('instanceRootOf', () => {
  it('sobe até a cópia que contém o nó', () => {
    const saida = syncComponentInstances(documento());
    const filho = Object.values(saida.nodes).find((n) => n.parentId === 'copia');
    expect(instanceRootOf(saida, filho.id).id).toBe('copia');
    expect(instanceRootOf(saida, 'mestre_titulo')).toBeNull();
  });
});
