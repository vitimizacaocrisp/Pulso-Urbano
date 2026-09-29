-- =============================================================
-- Pulso Urbano — Migração: tipos de conteúdo (entry_type + meta)
-- =============================================================
-- Adiciona classificação de conteúdo às análises para distinguir:
--   'analysis' (padrão) — análise/observatório
--   'academic'          — produção acadêmica (tese, dissertação, artigo, relatório)
--   'dataset'           — dado primário (questionário, microdados, livro de códigos)
--
-- `meta` (JSONB) guarda os campos específicos de cada tipo:
--   academic: { academicType, venue, year, doi, pdfUrl }
--   dataset:  { dataFormat, sampleSize, instrument }  (+ downloads em reference_links)
--
-- Migração ADITIVA e idempotente. O backend degrada graciosamente se ela
-- ainda não tiver sido aplicada (igual ao full-text search).
-- =============================================================

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS entry_type VARCHAR(20) NOT NULL DEFAULT 'analysis';

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS meta JSONB;

-- Índice para filtrar rapidamente as páginas /producoes e /dados.
CREATE INDEX IF NOT EXISTS idx_analyses_entry_type ON analyses (entry_type);
