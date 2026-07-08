# Pulso Urbano v2 — Trabalho PENDENTE (handoff)

> Documento único e autossuficiente do que **falta** fazer na reformulação v2.
> Substitui os antigos `docs/planejamento/*` (o que já foi feito virou código —
> ver "Estado atual"). Escrito para outra IA/dev continuar sem contexto prévio.
>
> **Última atualização:** 2026-07-05.

---

## 0. Regras invioláveis (segurança do processo)

1. **NENHUM deploy** (Vercel/Neon/R2 de produção) sem permissão explícita do dono. Tudo é validado no ambiente Docker de teste.
2. **Produção é somente-leitura.** Banco de produção (Neon) só pode ser LIDO (ex.: backfill). Nunca escrever nele até o cutover autorizado.
3. **Alvo de desenvolvimento = Docker** (`database/docker-compose.yml`, Postgres 16 em `:5433`). O `pool.js` tem *phase guard*: v2 só conecta em produção com `V2_USE_PROD=1`.
4. **Commits:** o dono executa o `git push`. A IA fornece a mensagem de commit ao fim de cada etapa (padrão `/caveman-commit`, Conventional Commits).
5. Ao terminar uma etapa: rodar lint + build (frontend) e a suíte (`npm test` no backend) e reportar resultado.

---

## 1. Como subir o ambiente de dev

```bash
# 1) Banco de teste (Docker)
docker compose -f database/docker-compose.yml up -d      # Postgres 16 em :5433
#    user=pulso  senha=pulso_dev  db=pulso_urbano
#    schema + dados já persistidos no volume pulso_pgdata.
#    Para recriar do zero: docker compose ... down -v && up -d,
#    depois aplicar database/migrations/2026_v2_schema.sql e rodar
#    node backend/scripts/seed_and_backfill.js  (lê Neon read-only, escreve Docker).

# 2) Backend (porta 3000)  — precisa de backend/.env
cd backend && node index.js          # health: GET http://localhost:3000/health

# 3) Frontend (Vite, porta 5173/5180) — proxy /api → :3000
cd frontend && npm run dev
```

### Credenciais de teste (no Docker)
| Conta | E-mail | Senha | Papel |
|---|---|---|---|
| Superadmin | `super@teste.local` | `senha123` | admin/superadmin |
| Editor | `editor@teste.local` | `senha123` | admin/editor |
| Usuário 1 | `user1@teste.local` | `senha123` | user (verificado) |
| Usuário 2 | `user2@teste.local` | `senha123` | user |

### Env vars relevantes (backend/.env)
`DATABASE_URL` (Neon, read-only) · `TEST_DATABASE_URL` (Docker) · `JWT_SECRET` ·
`UPSTASH_REDIS_REST_URL`/`_TOKEN` (cache+sessão; sem eles cai p/ memória) ·
`RESEND_API_KEY`/`EMAIL_FROM`/`APP_URL` (sem RESEND vira no-op logado) ·
`STORAGE_BUCKET_NAME`/`STORAGE_PUBLIC_URL` (R2).

---

## 2. Estado atual — o que JÁ existe (não refazer)

### Banco (Docker, 26 tabelas)
- `database/migrations/2026_v2_schema.sql` — **fonte de verdade do schema**. Class-Table Inheritance: `postagens` (base, coluna `tipo`) + `pt_analises|pt_academicos|pt_dados|pt_podcasts|pt_livros|pt_videos` (1:1). Trigger de invariante tipo↔subtipo. FTS `search_vector` + `f_unaccent`. Taxonomia N:M (`categorias`, `tags`, `autores`, `fontes`, `ufs`, `municipios` + junções `postagem_*`). `anexos` (mídia unificada: `origem` r2|externo, `chave_r2`, `url_r2`, `tipo`, `owner_tipo`/`owner_id` p/ avatar, `postagem_id` p/ postagem). `users`/`admins` (`session_id`, `senha_hash`, `role`, `is_active`, `deleted_at`, `email_verificado`, `email_pendente`, `avatar_anexo_id`). `auth_tokens` (sha256, single-use, TTL). `audit_log`. `postagens.legado_id` (mapeia `analyses.id` de produção).
- `backend/scripts/seed_and_backfill.js` (idempotente por `legado_id`) e `verify_parity.js`.

