-- =============================================================
-- Pulso Urbano — Migração: flag is_crisp
-- =============================================================
-- Marca postagens produzidas pelo CRISP/UFMG (Centro de Estudos de
-- Criminalidade e Segurança Pública). Alimenta a página /crisp e o filtro
-- transversal (independe do entry_type).
--
-- Migração ADITIVA e idempotente. O backend degrada graciosamente se ela
-- ainda não tiver sido aplicada (o filtro CRISP é simplesmente ignorado).
-- =============================================================

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS is_crisp BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_analyses_is_crisp ON analyses (is_crisp);

-- Backfill: fonte OU autor contendo "CRISP" ou o nome por extenso do centro.
UPDATE analyses SET is_crisp = TRUE
WHERE is_crisp = FALSE
  AND (
        source::text ILIKE '%crisp%'
     OR author       ILIKE '%crisp%'
     OR source::text ILIKE '%centro de estudos de criminalidade%'
     OR author       ILIKE '%centro de estudos de criminalidade%'
  );
