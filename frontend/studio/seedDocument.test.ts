// @ts-nocheck — testes nascidos em JS; a checagem estrita deles fica para depois (rodam normalmente no vitest).
import { describe, expect, it } from 'vitest';
import { createSeedDocument } from './seedDocument';
import { syncComponentInstances } from './core';

describe('createSeedDocument', () => {
  it('é um documento válido — uma mudança de schema que o quebre falha aqui, e não ao abrir o editor', () => {
    expect(() => createSeedDocument()).not.toThrow();
  });

  it('abre com a análise de exemplo e os três cartões preenchidos', () => {
    const doc = syncComponentInstances(createSeedDocument());
    const numeros = Object.values(doc.nodes)
      .filter((n) => n.type === 'core/heading' && n.content.level === 3)
      .map((n) => n.content.text)
      .sort();
    expect(doc.metadata.title).toMatch(/exemplo/i);
    expect(numeros).toEqual(['+11%', '62%', '−18%'].sort());
  });

  it('devolve uma cópia nova a cada chamada, para "Recomeçar" não herdar edições', () => {
    const primeiro = createSeedDocument();
    primeiro.nodes.titulo.content.text = 'alterado';
    expect(createSeedDocument().nodes.titulo.content.text).not.toBe('alterado');
  });
});
