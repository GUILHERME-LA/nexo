BEGIN;

-- ═══════════════════════════════════════════════════════════
-- Colunas de geolocalização para classificação por conteúdo
-- Schema: revista_timeline
-- ═══════════════════════════════════════════════════════════

ALTER TABLE revista_timeline.noticias
  ADD COLUMN IF NOT EXISTS uf varchar(2) NULL,
  ADD COLUMN IF NOT EXISTS pais_iso varchar(2) NULL,
  ADD COLUMN IF NOT EXISTS escopo varchar(16) NULL
    CHECK (escopo IN ('nacional', 'internacional', 'regional'));

CREATE INDEX IF NOT EXISTS ix_noticias_uf
  ON revista_timeline.noticias (uf) WHERE uf IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_noticias_pais_iso
  ON revista_timeline.noticias (pais_iso) WHERE pais_iso IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_noticias_escopo
  ON revista_timeline.noticias (escopo) WHERE escopo IS NOT NULL;

ALTER TABLE revista_timeline.tweets
  ADD COLUMN IF NOT EXISTS uf varchar(2) NULL,
  ADD COLUMN IF NOT EXISTS pais_iso varchar(2) NULL,
  ADD COLUMN IF NOT EXISTS escopo varchar(16) NULL
    CHECK (escopo IN ('nacional', 'internacional', 'regional'));

CREATE INDEX IF NOT EXISTS ix_tweets_uf
  ON revista_timeline.tweets (uf) WHERE uf IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_tweets_pais_iso
  ON revista_timeline.tweets (pais_iso) WHERE pais_iso IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_tweets_escopo
  ON revista_timeline.tweets (escopo) WHERE escopo IS NOT NULL;

-- ═══════════════════════════════════════════════════════════
-- Backfill heurístico para dados existentes
-- ═══════════════════════════════════════════════════════════

-- Notícias com termos federais → DF
UPDATE revista_timeline.noticias
SET uf = 'DF', pais_iso = 'BR', escopo = 'nacional'
WHERE uf IS NULL
  AND (
    titulo ILIKE '%stf%' OR titulo ILIKE '%supremo tribunal%'
    OR titulo ILIKE '%congresso nacional%' OR titulo ILIKE '%esplanada%'
    OR titulo ILIKE '%polícia federal%' OR titulo ILIKE '%governo federal%'
    OR titulo ILIKE '%senado%' OR titulo ILIKE '%câmara dos deputados%'
  );

UPDATE revista_timeline.tweets
SET uf = 'DF', pais_iso = 'BR', escopo = 'nacional'
WHERE uf IS NULL
  AND (
    texto ILIKE '%stf%' OR texto ILIKE '%supremo tribunal%'
    OR texto ILIKE '%congresso nacional%' OR texto ILIKE '%esplanada%'
    OR texto ILIKE '%polícia federal%' OR texto ILIKE '%governo federal%'
    OR texto ILIKE '%senado%' OR texto ILIKE '%câmara dos deputados%'
  );

-- Tweets com menção a estados
UPDATE revista_timeline.tweets
SET uf = CASE
    WHEN texto ILIKE '%são paulo%' OR texto ILIKE '%capital paulista%' THEN 'SP'
    WHEN texto ILIKE '%rio de janeiro%' THEN 'RJ'
    WHEN texto ILIKE '%belo horizonte%' THEN 'MG'
    WHEN texto ILIKE '%curitiba%' THEN 'PR'
    WHEN texto ILIKE '%porto alegre%' THEN 'RS'
    WHEN texto ILIKE '%salvador%' THEN 'BA'
    WHEN texto ILIKE '%recife%' THEN 'PE'
    WHEN texto ILIKE '%fortaleza%' THEN 'CE'
    WHEN texto ILIKE '%goiânia%' THEN 'GO'
    WHEN texto ILIKE '%manaus%' THEN 'AM'
    WHEN texto ILIKE '%belém%' THEN 'PA'
    WHEN texto ILIKE '%florianópolis%' THEN 'SC'
    WHEN texto ILIKE '%vitória%' THEN 'ES'
    WHEN texto ILIKE '%brasília%' OR texto ILIKE '%brasilia%' OR texto ILIKE '%distrito federal%' THEN 'DF'
    ELSE uf
  END,
  pais_iso = COALESCE(pais_iso, 'BR'),
  escopo = COALESCE(escopo, 'nacional')
WHERE uf IS NULL
  AND (
    texto ILIKE '%são paulo%' OR texto ILIKE '%rio de janeiro%'
    OR texto ILIKE '%belo horizonte%' OR texto ILIKE '%curitiba%'
    OR texto ILIKE '%porto alegre%' OR texto ILIKE '%salvador%'
    OR texto ILIKE '%brasília%' OR texto ILIKE '%brasilia%'
  );

-- Notícias com menção a estados
UPDATE revista_timeline.noticias
SET uf = CASE
    WHEN titulo ILIKE '%são paulo%' OR resumo ILIKE '%são paulo%' THEN 'SP'
    WHEN titulo ILIKE '%rio de janeiro%' OR resumo ILIKE '%rio de janeiro%' THEN 'RJ'
    WHEN titulo ILIKE '%belo horizonte%' OR resumo ILIKE '%belo horizonte%' THEN 'MG'
    WHEN titulo ILIKE '%curitiba%' OR resumo ILIKE '%curitiba%' THEN 'PR'
    WHEN titulo ILIKE '%porto alegre%' OR resumo ILIKE '%porto alegre%' THEN 'RS'
    WHEN titulo ILIKE '%salvador%' OR resumo ILIKE '%salvador%' THEN 'BA'
    WHEN titulo ILIKE '%brasília%' OR titulo ILIKE '%brasilia%' OR resumo ILIKE '%brasília%' THEN 'DF'
    ELSE uf
  END,
  pais_iso = COALESCE(pais_iso, 'BR'),
  escopo = COALESCE(escopo, 'nacional')
WHERE uf IS NULL
  AND (
    titulo ILIKE '%são paulo%' OR resumo ILIKE '%são paulo%'
    OR titulo ILIKE '%rio de janeiro%' OR resumo ILIKE '%rio de janeiro%'
    OR titulo ILIKE '%belo horizonte%' OR resumo ILIKE '%belo horizonte%'
    OR titulo ILIKE '%curitiba%' OR resumo ILIKE '%curitiba%'
    OR titulo ILIKE '%salvador%' OR resumo ILIKE '%salvador%'
    OR titulo ILIKE '%brasília%' OR titulo ILIKE '%brasilia%'
  );

COMMIT;
