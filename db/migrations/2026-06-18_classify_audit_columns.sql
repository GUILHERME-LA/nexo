BEGIN;

-- ═══════════════════════════════════════════════════════════
-- Colunas de auditoria da classificação geográfica
-- Schema: revista_timeline
-- Rastreia QUANDO, COMO e com QUE CONFIANÇA cada item foi classificado.
-- ═══════════════════════════════════════════════════════════

-- ── Noticias ──────────────────────────────────────────────
ALTER TABLE revista_timeline.noticias
  ADD COLUMN IF NOT EXISTS classified_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS classify_method varchar(16) NULL
    CHECK (classify_method IN ('llm', 'heuristic', 'fallback')),
  ADD COLUMN IF NOT EXISTS classify_confidence varchar(8) NULL
    CHECK (classify_confidence IN ('high', 'medium', 'low'));

CREATE INDEX IF NOT EXISTS ix_noticias_classify_method
  ON revista_timeline.noticias (classify_method) WHERE classify_method IS NOT NULL;

-- ── Tweets ────────────────────────────────────────────────
ALTER TABLE revista_timeline.tweets
  ADD COLUMN IF NOT EXISTS classified_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS classify_method varchar(16) NULL
    CHECK (classify_method IN ('llm', 'heuristic', 'fallback')),
  ADD COLUMN IF NOT EXISTS classify_confidence varchar(8) NULL
    CHECK (classify_confidence IN ('high', 'medium', 'low'));

CREATE INDEX IF NOT EXISTS ix_tweets_classify_method
  ON revista_timeline.tweets (classify_method) WHERE classify_method IS NOT NULL;

-- ── Backfill para dados já classificados (uf não-nulo = já processado) ──
UPDATE revista_timeline.noticias
SET classified_at = coletado_em,
    classify_method = 'heuristic',
    classify_confidence = 'medium'
WHERE uf IS NOT NULL AND classified_at IS NULL;

UPDATE revista_timeline.tweets
SET classified_at = coletado_em,
    classify_method = 'heuristic',
    classify_confidence = 'medium'
WHERE uf IS NOT NULL AND classified_at IS NULL;

COMMIT;
