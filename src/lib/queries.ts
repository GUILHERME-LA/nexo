import { supabaseRevista } from "./supabaseRevista";
import type { AnaliseIA, MapaCalor, MetricaDiaria, Noticia, Pauta, TopicoQuente, Tweet, Vertical } from "./types";

function nameOf(v: Vertical): string {
  return v.name || v.slug || v.id;
}
export { nameOf };

// =============================================================================
// REGRA CANÔNICA DE JANELA TEMPORAL
// =============================================================================
// TODA consulta analítica (contadores, gráficos, rankings, listagens das telas
// principais) usa EXCLUSIVAMENTE `coletado_em >= NOW() - 24h`.
// Nunca usar `publicado_em` para filtro temporal — apenas para ordenação visual.
// Exceção única: as funções `fetchTodasNoticias` / `fetchTodosTweets` (Arquivo).
// =============================================================================
export const JANELA_24H_MS = 24 * 60 * 60 * 1000;
export function desde24h(): string {
  return new Date(Date.now() - JANELA_24H_MS).toISOString();
}

// =============================================================================
// DEDUP CANÔNICO POR URL
// =============================================================================
// Mantém o registro mais recente (`coletado_em` desc) quando há a mesma URL.
// Itens sem URL passam direto (não há critério estável para dedup).
// =============================================================================
function dedupePorUrl<T extends { id: string; url?: string | null; coletado_em?: string | null }>(items: T[]): T[] {
  const vistos = new Map<string, T>();
  const sair: T[] = [];
  for (const it of items) {
    const url = (it.url ?? "").trim();
    if (!url) {
      sair.push(it);
      continue;
    }
    const atual = vistos.get(url);
    if (!atual) {
      vistos.set(url, it);
      continue;
    }
    const tNovo = it.coletado_em ? new Date(it.coletado_em).getTime() : 0;
    const tAtual = atual.coletado_em ? new Date(atual.coletado_em).getTime() : 0;
    if (tNovo > tAtual) vistos.set(url, it);
  }
  return [...sair, ...vistos.values()];
}

export async function fetchVerticais(): Promise<Vertical[]> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 8_000);

  try {
    const { data, error } = await supabaseRevista
      .from("verticais")
      .select("id, slug, name")
      .eq("is_active", true)
      .order("name")
      .abortSignal(controller.signal);

    if (error) throw error;
    return (data ?? []) as Vertical[];
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export async function fetchAnaliseDestaque(verticalId: string): Promise<AnaliseIA | null> {
  const { data, error } = await supabaseRevista
    .from("analises_ia")
    .select("*")
    .eq("vertical_id", verticalId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as AnaliseIA) ?? null;
}

// ---- Sentimento: contagem ao vivo (Termômetro) e busca de itens --------------

const SENT_VALORES: Record<"pos" | "neu" | "neg", string[]> = {
  pos: ["positivo"],
  neu: ["neutro"],
  neg: ["negativo"],
};

// Termômetro: conta sentimento com 2 queries leves (apenas coluna sentimento)
// em vez de 6 queries pesadas (dados completos) como antes.
export async function fetchTermometro(
  verticalId: string,
): Promise<Record<"pos" | "neu" | "neg", { noticias: number; tweets: number }>> {
  const [noticias, tweets] = await Promise.all([
    supabaseRevista
      .from("noticias")
      .select("sentimento")
      .eq("vertical_id", verticalId)
      .gte("coletado_em", desde24h()),
    supabaseRevista
      .from("tweets")
      .select("sentimento")
      .eq("vertical_id", verticalId)
      .gte("coletado_em", desde24h()),
  ]);

  const nots = ((noticias.data ?? []) as { sentimento?: string | null }[]);
  const tws = ((tweets.data ?? []) as { sentimento?: string | null }[]);

  const c = (rows: { sentimento?: string | null }[], v: string) =>
    rows.filter((r) => (r.sentimento ?? "").toLowerCase() === v).length;

  return {
    pos: { noticias: c(nots, "positivo"), tweets: c(tws, "positivo") },
    neu: { noticias: c(nots, "neutro"), tweets: c(tws, "neutro") },
    neg: { noticias: c(nots, "negativo"), tweets: c(tws, "negativo") },
  };
}

export async function buscarNoticiasPorSentimento(
  verticalId: string,
  bucket: "pos" | "neu" | "neg",
  limit = 300,
): Promise<Noticia[]> {
  const { data, error } = await supabaseRevista
    .from("noticias")
    .select(NOTICIA_COLS)
    .eq("vertical_id", verticalId)
    .gte("coletado_em", desde24h())
    .in("sentimento", SENT_VALORES[bucket])
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return dedupePorUrl((data ?? []) as Noticia[]);
}

export async function buscarTweetsPorSentimento(
  verticalId: string,
  bucket: "pos" | "neu" | "neg",
  limit = 300,
): Promise<Tweet[]> {
  const { data, error } = await supabaseRevista
    .from("tweets")
    .select(TWEET_COLS)
    .eq("vertical_id", verticalId)
    .gte("coletado_em", desde24h())
    .in("sentimento", SENT_VALORES[bucket])
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return dedupePorUrl((data ?? []) as Tweet[]);
}

export async function fetchMetricaDiaria(verticalId: string): Promise<MetricaDiaria | null> {
  const { data, error } = await supabaseRevista
    .from("metricas_diarias")
    .select("*")
    .eq("vertical_id", verticalId)
    .order("data_referencia", { ascending: false })
    .limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as MetricaDiaria) ?? null;
}

