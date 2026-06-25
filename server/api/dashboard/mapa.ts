import { defineEventHandler, getQuery } from "h3";
import { createClient } from "@supabase/supabase-js";

function supabaseServer() {
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "revista_timeline" } },
  );
}

type Scope = "br" | "world";
type Periodo = "24h" | "7d" | "30d";

const UF_GEO: Record<string, { lat: number; lon: number; nome: string }> = {
  AC: { lat: -8.77, lon: -70.55, nome: "Acre" },
  AL: { lat: -9.62, lon: -36.62, nome: "Alagoas" },
  AP: { lat: 1.41, lon: -51.77, nome: "Amapá" },
  AM: { lat: -3.07, lon: -61.66, nome: "Amazonas" },
  BA: { lat: -12.97, lon: -38.51, nome: "Bahia" },
  CE: { lat: -3.71, lon: -38.54, nome: "Ceará" },
  DF: { lat: -15.78, lon: -47.93, nome: "Distrito Federal" },
  ES: { lat: -19.18, lon: -37.34, nome: "Espírito Santo" },
  GO: { lat: -16.68, lon: -49.26, nome: "Goiás" },
  MA: { lat: -2.53, lon: -44.28, nome: "Maranhão" },
  MT: { lat: -12.64, lon: -55.72, nome: "Mato Grosso" },
  MS: { lat: -20.51, lon: -54.54, nome: "Mato Grosso do Sul" },
  MG: { lat: -19.92, lon: -43.94, nome: "Minas Gerais" },
  PA: { lat: -3.12, lon: -60.02, nome: "Pará" },
  PB: { lat: -7.07, lon: -35.48, nome: "Paraíba" },
  PR: { lat: -25.43, lon: -49.27, nome: "Paraná" },
  PE: { lat: -8.05, lon: -34.87, nome: "Pernambuco" },
  PI: { lat: -5.09, lon: -42.80, nome: "Piauí" },
  RJ: { lat: -22.91, lon: -43.17, nome: "Rio de Janeiro" },
  RN: { lat: -5.79, lon: -35.21, nome: "Rio Grande do Norte" },
  RS: { lat: -30.03, lon: -51.23, nome: "Rio Grande do Sul" },
  RO: { lat: -11.22, lon: -62.71, nome: "Rondônia" },
  RR: { lat: 2.74, lon: -62.07, nome: "Roraima" },
  SC: { lat: -27.59, lon: -48.55, nome: "Santa Catarina" },
  SE: { lat: -10.90, lon: -37.07, nome: "Sergipe" },
  SP: { lat: -23.55, lon: -46.63, nome: "São Paulo" },
  TO: { lat: -10.25, lon: -48.25, nome: "Tocantins" },
};

function horasPeriodo(periodo: Periodo): number {
  return periodo === "24h" ? 24 : periodo === "7d" ? 168 : 720;
}

export default defineEventHandler(async (event) => {
  const params = getQuery(event);
  const escopo: Scope = params.escopo === "world" ? "world" : "br";
  const periodo: Periodo = ["24h", "7d", "30d"].includes(params.periodo as string)
    ? (params.periodo as Periodo) : "24h";
  const camada = ["sentimento", "volume", "momentum"].includes(params.camada as string)
    ? params.camada : "volume";

  const sb = supabaseServer();
  const horas = horasPeriodo(periodo);
  const desde = new Date(Date.now() - horas * 3600_000).toISOString();
  const col = escopo === "br" ? "uf" : "pais_iso";

  const PAGE = 1000;
  const MAX_PAGES = 10;

  async function fetchAll(tabela: "noticias" | "tweets") {
    const out: any[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const { data, error } = await sb
        .from(tabela)
        .select(`${col}, sentimento, candidatos, titulo, texto, likes, retweets, views, coletado_em, publicado_em`)
        .not(col, "is", null)
        .gte("coletado_em", desde)
        .order("coletado_em", { ascending: false })
        .range(page * PAGE, (page + 1) * PAGE - 1);
      if (error) throw error;
      const lote = data ?? [];
      out.push(...lote);
      if (lote.length < PAGE) break;
    }
    return out;
  }

  const [noticias, tweets] = await Promise.all([fetchAll("noticias"), fetchAll("tweets")]);

  // ── Agregação por local ────────────────────────────────────────────────
  const porLocal = new Map<string, {
    n: number; tw: number; eng: number;
    sentScores: number[];
    entities: Map<string, { vol: number; sentSum: number }>;
  }>();

  function processar(arr: any[], tipo: "noticia" | "tweet") {
    for (const row of arr) {
      const loc = row[col] as string;
      if (!loc) continue;

      if (!porLocal.has(loc)) {
        porLocal.set(loc, {
          n: 0, tw: 0, eng: 0,
          sentScores: [],
          entities: new Map(),
        });
      }
      const acc = porLocal.get(loc)!;

      if (tipo === "noticia") acc.n++; else acc.tw++;
      acc.eng += (row.likes ?? 0) + (row.retweets ?? 0) * 3 + (row.views ?? 0) * 0.01;

      if (row.sentimento) {
        const score = row.sentimento === "positivo" ? 1 : row.sentimento === "negativo" ? -1 : 0;
        acc.sentScores.push(score);
      }

      for (const e of (row.candidatos ?? [])) {
        const existing = acc.entities.get(e);
        if (existing) {
          existing.vol++;
          const s = row.sentimento === "positivo" ? 1 : row.sentimento === "negativo" ? -1 : 0;
          existing.sentSum += s;
        } else {
          const s = row.sentimento === "positivo" ? 1 : row.sentimento === "negativo" ? -1 : 0;
          acc.entities.set(e, { vol: 1, sentSum: s });
        }
      }
    }
  }

  processar(noticias, "noticia");
  processar(tweets, "tweet");

  // ── Montar resposta ────────────────────────────────────────────────────
  const bubbles = [...porLocal.entries()].map(([loc, acc]) => {
    const vol = acc.n + acc.tw;
    const avgSent = acc.sentScores.length > 0
      ? acc.sentScores.reduce((a, b) => a + b, 0) / acc.sentScores.length
      : 0;
    const geo = escopo === "br" ? UF_GEO[loc] : null;

    const topEntidades = [...acc.entities.entries()]
      .map(([name, data]) => ({
        name,
        volume: data.vol,
        sentimentoScore: data.vol > 0 ? data.sentSum / data.vol : 0,
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);

    return {
      local: loc,
      nome: geo?.nome ?? loc,
      volume: vol,
      noticias: acc.n,
      tweets: acc.tw,
      engajamento: acc.eng,
      sentimentoMedio: avgSent,
      geo: geo ? { lat: geo.lat, lon: geo.lon } : null,
      topEntidades,
    };
  }).sort((a, b) => b.volume - a.volume);

  const totalMencoes = bubbles.reduce((a, b) => a + b.volume, 0);
  const epicentro = bubbles[0]?.nome ?? "—";
  const sentimentoGeral = bubbles.length > 0
    ? bubbles.reduce((a, b) => a + b.sentimentoMedio, 0) / bubbles.length
    : 0;

  return {
    escopo,
    periodo,
    camada,
    totalItens: noticias.length + tweets.length,
    kpis: {
      entidadesAtivas: bubbles.length,
      mencoesPeriodo: totalMencoes,
      sentimentoMedio: sentimentoGeral,
      epicentro,
    },
    bubbles,
  };
});
