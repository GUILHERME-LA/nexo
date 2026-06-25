# Pacote de Transferência — Mapa de Calor + Pulso Social

> **Origem:** Timeline Radar (`C:\Projetos\timeline-radar`)
> **Destino:** Honorix Insights QA (`C:\Projetos\honorix-insights-Qa`)
> **Escopo:** Estrutura, lógica e dados. Sem identidade visual (cores, fontes, tokens).

---

## 1. Inventário de Arquivos

### 1.1 Mapa de Calor — Arquivos Essenciais

| Arquivo | Linhas | O que faz | Viaja? |
|---|---|---|---|
| `src/routes/mapa.tsx` | 380 | Página orquestradora: state, queries, composição | **Adaptação** — reescrever queries para `insight-api.ts` |
| `src/lib/mapaGeo.ts` | 628 | Core de agregação: `fetchMapaBubble()`, `ENTITY_GEO`, `BR_UF_GEO`, projeções | **Sim** — lógica pura + dados estáticos |
| `src/lib/mapaCalor7d.ts` | 206 | Agregação 7d: matriz entidade×dia, drill-down por dia | **Sim** — adaptar queries |
| `src/components/BubbleMap.tsx` | 308 | SVG bubble map com `world-map-country-shapes` | **Sim** — reescrever imports |
| `src/components/MapaSidebar.tsx` | 122 | Ranking + clusters por setor | **Sim** — props inalteradas |
| `src/components/MapaTooltip.tsx` | 140 | Tooltip flutuante com sparkline | **Sim** — props inalteradas |
| `server/api/dashboard/mapa.ts` | 180 | Endpoint REST `/api/dashboard/mapa` | **Depende** — se destination usar Nitro/H3, sim |

### 1.2 Mapa de Calor — Arquivos de Suporte

| Arquivo | Linhas | O que faz | Viaja? |
|---|---|---|---|
| `src/lib/brStateOutlines.ts` | ~2000 | Coordenadas SVG dos 27 estados BR | **Sim** — dados estáticos |
| `public/brazil-states.json` | ~14KB | GeoJSON para choropleth | **Sim** |
| `public/countries-110m.json` | ~23KB | TopoJSON países (baixa res) | **Sim** |
| `public/countries-50m.json` | ~109KB | TopoJSON países (alta res) | **Sim** |
| `public/br-centroids.csv` | ~1KB | Centroides dos estados BR | **Sim** |

### 1.3 Pulso Social — Arquivos Essenciais

| Arquivo | Linhas | O que faz | Viaja? |
|---|---|---|---|
| `src/routes/tweets.tsx` | 253 | Página orquestradora: filtros, queries, layout 3-col | **Adaptação** — reescrever queries |
| `src/components/pulso-social/KpiStrip.tsx` | 144 | Faixa 5 KPIs (volume, sentimento, engajamento, perfis, pico) | **Sim** |
| `src/components/pulso-social/FilterRail.tsx` | 288 | Painel de filtros (sentimento, espectro, engajamento, janela) | **Sim** |
| `src/components/pulso-social/AiDigest.tsx` | 154 | Bloco de síntese IA com bullet points | **Sim** |
| `src/components/pulso-social/SignalCard.tsx` | 211 | Card de tweet/sinal com espectro e sentimento | **Sim** |
| `src/components/pulso-social/AsidePanel.tsx` | 157 | Tendências + share of voice | **Sim** |

### 1.4 Lógica Compartilhada (viaja para ambos)

| Arquivo | Linhas | O que faz |
|---|---|---|
| `src/lib/types.ts` | 147 | Interfaces: `Tweet`, `Noticia`, `AnaliseIA`, `MetricaDiaria`, `TopicoQuente`, `MapaCalor` |
| `src/lib/queries.ts` | 418 | Todas as funções de query Supabase |
| `src/lib/espectro.ts` | ~200 | Classificação espectro político (esquerda/centro/direita) |
| `src/lib/verticalGuard.ts` | 42 | Guard de escopo: `VERTICAL_BRASIL`, `VERTICAL_GLOBAL`, `temSinalGlobal()` |
| `src/lib/relTime.ts` | ~50 | Tempo relativo em pt-BR (`há 3min`, `há 2h`) |
| `src/lib/htmlDecode.ts` | ~80 | Decodificação de entidades HTML + `cleanText()` |
| `src/lib/uiStore.ts` | ~80 | Estado global via `useSyncExternalStore` |

