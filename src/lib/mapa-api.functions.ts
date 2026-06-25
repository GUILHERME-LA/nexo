import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Scope } from "./mapaGeo";

function supabaseServer() {
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "revista_timeline" } },
  );
}

interface MapaQuery {
  escopo: Scope;
  periodo: "24h" | "7d" | "30d";
}

export const fetchMapaData = createServerFn({ method: "GET" })
  .validator((data: MapaQuery) => data)
  .handler(async ({ data }) => {
    const sb = supabaseServer();
    const horas = data.periodo === "24h" ? 24 : data.periodo === "7d" ? 168 : 720;
    const desde = new Date(Date.now() - horas * 3600_000).toISOString();

    const col = data.escopo === "br" ? "uf" : "pais_iso";

    const [nRes, tRes] = await Promise.all([
      sb.from("noticias")
        .select(`${col}, sentimento, candidatos, titulo, resumo`)
        .not(col, "is", null)
        .gte("coletado_em", desde)
        .order("coletado_em", { ascending: false })
        .limit(2000),
      sb.from("tweets")
        .select(`${col}, sentimento, candidatos, texto`)
        .not(col, "is", null)
        .gte("coletado_em", desde)
        .order("coletado_em", { ascending: false })
        .limit(2000),
    ]);

    if (nRes.error || tRes.error) {
      throw new Error(`Supabase error: ${JSON.stringify([nRes.error, tRes.error])}`);
    }

    type Row = { uf?: string; pais_iso?: string; sentimento?: string; candidatos?: string[]; titulo?: string; resumo?: string; texto?: string };
    const noticias = (nRes.data ?? []) as Row[];
    const tweets = (tRes.data ?? []) as Row[];

    const porLocal = new Map<string, {
      n: number; tw: number; sentScores: number[];
      entities: Map<string, number>; textos: string[];
    }>();

    for (const n of noticias) {
      const loc = n[col] as string;
      if (!loc) continue;
      if (!porLocal.has(loc)) porLocal.set(loc, { n: 0, tw: 0, sentScores: [], entities: new Map(), textos: [] });
      const acc = porLocal.get(loc)!;
      acc.n++;
      if (n.sentimento) {
        acc.sentScores.push(n.sentimento === "positivo" ? 1 : n.sentimento === "negativo" ? -1 : 0);
      }
      for (const e of (n.candidatos ?? [])) acc.entities.set(e, (acc.entities.get(e) ?? 0) + 1);
      acc.textos.push(`${n.titulo ?? ""} ${n.resumo ?? ""}`.slice(0, 200));
    }

    for (const t of tweets) {
      const loc = t[col] as string;
      if (!loc) continue;
      if (!porLocal.has(loc)) porLocal.set(loc, { n: 0, tw: 0, sentScores: [], entities: new Map(), textos: [] });
      const acc = porLocal.get(loc)!;
      acc.tw++;
      if (t.sentimento) {
        acc.sentScores.push(t.sentimento === "positivo" ? 1 : t.sentimento === "negativo" ? -1 : 0);
      }
      for (const e of (t.candidatos ?? [])) acc.entities.set(e, (acc.entities.get(e) ?? 0) + 1);
      acc.textos.push((t.texto ?? "").slice(0, 200));
    }

    const bubbles = Array.from(porLocal.entries()).map(([loc, acc]) => ({
      local: loc,
      volume: acc.n + acc.tw,
      noticias: acc.n,
      tweets: acc.tw,
      sentimentoMedio: acc.sentScores.length > 0
        ? acc.sentScores.reduce((a, b) => a + b, 0) / acc.sentScores.length
        : 0,
      topEntidades: Array.from(acc.entities.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, volume]) => ({ name, volume })),
      exemplos: acc.textos.slice(0, 3),
    }));

    return {
      escopo: data.escopo,
      periodo: data.periodo,
      totalItens: noticias.length + tweets.length,
      classificados: noticias.length + tweets.length,
      bubbles,
    };
  });
