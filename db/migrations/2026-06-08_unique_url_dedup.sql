-- =============================================================================
-- DEDUP + UNIQUE(url) para noticias e tweets
-- Schema: revista_timeline
-- =============================================================================
-- Rode no SQL Editor do Supabase. A app já dedupa em memória (cinto +
-- suspensório), mas este script garante a integridade no banco e impede
-- novas duplicatas serem inseridas pelo pipeline.
-- =============================================================================

-- 1) Remove duplicatas, mantendo o registro mais RECENTE por `coletado_em`
--    (em empate, o de maior `id`). Faz para cada (vertical_id, url).
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY vertical_id, url
           ORDER BY coletado_em DESC NULLS LAST, id DESC
         ) AS rn
  FROM revista_timeline.noticias
  WHERE url IS NOT NULL AND url <> ''
)
DELETE FROM revista_timeline.noticias n
USING ranked r
WHERE n.id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY vertical_id, url
           ORDER BY coletado_em DESC NULLS LAST, id DESC
         ) AS rn
  FROM revista_timeline.tweets
  WHERE url IS NOT NULL AND url <> ''
)
DELETE FROM revista_timeline.tweets t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;

-- 2) UNIQUE parcial: impede que duas linhas da mesma vertical compartilhem URL.
--    Parcial porque registros sem URL (raro, mas possível) não podem ser
--    desambiguados — esses ficam de fora do constraint.
CREATE UNIQUE INDEX IF NOT EXISTS ux_noticias_vertical_url
  ON revista_timeline.noticias (vertical_id, url)
  WHERE url IS NOT NULL AND url <> '';

CREATE UNIQUE INDEX IF NOT EXISTS ux_tweets_vertical_url
  ON revista_timeline.tweets (vertical_id, url)
  WHERE url IS NOT NULL AND url <> '';

-- 3) Índices auxiliares para acelerar a janela canônica de 24h.
CREATE INDEX IF NOT EXISTS ix_noticias_vertical_coletado
  ON revista_timeline.noticias (vertical_id, coletado_em DESC);

CREATE INDEX IF NOT EXISTS ix_tweets_vertical_coletado
  ON revista_timeline.tweets (vertical_id, coletado_em DESC);

-- =============================================================================
-- IMPORTANTE: ajuste o pipeline de ingestão para usar
--   INSERT ... ON CONFLICT (vertical_id, url) DO UPDATE SET coletado_em = EXCLUDED.coletado_em ...
-- ou DO NOTHING — assim novas coletas da mesma URL atualizam em vez de duplicar.
-- =============================================================================