### Backend (Node/Express) — v2 em `backend/src`
- `db/pool.js` — `pg.Pool` + `q`, `withTx`, phase guard.
- `middleware/authV2.js` — `authenticate` (fail-closed), **`optionalAuth`** (anônimo ok), `requireAuth`, `requireAdmin`, `requireSuperadmin`, `loadSession`. JWT `{id,tipo,sid,ver:2}` em cookie httpOnly `authToken`; sessão única (revalida `sid`+`is_active`+`role`); códigos: `sem_token`, `token_invalido`, `sessao_encerrada`, `conta_desativada`, `role_insuficiente`.
- `services/`: `sessionCache` (fail-closed, Redis→Postgres), `authTokens`, `email` (Resend, no-op sem key), `accounts` (bcrypt 12, `validarSenha` min 10, `rotacionarSessao`, cookies), `audit`, `sanitize` (`sanitizeConteudo` allowlist, `validaEmbedUrl`, `validaHttpsUrl`), `storage` (R2/S3: `generatePresignedUrls`, `deleteFileFromS3`).
- `repositories/postagensRepo.js` — `criarRascunho`, `patchPostagem`, `publicar` (slug único server-side), `arquivar`, `softDelete`, `registrarView`, `listar`, `detalhe`. Colunas sempre de allowlist (`COMUNS_COLS`, `PT_COLS`). `VISIVEL = status='publicado' AND deleted_at IS NULL`.
- `validators/postagemSchemas.js` — **fonte de verdade dos campos por tipo** (Zod). `TIPOS`, `criarSchema`, `validaPatch(tipo,body)`, `validaPublicacao(post)`.
- `routes/v2/`:
  - `auth.js` — `userAuth` (`/api/auth/*`: login, logout, esqueci-senha, redefinir-senha, register, verificar, confirmar-email) e `adminAuth` (`/api/admin/auth/*`).
  - `conta.js` — `/api/me` (GET/PUT nome/senha/email, logout-all, DELETE).
  - `equipe.js` — `/api/admin/{admins,usuarios,audit}` (requireAdmin lista, requireSuperadmin muta).
  - `postagensPublic.js` — lista, taxonomia, resolver de `legado_id`, beacon de view, **detalhe com gate prévia/completo** (optionalAuth) e **download de anexo** (`GET /api/postagens/:slug/anexos/:anexoId/url`, requireAuth).
  - `postagensAdmin.js` — wizard CRUD (POST rascunho, PATCH autosave, PUT publicar/arquivar, DELETE, listagem/detalhe admin, DELETE anexo por posse). ⚠️ **ainda em `verifyToken` legado** (ver Pendência P4).

### Frontend (Vue 3) — `frontend/src`
- `services/api.js` — axios central, interceptor de erro v2 (`onAuthError`, `errorCode`, `errorMessage`).
- `composables/useAuth.js` — estado reativo (`me`, `isLogado`, `isAdmin`, `isSuperadmin`) + `login/logout/fetchMe/register/esqueciSenha/redefinirSenha/verificarEmail/limparSessao`.
- `main.js` — handler de erro por código v2 (kicks por tipo).
- `router/index.js` — guard v2 sobre `/api/me`: `requiresAdmin` (só admin) vs `requiresAuth` (qualquer conta); redireciona ao login certo com `?redirect`.
- Views: `ContaView.vue` (/conta), `admin/EquipeView.vue` (/admin/equipe), `admin/AdminLogin.vue` (/login, admin), `auth/*` (/entrar, /cadastro, /esqueci-senha, /redefinir-senha, /verificar-email) sobre `auth/AuthCard.vue`.
- `components/MeuHeader.vue` — entrada de conta (Entrar / Minha conta).

### Modelo de acesso já decidido e parcialmente implementado
**Observatório aberto:** listagens públicas; **ver postagem completa e baixar arquivos exigem conta de usuário**; `/admin/*` exige admin. Backend já entrega prévia (anônimo) vs completo (logado) e gate de download (P1 no frontend ainda falta).

---

## 3. PENDÊNCIAS

Ordem sugerida: **P1 → P2 → P3** (fluxo de usuário e admin), depois P4/P5 (fundação), P6/P7 (contas), e P8/P9 (deploy/cutover, só com permissão).

---

