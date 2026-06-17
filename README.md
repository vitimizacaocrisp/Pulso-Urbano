# 📊 Pulso Urbano — Observatório de Segurança Pública

**Pulso Urbano** é uma plataforma de dados e análises sobre segurança pública, criminalidade e vitimização no Brasil, desenvolvida em parceria com o [CRISP/UFMG](https://www.crisp.ufmg.br) e financiada pela **FAPEMIG** (Edital 001/2023 — Demanda Universal, processo APQ-02456-23).

O acervo reúne análises curadas (panoramas nacionais e estaduais, indicadores do Anuário FBSP, Atlas da Violência, pesquisas de vitimização do CRISP, etc.), cada uma com dados em destaque, conteúdo aprofundado, referências e anexos para download.

---

## 🚀 Links

| Ambiente | URL |
|---|---|
| Frontend | https://pulso-urbano.netlify.app |
| Backend (API) | Hospedado na Vercel (definir em `VITE_API_URL`) |
| Repositório | https://github.com/vitimizacaocrisp/Pulso-Urbano |

---

## 🧱 Stack

Monorepo com duas aplicações (`frontend/` e `backend/`).

### Frontend
* **Vue 3** (Composition API `<script setup>` + Options API) com **Vite** (migrado do Vue CLI).
* **Vue Router 4** — SPA com guarda de rota global.
* **Axios** com interceptor que injeta o JWT no header `Authorization`.
* **Chart.js** — gráficos do dashboard e dentro das análises.
* **Iconify** (`@iconify/vue`, conjunto `mdi`) — ícones (substituiu o FontAwesome).
* **EmailJS** (`@emailjs/browser`) — formulário de contato (sem backend de e-mail).
* **CSS puro** com variáveis e 3 temas (claro / escuro puro / conforto sépia). Sem Less/Sass.
* **Hospedagem:** Netlify.

### Backend
* **Express 5** (Node.js ≥ 20).
* **PostgreSQL** na **Neon** via `@neondatabase/serverless` (driver HTTP, ideal para serverless).
* **JWT** (`jsonwebtoken`) + **bcryptjs**; auth stateless via header `Authorization`.
* **AWS SDK v3 (S3)** apontando para o **Cloudflare R2** (storage S3-compatível) com URLs pré-assinadas.
* **Upstash Redis** — rate limiting e cache distribuído, com *fallback* automático para memória.
* **Multer** — recebe uploads em memória antes de enviar ao R2.
* **Hospedagem:** Vercel (serverless functions).

### Infraestrutura
| Serviço | Uso |
|---|---|
| **Neon** | Banco PostgreSQL |
| **Cloudflare R2** | Armazenamento de arquivos (imagens, PDFs, dados, scripts) |
| **Upstash Redis** | Rate limit + cache (opcional; degrada para memória) |
| **Netlify** | Build e hospedagem do frontend |
| **Vercel** | Hospedagem da API |

> **Nota:** o storage migrou do **Backblaze B2** para o **Cloudflare R2**. Não há mais nenhuma dependência do B2 no código — apenas as variáveis `STORAGE_*` (ver abaixo) são usadas.

---

## ⚙️ Como funciona (detalhes técnicos)

### Autenticação (stateless, cross-domain)
Frontend (Netlify) e backend (Vercel) ficam em domínios distintos, então a auth **não usa cookie** (cookie cross-site é bloqueado por vários navegadores). Fluxo:

1. `POST /admin-auth` valida e-mail/senha (bcrypt) contra a tabela `admins` e devolve um **JWT no corpo**.
2. O frontend guarda o token em `localStorage`.
3. Um **interceptor do Axios** (`frontend/src/main.js`) injeta `Authorization: Bearer <token>` em toda requisição.
4. O middleware `verifyToken` (backend) valida o header nas rotas protegidas.
5. "Lembrar-me" controla apenas a validade do JWT (12h vs 168h). Logout = descartar o token local.

> Contas de administrador **só** são criadas direto no banco (ver `database/schema.sql`) — não há rota pública de cadastro.

### Busca (full-text + fallback)
`/api/admin/search` usa **PostgreSQL Full-Text Search** (`tsvector` + índice GIN + `unaccent`/`websearch_to_tsquery`) quando a migração de FTS foi aplicada, com **detecção de capacidade** (`isFtsAvailable()`). Se a coluna/índice não existir, cai para `ILIKE` por substring — a busca nunca quebra. A busca do header filtra em tempo real no cliente; a página `/pesquisa` usa *debounce* de 400 ms.

### Cache e rate limiting
`backend/src/cache/serverCache.js` abstrai um cache que usa **Upstash Redis** se as variáveis estiverem presentes, ou **memória** caso contrário. Mutações de análise invalidam as chaves públicas e de admin. O rate limiter protege o login contra força bruta (também com fallback para memória).

### Storage (Cloudflare R2)
`backend/src/services/storage.js` valida as variáveis `STORAGE_*` no boot (*fail-fast*), gera **URLs pré-assinadas** para upload e converte URLs públicas em *keys* para deleção. Há uma *allowlist* de tipos de arquivo.

### Capas das análises (geração automática)
`frontend/src/utils/coverUtils.js` + `components/AnalysisCover.vue` resolvem a capa de cada análise em 3 níveis:
1. `cover_image_path` real (upload/og:image) → `<img>`.
2. Sem imagem, mas categoria/tags casam com um tema → **SVG temático gerado** (gradiente + ícone + título), determinístico e sem rede.
3. Nada casa → **foto de API externa** (loremflickr) com indicativo da análise; se a foto falhar, cai para o SVG.

### Experiência de carregamento
* **Splash** em tela cheia só na **primeira** navegação (verificação inicial). Navegações seguintes usam uma **barra de progresso** fina no topo (`TopProgressBar.vue`), sem esconder o conteúdo.
* **Aviso de cookies** (`CookieConsent.vue`) no rodapé, exibido uma única vez (`localStorage.cookie-consent`).

### Cold start / keep-alive
A API tem um endpoint leve `GET /health` (não toca DB/R2). O workflow `.github/workflows/keep-alive.yml` o pinga a cada ~10 min (defina a variável `BACKEND_URL` no GitHub) para mitigar hibernação em planos gratuitos.

### Renderização de conteúdo
O conteúdo HTML de cada análise é renderizado num **iframe isolado** (`IsolatedRenderer.vue`, `sandbox`) que se ajusta à altura via `postMessage` e herda a cor do tema ativo. Links internos recebem destaque (sublinhado + cor da marca).

---

## 📁 Estrutura

```
Pulso-Urbano/
├── frontend/
│   ├── src/
│   │   ├── components/        # Header, Footer, AnalysisCover, IsolatedRenderer, cookie/progresso…
│   │   ├── views/             # Home, Catálogo, Pesquisa, Contato, Sobre, postagens/, admin/
│   │   ├── router/            # rotas + guarda de auth (token no localStorage)
│   │   ├── composables/       # useTheme, useToast
│   │   ├── utils/             # coverUtils, apiCache, analysisUtils
│   │   └── assets/css/        # variables.css (3 temas) + style.css
│   ├── public/_redirects      # fallback SPA do Netlify
│   └── vite.config.js         # proxy dev /api e /admin-auth → localhost:3000
├── backend/
│   ├── index.js               # Express, CORS, rotas
│   ├── src/
│   │   ├── routes/            # publicRoutes, adminRoutes
│   │   ├── middleware/        # verifyToken, rateLimiter, asyncHandler
│   │   ├── services/storage.js# Cloudflare R2 (S3 SDK v3)
│   │   ├── cache/             # cache Redis/memória
│   │   └── db/                # conexão Neon
├── database/                  # schema.sql + migrations (FTS)
└── .github/workflows/         # keep-alive
```

---

## 🛠️ Rodando localmente

**Pré-requisitos:** Node.js ≥ 20, npm.

### 1. Backend
```bash
cd backend
npm install
# crie backend/.env (ver variáveis abaixo)
npm start            # http://localhost:3000
```

### 2. Frontend
```bash
cd frontend
npm install
# deixe VITE_API_URL VAZIO em dev (o proxy do Vite encaminha p/ localhost:3000)
npm run dev          # http://localhost:5173
```

### Variáveis de ambiente

**backend/.env**
```bash
DATABASE_URL="<conexão PostgreSQL da Neon>"
JWT_SECRET="<chave forte para assinar o JWT>"
# Cloudflare R2 (S3-compatível)
STORAGE_ENDPOINT="<https://<account>.r2.cloudflarestorage.com>"
STORAGE_BUCKET_NAME="<nome do bucket>"
STORAGE_ASSESS_KEY_ID="<access key id do R2>"
STORAGE_SECRET_ACCESS_KEY="<secret access key do R2>"
STORAGE_PUBLIC_URL="<https://pub-xxxx.r2.dev>"
# CORS em produção
ALLOWED_ORIGIN="<https://seu-site.netlify.app>"
ALLOWED_ORIGIN_LOCALHOST="http://localhost:5173"
# Opcionais (degradam para memória se ausentes)
UPSTASH_REDIS_REST_URL="<...>"
UPSTASH_REDIS_REST_TOKEN="<...>"
```

**frontend/.env.local** (dev) — em produção, defina no painel do Netlify:
```bash
VITE_API_URL=                         # vazio em dev (usa o proxy do Vite)
VITE_EMAILJS_SERVICE_ID="<...>"
VITE_EMAILJS_TEMPLATE_ID="<...>"
VITE_EMAILJS_PUBLIC_KEY="<...>"
```

### Deploy (produção)
| Onde | Variável | Valor |
|---|---|---|
| Netlify | `VITE_API_URL` | URL da API na Vercel |
| Vercel | `ALLOWED_ORIGIN` | URL do site no Netlify |
| GitHub (Actions) | `BACKEND_URL` | URL da API (keep-alive) |

---

## 🗄️ Banco de dados
* `database/schema.sql` — tabelas `analyses` e `admins` (admin criado só via SQL).
* `database/migrations/2026_full_text_search.sql` — `unaccent`, coluna `search_vector` gerada e índice GIN para a busca.

---

## 📬 Contato
vitimizacaocrisp1@gmail.com
