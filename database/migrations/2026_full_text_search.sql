-- =============================================================
-- Full-text search em `analyses` (PostgreSQL tsvector + GIN)
--
-- Busca por relevância, com stemming em português e insensível a
-- acentos (ex.: "violencia" encontra "violência").
--
-- Idempotente: pode rodar mais de uma vez sem erro.
-- Rode UMA vez no banco (Neon) ANTES de subir o backend novo.
-- =============================================================

-- 1) Extensão para remover acentos
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2) Wrapper IMMUTABLE do unaccent.
--    A forma de 2 argumentos fixa o dicionário, tornando a função
--    independente do search_path — requisito para usá-la numa coluna
--    gerada (GENERATED ALWAYS).
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE PARALLEL SAFE STRICT
AS $func$
  SELECT public.unaccent('public.unaccent', $1)
$func$;

-- 3) Coluna tsvector gerada a partir dos campos pesquisáveis.
--    JSONB (tag/category/source) é convertido para texto.
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('portuguese',
      public.f_unaccent(
        coalesce(title,       '') || ' ' ||
        coalesce(subtitle,    '') || ' ' ||
        coalesce(author,      '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(content,     '') || ' ' ||
        coalesce(tag::text,      '') || ' ' ||
        coalesce(category::text, '') || ' ' ||
        coalesce(source::text,   '')
      )
    )
  ) STORED;

-- 4) Índice GIN para tornar a busca rápida
CREATE INDEX IF NOT EXISTS idx_analyses_search
  ON analyses USING GIN (search_vector);