### P1 — Views públicas consumindo API v2 + prévia ✅ CONCLUÍDO (2026-07-05)
Feito: `utils/postagemV2.js` (adaptadores), grid (`CardAnalisesCatalogo`), `RecentPosts`, `HomeView` (highlight), `PesquisaView`, `BaseSearch` e detalhe (`PostagensDetailView`) consomem v2; `/postagem/:id` público com prévia+CTA+downloads; id legado numérico → 301 client-side. Verificado no browser (anon prévia sem corpo; logado com corpo+download). **Follow-up menor:** filtros avançados da Pesquisa (multi-categoria, fonte, ano) degradados — o endpoint público v2 só suporta q + 1 categoria/tag; estender depois se necessário.

<details><summary>Escopo original (referência)</summary>

**Objetivo:** o site público (hoje ainda em endpoints legados) passa a consumir a API v2 e a respeitar o modelo de acesso aberto com prévia.

**Contexto atual:** `AcervoView.vue`, `HomeView.vue`, `PesquisaView.vue`, `views/postagens/PostagensDetailView.vue` consomem endpoints legados. A rota `/postagem/:id` está com `meta.requiresAuth` (fail-closed temporário) — precisa virar **pública** com prévia.

**Contrato da API v2 a consumir:**
- `GET /api/postagens?tipo&categoria&tag&crisp&uf&q&page&limit` → `{ success, data:{ itens, total, page, pages } }`. Cada item: `id, legado_id, tipo, slug, titulo, subtitulo, resumo, destaque, is_crisp, periodo_estudo, nacionalidade, visualizacoes, publicado_em, categorias[], tags[], autores[], fontes[], ufs[], municipios[], cover{id,url}`.
- `GET /api/postagens/:slug` (optionalAuth) →
  - **anônimo:** `{ ...item, conteudo:null, subtipo (sem transcricao/embed_url), anexos:[{id,tipo,nome,ordem}] (sem url), previa:true }`.
  - **logado:** `{ ...item, conteudo, subtipo completo, anexos:[{...,url}], previa:false }`.
- `GET /api/postagens/id/:legadoId` → `{ data:{ slug } }` (resolver de URL legada `/postagem/{id}` → 301 client-side p/ `/postagem/{slug}`).
- `GET /api/postagens/:slug/anexos/:anexoId/url` (**requireAuth**) → `{ data:{ url, nome } }`. Chamar só quando logado; anônimo recebe 401 `sem_token`.
- `POST /api/postagens/:id/view` — beacon de visualização (sem auth, dedup por `sessionStorage`).
- `GET /api/taxonomia` → `{ data:{ categorias[], tags[], ufs[], tipos[] } }` (menus/filtros).

**Tarefas:**
1. Router: remover `meta.requiresAuth` de `/postagem/:id` (agora pública). Manter `/conta` e `/admin/*` protegidos. Adaptar `/postagem/:id` para aceitar **slug** (`/postagem/:slug`) e resolver id legado via endpoint (301). Mapear `viewKey` (all/analysis/academic/dataset/podcast/crisp) → filtro `tipo`/`crisp` do endpoint v2.
2. `PostagensDetailView.vue`: consumir `GET /api/postagens/:slug`. Se `previa:true` (anônimo): renderizar título/capa/resumo/metadados + **bloco CTA** "Crie uma conta para ler na íntegra e baixar os arquivos" com links `/entrar?redirect=<rota atual>` e `/cadastro`. Ocultar/borrar `conteudo`; listar anexos por nome com botão "Baixar" que, se anônimo, leva ao CTA. Se logado: renderizar `conteudo` completo; botão "Baixar" chama o endpoint de URL de anexo (requireAuth) e dispara o download. Disparar o beacon de view.
3. `AcervoView.vue`/`HomeView.vue`/`PesquisaView.vue`: consumir lista/taxonomia v2. Cards usam o shape acima (usar `cover.url`, `mediaUrl()` já existe em `services/api.js`).
4. Usar `useAuth().isLogado` para alternar UI (CTA vs conteúdo). Chamar `fetchMe()` cedo (o header já faz).

**Aceite:** todos verificados no browser (catálogo anon, prévia/CTA anon, conteúdo+download logado, redirect legado).
</details>

---

