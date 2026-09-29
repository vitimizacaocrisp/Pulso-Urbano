-- =============================================================
-- Pulso Urbano — Migração: documentos do Editor Alpha (GraphicStudio)
-- =============================================================
-- Guarda o documento visual em JSON, que é a fonte da verdade do editor.
-- O HTML é sempre derivado; nunca é armazenado, para não existirem duas
-- versões da mesma página podendo divergir.
--
-- `documento` é JSONB e não uma árvore de tabelas de propósito: o schema do
-- editor evolui com frequência e é validado por Zod no cliente. Normalizar
-- exigiria migrar o banco a cada campo novo de estilo.
--
-- Visibilidade: só `status = 'publicado'` sai pela rota pública. Rascunho é
-- visível apenas para administradores autenticados.
--
-- Migração ADITIVA e idempotente.
-- =============================================================

CREATE TABLE IF NOT EXISTS studio_documents (
  id            SERIAL PRIMARY KEY,
  -- Slug do próprio documento; é o endereço público da página.
  slug          VARCHAR(200) NOT NULL UNIQUE,
  titulo        VARCHAR(500) NOT NULL,
  documento     JSONB NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'rascunho'
                CHECK (status IN ('rascunho', 'publicado')),
  -- Contador de edições. O cliente devolve a versão que abriu; se não bater, a
  -- gravação é recusada em vez de apagar em silêncio o trabalho de outra pessoa.
  versao        INTEGER NOT NULL DEFAULT 1,
  -- Quem salvou por último. Sem FK para não travar a exclusão de um admin.
  atualizado_por INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

-- A rota pública filtra por slug + status + não excluído.
CREATE INDEX IF NOT EXISTS idx_studio_documents_publicados
  ON studio_documents (slug)
  WHERE status = 'publicado' AND deleted_at IS NULL;

-- A listagem do admin ordena pelo mais recente.
CREATE INDEX IF NOT EXISTS idx_studio_documents_updated
  ON studio_documents (updated_at DESC);

-- Histórico: a versão anterior é arquivada a cada gravação, para dar como
-- desfazer uma publicação ruim sem depender de backup do banco.
CREATE TABLE IF NOT EXISTS studio_document_versions (
  id             SERIAL PRIMARY KEY,
  documento_id   INTEGER NOT NULL REFERENCES studio_documents(id) ON DELETE CASCADE,
  versao         INTEGER NOT NULL,
  titulo         VARCHAR(500) NOT NULL,
  documento      JSONB NOT NULL,
  status         VARCHAR(20) NOT NULL,
  atualizado_por INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (documento_id, versao)
);

CREATE INDEX IF NOT EXISTS idx_studio_versions_doc
  ON studio_document_versions (documento_id, versao DESC);