### 1.5 Pipeline Geo-Classification (se necessário portar)

| Arquivo | Linhas | O que faz | Viaja? |
|---|---|---|---|
| `src/lib/geo/geo-types.ts` | ~50 | Contratos de tipos | **Sim** |
| `src/lib/geo/geo-constants.ts` | ~200 | Tabelas estáticas (UFs, países, gentílicos) | **Sim** |
| `src/lib/geo/geo-rules.validator.ts` | ~250 | 8 regras de validação pós-LLM | **Sim** |
| `src/lib/geo/gemini-ner.service.ts` | ~120 | Classificação via Gemini Flash Lite | **Adaptação** |
| `src/lib/geo/geo-classifier.service.ts` | ~150 | Orquestrador: batch + audit columns | **Adaptação** |

### 1.6 Navegação (3 componentes compartilhados)

| Arquivo | Atualização necessária |
|---|---|
| `src/components/Masthead.tsx` | Adicionar "Pulso Social" ao `NAV_MORE` e "Mapa de Calor" ao `NAV_MORE` |
| `src/components/Sidebar.tsx` | Adicionar ao `NAV_PRINCIPAL` |
| `src/components/BottomNav.tsx` | Adicionar ao `BOTTOM_NAV` e `MORE_NAV` |

---

## 2. Contrato de Dados

### 2.1 CRÍTICO: Schemas Diferentes entre Origem e Destino

> ⚠️ **O destino (Honorix) lê do MESMO Supabase (`ukbropscfhsootbiloge`) mas usa VIEWS diferentes com nomes de coluna diferentes.**

**Origem (Timeline Radar) — Schema `revista_timeline`:**

| Tabela | Colunas-chave |
|---|---|
| `noticias` | `id`, `vertical_id` (UUID), `titulo`, `fonte`, `resumo`, `url`, `candidatos` (text[]), `sentimento` ("positivo"/"negativo"/"neutro"), `sentimento_score`, `publicado_em`, `coletado_em`, `uf`, `pais_iso`, `escopo` |
| `tweets` | `id`, `vertical_id` (UUID), `autor_nome`, `autor_handle`, `texto`, `url`, `likes`, `retweets`, `views`, `sentimento`, `sentimento_score`, `candidatos` (text[]), `publicado_em`, `coletado_em`, `uf`, `pais_iso`, `escopo` |
| `analises_ia` | `id`, `vertical_id` (UUID), `titulo`, `resumo`, `topicos` (jsonb), `entidades` (text[]), `watch_for`, `created_at` |
| `metricas_diarias` | `vertical_id`, `total_tweets`, `total_noticias`, `total_mencoes`, `engajamento_total`, `sentimento_medio`, `perfis_unicos`, `veiculos_unicos` |
| `topicos_quentes` | `vertical_id`, `entidade`, `score`, `num_mencoes`, `engajamento`, `sentimento`, `sentimento_score`, `variacao_pct` |
| `verticais` | `id`, `slug`, `name`, `is_active` |

**Destino (Honorix) — Views/Tables:**

| View/Tabela | Colunas-chave | Diferença |
|---|---|---|
| `vw_signals_recentes` | `id`, `vertical` (string: "honorix-global"/"honorix-brasil"), `autor_nome`, `texto`, `url`, `platform`, `likes`, `retweets`, `sentimento` ("bullish"/"neutro"/"bearish"), `sentimento_score`, `entities` (jsonb), `publicado_em` | `vertical` é string, não UUID. `entities` é jsonb, não text[]. `platform` em vez de `periodo`. Sentimento usa bullish/bearish. |
| `vw_noticias_recentes` | `id`, `vertical` (string), `titulo`, `fonte`, `resumo`, `url`, `entities` (jsonb), `categories` (jsonb), `sentimento` ("bullish"/"neutro"/"bearish"), `publicado_em`, `tem_imagem`, `imagem_url` | `entities` e `categories` são jsonb. Sem `candidatos`. |
| `vw_topicos_hoje` | `vertical`, `entidade`, `tipo`, `categoria`, `score`, `num_mencoes`, `engajamento`, `sentimento`, `sentimento_score`, `variacao_pct` | Similar mas `vertical` é string. |
| `vw_analises_hoje` | `id`, `vertical` (string), `titulo`, `resumo`, `topicos` (jsonb), `sentimento` ("bullish"/"neutro"/"bearish"), `impacto`, `entities` (jsonb), `tickers` (jsonb), `watch_for`, `created_at` | Sentimento usa bullish/bearish. |
| `mapa_calor` | `entidade`, `valor`, `tipo`, `vertical_id` | Tabela compartilhada (mesmo Supabase). |