### P2 — Wizard de criação de postagem (multi-tipo, por etapas) ✅ CONCLUÍDO (2026-07-05)
Feito: `components/admin/postagem/` — `PostagemWizard.vue` (orquestra: cria rascunho no passo 1, autosave PATCH com debounce, publica), `StepTipo`, `FieldsIdentidade`, `FieldsEspecifico` (campos dos 6 tipos num só componente, switch por tipo), `FieldsTaxonomia`, `FieldsMidia`, `FieldsPublicacao`. Rota `/admin/criar` + link no `AdminLayout`. Estado compartilhado via `provide/inject` (evita mutação de props). Verificado: criar análise → preencher → publicar → post ao vivo. **Pendências ligadas:** upload de capa/anexos é placeholder (depende de **P5**); edição = **P16** (editor morph, ainda pendente); rotas admin de postagem seguem em auth legado (**P4**).

<details><summary>Escopo original (referência)</summary>

**Objetivo:** substituir a criação atual por um wizard: escolhe tipo → preenche por passos. **Rascunho nasce no passo 1** (resolve o chicken-egg do upload de mídia que precisa de `postagem_id`).

**Endpoints (JÁ EXISTEM em `postagensAdmin.js`, ver P4 sobre auth):**
- `POST /api/admin/postagens` `{tipo}` → `{ data:{ id, tipo, status:'rascunho' } }` (cria `postagens`+`pt_*` vazio numa transação).
- `PATCH /api/admin/postagens/:id` — autosave parcial. Body aceita comuns + `subtipo{}` + arrays de taxonomia por NOME. Valida via `validaPatch`.
- `PUT /api/admin/postagens/:id/publicar` → `{ data:{ slug } }` (valida `validaPublicacao`).
- `GET /api/admin/postagens?status=rascunho|publicado|arquivado&...` — listagem admin.
- `GET /api/admin/postagens/:id` — detalhe completo (shape com `conteudo`, `subtipo`, arrays).
- `PUT /api/admin/postagens/:id/arquivar`, `DELETE /api/admin/postagens/:id`.

**Passos do wizard:**
| # | Passo | Conteúdo |
|---|---|---|
| 1 | Tipo | escolhe entre os 6 tipos → **POST cria rascunho** |
| 2 | Identidade | titulo, subtitulo, autores (multi), resumo |
| 3 | Específico | campos do subtipo (tabela abaixo) |
| 4 | Taxonomia | categorias (multi), tags (multi), fontes, UFs (siglas)/municípios |
| 5 | Conteúdo | editor conforme o tipo |
| 6 | Mídia | capa + anexos (upload presigned — depende de P5) |
| 7 | Publicação | destaque, is_crisp, with_header/footer, revisão → **publicar** |

Autosave server-side por passo/debounce (PATCH). Barra de progresso, voltar/avançar livres. Validação por passo (Zod no client, espelhando `postagemSchemas.js`) + validação total no publicar (server).

**Campos por tipo (subtipo)** — autoritativo em `backend/src/validators/postagemSchemas.js`:
| Tipo | Campos (`subtipo`) |
|---|---|
| analise | `metodologia` (HTML até 20k), `indicadores` (JSON livre) |
| academico | `tipo_producao`, `ano`(int), `veiculo`, `doi`, `qualis`(≤4), `issn`, `orientador`, `programa` |
| dado | `instrumento`, `formato`, `tamanho_amostra`(int), `cobertura`, `periodo_coleta`, `licenca`, `metodologia_amostral` |
| podcast | `formato_midia`(audio\|video), `numero_episodio`(int), `temporada`(int), `duracao_seg`(int), `plataforma`, `embed_url`*, `transcricao`, `convidados` |
| livro | `isbn`, `editora`, `ano_pub`(int), `edicao`, `num_paginas`(int), `compra_url`**, `sumario` |
| video | `plataforma`, `embed_url`*, `duracao_seg`(int), `legendas_url`** |

\* `embed_url` restrito a allowlist de domínios por tipo (podcast: spotify/apple/youtube; vídeo: youtube/vimeo) — `validaEmbedUrl`.
\** URLs exigem `https:` — `validaHttpsUrl`.
Comuns (todos): `titulo`(obrig, ≤255), `subtitulo`, `resumo`(≤5000), `conteudo`(HTML, sanitizado no server), `destaque`(bool), `is_crisp`(bool), `periodo_estudo`, `nacionalidade`, `with_header`/`with_footer`(bool). Taxonomia: `categorias[]`, `tags[]`, `autores[]`, `fontes[]`, `ufs[]`(siglas 2 letras), `municipios[]` — enviados por NOME; o repo faz upsert + rebuild das junções.

