<template>
  <iframe
    ref="frame"
    class="isolated-frame"
    sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
    :srcdoc="compiledHtml"
    @load="onIframeLoad"
  ></iframe>
</template>

<script>
export default {
  name: "IsolatedRenderer",

  props: {
    content: {
      type: String,
      required: true
    }
  },

  data() {
    return {
      lastHeight: 0,
      heightCheckInterval: null
    }
  },

  computed: {
    cleanContent() {
      if (!this.content) return ''
      
      let html = this.content
      
      if (html.includes('&lt;') || html.includes('&gt;') || html.includes('&amp;')) {
        const textarea = document.createElement('textarea')
        textarea.innerHTML = html
        html = textarea.value
      }
      
      return html.trim()
    },

    iframeId() {
      return 'iframe-' + Math.random().toString(36).substr(2, 9)
    },

    compiledHtml() {
      const content = this.cleanContent
      
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
  min-height: 100vh;
  overflow: visible;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333;
}
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
    const html = document.documentElement;
    const body = document.body;
    return Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
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
    
    // Fallback de segurança
    this.heightCheckInterval = setInterval(() => {
      const iframe = this.$refs.frame
      if (iframe) {
        const currentHeight = parseInt(iframe.style.height) || 0
        if (currentHeight > 8000) {
          iframe.style.height = '8000px'
          clearInterval(this.heightCheckInterval)
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
    handleMessage(event) {
      if (!event.data || event.data.type !== 'iframe-height') return
      
      const iframe = this.$refs.frame
      if (!iframe || !event.data.height) return
      
      const newHeight = parseInt(event.data.height)
      if (newHeight <= 0 || newHeight > 8000) return
      
      const currentHeight = parseInt(iframe.style.height) || 0
      
      if (Math.abs(newHeight - currentHeight) > 10) {
        iframe.style.height = (newHeight + 30) + 'px'
      }
    },
    
    onIframeLoad() {
      // Força altura inicial após carregar
      setTimeout(() => {
        const iframe = this.$refs.frame
        if (!iframe) return
        
        try {
          // Tenta acessar documento interno
          const doc = iframe.contentWindow.document
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
  min-height: 300px;
  height: auto;
  border: none;
  display: block;
  background: white;
  overflow: hidden;
}
</style>