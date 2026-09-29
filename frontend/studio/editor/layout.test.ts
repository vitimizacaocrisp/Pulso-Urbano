// @ts-nocheck — testes nascidos em JS; a checagem estrita deles fica para depois (rodam normalmente no vitest).
import { describe, expect, it } from 'vitest';
import {
  alignNodeFrames,
  createGroupLayout,
  distributeNodeFrames,
  snapFrame,
  snapResizeEdges,
  snapToSiblings,
} from './layout';

const bloco = (id, x, y, width = 100, height = 50, rotation = 0) => ({
  id,
  frame: { x, y, width, height, rotation },
  width,
  height,
});

describe('snapToSiblings', () => {
  const irmaos = [bloco('a', 100, 100), bloco('b', 400, 300)];

  it('encosta a borda esquerda na borda esquerda do vizinho', () => {
    const { frame, guides } = snapToSiblings(
      { x: 104, y: 500, width: 100, height: 50, rotation: 0 }, irmaos, 6);
    expect(frame.x).toBe(100);
    expect(guides.some((g) => g.axis === 'x' && g.position === 100)).toBe(true);
  });

  it('alinha pelos centros', () => {
    // Centro do vizinho `a` em x = 150; o alvo tem 60 de largura.
    const { frame } = snapToSiblings(
      { x: 118, y: 500, width: 60, height: 50, rotation: 0 }, irmaos, 6);
    expect(frame.x + 30).toBe(150);
  });

  it('alinha nos dois eixos ao mesmo tempo', () => {
    const { frame, guides } = snapToSiblings(
      { x: 402, y: 297, width: 100, height: 50, rotation: 0 }, irmaos, 6);
    expect(frame).toMatchObject({ x: 400, y: 300 });
    expect(guides).toHaveLength(2);
  });

  it('ignora o que está longe demais', () => {
    const { frame, guides } = snapToSiblings(
      { x: 260, y: 700, width: 100, height: 50, rotation: 0 }, irmaos, 6);
    expect(frame).toMatchObject({ x: 260, y: 700 });
    expect(guides).toEqual([]);
  });

  it('escolhe o alinhamento mais próximo quando há mais de um', () => {
    // Borda direita de `a` em 200 e esquerda de um vizinho novo em 203.
    const { frame } = snapToSiblings(
      { x: 1, y: 500, width: 201, height: 50, rotation: 0 },
      [...irmaos, bloco('c', 203, 600)],
      6,
    );
    expect(frame.x + 201).toBe(203);
  });

  it('não age em nó girado, onde as bordas na tela não são as do frame', () => {
    const { frame, guides } = snapToSiblings(
      { x: 104, y: 500, width: 100, height: 50, rotation: 30 }, irmaos, 6);
    expect(frame.x).toBe(104);
    expect(guides).toEqual([]);
  });

  it('ignora irmão girado como referência', () => {
    const { guides } = snapToSiblings(
      { x: 104, y: 500, width: 100, height: 50, rotation: 0 },
      [bloco('girado', 100, 100, 100, 50, 45)],
      6,
    );
    expect(guides).toEqual([]);
  });

  it('estende a guia para cobrir os dois objetos', () => {
    const { guides } = snapToSiblings(
      { x: 102, y: 500, width: 100, height: 50, rotation: 0 }, [bloco('a', 100, 100)], 6);
    const guia = guides.find((g) => g.axis === 'x');
    expect(guia.from).toBe(100);
    expect(guia.to).toBe(550);
  });
});

describe('snapResizeEdges', () => {
  const irmaos = [bloco('a', 100, 100, 200, 80)];

  it('encosta a borda direita puxada e mantém a esquerda parada', () => {
    const { frame, guides } = snapResizeEdges(
      { x: 20, y: 400, width: 278, height: 50, rotation: 0 }, 'e', irmaos, 6);
    expect(frame.x).toBe(20);
    expect(frame.x + frame.width).toBe(300);
    expect(guides).toHaveLength(1);
  });

  it('encosta a borda esquerda puxada e mantém a direita parada', () => {
    const direita = 500;
    const { frame } = snapResizeEdges(
      { x: 97, y: 400, width: direita - 97, height: 50, rotation: 0 }, 'w', irmaos, 6);
    expect(frame.x).toBe(100);
    expect(frame.x + frame.width).toBe(direita);
  });

  it('encosta nos dois eixos numa alça de canto', () => {
    const { frame, guides } = snapResizeEdges(
      { x: 20, y: 20, width: 278, height: 158, rotation: 0 }, 'se', irmaos, 6);
    expect(frame.x + frame.width).toBe(300);
    expect(frame.y + frame.height).toBe(180);
    expect(guides).toHaveLength(2);
  });

  it('recusa o encaixe que deixaria o objeto menor que o mínimo', () => {
    const { frame, guides } = snapResizeEdges(
      { x: 98, y: 400, width: 6, height: 50, rotation: 0 }, 'e', irmaos, 6, 8);
    expect(frame.width).toBe(6);
    expect(guides).toEqual([]);
  });

  it('não age em nó girado', () => {
    const { frame, guides } = snapResizeEdges(
      { x: 20, y: 400, width: 278, height: 50, rotation: 15 }, 'e', irmaos, 6);
    expect(frame.width).toBe(278);
    expect(guides).toEqual([]);
  });
});

describe('snapFrame', () => {
  it('arredonda posição e tamanho para a grade', () => {
    expect(snapFrame({ x: 13, y: 27, width: 101, height: 49, rotation: 0 }))
      .toMatchObject({ x: 16, y: 24, width: 104, height: 48 });
  });
});

describe('alignNodeFrames', () => {
  it('alinha pela borda esquerda do conjunto', () => {
    const saida = alignNodeFrames([bloco('a', 100, 0), bloco('b', 250, 80)], 'left');
    expect(saida.a.x).toBe(100);
    expect(saida.b.x).toBe(100);
  });

  it('não faz nada com menos de dois objetos', () => {
    expect(alignNodeFrames([bloco('a', 0, 0)], 'left')).toEqual({});
  });
});

describe('distributeNodeFrames', () => {
  it('deixa espaços iguais entre três objetos', () => {
    const saida = distributeNodeFrames(
      [bloco('a', 0, 0), bloco('b', 120, 0), bloco('c', 400, 0)], 'horizontal');
    const vaos = [saida.b.x - (saida.a.x + 100), saida.c.x - (saida.b.x + 100)];
    expect(vaos[0]).toBeCloseTo(vaos[1], 5);
  });

  it('exige pelo menos três objetos', () => {
    expect(distributeNodeFrames([bloco('a', 0, 0), bloco('b', 10, 0)], 'horizontal')).toEqual({});
  });
});

describe('createGroupLayout', () => {
  it('envolve os filhos e os reposiciona em coordenadas do grupo', () => {
    const grupo = createGroupLayout([bloco('a', 100, 100), bloco('b', 250, 180)]);
    expect(grupo.frame).toMatchObject({ x: 100, y: 100, width: 250, height: 130 });
    expect(grupo.children.a).toMatchObject({ x: 0, y: 0 });
    expect(grupo.children.b).toMatchObject({ x: 150, y: 80 });
  });
});