**Regras de publicar (`validaPublicacao`):** exige `titulo`+`resumo`; `conteudo` obrigatório p/ analise/academico/livro/dado; podcast/video exigem `embed_url` (ou upload de mídia).

**Editor por tipo (passo 5):** analise/academico → editor HTML (Monaco existente); livro/dado → `DocumentEditor` existente; podcast/video → show notes curtas (o "conteúdo" é o player).

**Componentes a criar (frontend):**
```
components/admin/postagem/
├── PostagemWizard.vue        (orquestra criar)
├── StepTipo.vue              (passo 1 → dispara POST rascunho)
├── FieldsIdentidade.vue  FieldsTaxonomia.vue  FieldsMidia.vue  FieldsPublicacao.vue
└── tipos/FieldsAnalise.vue FieldsAcademico.vue FieldsDado.vue FieldsPodcast.vue FieldsLivro.vue FieldsVideo.vue
```
Reaproveitar `useMediaUpload`/`useMonacoMarkdown`. **Aposentar** `useAnalysisDraft` (autosave agora é server-side). Substitui o fluxo em `views/admin/EditAnalysisView.vue`/`ContentManagerView.vue` (rota `/admin/content-manager`).

**Aceite:**
- [ ] Passo 1 cria rascunho; recarregar/trocar de máquina retoma (autosave server-side).
- [ ] Cada um dos 6 tipos: criar → publicar → renderiza público correto.
- [ ] Rascunho invisível nas rotas públicas.
- [ ] HTML malicioso neutralizado ao gravar; `embed_url` fora da allowlist rejeitado.
</details>

---

### P3 — Editor "morph" (edição adapta ao tipo) ✅ CONCLUÍDO (2026-07-05)
Feito: `components/admin/postagem/PostagemEditor.vue` (rota `/admin/editar`, link no `AdminLayout`). Busca → abre → abas (Identidade/Específico/Taxonomia/Conteúdo/Mídia/Config) reusando os `Fields*` do wizard via `provide/inject`; Salvar (PATCH), Publicar, Arquivar, Excluir; upload/remoção de anexos; **tipo imutável**. Verificado (busca+detalhe+PATCH). Editor legado permanece acessível como "Gerenciar (legado)".

<details><summary>Escopo original</summary>

**Objetivo:** em `/admin/edit-analysis`, buscar a postagem → a tela assume o layout do **tipo** dela (mesmas seções do wizard, todas visíveis em abas, pré-preenchidas).

**Tarefas:**
1. `PostagemEditor.vue` reutilizando os mesmos `Fields*` do wizard, mas em abas (não passos).
2. Carregar via `GET /api/admin/postagens/:id`; salvar via `PATCH` (mesmo contrato do wizard); publicar/arquivar/deletar pelos endpoints existentes.
3. **Trocar o tipo de uma postagem existente é bloqueado** (decisão de projeto — criar nova).
4. Deleção de mídia só por `DELETE /api/admin/anexos/:id` (por posse) — nunca por URL.

</details>

---

### P4 — Migrar `postagensAdmin.js` para auth v2 ✅ CONCLUÍDO (2026-07-05)
Feito: todas as rotas admin de postagem usam `requireAdmin`; `req.user` → `req.auth`; `criado_por` já vem do repo (não há `atualizado_por` no schema); mutações (criar/publicar/arquivar/deletar/anexo/presign) gravam em `audit_log`. Verificado: sem cookie → 401; admin cria; `audit_log` recebe eventos.

<details><summary>Escopo original</summary>

**Problema:** as rotas admin de postagem ainda usam `verifyToken` **legado** e `req.user` (TODO no topo do arquivo). Deveriam usar `requireAdmin` (sessão única, role, códigos v2) e registrar em `audit_log`.

**Tarefas:**
1. Trocar `verifyToken` → `requireAdmin` (de `middleware/authV2`).
2. `req.user?.id` → `req.auth.id`. Preencher `postagens.criado_por` (criar) e `atualizado_por` (patch/publicar) — conferir nomes de coluna no schema.
3. Registrar mutações em `audit_log` via `services/audit.log(req, {...})` (criar/publicar/arquivar/deletar/anexo).
4. Ajustar testes se necessário.

