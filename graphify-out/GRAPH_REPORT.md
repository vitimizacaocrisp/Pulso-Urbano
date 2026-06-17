# Graph Report - .  (2026-06-16)

## Corpus Check
- Corpus is ~42,474 words - fits in a single context window. You may not need a graph.

## Summary
- 413 nodes · 437 edges · 54 communities (44 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.78)
- Token cost: 41,041 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Analysis Editor View|Analysis Editor View]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_Backend Server & Routing|Backend Server & Routing]]
- [[_COMMUNITY_Server Cache & Admin Routes|Server Cache & Admin Routes]]
- [[_COMMUNITY_Content Manager (IndexedDB)|Content Manager (IndexedDB)]]
- [[_COMMUNITY_Backend Package Manifest|Backend Package Manifest]]
- [[_COMMUNITY_Auth & Upload Middleware|Auth & Upload Middleware]]
- [[_COMMUNITY_R2 Storage Client|R2 Storage Client]]
- [[_COMMUNITY_Home View & Particle Canvas|Home View & Particle Canvas]]
- [[_COMMUNITY_Backend Dependencies|Backend Dependencies]]
- [[_COMMUNITY_Frontend API Cache|Frontend API Cache]]
- [[_COMMUNITY_Cover Generation Utils|Cover Generation Utils]]
- [[_COMMUNITY_Project Docs & Rationale|Project Docs & Rationale]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_JS Config  Path Aliases|JS Config / Path Aliases]]
- [[_COMMUNITY_App Bootstrap & Router|App Bootstrap & Router]]
- [[_COMMUNITY_Login Rate Limiter|Login Rate Limiter]]
- [[_COMMUNITY_Header & Search UI|Header & Search UI]]
- [[_COMMUNITY_Toast Notifications|Toast Notifications]]
- [[_COMMUNITY_Analysis Media Utils|Analysis Media Utils]]
- [[_COMMUNITY_Analysis Cover Component|Analysis Cover Component]]
- [[_COMMUNITY_Theme Composable|Theme Composable]]
- [[_COMMUNITY_Root Dev Scripts|Root Dev Scripts]]
- [[_COMMUNITY_Cookie Consent|Cookie Consent]]
- [[_COMMUNITY_Contact View|Contact View]]
- [[_COMMUNITY_Vercel Config|Vercel Config]]
- [[_COMMUNITY_Stateless JWT Auth Flow|Stateless JWT Auth Flow]]
- [[_COMMUNITY_Vercel Rewrites|Vercel Rewrites]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_Cover & Iframe Rationale|Cover & Iframe Rationale]]
- [[_COMMUNITY_Full-Text Search Fallback|Full-Text Search Fallback]]
- [[_COMMUNITY_Cache & Rate-Limit Rationale|Cache & Rate-Limit Rationale]]
- [[_COMMUNITY_Cold start  keep-alive (GET health)|Cold start / keep-alive (GET /health)]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 7 edges
2. `sql` - 6 edges
3. `scripts` - 6 edges
4. `buildCoverSvg()` - 6 edges
5. `scripts` - 5 edges
6. `pickCover()` - 5 edges
7. `reset()` - 5 edges
8. `cacheGet()` - 4 edges
9. `cacheSet()` - 4 edges
10. `cacheInvalidate()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Scripts Vue CLI legados (serve/build/lint)` --conceptually_related_to--> `Pulso Urbano (Observatório de Segurança Pública)`  [AMBIGUOUS]
  frontend/README.md → README.md
- `Template de e-mail do formulário de contato (EmailJS)` --conceptually_related_to--> `Pulso Urbano (Observatório de Segurança Pública)`  [INFERRED]
  frontend/emailjs-template.html → README.md
- `Entrypoint SPA (index.html)` --conceptually_related_to--> `Pulso Urbano (Observatório de Segurança Pública)`  [INFERRED]
  frontend/index.html → README.md
- `MAX_UPLOAD_BYTES (validação advisory 50MB)` --conceptually_related_to--> `Storage Cloudflare R2 (URLs pré-assinadas)`  [INFERRED]
  backend/docs/r2-hard-size-limit.md → README.md
- `Limite rígido de upload via Cloudflare Worker` --conceptually_related_to--> `Storage Cloudflare R2 (URLs pré-assinadas)`  [INFERRED]
  backend/docs/r2-hard-size-limit.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Fluxo de autenticação stateless cross-domain** — readme_stateless_auth, readme_axios_interceptor, readme_verifytoken_middleware [EXTRACTED 1.00]
- **Imposição de limite de tamanho de upload no R2** — r2_hard_size_limit_worker, r2_hard_size_limit_max_upload_bytes, r2_hard_size_limit_presigned_put, readme_storage_r2 [EXTRACTED 1.00]

## Communities (54 total, 10 thin omitted)

### Community 0 - "Analysis Editor View"
Cohesion: 0.07
Nodes (29): activeAnalysisId, activeMediaType, confirmDelete(), contentMediaMap, editorEl, feedback, feedbackIcon, form (+21 more)

### Community 1 - "Frontend Dependencies"
Cohesion: 0.06
Nodes (32): dependencies, axios, chart.js, dompurify, @emailjs/browser, @iconify/vue, idb, marked (+24 more)

### Community 2 - "Backend Server & Routing"
Cohesion: 0.08
Nodes (26): ALLOWED_ORIGINS, app, cors, express, mainRoutes, { requestHandler, testConnection }, { neon }, requestHandler() (+18 more)

### Community 3 - "Server Cache & Admin Routes"
Cohesion: 0.09
Nodes (23): cacheGet(), cacheInvalidate(), cacheSet(), mem, { Redis }, { cacheGet, cacheSet, cacheInvalidate }, express, {
  generatePresignedUrls,
  deleteFileFromS3
} (+15 more)

### Community 4 - "Content Manager (IndexedDB)"
Cohesion: 0.11
Nodes (22): activeMediaType, confirmClear(), contentMediaMap, dbClear(), dbGet(), dbPut(), feedbackIcon, form (+14 more)

### Community 5 - "Backend Package Manifest"
Cohesion: 0.09
Nodes (22): author, bugs, url, description, devDependencies, nodemon, engines, node (+14 more)

### Community 6 - "Auth & Upload Middleware"
Cohesion: 0.13
Nodes (16): asyncHandler(), bcrypt, express, jwt, multer, path, storage, upload (+8 more)

### Community 7 - "R2 Storage Client"
Cohesion: 0.13
Nodes (14): ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, crypto, FOLDER_MAP, { getSignedUrl }, isAllowedFileType(), missingR2Env, path (+6 more)

### Community 8 - "Home View & Particle Canvas"
Cohesion: 0.12
Nodes (7): autoMouse, canvasRef, dailyHighlight, heroContainer, mouse, Particle, particles

### Community 9 - "Backend Dependencies"
Cohesion: 0.13
Nodes (15): dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs, cookie-parser, cors, cross-env, dotenv (+7 more)

### Community 10 - "Frontend API Cache"
Cohesion: 0.22
Nodes (11): cacheGet(), CacheKeys, cacheSet(), fetchWithCache(), inflight, memCache, memGet(), memSet() (+3 more)

### Community 11 - "Cover Generation Utils"
Cohesion: 0.29
Nodes (10): buildCoverSvg(), coverSvgDataUri(), esc(), externalPhoto(), fullMediaPath(), ICONS, matchTheme(), pickCover() (+2 more)

### Community 12 - "Project Docs & Rationale"
Cohesion: 0.22
Nodes (11): Template de e-mail do formulário de contato (EmailJS), Scripts Vue CLI legados (serve/build/lint), Entrypoint SPA (index.html), Bootstrap de tema inline (data-theme via localStorage), MAX_UPLOAD_BYTES (validação advisory 50MB), Presigned PUT direto do navegador para o R2, Limite rígido de upload via Cloudflare Worker, Migração de storage Backblaze B2 → Cloudflare R2 (+3 more)

### Community 13 - "ESLint Config"
Cohesion: 0.18
Nodes (10): env, browser, es2022, node, extends, parserOptions, ecmaVersion, sourceType (+2 more)

### Community 15 - "JS Config / Path Aliases"
Cohesion: 0.22
Nodes (8): compilerOptions, baseUrl, lib, module, moduleResolution, paths, target, @/*

### Community 16 - "App Bootstrap & Router"
Cohesion: 0.25
Nodes (4): appBooted, isRouteLoading, router, routes

### Community 17 - "Login Rate Limiter"
Cohesion: 0.28
Nodes (7): getClientIp(), loginRateLimiter(), { Ratelimit }, { Redis }, assert, { loginRateLimiter }, { test }

### Community 19 - "Toast Notifications"
Cohesion: 0.33
Nodes (3): { toasts, remove, error, success, info }, toasts, useToast()

### Community 20 - "Analysis Media Utils"
Cohesion: 0.38
Nodes (4): generateFileMediaHtml(), generateUrlMediaHtml(), mediaTypeLabels, processCodeContent()

### Community 21 - "Analysis Cover Component"
Cohesion: 0.40
Nodes (3): cover, imgFailed, props

### Community 22 - "Theme Composable"
Cohesion: 0.40
Nodes (3): isDark, theme, THEMES

### Community 23 - "Root Dev Scripts"
Cohesion: 0.40
Nodes (4): scripts, client, dev, server

### Community 27 - "Stateless JWT Auth Flow"
Cohesion: 1.00
Nodes (3): Interceptor Axios (injeta Authorization Bearer), Autenticação stateless cross-domain (JWT), Middleware verifyToken

## Ambiguous Edges - Review These
- `Pulso Urbano (Observatório de Segurança Pública)` → `Scripts Vue CLI legados (serve/build/lint)`  [AMBIGUOUS]
  frontend/README.md · relation: conceptually_related_to

## Knowledge Gaps
- **210 isolated node(s):** `express`, `cors`, `{ requestHandler, testConnection }`, `mainRoutes`, `app` (+205 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Pulso Urbano (Observatório de Segurança Pública)` and `Scripts Vue CLI legados (serve/build/lint)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `dependencies` connect `Backend Dependencies` to `Backend Package Manifest`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `verifyToken()` connect `Auth & Upload Middleware` to `Server Cache & Admin Routes`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `express`, `cors`, `{ requestHandler, testConnection }` to the rest of the system?**
  _218 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Analysis Editor View` be split into smaller, more focused modules?**
  _Cohesion score 0.0659536541889483 - nodes in this community are weakly interconnected._
- **Should `Frontend Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Backend Server & Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.07956989247311828 - nodes in this community are weakly interconnected._