### 2.2 Mapeamento de Sentimento

| Timeline Radar | Honorix Insights | Ação |
|---|---|---|
| `positivo` | `bullish` | Mapear na query |
| `negativo` | `bearish` | Mapear na query |
| `neutro` | `neutro` | Idêntico |

### 2.3 Mapeamento de Entidades

| Timeline Radar | Honorix Insights | Ação |
|---|---|---|
| `candidatos` (text[]) | `entities` (jsonb) | Usar `contains` com `jsonbContains()` |
| `periodo` (text) | `platform` (text) | Mapear |
| `vertical_id` (UUID) | `vertical` (string) | Adaptar queries |
| `coletado_em` | `publicado_em` | Adaptar queries |

### 2.4 Queries que Precisam ser Adaptadas

**Pulso Social (queries atuais → queries destino):**

```typescript
// ATUAL (Timeline Radar)
fetchTweets(verticalId: string, limit: number)
  → .from("tweets").eq("vertical_id", verticalId).gte("coletado_em", desde24h())

// DESTINO (Honorix) — adaptar para:
fetchSignals(vertical: "honorix-global" | "honorix-brasil", opts?)
  → .from("vw_signals_recentes").eq("vertical", vertical)
```

**Mapa de Calor (queries atuais → queries destino):**

```typescript
// ATUAL — fetchMapaBubble() faz:
.from("noticias").eq("vertical_id", verticalId).gte("coletado_em", since)
.from("tweets").eq("vertical_id", verticalId).gte("coletado_em", since)

// DESTINO — adaptar para:
.from("vw_noticias_recentes").eq("vertical", vertical)
.from("vw_signals_recentes").eq("vertical", vertical)
// + usar publicado_em em vez de coletado_em para filtro temporal
```

### 2.5 Colunas de Geo (Timeline Radar)

O Mapa de Calor do Timeline Radar usa colunas adicionais que NÃO existem nas views do Honorix:

| Coluna | Tipo | Origem | Precisa no destino? |
|---|---|---|---|
| `uf` | varchar(2) | `noticias`/`tweets` | **Sim** — essencial para escopo BR |
| `pais_iso` | varchar(2) | `noticias`/`tweets` | **Sim** — essencial para escopo world |
| `escopo` | varchar(16) | `noticias`/`tweets` | Útil mas não obrigatório |
| `classified_at` | timestamptz | `noticias`/`tweets` | Audit — opcional |
| `classify_method` | varchar(16) | `noticias`/`tweets` | Audit — opcional |
| `classify_confidence` | varchar(8) | `noticias`/`tweets` | Audit — opcional |

> **MIGRAÇÃO NECESSÁRIA:** Rodar `db/migrations/2026-06-18_add_geo_columns.sql` e `db/migrations/2026-06-18_classify_audit_columns.sql` no Supabase do destino se as views não já tiverem essas colunas.

---

## 3. Lista de Bug Fixes

### 3.1 Drawer 0 Resultados (commit `17a7aad`)

**Problema:** O drawer do Mapa de Calor retornava 0 resultados para entidades que existiam no banco.

**Causa raiz:** A query usava filtro `ov` (overlap) que buscava interseção de arrays — `candidatos` overlap `{entities}`. Para entidades compostas como "Lula 3" ou "Bolsonaro", a busca falhava porque o array do banco tinha variações.

**Solução:** Substituído por `Promise.all` com queries individuais `cs` (contains) para cada entidade-chave (`allKeys`). Cada entidade vira uma query separada, os resultados são mergeados e deduplicados por URL.

**Para portar:** Reaplicar o padrão `Promise.all` com queries `cs` individuais ao adaptar `buscarNoticiasPorLocal()` e `buscarTweetsPorLocal()` para o schema do destino.

### 3.2 Layout Overflow (commit `17a7aad`)

**Problema:** O drawer do mapa estourava o container do layout em telas menores.

**Solução:** Reduzida largura do drawer, adicionado `overflow-x: hidden` no container.

**Para portar:** Testar responsividade do layout no destino.