</details>

---

### P5 — Upload de mídia v2 (presign + `anexos`) + GC ✅ CONCLUÍDO (2026-07-05)
Feito: `storage.presignPostagemUpload` (layout `postagens/{id}/`) + rota `POST /api/admin/postagens/:id/anexos/presign` (requireAdmin, **rate-limit 60/h por admin**) que cria a linha em `anexos` (origem r2) e devolve a URL assinada; capa seta `cover_anexo_id`. Frontend: `FieldsMidia` envia capa/anexo (presign → PUT no R2). GC: `backend/scripts/gc_orphans.js` (dry-run padrão, `--apply` deleta; só prefixos v2 `postagens/`+`avatares/`, nunca `uploads/*` legado até o cutover). Verificado: upload real (PUT R2 200, anexo criado); GC dry-run roda (16 refs, 0 órfãos).

<details><summary>Escopo original</summary>

**Problema:** `services/storage.generatePresignedUrls` hoje é legado: usa `FOLDER_MAP[category]`, **não** cria linha em `anexos`, e devolve `publicUrl` de bucket **público** (`STORAGE_PUBLIC_URL`).

**Tarefas:**
1. Endpoint admin (v2) de presign para postagem: layout `postagens/{id}/...`, cria a linha em `anexos` (`origem='r2'`, `chave_r2`, `url_r2`, `tipo`, `postagem_id`, `ordem`). Capa vs anexo (`tipo='cover'` seta `postagens.cover_anexo_id`).
2. Limites: ≤20 presigns/request (já) + **≤60/hora por admin** (contador Upstash).
3. GC de órfãos: objetos R2 sem linha em `anexos` e >7 dias → deletar (job manual documentado; automação futura).

</details>

---

### P6 — Avatar do usuário/admin (foto de perfil) ✅ CONCLUÍDO (2026-07-05)
Feito: `storage.presignAvatarUpload` (só imagem, ≤2MB, layout `avatares/{tipo}/{id}/{hash}`); rotas `POST /api/me/avatar/presign`, `PUT /api/me/avatar` (confirma + remove o anterior por posse), `DELETE /api/me/avatar`; `/api/me` expõe `avatar_url`. UI: seção "Foto de perfil" no `ContaView` (preview + enviar + remover). Verificado (presign → PUT R2 200 → confirm → avatar_url; não-imagem rejeitada; remoção limpa objeto+linha).

---

### P7 — Reset de senha de ADMIN (UI) ✅ CONCLUÍDO (2026-07-05)
Feito: `useAuth.esqueciSenha/redefinirSenha` aceitam `tipo` (admin → `/api/admin/auth/*`); `EsqueciSenhaView`/`RedefinirSenhaView` leem `?tipo=admin`; link "Esqueceu a senha?" do `AdminLogin` aponta p/ `/esqueci-senha?tipo=admin`; template de e-mail `reset_senha` embute `&tipo=admin` no link. Verificado e2e (admin temp: redefinir → login nova senha → token single-use).

---

### P8 — Privacidade do R2 (bucket privado) ✅ CONCLUÍDO (2026-07-06)
O dono tornou o bucket **privado** (removeu `STORAGE_PUBLIC_URL`) e restringiu o CORS. Implementado: leituras por **URL pré-assinada de GET** (TTL 5 min). `storage.presignGetByKey`/`deleteByKey`; `anexos.url_r2` passa a guardar a **chave** (não há URL pública). Download gated (`/api/postagens/:slug/anexos/:anexoId/url`) devolve URL assinada; capas/avatares servidos por **proxy** `GET /api/media/:anexoId` (302 → URL assinada, público só p/ cover/avatar; externo/legado redireciona à URL original). Uploads/deleções sempre por `chave_r2`. Verificado e2e (upload PUT 200, media 302→200, download 200, anon 401, capa no catálogo).

**Upload até 2 GB + progresso** (pedido do dono): `MAX_UPLOAD_BYTES=2GB`; presign PUT TTL 1h; upload direto do navegador via `utils/uploadR2.js` (XMLHttpRequest, progresso); componente `UploadProgress.vue` (anel girando + barra). Ligado no wizard, editor e avatar (ContaView). **Deleção limpa o R2:** apagar postagem remove os objetos das anexos + linhas; remover anexo deleta o objeto por chave.

