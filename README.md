# 📊 Pulso Urbano — Observatório de Segurança Pública

**Pulso Urbano** é uma plataforma de dados e análises sobre segurança pública, criminalidade e vitimização no Brasil, desenvolvida em parceria com o [CRISP/UFMG](https://www.crisp.ufmg.br) e financiada pela **FAPEMIG** (Edital 001/2023 — Demanda Universal, processo APQ-02456-23).

O acervo reúne análises curadas (panoramas nacionais e estaduais, indicadores do Anuário FBSP, Atlas da Violência, pesquisas de vitimização do CRISP, etc.), cada uma com dados em destaque, conteúdo aprofundado, referências e anexos para download.

---

## 🚀 Links

| Ambiente | URL |
|---|---|
| Frontend | https://pulsourbano.vercel.app |
| Backend (API) | https://pulso-urbano-backend.vercel.app |
| Repositório | https://github.com/vitimizacaocrisp/Pulso-Urbano |

---

## 🧱 Stack

Monorepo com duas aplicações (`frontend/` e `backend/`), cada uma um **projeto Vercel separado** (domínios diferentes — sempre cross-origin, mesmo em produção).

### Frontend
* **Nuxt 4** + **TypeScript** (SSR; `/admin/**` e `/conta` são `ssr: false` — o cookie httpOnly de auth é do domínio do *backend*, então o servidor do Nuxt nunca o vê).
* **Vue 3** (`<script setup lang="ts">`).
* **Axios** — cliente único em `services/api.ts` (`baseURL` via runtimeConfig, `withCredentials`, interceptors; sob SSR o cookie é encaminhado manualmente, ver comentários no arquivo).
* **Chart.js**, **Iconify** (`mdi`), **EmailJS** (formulário de contato), **Monaco Editor** (editor de código/markdown).
* **CSS puro** com variáveis e 3 temas (claro / escuro puro / conforto sépia), tema persistido em cookie (SSR-safe).
* **studio/** — motor do "Editor Alpha" (`/admin/editor-alpha`), um editor visual client-only que gera páginas em `/p/:slug`.
* **Hospedagem:** Vercel, projeto `pulsourbano` (Root Directory `frontend/`).

### Backend
* **Express 5** + **TypeScript** (compilado só pelo `tsc --noEmit`/typecheck — o runtime roda `.ts` direto via `tsx`; a Vercel transpila na hora do deploy).
* **PostgreSQL**: em produção, **Neon** — rotas legadas via `@neondatabase/serverless` (driver HTTP), rotas v2 via `pg.Pool` (TCP, suporta transação). **Localmente**, os dois caem para o Postgres do Docker (ver "Rodando localmente") — nunca em produção (`src/db/localDb.ts` só ativa com host `localhost`).
* **JWT** (`jsonwebtoken`) + **bcryptjs**; sessão única por conta, token em **cookie httpOnly**. 2FA (TOTP) para admins.
* **Zod** — validação de payloads e sanitização de query params.
* **AWS SDK v3 (S3)** apontando para o **Cloudflare R2**. Uploads vão **direto do navegador para o R2** via URLs pré-assinadas.
* **Upstash Redis** — rate limiting e cache distribuído, com *fallback* automático para memória.
* **Hospedagem:** Vercel, projeto `pulso-urbano-backend` (Root Directory `backend/`). Sem rewrite para um arquivo de entrada — a Vercel detecta o Express sozinha a partir de `export default app` em `src/index.ts`.

### Infraestrutura
| Serviço | Uso |
|---|---|
| **Neon** | Banco PostgreSQL (produção) |
| **Cloudflare R2** | Armazenamento de arquivos (imagens, PDFs, dados, scripts) |
| **Upstash Redis** | Rate limit + cache (opcional; degrada para memória) |
| **Vercel** | Hospedagem do frontend e da API (dois projetos separados) |

> **Nota:** o storage migrou do **Backblaze B2** para o **Cloudflare R2**. Não há mais nenhuma dependência do B2 no código — apenas as variáveis `STORAGE_*` (ver abaixo) são usadas.

---

## ⚙️ Como funciona (detalhes técnicos)

### Autenticação (cookie httpOnly, cross-origin)
Frontend e API são domínios **diferentes** na Vercel — a auth usa um **cookie httpOnly** com `sameSite=none; secure` em produção (imune a exfiltração por XSS, já que o JavaScript não consegue lê-lo). Fluxo (auth v2, `backend/src/routes/v2/auth.ts`):

1. `POST /api/auth/login` (usuário) ou `POST /api/admin/auth/login` (admin) valida credenciais e checa sessão única (`sid`).
2. O backend responde com `Set-Cookie: authToken=<JWT>` (`httpOnly`, `secure` em produção, `maxAge` conforme "lembrar-me"). Admin com 2FA ativo recebe um desafio em vez de logar direto — segundo passo em `POST /api/admin/auth/2fa`.
3. O cliente axios (`frontend/services/api.ts`) usa `withCredentials: true`; sob SSR o cookie é encaminhado manualmente (ver comentários no arquivo).
4. O middleware `authenticate`/`requireAdmin` (`backend/src/middleware/authV2.ts`) revalida sessão a cada request (cache → Postgres), fail-closed.
5. `POST /api/me/logout` (ou `/api/admin/auth/logout`) limpa o cookie e a sessão.

> **Convenção de status:** sem credencial → **401** `sem_token`; sessão inválida/expirada/trocada em outro dispositivo → **401** com o `code` correspondente; sem permissão pro recurso → **403** (ver `backend/test/*.test.ts`).

> Contas de admin **só** são criadas por outro admin (ou direto no banco); não há cadastro público de admin. Contas de usuário se cadastram em `/cadastro` e confirmam o e-mail.

### Busca (full-text + fallback)
`/api/admin/search` usa **PostgreSQL Full-Text Search** (`tsvector` + índice GIN + `unaccent`/`websearch_to_tsquery`) quando a migração de FTS foi aplicada, com **detecção de capacidade** (`isFtsAvailable()`). Se a coluna/índice não existir, cai para `ILIKE` por substring — a busca nunca quebra. A busca do header filtra em tempo real no cliente; a página `/pesquisa` usa *debounce* de 400 ms.

### Cache e rate limiting
`backend/src/cache/serverCache.ts` abstrai um cache que usa **Upstash Redis** se as variáveis estiverem presentes, ou **memória** caso contrário. Mutações de análise invalidam as chaves públicas e de admin. O rate limiter protege o login contra força bruta (também com fallback para memória).

### Storage (Cloudflare R2)
`backend/src/services/storage.ts` valida as variáveis `STORAGE_*` no boot (*fail-fast*), gera **URLs pré-assinadas** para upload e converte URLs públicas em *keys* para deleção. Há uma *allowlist* de tipos de arquivo.

### Capas das análises (geração automática)
`frontend/utils/coverUtils.ts` + `components/AnalysisCover.vue` resolvem a capa de cada análise em 3 níveis:
1. `cover_image_path` real (upload/og:image) → `<img>`.
2. Sem imagem, mas categoria/tags casam com um tema → **SVG temático gerado** (gradiente + ícone + título), determinístico e sem rede.
3. Nada casa → **foto de API externa** (loremflickr) com indicativo da análise; se a foto falhar, cai para o SVG.

### Experiência de carregamento
* **Splash** em tela cheia só na **primeira** navegação (verificação inicial). Navegações seguintes usam uma **barra de progresso** fina no topo (`TopProgressBar.vue`), sem esconder o conteúdo.
* **Aviso de cookies** (`CookieConsent.vue`) no rodapé, exibido uma única vez (`localStorage.cookie-consent`).

### Cold start / keep-alive
A API tem um endpoint leve `GET /health` (não toca DB/R2), pensado para ping externo (ex.: cron job ou uptime monitor) mitigar hibernação em planos gratuitos. Não há workflow de keep-alive no repo hoje.

### Renderização de conteúdo
O conteúdo HTML de cada análise é renderizado num **iframe isolado** (`IsolatedRenderer.vue`, `sandbox`) que se ajusta à altura via `postMessage` e herda a cor do tema ativo. Links internos recebem destaque (sublinhado + cor da marca).

---

## 📁 Estrutura

```
Pulso-Urbano/
├── frontend/                  # projeto Vercel "pulsourbano" — Nuxt 4 + TS
│   ├── pages/                 # rotas por arquivo (index, catalogo, admin/, postagem/[id], p/[slug]…)
│   ├── components/            # Header, Footer, AnalysisCover, IsolatedRenderer…
│   ├── layouts/                # default.vue, admin.vue
│   ├── middleware/             # auth.ts, guest.ts (pulam no SSR — ver seção de Autenticação)
│   ├── composables/            # useAuth, useTheme, useToast, useAnalysisDraft…
│   ├── services/api.ts         # cliente axios único (baseURL via runtimeConfig)
│   ├── studio/                  # motor do Editor Alpha (client-only)
│   ├── utils/                   # coverUtils, apiCache, analysisUtils
│   ├── assets/css/              # variables.css (3 temas) + style.css
│   └── nuxt.config.ts           # runtimeConfig, routeRules (ssr:false em /admin,/conta), preset vercel
├── backend/                    # projeto Vercel "pulso-urbano-backend" — Express 5 + TS
│   ├── src/
│   │   ├── index.ts             # export default app — entrada que a Vercel detecta sozinha
│   │   ├── routes/              # publicRoutes, adminRoutes, v2/ (auth, conta, postagens, studio…)
│   │   ├── middleware/          # authV2, rateLimiter, asyncHandler
│   │   ├── services/storage.ts  # Cloudflare R2 (S3 SDK v3)
│   │   ├── cache/                # cache Redis/memória
│   │   └── db/                   # dbConnect (Neon legado), pool (v2), localDb (só dev/Docker)
│   ├── test/                     # node:test — roda com tsx
│   └── scripts/setup_local_db.ts # aplica schema+migrações no Postgres local (Docker)
├── database/                    # schema.sql + migrations (v2, FTS, is_crisp, studio, content_types)
└── .github/workflows/            # ci.yml (typecheck+lint+test+build)
```

---

## 🛠️ Rodando localmente

**Pré-requisitos:** Node.js 24.x, npm, Docker (banco local — ver abaixo).

### 1. Banco de dados (Docker, só local)
Produção usa Neon; localmente (inclusive se a rede bloquear o Neon) o backend fala com um Postgres descartável no Docker:
```bash
cd backend
npm run db:local:up      # sobe o container (porta 5433)
npm run db:local:setup   # aplica schema.sql + todas as migrations
```

### 2. Backend
```bash
cd backend
npm install
# crie backend/.env (ver variáveis abaixo) — TEST_DATABASE_URL já habilitada aponta pro Docker
npm run dev           # http://localhost:3000 (tsx watch)
```

### 3. Frontend
```bash
cd frontend
npm install
# deixe NUXT_PUBLIC_API_URL VAZIO em dev (o proxy do Nuxt encaminha p/ localhost:3000)
npm run dev           # http://localhost:3001 (porta fixa — ver nuxt.config.ts)
```

Ou, na raiz, `npm run dev` sobe os dois de uma vez (Windows).

### Variáveis de ambiente

**backend/.env** (ver `backend/.env.example`)
```bash
# Produção: NEON_DATABASE_URL (ou DATABASE_URL, legado). Local: TEST_DATABASE_URL,
# só se apontar pra localhost — nunca usada em produção (ver src/db/localDb.ts).
NEON_DATABASE_URL="<conexão PostgreSQL da Neon>"
TEST_DATABASE_URL="postgresql://pulso:pulso_dev@localhost:5433/pulso_urbano"
JWT_SECRET="<chave forte para assinar o JWT>"
# Cloudflare R2 (S3-compatível)
STORAGE_ENDPOINT="<https://<account>.r2.cloudflarestorage.com>"
STORAGE_BUCKET_NAME="<nome do bucket>"
STORAGE_ASSESS_KEY_ID="<access key id do R2>"
STORAGE_SECRET_ACCESS_KEY="<secret access key do R2>"
STORAGE_PUBLIC_URL="<https://pub-xxxx.r2.dev>"
# CORS em produção — URL do frontend (pulsourbano.vercel.app) e previews do time
ALLOWED_ORIGIN="<https://pulsourbano.vercel.app>"
ALLOWED_ORIGIN_LOCALHOST="http://localhost:3001"
# Opcionais (degradam para memória se ausentes)
UPSTASH_REDIS_REST_URL="<...>"
UPSTASH_REDIS_REST_TOKEN="<...>"
```

**frontend/.env.local** (dev) — em produção, defina no painel da Vercel (projeto `pulsourbano`):
```bash
NUXT_PUBLIC_API_URL=                       # vazio em dev (usa o proxy do Nuxt); em prod, URL da API
NUXT_PUBLIC_EMAILJS_SERVICE_ID="<...>"
NUXT_PUBLIC_EMAILJS_TEMPLATE_ID="<...>"
NUXT_PUBLIC_EMAILJS_PUBLIC_KEY="<...>"
NUXT_PUBLIC_PITCH_VIDEO_URL=                # opcional — vídeo institucional na página Sobre
```

### Deploy (produção)
Dois projetos Vercel independentes (cross-origin), Root Directory `frontend/` e `backend/` respectivamente — sem `vercel.json` na raiz do repo.

| Projeto Vercel | Variável | Valor |
|---|---|---|
| `pulsourbano` (frontend) | `NUXT_PUBLIC_API_URL` | URL da API (`pulso-urbano-backend`) |
| `pulso-urbano-backend` (backend) | `ALLOWED_ORIGIN` | URL do frontend (`pulsourbano`) |

---

## 🗄️ Banco de dados
* `database/schema.sql` — tabela legada `analyses` (o schema v2 vive em `2026_v2_schema.sql`; convivem durante a migração).
* `database/migrations/` — v2 (postagens/usuários/sessão única), full-text search, `is_crisp`, tipos de conteúdo, documentos do Editor Alpha.
* `backend/scripts/setup_local_db.ts` aplica tudo isso de uma vez no Postgres local — recusa qualquer host que não seja `localhost`.

---

## 📬 Contato
vitimizacaocrisp1@gmail.com
