<template>
  <iframe
    ref="frame"
    class="isolated-frame"
    title="Conteúdo da análise"
    sandbox="allow-scripts allow-popups"
    :srcdoc="compiledHtml"
    @load="onIframeLoad"
  ></iframe>
</template>

<script lang="ts">
import { useTheme } from '@/composables/useTheme'
import DOMPurify from 'dompurify'

const EMBED_HOSTS = new Set([
  'open.spotify.com', 'www.youtube.com', 'www.youtube-nocookie.com',
  'player.vimeo.com', 'podcasts.apple.com', 'www.google.com',
])

function sanitizeRenderedContent(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'loading', 'target'],
  })
  const doc = new DOMParser().parseFromString(`<body>${clean}</body>`, 'text/html')
  doc.querySelectorAll('iframe').forEach((frame) => {
    try {
      const url = new URL(frame.getAttribute('src') || '')
      if (url.protocol !== 'https:' || !EMBED_HOSTS.has(url.hostname)) frame.remove()
    } catch { frame.remove() }
  })
  doc.querySelectorAll('a[target="_blank"]').forEach((link) => link.setAttribute('rel', 'noopener noreferrer'))
  return doc.body.innerHTML
}

export default {
  name: "IsolatedRenderer",

  setup() {
    const { theme } = useTheme()
    return { theme }
  },

  props: {
    content: {
      type: String,
      required: true
    }
  },

  data() {
    return {
      lastHeight: 0,
      heightCheckInterval: null as ReturnType<typeof setInterval> | null
    }
  },

  computed: {
    cleanContent(): string {
      if (!this.content) return ''

      let html = this.content

      if (html.includes('&lt;') || html.includes('&gt;') || html.includes('&amp;')) {
        const textarea = document.createElement('textarea')
        textarea.innerHTML = html
        html = textarea.value
      }

      // Defesa em profundidade: conteúdo legado pode estar codificado e só
      // virar uma tag depois da sanitização do servidor.
      return sanitizeRenderedContent(html.trim())
    },

    iframeId(): string {
      return 'iframe-' + Math.random().toString(36).substr(2, 9)
    },

    compiledHtml(): string {
      const content = this.cleanContent

      // Cor de texto do conteúdo conforme o tema ativo (o fundo do iframe é
      // transparente e mostra o wrapper já tematizado).
      const t = this.theme
      const textColor = t === 'dark' ? '#d4d4d4' : t === 'comfort' ? '#4a3b29' : '#333'
      const linkColor = t === 'dark' ? '#8eacff' : t === 'comfort' ? '#2f6db0' : '#2563eb'
      const softSurface = t === 'dark' ? 'rgba(255,255,255,.055)' : t === 'comfort' ? 'rgba(106,76,43,.07)' : 'rgba(37,99,235,.055)'
      const ruleColor = t === 'dark' ? 'rgba(255,255,255,.16)' : 'rgba(15,23,42,.14)'

      // eslint-disable-next-line no-useless-escape
      const scriptEnd = '<\/script>'

      return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<base target="_blank" />
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html, body {
  height: auto;
  overflow: visible;
  background: transparent;
  color: ${textColor};
}
body {
  padding: 2px 1px 8px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 17px;
  line-height: 1.78;
}
h1, h2, h3, h4, h5, h6 {
  margin: 1.55em 0 .55em;
  font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  line-height: 1.2;
  letter-spacing: -.025em;
  color: ${textColor};
}
h1:first-child, h2:first-child, h3:first-child { margin-top: 0; }
h2 { font-size: 1.65em; }
h3 { font-size: 1.25em; }
p { margin: 0 0 1.1em; }
ul, ol { margin: 0 0 1.25em; padding-left: 1.45em; }
li + li { margin-top: .32em; }
blockquote {
  margin: 1.5em 0;
  padding: 1em 1.15em 1em 1.35em;
  border-left: 4px solid ${linkColor};
  border-radius: 0 10px 10px 0;
  background: ${softSurface};
  font-size: 1.05em;
  font-style: italic;
}
table { width: 100%; margin: 1.4em 0; border-collapse: collapse; font-family: ui-sans-serif, system-ui, sans-serif; font-size: .93em; }
th, td { padding: .72em .8em; border: 1px solid ${ruleColor}; text-align: left; }
th { background: ${softSurface}; font-weight: 750; }
hr { margin: 2em 0; border: 0; border-top: 1px solid ${ruleColor}; }
code { padding: .12em .32em; border-radius: 4px; background: ${softSurface}; font-size: .88em; }
a {
  color: ${linkColor};
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: ${linkColor}80;
  text-underline-offset: 2px;
  transition: text-decoration-color 0.15s;
}
a:hover { text-decoration-color: ${linkColor}; }
img, canvas, svg {
  max-width: 100%;
  height: auto;
  display: block;
}
a:focus {
  outline: 2px solid #3182ce;
  outline-offset: 2px;
}
main, section, article, div {
  height: auto;
  overflow: visible;
}
.chart-wrapper {
  position: relative;
  height: 400px;
}
</style>
<script>
(function() {
  let lastHeight = 0;
  let stableCount = 0;
  let resizeObserver = null;

  function getHeight() {
    const body = document.body;
    const html = document.documentElement;
    // Usar apenas scrollHeight e offsetHeight garante que estamos
    // medindo o conteúdo, e não a janela do iframe em si.
    return Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.scrollHeight
    );
  }

  function sendHeight() {
    const height = getHeight();

    if (Math.abs(height - lastHeight) > 5) {
      lastHeight = height;
      stableCount = 0;

      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'iframe-height',
          height: height,
          iframeId: '${this.iframeId}'
        }, '*');
      }
    } else {
      stableCount++;
    }

    return stableCount > 5;
  }

  function setupObserver() {
    // Só configura observer se body existir
    if (!document.body) {
      setTimeout(setupObserver, 50);
      return;
    }

    sendHeight();

    // ResizeObserver com verificação de existência
    if (window.ResizeObserver && document.body) {
      resizeObserver = new ResizeObserver(function() {
        setTimeout(sendHeight, 50);
      });
      resizeObserver.observe(document.body);
    }

    // Verificações periódicas
    let checks = 0;
    const maxChecks = 30;
    const interval = setInterval(function() {
      checks++;
      const isStable = sendHeight();
      if (isStable || checks >= maxChecks) {
        clearInterval(interval);
      }
    }, 300);

    // Eventos
    window.addEventListener('load', function() {
      setTimeout(sendHeight, 100);
      setTimeout(sendHeight, 500);
      setTimeout(sendHeight, 1000);
    });

    let resizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(sendHeight, 100);
    });
  }

  // Inicia quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupObserver);
  } else {
    setupObserver();
  }
})();
${scriptEnd}
</head>
<body>
${content}
</body>
</html>
      `.trim()
    }
  },

  mounted() {
    window.addEventListener('message', this.handleMessage)

    this.heightCheckInterval = setInterval(() => {
      const iframe = this.$refs.frame as HTMLIFrameElement | undefined
      if (iframe) {
        const currentHeight = parseInt(iframe.style.height) || 0
        // Limite aumentado para 50000 apenas como margem de extremo erro
        if (currentHeight > 50000) {
          iframe.style.height = '50000px'
          clearInterval(this.heightCheckInterval!)
        }
      }
    }, 2000)
  },

  beforeUnmount() {
    window.removeEventListener('message', this.handleMessage)
    if (this.heightCheckInterval) {
      clearInterval(this.heightCheckInterval)
    }
  },

  methods: {
    handleMessage(event: MessageEvent) {
      if (!event.data || event.data.type !== 'iframe-height') return

      const iframe = this.$refs.frame as HTMLIFrameElement | undefined
      if (!iframe || event.source !== iframe.contentWindow || !event.data.height) return

      const newHeight = parseInt(event.data.height)

      // Aumente o limite tolerado aqui (ou remova a verificação de limite superior)
      if (newHeight <= 0 || newHeight > 50000) return

      const currentHeight = parseInt(iframe.style.height) || 0

      if (Math.abs(newHeight - currentHeight) > 10) {
        iframe.style.height = newHeight + 'px'
      }
    },

    onIframeLoad() {
      // Força altura inicial após carregar
      setTimeout(() => {
        const iframe = this.$refs.frame as HTMLIFrameElement | undefined
        if (!iframe) return

        try {
          // Tenta acessar documento interno
          const doc = iframe.contentWindow!.document
          const height = Math.max(
            doc.body.scrollHeight,
            doc.documentElement.scrollHeight
          )
          if (height > 100) {
            iframe.style.height = (height + 30) + 'px'
          }
        } catch (e) {
          // Sem acesso cross-origin, aguarda postMessage
        }
      }, 500)
    }
  }
}
</script>

<style scoped>
.isolated-frame {
  width: 100%;
  min-height: 120px;
  height: auto;
  border: none;
  display: block;
  background: transparent;
  overflow: hidden;
}
</style>
