-- =============================================================
-- Pulso Urbano — Schema do banco de dados
-- =============================================================

-- -------------------------------------------------------------
-- Tabela principal de análises
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analyses (
  id                SERIAL PRIMARY KEY,
  title             VARCHAR(255),
  subtitle          VARCHAR(255),
  last_update       TIMESTAMP WITH TIME ZONE,
  study_period      VARCHAR(100),
  source            JSONB,
  category          JSONB,
  tag               JSONB,
  author            VARCHAR(255),
  description       TEXT,
  content           TEXT,
  reference_links   JSONB,
  cover_image_path  VARCHAR(500),
  nationality       VARCHAR(100),
  states            JSONB,
  cities            JSONB,
  with_header       BOOLEAN DEFAULT TRUE,
  with_footer       BOOLEAN DEFAULT TRUE,
  entry_type        VARCHAR(20) NOT NULL DEFAULT 'analysis',
  meta              JSONB,
  is_crisp          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -------------------------------------------------------------
-- Tabela de administradores
--
-- Regra: novos admins só podem ser criados diretamente no banco.
-- Não há endpoint de cadastro na API.
--
-- Para adicionar um admin, gere o hash da senha com:
--   node -e "require('bcryptjs').hash('SUA_SENHA', 12).then(h => console.log(h))"
-- depois execute um INSERT abaixo.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -------------------------------------------------------------
-- Admin inicial
--
-- IMPORTANTE: troque o password_hash antes de rodar em produção.
--
-- Para gerar seu hash:
--   node -e "require('bcryptjs').hash('SUA_SENHA_AQUI', 12).then(h => console.log(h))"
-- -------------------------------------------------------------
INSERT INTO admins (name, email, password_hash)
VALUES (
  'Administrador',
  'admin@pulsourbano.com.br',
  '$2a$12$SUBSTITUA_ESTE_HASH_PELO_GERADO_COM_BCRYPT'
)
ON CONFLICT (email) DO NOTHING;

-- -------------------------------------------------------------
-- Após criar as tabelas, rode também as migrações:
--   database/migrations/2026_full_text_search.sql  (busca por relevância)
--   database/migrations/2026_content_types.sql     (produções acadêmicas e dados primários)
--   database/migrations/2026_is_crisp.sql          (flag CRISP/UFMG + página /crisp)
-- O backend degrada graciosamente se elas não tiverem sido aplicadas.
-- -------------------------------------------------------------
