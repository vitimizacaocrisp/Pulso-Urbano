// ─────────────────────────────────────────────────────────────────────
// Sanitização server-side de HTML (doc 05/07).
//
// Pré-requisito do multi-admin: sem isto, um editor injeta <script> que roda
// na sessão do superadmin (XSS armazenado → escalação de privilégio).
// A renderização em iframe sandbox continua como defesa em profundidade.
// ─────────────────────────────────────────────────────────────────────
const sanitizeHtml = require('sanitize-html');

// Allowlist ampla o bastante para o conteúdo editorial existente (títulos,
// tabelas, imagens, iframes de embed permitidos), sem executáveis.
const EMBED_IFRAME_HOSTS = [
  'open.spotify.com', 'www.youtube.com', 'www.youtube-nocookie.com',
  'player.vimeo.com', 'podcasts.apple.com', 'www.google.com',
];

const OPTS = {
  allowedTags: [
    'h1','h2','h3','h4','h5','h6','p','br','hr','blockquote','pre','code',
    'ul','ol','li','strong','em','b','i','u','s','sub','sup','mark','small',
    'a','img','figure','figcaption','table','thead','tbody','tfoot','tr','th','td',
    'div','span','section','article','aside','header','footer','main',
    'audio','video','source','track','iframe','details','summary','caption',
  ],
  allowedAttributes: {
    '*': ['class','id','style','title','aria-*','role','data-*'],
    a: ['href','target','rel','download'],
    img: ['src','alt','width','height','loading'],
    audio: ['src','controls','preload'],
    video: ['src','controls','preload','poster','width','height'],
    source: ['src','type'],
    track: ['src','kind','srclang','label','default'],
    iframe: ['src','width','height','frameborder','allow','allowfullscreen','loading','title'],
    th: ['colspan','rowspan','scope'], td: ['colspan','rowspan'],
  },
  // http/https/mailto e imagens data: (gráficos embutidos no conteúdo legado)
  allowedSchemes: ['http','https','mailto'],
  allowedSchemesByTag: { img: ['http','https','data'] },
  // iframes só dos provedores de embed conhecidos
  allowedIframeHostnames: EMBED_IFRAME_HOSTS,
  disallowedTagsMode: 'discard',
  // style attr passa (conteúdo legado usa inline styles); scripts/handlers NÃO:
  // sanitize-html já remove on* e <script> por não estarem na allowlist.
};

const sanitizeConteudo = (html) => (html == null ? html : sanitizeHtml(String(html), OPTS));

// Validação de URL de embed/link por allowlist (doc 05).
const EMBED_HOSTS_BY_TIPO = {
  podcast: ['open.spotify.com','podcasts.apple.com','www.youtube.com','youtu.be','music.youtube.com'],
  video:   ['www.youtube.com','youtu.be','player.vimeo.com','vimeo.com'],
};
function validaEmbedUrl(url, tipo) {
  if (!url) return true;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const hosts = EMBED_HOSTS_BY_TIPO[tipo] || [];
    return hosts.some((h) => u.hostname === h);
  } catch { return false; }
}
function validaHttpsUrl(url) {
  if (!url) return true;
  try { return new URL(url).protocol === 'https:'; } catch { return false; }
}

module.exports = { sanitizeConteudo, validaEmbedUrl, validaHttpsUrl, EMBED_HOSTS_BY_TIPO };
