-- =============================================================
-- Pulso Urbano — Schema v2 (modelo multi-tipo normalizado)
-- Referência: docs/planejamento/01-banco-dados.md
--
-- ADITIVO e IDEMPOTENTE. Funciona em banco NOVO (Docker) e em banco
-- EXISTENTE (Neon, onde `admins` já existe): CREATE IF NOT EXISTS +
-- bloco de ALTERs. Não toca em `analyses` (legado).
-- =============================================================

-- ── Extensões / Enums ────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS unaccent;

DO $$ BEGIN CREATE TYPE tipo_postagem   AS ENUM ('analise','academico','dado','podcast','livro','video'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_postagem AS ENUM ('rascunho','publicado','arquivado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE formato_podcast AS ENUM ('audio','video'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_autor      AS ENUM ('pessoa','instituicao'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE role_admin      AS ENUM ('superadmin','editor'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- f_unaccent imutável (uso em índice/tsvector; mesma config na consulta)
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  AS $$ SELECT public.unaccent('public.unaccent', $1) $$
  LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- ── Autenticação ─────────────────────────────────────────────
-- admins: CREATE cobre banco novo; ALTERs cobrem o Neon (tabela já existe lá
-- com password_hash — o CREATE IF NOT EXISTS vira no-op e os ALTERs completam).
CREATE TABLE IF NOT EXISTS admins (
  id              SERIAL PRIMARY KEY,
  nome            VARCHAR(120) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  senha_hash      VARCHAR(255),
  role            role_admin   NOT NULL DEFAULT 'editor',
  avatar_anexo_id INT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  session_id      UUID,
  ultimo_login    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);
-- Bloco de compatibilidade (no-ops em banco novo; essenciais no Neon):
ALTER TABLE admins ADD COLUMN IF NOT EXISTS nome            VARCHAR(120);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS senha_hash      VARCHAR(255);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS role            role_admin NOT NULL DEFAULT 'editor';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS avatar_anexo_id INT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS session_id      UUID;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS ultimo_login    TIMESTAMPTZ;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE admins ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ;
-- 2FA TOTP (doc 07/P10): segredo base32; recovery = array de hashes sha256.
ALTER TABLE admins ADD COLUMN IF NOT EXISTS totp_secret     TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS totp_enabled    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS totp_recovery   JSONB;
-- Copia hash legado uma vez (Neon usa password_hash; v2 usa senha_hash;
-- password_hash só é dropada na Fase 5):
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='admins' AND column_name='password_hash') THEN
    UPDATE admins SET senha_hash = password_hash WHERE senha_hash IS NULL;
  END IF;
END $$;
-- Bootstrap: sem nenhum superadmin, promove o admin ativo mais antigo
-- (senão o único admin de produção ficaria como 'editor', sem gestão de contas).
UPDATE admins SET role = 'superadmin'
WHERE id = (SELECT id FROM admins WHERE is_active ORDER BY id LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM admins WHERE role = 'superadmin');

CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  nome             VARCHAR(120),
  email            VARCHAR(255) NOT NULL,
  senha_hash       VARCHAR(255) NOT NULL,
  avatar_anexo_id  INT,
  email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
  email_pendente   VARCHAR(255),
  session_id       UUID,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_login     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

-- E-mail case-insensitive; parcial libera e-mail p/ recadastro após exclusão LGPD.
CREATE UNIQUE INDEX IF NOT EXISTS uq_admins_email ON admins (lower(email)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email  ON users  (lower(email)) WHERE deleted_at IS NULL;

-- Tokens de verificação/reset (docs 03/08): guarda o HASH, nunca o token puro.
CREATE TABLE IF NOT EXISTS auth_tokens (
  id          SERIAL PRIMARY KEY,
  conta_tipo  VARCHAR(10) NOT NULL CHECK (conta_tipo IN ('user','admin')),
  conta_id    INT NOT NULL,
  finalidade  VARCHAR(30) NOT NULL,
  token_hash  VARCHAR(64) NOT NULL,
  payload     JSONB,
  expira_em   TIMESTAMPTZ NOT NULL,
  usado_em    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_lookup ON auth_tokens (token_hash) WHERE usado_em IS NULL;

-- ── Base: postagens ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS postagens (
  id             SERIAL PRIMARY KEY,
  legado_id      INT UNIQUE,                    -- id original em analyses (redirect + idempotência)
  tipo           tipo_postagem   NOT NULL,
  slug           VARCHAR(200) UNIQUE,
  titulo         VARCHAR(255) NOT NULL,
  subtitulo      VARCHAR(255),
  resumo         TEXT,
  conteudo       TEXT,
  status         status_postagem NOT NULL DEFAULT 'rascunho',
  destaque       BOOLEAN NOT NULL DEFAULT FALSE,
  is_crisp       BOOLEAN NOT NULL DEFAULT FALSE,
  periodo_estudo VARCHAR(100),
  nacionalidade  VARCHAR(100),
  with_header    BOOLEAN DEFAULT TRUE,
  with_footer    BOOLEAN DEFAULT TRUE,
  cover_anexo_id INT,
  visualizacoes  INT NOT NULL DEFAULT 0,
  criado_por     INT REFERENCES admins(id),
  publicado_em   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  search_vector  tsvector
);
CREATE INDEX IF NOT EXISTS idx_postagens_tipo    ON postagens(tipo);
CREATE INDEX IF NOT EXISTS idx_postagens_status  ON postagens(status);
CREATE INDEX IF NOT EXISTS idx_postagens_crisp   ON postagens(is_crisp);
CREATE INDEX IF NOT EXISTS idx_postagens_fts     ON postagens USING GIN(search_vector);
-- leitura pública: WHERE status='publicado' AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_postagens_publico ON postagens (status, publicado_em DESC) WHERE deleted_at IS NULL;

-- ── Anexos (mídia unificada) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS anexos (
  id            SERIAL PRIMARY KEY,
  postagem_id   INT REFERENCES postagens(id) ON DELETE CASCADE,
  owner_tipo    VARCHAR(10) CHECK (owner_tipo IN ('admin','user')),
  owner_id      INT,
  tipo          VARCHAR(20) NOT NULL CHECK (tipo IN
                  ('cover','documento','dado','audio','video','imagem','anexo','avatar')),
  origem        VARCHAR(10) NOT NULL DEFAULT 'r2' CHECK (origem IN ('r2','externo')),
  url_r2        TEXT NOT NULL,
  chave_r2      TEXT,
  nome_arquivo  VARCHAR(255),
  mime          VARCHAR(100),
  tamanho_bytes BIGINT,
  ordem         INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  -- origem r2 exige chave (deleção usa SEMPRE chave_r2 do banco, nunca URL do cliente)
  CONSTRAINT chk_anexos_chave CHECK (origem <> 'r2' OR chave_r2 IS NOT NULL),
  -- vínculo: OU postagem OU dono (avatar) — nunca ambos, nunca nenhum
  CONSTRAINT chk_anexos_vinculo CHECK (
       (postagem_id IS NOT NULL AND owner_tipo IS NULL AND owner_id IS NULL)
    OR (postagem_id IS NULL AND owner_tipo IS NOT NULL AND owner_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_anexos_postagem ON anexos(postagem_id);
CREATE INDEX IF NOT EXISTS idx_anexos_owner    ON anexos(owner_tipo, owner_id) WHERE owner_tipo IS NOT NULL;

-- FKs adiadas (anexos precisa existir antes)
DO $$ BEGIN ALTER TABLE postagens ADD CONSTRAINT fk_postagens_cover FOREIGN KEY (cover_anexo_id) REFERENCES anexos(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admins    ADD CONSTRAINT fk_admins_avatar   FOREIGN KEY (avatar_anexo_id) REFERENCES anexos(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users     ADD CONSTRAINT fk_users_avatar    FOREIGN KEY (avatar_anexo_id) REFERENCES anexos(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Subtipos pt_* (1:1) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS pt_analises (
  postagem_id INT PRIMARY KEY REFERENCES postagens(id) ON DELETE CASCADE,
  metodologia TEXT,
  indicadores JSONB
);
CREATE TABLE IF NOT EXISTS pt_academicos (
  postagem_id   INT PRIMARY KEY REFERENCES postagens(id) ON DELETE CASCADE,
  tipo_producao VARCHAR(40),
  ano           SMALLINT,
  veiculo       VARCHAR(255),
  doi           VARCHAR(120),
  qualis        VARCHAR(4),
  issn          VARCHAR(20),
  orientador    VARCHAR(160),
  programa      VARCHAR(160)
);
CREATE TABLE IF NOT EXISTS pt_dados (
  postagem_id          INT PRIMARY KEY REFERENCES postagens(id) ON DELETE CASCADE,
  instrumento          VARCHAR(60),
  formato              VARCHAR(40),
  tamanho_amostra      INT,
  cobertura            VARCHAR(160),
  periodo_coleta       VARCHAR(60),
  licenca              VARCHAR(60),
  metodologia_amostral TEXT
);
CREATE TABLE IF NOT EXISTS pt_podcasts (
  postagem_id     INT PRIMARY KEY REFERENCES postagens(id) ON DELETE CASCADE,
  formato_midia   formato_podcast NOT NULL DEFAULT 'audio',
  numero_episodio INT,
  temporada       INT,
  duracao_seg     INT,
  plataforma      VARCHAR(30),
  embed_url       TEXT,
  audio_anexo_id  INT REFERENCES anexos(id),
  video_anexo_id  INT REFERENCES anexos(id),
  transcricao     TEXT,
  convidados      TEXT
);
CREATE TABLE IF NOT EXISTS pt_livros (
  postagem_id  INT PRIMARY KEY REFERENCES postagens(id) ON DELETE CASCADE,
  isbn         VARCHAR(20),
  editora      VARCHAR(160),
  ano_pub      SMALLINT,
  edicao       VARCHAR(30),
  num_paginas  INT,
  pdf_anexo_id INT REFERENCES anexos(id),
  compra_url   TEXT,
  sumario      TEXT
);
CREATE TABLE IF NOT EXISTS pt_videos (
  postagem_id    INT PRIMARY KEY REFERENCES postagens(id) ON DELETE CASCADE,
  plataforma     VARCHAR(30),
  embed_url      TEXT,
  video_anexo_id INT REFERENCES anexos(id),
  duracao_seg    INT,
  legendas_url   TEXT
);

-- Invariante tipo↔subtipo: INSERT em pt_* só se postagens.tipo corresponder.
CREATE OR REPLACE FUNCTION valida_subtipo() RETURNS trigger AS $$
DECLARE
  esperado tipo_postagem;
  atual    tipo_postagem;
BEGIN
  esperado := TG_ARGV[0]::tipo_postagem;
  SELECT tipo INTO atual FROM postagens WHERE id = NEW.postagem_id;
  IF atual IS NULL THEN
    RAISE EXCEPTION 'postagem % não existe', NEW.postagem_id;
  END IF;
  IF atual <> esperado THEN
    RAISE EXCEPTION 'postagem % é do tipo %, não aceita linha em pt_%', NEW.postagem_id, atual, esperado;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_val_pt_analises  ON pt_analises;
DROP TRIGGER IF EXISTS trg_val_pt_academicos ON pt_academicos;
DROP TRIGGER IF EXISTS trg_val_pt_dados     ON pt_dados;
DROP TRIGGER IF EXISTS trg_val_pt_podcasts  ON pt_podcasts;
DROP TRIGGER IF EXISTS trg_val_pt_livros    ON pt_livros;
DROP TRIGGER IF EXISTS trg_val_pt_videos    ON pt_videos;
CREATE TRIGGER trg_val_pt_analises   BEFORE INSERT ON pt_analises   FOR EACH ROW EXECUTE FUNCTION valida_subtipo('analise');
CREATE TRIGGER trg_val_pt_academicos BEFORE INSERT ON pt_academicos FOR EACH ROW EXECUTE FUNCTION valida_subtipo('academico');
CREATE TRIGGER trg_val_pt_dados      BEFORE INSERT ON pt_dados      FOR EACH ROW EXECUTE FUNCTION valida_subtipo('dado');
CREATE TRIGGER trg_val_pt_podcasts   BEFORE INSERT ON pt_podcasts   FOR EACH ROW EXECUTE FUNCTION valida_subtipo('podcast');
CREATE TRIGGER trg_val_pt_livros     BEFORE INSERT ON pt_livros     FOR EACH ROW EXECUTE FUNCTION valida_subtipo('livro');
CREATE TRIGGER trg_val_pt_videos     BEFORE INSERT ON pt_videos     FOR EACH ROW EXECUTE FUNCTION valida_subtipo('video');

-- ── Taxonomia + junções N:M ──────────────────────────────────
-- UNIQUEs de dedup: escrita usa INSERT ... ON CONFLICT (concorrência serverless).
CREATE TABLE IF NOT EXISTS categorias (id SERIAL PRIMARY KEY, nome VARCHAR(120) NOT NULL, slug VARCHAR(140) UNIQUE NOT NULL, cor VARCHAR(9), icone VARCHAR(60));
CREATE TABLE IF NOT EXISTS tags        (id SERIAL PRIMARY KEY, nome VARCHAR(80)  NOT NULL, slug VARCHAR(100) UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS autores     (id SERIAL PRIMARY KEY, nome VARCHAR(200) NOT NULL UNIQUE, tipo tipo_autor DEFAULT 'pessoa', afiliacao VARCHAR(200));
CREATE TABLE IF NOT EXISTS fontes      (id SERIAL PRIMARY KEY, nome VARCHAR(255) NOT NULL UNIQUE, url TEXT);
CREATE TABLE IF NOT EXISTS ufs         (id SERIAL PRIMARY KEY, sigla CHAR(2) UNIQUE, nome VARCHAR(60));
CREATE TABLE IF NOT EXISTS municipios  (id SERIAL PRIMARY KEY, uf_id INT REFERENCES ufs(id), nome VARCHAR(120), UNIQUE (uf_id, nome));

CREATE TABLE IF NOT EXISTS postagem_categorias (postagem_id INT REFERENCES postagens(id) ON DELETE CASCADE, categoria_id INT REFERENCES categorias(id) ON DELETE CASCADE, PRIMARY KEY(postagem_id,categoria_id));
CREATE TABLE IF NOT EXISTS postagem_tags       (postagem_id INT REFERENCES postagens(id) ON DELETE CASCADE, tag_id INT REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY(postagem_id,tag_id));
CREATE TABLE IF NOT EXISTS postagem_autores    (postagem_id INT REFERENCES postagens(id) ON DELETE CASCADE, autor_id INT REFERENCES autores(id) ON DELETE CASCADE, ordem INT DEFAULT 0, papel VARCHAR(40), PRIMARY KEY(postagem_id,autor_id));
CREATE TABLE IF NOT EXISTS postagem_fontes     (postagem_id INT REFERENCES postagens(id) ON DELETE CASCADE, fonte_id INT REFERENCES fontes(id) ON DELETE CASCADE, PRIMARY KEY(postagem_id,fonte_id));
CREATE TABLE IF NOT EXISTS postagem_ufs        (postagem_id INT REFERENCES postagens(id) ON DELETE CASCADE, uf_id INT REFERENCES ufs(id) ON DELETE CASCADE, PRIMARY KEY(postagem_id,uf_id));
CREATE TABLE IF NOT EXISTS postagem_municipios (postagem_id INT REFERENCES postagens(id) ON DELETE CASCADE, municipio_id INT REFERENCES municipios(id) ON DELETE CASCADE, PRIMARY KEY(postagem_id,municipio_id));

-- índices reversos (listagem por categoria/tag/autor)
CREATE INDEX IF NOT EXISTS idx_pc_categoria ON postagem_categorias(categoria_id);
CREATE INDEX IF NOT EXISTS idx_pt_tag       ON postagem_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_pa_autor     ON postagem_autores(autor_id);

-- ── Operacional ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_inscritos (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  confirmado BOOLEAN DEFAULT FALSE,
  unsub_token VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_email ON newsletter_inscritos (lower(email));

CREATE TABLE IF NOT EXISTS mensagens_contato (
  id SERIAL PRIMARY KEY, nome VARCHAR(120), email VARCHAR(255), assunto VARCHAR(200),
  mensagem TEXT, lido BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW()
);

-- audit_log com alvo genérico (postagem, admin, user, anexo...) + contexto de rede
CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  ator_tipo   VARCHAR(10) NOT NULL CHECK (ator_tipo IN ('admin','user','sistema')),
  ator_id     INT,
  acao        VARCHAR(60) NOT NULL,
  alvo_tipo   VARCHAR(20),
  alvo_id     INT,
  ip          VARCHAR(45),
  user_agent  VARCHAR(255),
  dados       JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_alvo ON audit_log(alvo_tipo, alvo_id);

-- ── Triggers utilitários ─────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_postagens_updated ON postagens;
CREATE TRIGGER trg_postagens_updated BEFORE UPDATE ON postagens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_admins_updated ON admins;
CREATE TRIGGER trg_admins_updated BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- FTS: trigger mantém search_vector (mesma config unaccent da consulta)
CREATE OR REPLACE FUNCTION postagens_fts_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('portuguese', f_unaccent(coalesce(NEW.titulo,''))), 'A') ||
    setweight(to_tsvector('portuguese', f_unaccent(coalesce(NEW.resumo,''))), 'B') ||
    setweight(to_tsvector('portuguese', f_unaccent(coalesce(NEW.conteudo,''))), 'C');
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_postagens_fts ON postagens;
CREATE TRIGGER trg_postagens_fts BEFORE INSERT OR UPDATE OF titulo, resumo, conteudo
  ON postagens FOR EACH ROW EXECUTE FUNCTION postagens_fts_trigger();

-- ── UFs fixas (27) ───────────────────────────────────────────
INSERT INTO ufs (sigla, nome) VALUES
 ('AC','Acre'),('AL','Alagoas'),('AP','Amapá'),('AM','Amazonas'),('BA','Bahia'),
 ('CE','Ceará'),('DF','Distrito Federal'),('ES','Espírito Santo'),('GO','Goiás'),
 ('MA','Maranhão'),('MT','Mato Grosso'),('MS','Mato Grosso do Sul'),('MG','Minas Gerais'),
 ('PA','Pará'),('PB','Paraíba'),('PR','Paraná'),('PE','Pernambuco'),('PI','Piauí'),
 ('RJ','Rio de Janeiro'),('RN','Rio Grande do Norte'),('RS','Rio Grande do Sul'),
 ('RO','Rondônia'),('RR','Roraima'),('SC','Santa Catarina'),('SP','São Paulo'),
 ('SE','Sergipe'),('TO','Tocantins')
ON CONFLICT (sigla) DO NOTHING;
