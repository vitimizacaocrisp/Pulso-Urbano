/**
 * Empacota o documento já renderizado num arquivo HTML que abre sozinho, sem
 * Vue, sem build e sem servidor.
 *
 * O corpo vem do DOM que o `GraphicStudioRenderer` produziu, e não de uma
 * segunda implementação de serialização. Assim o arquivo exportado é, por
 * construção, o que estava na tela: uma segunda tradução JSON -> HTML seria
 * mais uma coisa para divergir do renderer a cada mudança de schema.
 */

export interface StandaloneHtmlOptions {
  /** Nomeia a aba do navegador; não vira conteúdo visível. */
  title: string
  /** `outerHTML` da raiz `[data-graphicstudio-document]`. */
  bodyHtml: string
  /** CSS embutido — o arquivo precisa ser autossuficiente. */
  css: string
  /** Folha de fontes remota; sem ela o texto cai no fallback do sistema. */
  fontsHref?: string
  lang?: string
  /** Cor atrás da prancheta, fora da área do documento. */
  background?: string
  /**
   * Tamanho da prancheta em pixels. Com ele, o arquivo encolhe o documento
   * inteiro para caber em telas estreitas em vez de exigir rolagem lateral.
   */
  board?: { width: number; height: number }
}

/**
 * Encaixe proporcional em telas menores que a prancheta.
 *
 * Geometria absoluta não reflui — essa é a troca aceita quando se escolhe
 * manipulação direta como no Figma. Então o documento não se reorganiza: ele
 * inteiro é reduzido, preservando o desenho. Nunca amplia acima de 1.
 *
 * Precisa de script porque a razão `largura disponível / largura da prancheta` é
 * uma divisão entre comprimentos, que `calc()` não faz. Sem JavaScript a página
 * ainda abre: fica no tamanho natural, com rolagem lateral, que é o
 * comportamento de antes.
 */
function fitScript(width: number, height: number): string {
  return `
<script>
(function () {
  var board = document.querySelector('[data-graphicstudio-document]');
  var wrap = document.getElementById('gs-viewport');
  if (!board || !wrap) return;
  board.style.transformOrigin = 'top left';
  function fit() {
    var scale = Math.min(1, wrap.clientWidth / ${width});
    board.style.transform = scale < 1 ? 'scale(' + scale + ')' : '';
    wrap.style.height = Math.round(${height} * scale) + 'px';
  }
  fit();
  window.addEventListener('resize', fit);
})();
</script>`
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char)
}

/**
 * URLs que só existem dentro da aba que as criou (`blob:`), tipicamente imagens
 * e vídeos enviados do computador. Elas quebram no arquivo exportado, então a
 * interface avisa antes de baixar em vez de entregar um arquivo furado.
 */
export function countEphemeralAssets(bodyHtml: string): number {
  return (bodyHtml.match(/(?:src|href)="blob:/g) ?? []).length
}

/** Nome de arquivo previsível a partir do título, sem acento nem espaço. */
export function suggestedFileName(title: string): string {
  const slug = title
    .normalize('NFD')
    // Faixa das marcas de acento que o NFD separa das letras.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${slug || 'documento'}.html`
}

export function buildStandaloneHtml(options: StandaloneHtmlOptions): string {
  const {
    title,
    bodyHtml,
    css,
    fontsHref,
    lang = 'pt-br',
    background = '#ffffff',
    board,
  } = options

  // `fontsHref` é montado pelo catálogo do editor, mas escapa mesmo assim: o
  // atributo é interpolado em HTML cru.
  const fontLink = fontsHref
    ? `\n  <link rel="stylesheet" href="${escapeHtml(fontsHref)}">`
    : ''

  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>${fontLink}
  <style>
/* Reset mínimo: o documento posiciona tudo em coordenadas absolutas e não pode
   herdar margem nem box model do navegador. */
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  background: ${background};
}
/* Recorta o excedente enquanto o documento é reduzido para caber. */
#gs-viewport {
  overflow: hidden;
  width: 100%;
}
${css}
  </style>
</head>
<body>
<div id="gs-viewport">
${bodyHtml}
</div>${board ? fitScript(board.width, board.height) : ''}
</body>
</html>
`
}
