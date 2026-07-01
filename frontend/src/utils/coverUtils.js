// Sistema de capas das análises.
// Prioridade de resolução (pickCover):
//   1. cover_image_path real (og:image/upload) -> <img>
//   2. categoria/tags casam com um tema conhecido -> SVG gerado (inline, temático)
//   3. nada casa -> foto de API externa (loremflickr) com indicativo da análise
//
// O SVG é autocontido (gradiente + ícone + título), determinístico e sem rede.
// Mantém o visual consistente mesmo sem imagem real (relatório, item 5.3).

import { mediaUrl } from '@/services/api';

// Paths de ícone (mdi, viewBox 24x24) por tema. Apache-2.0.
const ICONS = {
  pessoa:    'M12 4a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4Z',
  patrimonio:'M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3Z',
  cofre:     'M5 3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5m0 2h14v14H5V5m9 2a4 4 0 0 0-4 4 4 4 0 0 0 4 4 4 4 0 0 0 4-4 4 4 0 0 0-4-4Z',
  escudo:    'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4m0 2.18 7 3.11V11c0 4.52-2.98 8.69-7 9.93C7.98 19.69 5 15.52 5 11V6.29l7-3.11Z',
  escola:    'M12 3 1 9l11 6 9-4.91V17h2V9L12 3M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82Z',
  grafico:   'M22 21H2V3h2v16h2v-9h4v9h2V6h4v13h2v-5h2v7Z',
  politica:  'M2 19h20v2H2v-2m1.15-6.84L12 3l8.85 9.16H17V18h-3v-4h-4v4H7v-5.84H3.15Z',
  olho:      'M12 9a3 3 0 0 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1 3-3m0-4.5c5 0 9.27 3.11 11 7.5-1.73 4.39-6 7.5-11 7.5S2.73 16.39 1 12c1.73-4.39 6-7.5 11-7.5Z',
  genero:    'M12 2a3 3 0 0 1 3 3c0 1.31-.83 2.42-2 2.83V9h2v2h-2v3h-2v-3H9V9h2V7.83C9.83 7.42 9 6.31 9 5a3 3 0 0 1 3-3Z',
  ambiente:  'M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8Z',
  policia:   'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4m0 4a2.5 2.5 0 0 1 2.5 2.5A2.5 2.5 0 0 1 12 10a2.5 2.5 0 0 1-2.5-2.5A2.5 2.5 0 0 1 12 5m0 6.5c1.93 0 3.5 1.07 3.5 2.4V15h-7v-1.1c0-1.33 1.57-2.4 3.5-2.4Z',
  doc:       'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6m4 18H6V4h7v5h5v11Z',
};

// Temas: 1ª regex que casar (categoria + tags) define a capa.
const THEMES = [
  { re: /g[êe]nero|mulher|feminic|dom[ée]stic|trans|lgbt/i, icon: ICONS.genero,    c1: '#d6336c', c2: '#a61e4d', label: 'Gênero' },
  { re: /patrim[ôo]ni|roubo|furto|carga|ve[íi]culo|celular|estelionato|digital/i, icon: ICONS.cofre, c1: '#f59f00', c2: '#b07d00', label: 'Patrimônio' },
  { re: /pessoa|homic[íi]dio|letal|feminic|crian|infa|idoso|ind[íi]gena|quilombo/i, icon: ICONS.pessoa, c1: '#e8590c', c2: '#a93226', label: 'Crimes contra a pessoa' },
  { re: /policial|letalidade|pol[íi]cia|c[âa]mera|seguran[çc]a p[úu]blica/i, icon: ICONS.policia, c1: '#1c7ed6', c2: '#1862ab', label: 'Policiamento' },
  { re: /seguran[çc]a|sensa[çc][ãa]o|percep[çc]|medo|risco/i, icon: ICONS.olho, c1: '#0ea5a4', c2: '#0b7285', label: 'Sensação de Segurança' },
  { re: /metodolog|amostra|vitimiza[çc]|pesquisa|survey|dados|estat[íi]stic/i, icon: ICONS.grafico, c1: '#2f54eb', c2: '#1d39c4', label: 'Metodologia e Dados' },
  { re: /educa|escola|bullying|ensino/i, icon: ICONS.escola, c1: '#7048e8', c2: '#5f3dc4', label: 'Educação' },
  { re: /pol[íi]tic|lei|legisla|estado|congresso|governo/i, icon: ICONS.politica, c1: '#3b5bdb', c2: '#2b3fa1', label: 'Política' },
  { re: /ambient|garimpo|desmat|amaz[ôo]ni|campo|agr[áa]ri|fronteira/i, icon: ICONS.ambiente, c1: '#2f9e44', c2: '#2b8a3e', label: 'Ambiental' },
  { re: /crim|viol[êe]ncia|fac[çc][ãa]o|tr[áa]fico|org[âa]nizad|pris|encarcer/i, icon: ICONS.escudo, c1: '#c92a2a', c2: '#a51111', label: 'Criminalidade' },
];