⚠️ **CORS do bucket:** o PUT do navegador exige a ORIGEM do frontend no CORS do R2. Hoje: `localhost:8080`, `localhost:3000`, `pulsourbano.vercel.app`. **O Vite dev roda em `:5173`/`:5180`** — para testar upload local no navegador, adicionar essa origem no CORS do R2 (leituras/downloads não precisam de CORS). Prod (vercel) já está liberado.
⚠️ `.env`: `STORAGE_API_S3` foi adicionado mas **não é usado** (o código usa `STORAGE_ENDPOINT`) — pode remover.

---

### P9 — Cutover para produção — Fase A CONCLUÍDA (2026-07-08), Fase B pendente (deploy)

**Pivô de banco:** o usuário provisionou um **novo Neon via integração nativa Vercel** (`NEON_*` env vars) e pediu para usá-lo como produção definitiva, no lugar do Neon antigo (`ep-polished-bush...`). Projeto Vercel confirmado via MCP: **`pulsourbano`** (`prj_4a8TZ5ypESGivkBT3OtL00rZ7SF5`, domínio `pulsourbano.vercel.app`) — os projetos `pulso-urbano-backend` e `frontend` na Vercel eram órfãos (nenhum `.vercel/project.json` do repo aponta pra eles) e foram removidos pelo usuário.

**Fase A (feita, só leitura→escrita no NOVO Neon, nada em Vercel ainda):**
1. Backup lógico (JSON) das tabelas antigas (`analyses` 93 linhas, `admins` 1 linha) — scratchpad da sessão.
2. Schema v2 aplicado no **novo** Neon (`NEON_POSTGRES_URL_NON_POOLING`) via `pg` direto (idempotente, mesma migration).
3. Tabela legado `analyses` recriada + 93 linhas copiadas (JSONB precisa `JSON.stringify` explícito ao inserir via `pg`).
4. Admin legado migrado: `password_hash` → `admins.senha_hash`, promovido a `superadmin` manualmente (bootstrap automático do schema não achou linha na hora certa, pois a tabela nasceu vazia).
5. **`backend/scripts/backfill_prod.js`** (novo — não confundir com `seed_and_backfill.js`, que é só p/ Docker/teste e TRUNCA+cria contas fake): backfill Neon→Neon, sem reset, sem contas de teste, idempotente por `legado_id`, `criado_por`=admin real. Rodou contra o novo projeto (região **us-east-1**, diferente da antiga us-east-2) — **~7 min** por causa de latência cross-region acumulada em milhares de round-trips seriais (não é bug, é o padrão per-row do script; ver possível otimização futura: batch/multi-row INSERT).
6. Paridade 100% verificada: 93 postagens, `legado_id`/`search_vector` 0 nulos, is_crisp 6, categorias 9, tags 313, autores 73, anexos 138 — bate com a run Docker já validada antes.
7. **`backend/.env`** atualizado: `DATABASE_URL` agora aponta pro novo Neon (URL antiga comentada ao lado, pra rollback rápido); `V2_USE_PROD=1` adicionado.
8. **CORS apertado** (`backend/index.js`): removido wildcard `*.vercel.app` (qualquer projeto Vercel de terceiros podia mandar request com `credentials:true` — item já sinalizado como pendência de segurança) e a regra Netlify morta (projeto não usa Netlify). Agora só `ALLOWED_ORIGIN`/`ALLOWED_ORIGIN_LOCALHOST` (env) + subdomínio de preview do próprio time (`*.vitimizacaocrisps-projects.vercel.app`) + localhost.
9. **Verificado localmente simulando o ambiente da Vercel** (backend rodando sem `TEST_DATABASE_URL`, só `DATABASE_URL`+`V2_USE_PROD=1` — é exatamente o que a Vercel vai ver): `/api/postagens` (93), `/api/taxonomia`, detalhe com gate de prévia, resolver de `id` legado, login admin (hash bcrypt migrado comparado corretamente), rota legada `/api/analyses/:id` (driver `neon()` antigo) — **os dois drivers coexistindo na mesma DATABASE_URL nova, funcionando**. Lint 0, rotas carregam sem erro.
10. **Descartes do backfill** (normais, já eram esperados): 31 valores de `states` sem match de UF (nomes de estados americanos e "Todos os 27 estados+DF" em 5 posts específicos) — não viram UF, só logados, não é falha.