// Resumo das últimas 24h — REGRA CANÔNICA: coletado_em >= NOW() - 24h.
// Conta a partir das LISTAGENS dedupadas para que os 4 cards do Dashboard
// reflitam exatamente os mesmos registros que aparecem no clipping / mapa /
// drawer (dedup por URL aplicado em todos os lugares).
export async function fetchResumo24h(
  verticalId: string,
): Promise<{ noticias: number; tweets: number; mencoes: number; engajamento: number }> {
  const [noticias, tweets] = await Promise.all([
    fetchNoticias(verticalId, 5000),
    fetchTweets(verticalId, 5000),
  ]);
  const engajamento = tweets.reduce(
    (s, t) => s + (t.likes ?? 0) + (t.retweets ?? 0) + (t.replies ?? 0),
    0,
  );
  return {
    noticias: noticias.length,
    tweets: tweets.length,
    mencoes: noticias.length + tweets.length,
    engajamento,
  };
}

export async function fetchTopicosQuentes(verticalId: string): Promise<TopicoQuente[]> {
  // último data_referencia disponível para a vertical
  const { data: ref, error: e1 } = await supabaseRevista
    .from("topicos_quentes")
    .select("data_referencia")
    .eq("vertical_id", verticalId)
    .order("data_referencia", { ascending: false })
    .limit(1);
  if (e1) throw e1;
  const dref = (ref ?? [])[0]?.data_referencia;
  if (!dref) return [];
  const { data, error } = await supabaseRevista
    .from("topicos_quentes")
    .select("*")
    .eq("vertical_id", verticalId)
    .eq("data_referencia", dref)
    .order("score", { ascending: false });
  if (error) throw error;
  const linhas = (data ?? []) as TopicoQuente[];

  // Recontagem 24h em batch (2 queries no total) em vez de 2N queries
  const [todasNoticias, todosTweets] = await Promise.all([
    supabaseRevista
      .from("noticias")
      .select("id, candidatos")
      .eq("vertical_id", verticalId)
      .gte("coletado_em", desde24h()),
    supabaseRevista
      .from("tweets")
      .select("id, candidatos")
      .eq("vertical_id", verticalId)
      .gte("coletado_em", desde24h()),
  ]);

  const arrNoticias = (todasNoticias.data ?? []) as { id: string; candidatos?: string[] }[];
  const arrTweets = (todosTweets.data ?? []) as { id: string; candidatos?: string[] }[];

  const reais = linhas.map((t) => {
    const nNots = arrNoticias.filter((n) => Array.isArray(n.candidatos) && n.candidatos.includes(t.entidade)).length;
    const nTws = arrTweets.filter((tw) => Array.isArray(tw.candidatos) && tw.candidatos.includes(t.entidade)).length;
    return { ...t, num_mencoes: nNots + nTws };
  });

  const maxReal = reais.reduce((m, t) => Math.max(m, t.num_mencoes ?? 0), 0);
  const ajustadas = reais.map((t) => ({
    ...t,
    score: maxReal > 0 ? Math.round(((t.num_mencoes ?? 0) / maxReal) * 100) : 0,
  }));

  return ajustadas.filter((t) => (t.num_mencoes ?? 0) > 0).sort((a, b) => (b.num_mencoes ?? 0) - (a.num_mencoes ?? 0));
}

