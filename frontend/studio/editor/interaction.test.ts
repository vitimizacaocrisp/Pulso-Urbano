// @ts-nocheck — testes nascidos em JS; a checagem estrita deles fica para depois (rodam normalmente no vitest).
import { describe, expect, it } from 'vitest';
import {
  resizeRotatedFrame,
  rotateVector,
  scaleCssLengths,
  scaleStyle,
} from './interaction';

const DEG = Math.PI / 180;

/** Mesma matriz que o renderer compõe: rotate, scale, skewX, skewY. */
function matriz(rotacao, visual = {}) {
  const cos = Math.cos(rotacao * DEG);
  const sen = Math.sin(rotacao * DEG);
  const mult = (l, r) => ({
    a: l.a * r.a + l.c * r.b,
    b: l.b * r.a + l.d * r.b,
    c: l.a * r.c + l.c * r.d,
    d: l.b * r.c + l.d * r.d,
  });
  let m = { a: cos, b: sen, c: -sen, d: cos };
  if (visual.scale && visual.scale !== 1) m = mult(m, { a: visual.scale, b: 0, c: 0, d: visual.scale });
  if (visual.skewX) m = mult(m, { a: 1, b: 0, c: Math.tan(visual.skewX * DEG), d: 1 });
  if (visual.skewY) m = mult(m, { a: 1, b: Math.tan(visual.skewY * DEG), c: 0, d: 1 });
  return m;
}

/** Onde está, na tela, o canto oposto à alça arrastada. */
function ancoraNaTela(frame, direcao, visual = {}) {
  const ax = direcao.includes('w') ? 1 : direcao.includes('e') ? 0 : 0.5;
  const ay = direcao.includes('n') ? 1 : direcao.includes('s') ? 0 : 0.5;
  const m = matriz(frame.rotation, visual);
  const local = { x: (ax - 0.5) * frame.width, y: (ay - 0.5) * frame.height };
  return {
    x: frame.x + frame.width / 2 + (m.a * local.x + m.c * local.y),
    y: frame.y + frame.height / 2 + (m.b * local.x + m.d * local.y),
  };
}

const base = { x: 100, y: 80, width: 300, height: 200, rotation: 0 };

describe('resizeRotatedFrame', () => {
  it('mantém a borda oposta parada num nó sem rotação', () => {
    const semRotacao = { ...base, x: 0, y: 0, width: 200, height: 100 };
    expect(resizeRotatedFrame(semRotacao, 'w', { x: -20, y: 0 }, { grid: 0 }))
      .toMatchObject({ x: -20, width: 220 });
    expect(resizeRotatedFrame(semRotacao, 'e', { x: 20, y: 0 }, { grid: 0 }))
      .toMatchObject({ x: 0, width: 220 });
  });

  it('cresce para o lado oposto quando o nó está de cabeça para baixo', () => {
    const invertido = { ...base, x: 0, y: 0, width: 200, height: 100, rotation: 180 };
    const depois = resizeRotatedFrame(invertido, 'e', { x: -20, y: 0 }, { grid: 0 });
    expect(depois.width).toBeGreaterThan(invertido.width);
  });

  it('deixa a âncora parada em qualquer rotação, escala ou inclinação', () => {
    const casos = [
      { rotation: 0, visual: {} },
      { rotation: 45, visual: {} },
      { rotation: 89.43, visual: {} },
      { rotation: 0, visual: { scale: 2 } },
      { rotation: 30, visual: { scale: 0.5 } },
      { rotation: 0, visual: { skewX: 20 } },
      { rotation: 25, visual: { scale: 1.5, skewX: 12, skewY: -8 } },
    ];
    const direcoes = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
    const arrastos = [{ x: 40, y: 25 }, { x: -30, y: 60 }, { x: 70, y: -45 }];

    for (const { rotation, visual } of casos) {
      const frame = { ...base, rotation };
      for (const direcao of direcoes) {
        for (const arrasto of arrastos) {
          const antes = ancoraNaTela(frame, direcao, visual);
          // `grid: 0` mede a geometria pura, sem o encaixe de 8 px.
          const depois = resizeRotatedFrame(frame, direcao, arrasto, { grid: 0, minimum: 8, visual });
          const agora = ancoraNaTela(depois, direcao, visual);
          const desvio = Math.hypot(agora.x - antes.x, agora.y - antes.y);
          // O resto é o arredondamento do tamanho para inteiro, visto ampliado
          // quando o nó tem escala maior que 1.
          expect(desvio).toBeLessThanOrEqual(1.01);
        }
      }
    }
  });

  it('trava a proporção com shift', () => {
    const depois = resizeRotatedFrame(base, 'se', { x: 90, y: 5 }, { aspect: true, grid: 0 });
    expect(depois.width / depois.height).toBeCloseTo(base.width / base.height, 5);
  });

  it('cresce dos dois lados quando ancorado no centro', () => {
    const centro = { x: base.x + base.width / 2, y: base.y + base.height / 2 };
    const depois = resizeRotatedFrame(base, 'e', { x: 30, y: 0 }, { fromCenter: true, grid: 0 });
    expect(depois.x + depois.width / 2).toBeCloseTo(centro.x, 5);
    expect(depois.width).toBeCloseTo(base.width + 60, 5);
  });

  it('respeita o tamanho mínimo', () => {
    const depois = resizeRotatedFrame(base, 'e', { x: -10_000, y: 0 }, { minimum: 8, grid: 0 });
    expect(depois.width).toBe(8);
  });
});

describe('rotateVector', () => {
  it('gira no mesmo sentido do CSS, com y para baixo', () => {
    const girado = rotateVector({ x: 1, y: 0 }, 90);
    expect(girado.x).toBeCloseTo(0, 10);
    expect(girado.y).toBeCloseTo(1, 10);
  });
});

describe('scaleCssLengths', () => {
  it('escala comprimentos absolutos', () => {
    expect(scaleCssLengths('12px', 2)).toBe('24px');
    expect(scaleCssLengths('12px 4px', 0.5)).toBe('6px 2px');
    expect(scaleCssLengths('1.5rem', 2)).toBe('3rem');
  });

  it('deixa porcentagem intacta, que já é relativa à caixa', () => {
    expect(scaleCssLengths('50%', 3)).toBe('50%');
    expect(scaleCssLengths('50% / 10px', 2)).toBe('50% / 20px');
  });
});

describe('scaleStyle', () => {
  const estilo = {
    fontSize: 20,
    lineHeight: 1.5,
    borderWidth: 2,
    opacity: 0.5,
    borderRadius: { value: '10px' },
    borderTopLeftRadius: { token: 'raio.grande' },
  };

  it('escala comprimentos e não escala adimensionais', () => {
    const dobrado = scaleStyle(estilo, 2);
    expect(dobrado.fontSize).toBe(40);
    expect(dobrado.borderWidth).toBe(4);
    // `lineHeight` é multiplicador: escalar aplicaria a escala duas vezes.
    expect(dobrado.lineHeight).toBe(1.5);
    expect(dobrado.opacity).toBe(0.5);
  });

  it('escala raio literal e preserva token do tema', () => {
    const dobrado = scaleStyle(estilo, 2);
    expect(dobrado.borderRadius).toEqual({ value: '20px' });
    expect(dobrado.borderTopLeftRadius).toEqual({ token: 'raio.grande' });
  });

  it('respeita os limites do schema, que o commit valida', () => {
    expect(scaleStyle({ fontSize: 200 }, 10).fontSize).toBe(240);
    expect(scaleStyle({ fontSize: 10 }, 0.01).fontSize).toBe(8);
  });
});