### 3.3 AiDigest Crash — `t.nome` undefined (commit `0b7a305`)

**Problema:** O componente `AiDigest` crashava com `Cannot read properties of undefined (reading 'replace')`.

**Causa raiz:** `analise.topicos` continha itens com `nome: undefined`. O código fazia `bullets.push(t.nome)` → `b.replace("**", "<strong>")` → crash pois `b` era `undefined`.

**Solução:**
```typescript
// ANTES
topicos.forEach(t => bullets.push(t.nome));
// DEPOIS
topicos.forEach(t => { if (t.nome) bullets.push(t.nome); });

// ANTES
const html = b.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
// DEPOIS
const html = (b || "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
```

**Para portar:** Garantir que `AiDigest.tsx` tenha os guards `if (t.nome)` e `(b || "")`.

### 3.4 Mapeamento de Sentimento Invertido

**Problema:** O `normSent()` do Timeline Radar mapeia "bullish" como neutro (não reconhece o termo).

**Impacto no destino:** Se o Honorix usa "bullish"/"bearish" em vez de "positivo"/"negativo", o `normSent()` precisa ser adaptado.

**Solução:**
```typescript
// ADICIONAR ao normSent():
if (/^(bullish|positive|positive)$/i.test(s)) return "pos";
if (/^(bearish|negative|negative)$/i.test(s)) return "neg";
```

---

## 4. Dependências Externas

### 4.1 NPM Packages (Mapa de Calor)

| Pacote | Usado em | Necessário? |
|---|---|---|
| `react-simple-maps` | `BubbleMap.tsx` | **Sim** — SVG map rendering |
| `world-map-country-shapes` | `BubbleMap.tsx` | **Sim** — country SVG paths |
| `topojson-client` | `mapaGeo.ts` | Não — apenas import types, não usado ativamente |
| `lucide-react` | Múltiplos | **Sim** — ícones |

### 4.2 NPM Packages (Pulso Social)

| Pacote | Usado em | Necessário? |
|---|---|---|
| `lucide-react` | Múltiplos | **Sim** |
| `@tanstack/react-query` | queries | **Sim** — já existe no destino |
| `@tanstack/react-router` | routing | **Sim** — já existe no destino |

### 4.3 Assets Estáticos

| Arquivo | Tamanho | Descrição |
|---|---|---|
| `public/brazil-states.json` | ~14KB | GeoJSON estados BR |
| `public/countries-110m.json` | ~23KB | TopoJSON países (baixa res) |
| `public/countries-50m.json` | ~109KB | TopoJSON países (alta res) |
| `public/br-centroids.csv` | ~1KB | Centroides estados BR |

### 4.4 Infraestrutura Externa

| Serviço | Uso | Status no Destino |
|---|---|---|
| Supabase (`ukbropscfhsootbiloge`) | Banco de dados | **Já conectado** via `external-client.ts` |
| Google Gemini API | Classificação geo (NER) | Configurar `GEMINI_API_KEY` no `.env` |

### 4.5 Environment Variables

| Var | Uso | Presente no Destino? |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase URL | Sim (via Lovable Cloud) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Sim (via Lovable Cloud) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side (classificador) | **Não** — precisa adicionar |
| `GEMINI_API_KEY` | Gemini NER | **Não** — precisa adicionar |

---

## 5. Pontos de Acoplamento Visual

### 5.1 Componentes que Usam CSS Customizado (não Tailwind)

O Timeline Radar usa **styled-components inline** com CSS custom properties. O destino usa **Tailwind + shadcn/ui**. Estes componentes precisam ser reescritos:

| Componente | Estilo Atual | Ação no Destino |
|---|---|---|
| `mapa.tsx` | CSS-in-JS com `styled.div` | Reescrever com Tailwind |
| `tweets.tsx` | `<style>` block com CSS grid | Reescrever com Tailwind |
| `KpiStrip.tsx` | `styled.div` | Reescrever com Tailwind |
| `FilterRail.tsx` | `styled.div` | Reescrever com Tailwind |
| `AiDigest.tsx` | `styled.div` | Reescrever com Tailwind |
| `SignalCard.tsx` | `styled.article` | Reescrever com Tailwind |
| `AsidePanel.tsx` | `styled.aside` | Reescrever com Tailwind |
| `BubbleMap.tsx` | SVG inline + `styled.svg` | Manter SVG, adaptar container |
| `MapaSidebar.tsx` | `styled.div` | Reescrever com Tailwind |
| `MapaTooltip.tsx` | `styled.div` | Reescrever com Tailwind |