export async function fetchMapaCalor(verticalId: string): Promise<MapaCalor[]> {
  const { data, error } = await supabaseRevista
    .from("mapa_calor")
    .select("*")
    .eq("vertical_id", verticalId)
    .order("data_referencia", { ascending: false })
    .limit(2000);
  if (error) throw error;
  return (data ?? []) as MapaCalor[];
}

// Ranking de menções nas últimas 24h — usa as MESMAS funções de busca por
// entidade (com janela 24h + dedup), então célula do mapa e drawer sempre
// batem. A tabela `mapa_calor` é usada só como lista de entidades candidatas.
export async function fetchRankingMencoes(
  verticalId: string,
): Promise<{ entidade: string; noticias: number; tweets: number; valor: number }[]> {
  const mc = await supabaseRevista.from("mapa_calor").select("entidade").eq("vertical_id", verticalId).limit(2000);
  if (mc.error) throw mc.error;
  const entidades = Array.from(
    new Set((mc.data ?? []).map((r) => (r as { entidade: string }).entidade).filter(Boolean)),
  );

  const linhas = await Promise.all(
    entidades.map(async (entidade) => {
      const [nots, tws] = await Promise.all([
        buscarNoticiasPorEntidade(verticalId, entidade),
        buscarTweetsPorEntidade(verticalId, entidade),
      ]);
      return { entidade, noticias: nots.length, tweets: tws.length, valor: nots.length + tws.length };
    }),
  );

  return linhas.filter((l) => l.valor > 0).sort((a, b) => b.valor - a.valor);
}

const NOTICIA_COLS =
  "id, vertical_id, titulo, fonte, resumo, autor, imagem_url, url, candidatos, sentimento, tem_imagem, publicado_em, coletado_em";
const TWEET_COLS =
  "id, vertical_id, autor_nome, autor_handle, autor_avatar_url, texto, url, likes, retweets, replies, views, sentimento, sentimento_score, periodo, candidatos, publicado_em, coletado_em";

// Listagem canônica de notícias da vertical (últimas 24h por coletado_em).
export async function fetchNoticias(verticalId: string, limit = 60): Promise<Noticia[]> {
  const { data, error } = await supabaseRevista
    .from("noticias")
    .select(NOTICIA_COLS)
    .eq("vertical_id", verticalId)
    .gte("coletado_em", desde24h())
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return dedupePorUrl((data ?? []) as Noticia[]);
}

export async function buscarNoticias(verticalId: string, termo: string, limit = 60): Promise<Noticia[]> {
  const t = termo.trim();
  if (!t) return [];
  const like = `%${t}%`;
  const { data, error } = await supabaseRevista
    .from("noticias")
    .select(NOTICIA_COLS)
    .eq("vertical_id", verticalId)
    .gte("coletado_em", desde24h())
    .or(`titulo.ilike.${like},resumo.ilike.${like},fonte.ilike.${like}`)
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return dedupePorUrl((data ?? []) as Noticia[]);
}

