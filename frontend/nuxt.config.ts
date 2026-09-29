import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  srcDir: '.',

  ssr: true,

  devtools: { enabled: false },

  // 3000 é a porta padrão do Nuxt E a do backend (ver backend/src/index.ts) —
  // `npm run dev` na raiz sobe os dois ao mesmo tempo, então um dos dois
  // precisa de porta fixa diferente.
  devServer: { port: 3001 },

  // Garante que useRequestEvent() funcione dentro de interceptors do axios
  // (chamados fora do corpo síncrono de setup()/plugin), necessário pro
  // encaminhamento manual de cookie em services/api.ts.
  experimental: { asyncContext: true },

  modules: ['@nuxt/eslint'],

  // Migração JS→TS gradual: tipagem permissiva (sem strict) — tipa o que
  // for óbvio (props, retorno de composable, resposta de API), usa `any`
  // onde não compensa o esforço. Endurecer depois, arquivo por arquivo.
  typescript: {
    strict: false,
    typeCheck: false,
  },

  css: ['~/assets/css/variables.css', '~/assets/css/style.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'pt-br' },
      title: 'Pulso Urbano: Observatório Nacional de Segurança Pública e Justiça',
      link: [
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com' },
        { rel: 'preconnect', href: 'https://api.iconify.design', crossorigin: 'anonymous' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,800;9..144,900&family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap',
        },
      ],
    },
  },

  runtimeConfig: {
    public: {
      apiUrl: '',
      emailjsServiceId: '',
      emailjsTemplateId: '',
      emailjsPublicKey: '',
      pitchVideoUrl: '',
    },
  },

  nitro: {
    preset: 'vercel',
    // Libs client-only (usadas só depois de montar no navegador, pelo Editor
    // Alpha e pelos leitores de anexo — ver studio/renderer). O bundler do
    // Nitro tenta processar o CJS real delas mesmo sem precisar rodá-las no
    // servidor, e o do papaparse (que embute código de worker como string)
    // quebra o parser do rollup. Como nenhuma roda no servidor de verdade,
    // apontamos pra um módulo vazio só no bundle do servidor — o navegador
    // continua recebendo o pacote real (isto não afeta o build do Vite).
    // Caminho absoluto de propósito: dentro de `nitro.alias`, `~` resolve
    // relativo a `server/` (raiz própria do Nitro), não à raiz do projeto.
    alias: (() => {
      const stub = fileURLToPath(new URL('./build-stubs/empty-client-lib.mjs', import.meta.url))
      return {
        papaparse: stub, xlsx: stub, 'sql.js': stub, mammoth: stub, 'monaco-editor': stub,
        // echarts/echarts-gl (gráficos do Editor Alpha) são a mesma história:
        // só rodam depois de montar no navegador (ver components/ChartViewer.vue).
        echarts: stub, 'echarts-gl': stub,
      }
    })(),
  },

  routeRules: {
    '/admin': { redirect: '/admin/dashboard' },
    // Áreas autenticadas: renderizadas só no cliente (ver middleware/auth.ts —
    // o SSR não tem acesso ao cookie de sessão do backend).
    '/admin/**': { ssr: false },
    '/conta': { ssr: false },
  },

  vite: {
    server: {
      proxy: {
        '/api': { target: 'http://localhost:3000', changeOrigin: true },
        '/admin-auth': { target: 'http://localhost:3000', changeOrigin: true },
      },
    },
    // Libs pesadas/CJS usadas só client-side (parsing de arquivo, editor).
    // O bundler tenta empacotar até imports dinâmicos pro chunk graph do
    // servidor; papaparse/xlsx/sql.js/mammoth/monaco não são ESM-válidos e
    // quebram o build SSR se não forem marcadas como externas.
    ssr: {
      external: ['papaparse', 'xlsx', 'sql.js', 'mammoth', 'monaco-editor'],
    },
  },
})