### 5.2 CSS Custom Properties que Viajam

Estas variáveis são usadas por todos os componentes e precisam ser definidas no destino:

```css
/* Sentimento */
--positivo / --bullish
--negativo / --bearish
--neutro

/* Espectro */
--esquerda
--centro
--direita

/* Cores do mapa */
--mapa-volume (azul)
--mapa-sentimento (verde-vermelho)
--mapa-momentum (amarelo-laranja)

/* UI */
--bg-principal
--bg-card
--border-subtle
--text-primary
--text-secondary
```

### 5.3 Layout Grid

O Pulso Social usa um 3-column grid fixo:

```css
.pulso-grid {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr) 300px;
  gap: 1.5rem;
}

/* Responsive: <980px → 1 column, rail and aside hide */
/* Responsive: 981-1200px → narrower columns */
```

**No destino:** Adaptar para usar Tailwind `grid-cols-[200px_1fr_300px]` ou componente `resizable` do shadcn.

### 5.4 Mapa SVG

O `BubbleMap.tsx` renderiza um SVG inline com viewBox fixo (1200x600 para world, 600x600 para BR). Os componentes de mapa (paths, circles, text) são SVG puro — NÃO usam Tailwind.

**Ação:** Manter o SVG inline, apenas adaptar o container wrapper para Tailwind.

---

## 6. Checklist de Transferência

### Fase 1: Preparação
- [ ] Rodar migração `add_geo_columns.sql` no Supabase destino (se colunas `uf`/`pais_iso` não existirem)
- [ ] Rodar migração `classify_audit_columns.sql` no Supabase destino
- [ ] Verificar se as views `vw_*` do destino expõem `uf`, `pais_iso` (ou se precisam ser criadas)
- [ ] Adicionar `SUPABASE_SERVICE_ROLE_KEY` e `GEMINI_API_KEY` ao `.env` do destino
- [ ] Instalar `react-simple-maps` e `world-map-country-shapes` no destino

### Fase 2: Pulso Social (mais simples)
- [ ] Adaptar `queries.ts` → mapear `tweets` para `vw_signals_recentes`, `vertical_id` para `vertical`
- [ ] Adaptar `normSent()` para reconhecer "bullish"/"bearish"
- [ ] Copiar componentes `pulso-social/*` e reescrever CSS → Tailwind
- [ ] Adaptar `tweets.tsx` (página) — queries + layout grid → Tailwind
- [ ] Copiar `espectro.ts`, `verticalGuard.ts`, `relTime.ts`, `htmlDecode.ts`
- [ ] Adicionar rotas na navegação (Masthead, Sidebar, BottomNav)

### Fase 3: Mapa de Calor (mais complexo)
- [ ] Adaptar `mapaGeo.ts` — substituir queries de `noticias`/`tweets` para views do destino
- [ ] Copiar `brStateOutlines.ts` e assets GeoJSON
- [ ] Adaptar `BubbleMap.tsx` — reescrever container para Tailwind, manter SVG
- [ ] Adaptar `MapaSidebar.tsx`, `MapaTooltip.tsx` — Tailwind
- [ ] Copiar `mapaCalor7d.ts` — adaptar queries
- [ ] Decidir se o endpoint REST `server/api/dashboard/mapa.ts` é necessário (destination usa Nitro?)
- [ ] Adicionar rota na navegação

### Fase 4: Pipeline Geo (opcional)
- [ ] Copiar `geo/` inteiro (types, constants, rules, gemini-ner, classifier)
- [ ] Adaptar `geo-classifier.service.ts` para Supabase do destino
- [ ] Configurar `GEMINI_API_KEY`
- [ ] Testar classificação em batch

### Fase 5: Validação
- [ ] Verificar que `fetchMapaBubble()` retorna dados com `uf`/`pais_iso`
- [ ] Verificar que filtros do Pulso Social funcionam (sentimento, espectro, engajamento)
- [ ] Verificar que o drawer do mapa retorna resultados (bug fix 3.1)
- [ ] Verificar que `AiDigest` não crasha (bug fix 3.3)
- [ ] Testar responsividade <980px, 981-1200px, >1200px
- [ ] Rodar lint e typecheck do destino