// Listagem canônica de tweets da vertical (últimas 24h por coletado_em).
export async function fetchTweets(verticalId: string, limit = 80): Promise<Tweet[]> {
  const { data, error } = await supabaseRevista
    .from("tweets")
    .select(TWEET_COLS)
    .eq("vertical_id", verticalId)
    .gte("coletado_em", desde24h())
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return dedupePorUrl((data ?? []) as Tweet[]);
}

// --- Busca de conteúdo por entidade (tópico quente / mapa) ---------------
// Mesma regra canônica: 24h + dedup. Assim cabeçalho do tópico, célula do
// mapa e conteúdo do drawer SEMPRE batem.

export async function buscarNoticiasPorEntidade(verticalId: string, entidade: string, limit = 500): Promise<Noticia[]> {
  const { data, error } = await supabaseRevista
    .from("noticias")
    .select(NOTICIA_COLS)
    .eq("vertical_id", verticalId)
    .gte("coletado_em", desde24h())
    .filter("candidatos", "cs", JSON.stringify([entidade]))
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return dedupePorUrl((data ?? []) as Noticia[]);
}

export async function buscarTweetsPorEntidade(verticalId: string, entidade: string, limit = 500): Promise<Tweet[]> {
  const { data, error } = await supabaseRevista
    .from("tweets")
    .select(TWEET_COLS)
    .eq("vertical_id", verticalId)
    .gte("coletado_em", desde24h())
    .filter("candidatos", "cs", JSON.stringify([entidade]))
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return dedupePorUrl((data ?? []) as Tweet[]);
}

// --- Arquivo: acervo HISTÓRICO completo, sem janela temporal -------------
// Exceção única à regra canônica. Dedup por URL continua aplicado.

export async function fetchTodasNoticias(limit = 30, offset = 0): Promise<Noticia[]> {
  const { data, error } = await supabaseRevista
    .from("noticias")
    .select(NOTICIA_COLS)
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return dedupePorUrl((data ?? []) as Noticia[]);
}

export async function fetchTodosTweets(limit = 30, offset = 0): Promise<Tweet[]> {
  const { data, error } = await supabaseRevista
    .from("tweets")
    .select(TWEET_COLS)
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return dedupePorUrl((data ?? []) as Tweet[]);
}

export async function fetchUltimaColeta(verticalId: string): Promise<string | null> {
  const [{ data: n }, { data: t }] = await Promise.all([
    supabaseRevista
      .from("noticias")
      .select("coletado_em")
      .eq("vertical_id", verticalId)
      .order("coletado_em", { ascending: false, nullsFirst: false })
      .limit(1),
    supabaseRevista
      .from("tweets")
      .select("coletado_em")
      .eq("vertical_id", verticalId)
      .order("coletado_em", { ascending: false, nullsFirst: false })
      .limit(1),
  ]);
  const a = (n ?? [])[0]?.coletado_em as string | undefined;
  const b = (t ?? [])[0]?.coletado_em as string | undefined;
  if (!a && !b) return null;
  if (!a) return b!;
  if (!b) return a!;
  return new Date(a) > new Date(b) ? a : b;
}

export async function fetchPautas(verticalId: string): Promise<Pauta[]> {
  const { data: ref, error: e1 } = await supabaseRevista
    .from("pautas_sugeridas")
    .select("data_referencia")
    .eq("vertical_id", verticalId)
    .order("data_referencia", { ascending: false })
    .limit(1);
  if (e1) throw e1;
  const dref = (ref ?? [])[0]?.data_referencia;
  if (!dref) return [];
  const { data, error } = await supabaseRevista
    .from("pautas_sugeridas")
    .select(
      "id, vertical_id, data_referencia, titulo, angulo, resumo, contexto, tipo_fonte, fontes, link_principal, relevancia, sentimento, entidades, categoria, espectro, ordem, status, created_at",
    )
    .eq("vertical_id", verticalId)
    .eq("data_referencia", dref)
    .order("ordem", { ascending: true, nullsFirst: false })
    .order("relevancia", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Pauta[];
}