**Fase B — pendente, é DEPLOY, precisa autorização explícita adicional antes de executar:**
1. **Configurar env vars no painel da Vercel** (projeto `pulsourbano`, Production): `DATABASE_URL` = valor novo (mesma string que está em `backend/.env` agora); `V2_USE_PROD=1`; manter `JWT_SECRET` como já está (rotacionar = logout global de todo mundo, não fazer sem avisar); conferir `STORAGE_*` (R2) já configurado; opcional mas recomendado: `RESEND_API_KEY`/`EMAIL_FROM`/`APP_URL` (sem isso e-mail fica no-op) e `UPSTASH_REDIS_REST_URL`/`_TOKEN` (sem isso cache/rate-limit/sessão caem pra fallback em memória — funciona mas sem persistir entre invocações serverless, e sem rate-limit real).
2. **Commit + push** das mudanças desta sessão (o handoff não commitou nada — regra do projeto é o usuário commitar, IA só fornece a mensagem).
3. **Deploy** (automático no push, ou `deploy_to_vercel` do MCP).
4. Pós-deploy: reconferir os mesmos smoke tests da Fase A contra a URL de produção real; observar logs de erro nas primeiras requisições.
5. **Não migrado ainda:** `users` (0 linhas — não existiam no legado, ok), avatares, anexos novos criados via wizard (nenhum existia em produção ainda, só R2 legado `uploads/*` referenciado por `analyses.cover_image_path`/`reference_links`, que o backfill já linkou como `anexos.origem='externo'` apontando pra essas URLs — funciona sem mover nada do R2).
6. **Freeze/re-run anti-deriva:** como zero postagens foram criadas em produção desde o início desta sessão (site legado só lê, não tem fluxo de escrita ativo pro usuário final), o risco de deriva entre o backfill e o deploy é baixo — mas se qualquer postagem for criada via admin legado entre agora e o deploy, rodar `backfill_prod.js` de novo (idempotente) resolve.

---

### P10 — 2FA TOTP para admins ✅ CONCLUÍDO (2026-07-06)
Feito: colunas `admins.totp_secret/totp_enabled/totp_recovery` (schema + Docker); `services/twofa.js` (otplib + qrcode); `routes/v2/twofa.js` (`/api/admin/2fa` setup/enable/disable, requireAdmin); login de admin devolve `{ requer2fa, challenge }` (JWT 5min) sem cookie quando 2FA ativo; `POST /api/admin/auth/2fa` confere TOTP **ou** código de recuperação (consumido no uso) e emite a sessão; `/api/me` expõe `totp_enabled`. Frontend: passo de código no `AdminLogin`; card "2FA" no `ContaView` (QR + segredo + ativar + recovery + desativar por senha). Deps novas: `otplib`, `qrcode`. Verificado e2e no browser (enable via QR, login desafio→TOTP→/admin, recovery consome, disable) + curl (código errado 401, single-session).

### P11 — CI com serviço Postgres ✅ CONCLUÍDO (2026-07-06)
Feito: `.github/workflows/ci.yml` sobe serviço `postgres:16-alpine` (porta 5433), aplica `2026_v2_schema.sql` via `pg` (sem depender de psql) e roda a suíte com `TEST_DATABASE_URL`+`JWT_SECRET` — os testes v2 deixam de ser pulados.

---

## 4. Contrato de erro e convenções v2
- Resposta padrão: `{ success:true, data }` ou `{ success:false, error:{ code, message } }`.
- Códigos de auth: `sem_token`, `token_invalido`, `sessao_encerrada`, `conta_desativada`, `role_insuficiente`; genéricos: `validacao_falhou`, `nao_encontrado`, `credenciais_invalidas`, `email_em_uso`.
- Auth por cookie httpOnly `authToken` (sameSite=lax, secure em prod). `withCredentials:true` no axios (já configurado).
- Sanitização de HTML (`conteudo`, `transcricao`) SEMPRE no servidor ao gravar (allowlist). XSS armazenado entre admins = escalação de privilégio.
- Toda escrita multi-tabela em transação (`withTx`). Colunas sempre de allowlist (nunca chave vinda do cliente).

## 5. Memória de projeto (contexto persistente)
Ver `.claude/.../memory/pulso-modelo-acesso-publico.md` — detalha o modelo de acesso e o caveat do R2.