const esc = (s) => String(s || '').replace(/[&<>"']/g, m => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
));

const fullMediaPath = (path) => mediaUrl(path);

const haystack = (a) => `${a?.category || ''} ${a?.tag || ''} ${a?.title || ''}`;

const matchTheme = (a) => THEMES.find(t => t.re.test(haystack(a))) || null;

// Quebra o título em até 3 linhas curtas para caber no SVG.
const wrapTitle = (title, max = 26, maxLines = 3) => {
  const words = String(title || '').split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  let out = lines.slice(0, maxLines);
  if (words.join(' ').length > out.join(' ').length) {
    out[out.length - 1] = out[out.length - 1].replace(/[.,;]?$/, '…');
  }
  return out;
};

// SVG temático autocontido.
export const buildCoverSvg = (a) => {
  const theme = matchTheme(a) || THEMES[5]; // default: metodologia/dados
  const lines = wrapTitle(a?.title, 26, 3);
  const titleSvg = lines.map((ln, i) =>
    `<text x="40" y="${168 + i * 30}" font-size="22" font-weight="700" fill="#ffffff" font-family="Georgia, serif">${esc(ln)}</text>`
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(a?.title)}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.c1}"/>
      <stop offset="1" stop-color="${theme.c2}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <g transform="translate(372 40) scale(11)" fill="#ffffff" opacity="0.10"><path d="${theme.icon}"/></g>
  <g transform="translate(40 44)" fill="#ffffff"><path transform="scale(1.25)" d="${theme.icon}"/></g>
  <text x="40" y="108" font-size="13" letter-spacing="2" font-weight="700" fill="#ffffff" opacity="0.85" font-family="system-ui, sans-serif">${esc((theme.label || '').toUpperCase())}</text>
  ${titleSvg}
  <text x="40" y="328" font-size="14" fill="#ffffff" opacity="0.9" font-family="system-ui, sans-serif">${esc(a?.source || 'Pulso Urbano')}</text>
  <rect x="0" y="352" width="640" height="8" fill="#ffffff" opacity="0.25"/>
</svg>`;
};

export const coverSvgDataUri = (a) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(buildCoverSvg(a));

// Foto externa (api) — usada quando nada casa. Keyword vem da tag/categoria.
export const externalPhoto = (a) => {
  const kw = (String(a?.tag || a?.category || 'public safety')
    .split(/[\s,]+/)[0] || 'city').replace(/[^a-zA-Z]/g, '') || 'city';
  return `https://loremflickr.com/640/360/${encodeURIComponent(kw)},brazil?lock=${a?.id || 1}`;
};

// Resolve a melhor capa para a análise.
export const pickCover = (a) => {
  if (a?.cover_image_path) {
    return { kind: 'image', src: fullMediaPath(a.cover_image_path) };
  }
  if (matchTheme(a)) {
    return { kind: 'svg', svg: buildCoverSvg(a) };
  }
  return { kind: 'photo', src: externalPhoto(a), label: a?.title };
};
