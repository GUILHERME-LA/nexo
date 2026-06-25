// =============================================================================
// AUDITORIA: rastreabilidade de cada métrica exibida na plataforma.
// Para cada item, produz: query SQL legível + total bruto do banco (COUNT) +
// total dedupado (mesmo que a UI mostra) + diff (duplicatas removidas).
// =============================================================================
import { supabaseRevista } from "./supabaseRevista";
import {
  desde24h,
  fetchNoticias,
  fetchTweets,
  buscarNoticiasPorEntidade,
  buscarTweetsPorEntidade,
  buscarNoticiasPorSentimento,
  buscarTweetsPorSentimento,
} from "./queries";

export type AuditLinha = {
  metrica: string;
  descricao: string;
  sql: string;
  totalBanco: number; // COUNT(*) direto no banco
  totalUI: number; // o que a tela mostra (já dedupado)
  diff: number; // totalBanco - totalUI = duplicatas removidas
};

const SENT_VALORES: Record<"pos" | "neu" | "neg", string> = {
  pos: "positivo",
  neu: "neutro",
  neg: "negativo",
};

async function countDireto(tabela: "noticias" | "tweets", filtros: { verticalId: string; sentimento?: "pos" | "neu" | "neg"; entidade?: string }): Promise<number> {
  let q = supabaseRevista
    .from(tabela)
    .select("id", { count: "exact", head: true })
    .eq("vertical_id", filtros.verticalId)
    .gte("coletado_em", desde24h());
  if (filtros.sentimento) q = q.eq("sentimento", SENT_VALORES[filtros.sentimento]);
  if (filtros.entidade) q = q.filter("candidatos", "cs", JSON.stringify([filtros.entidade]));
  const { count } = await q;
  return count ?? 0;
}

function sqlBase(tabela: string, verticalId: string, extra = ""): string {
  return [
    `SELECT count(*) FROM revista_timeline.${tabela}`,
    `WHERE vertical_id = '${verticalId}'`,
    `  AND coletado_em >= NOW() - INTERVAL '24 hours'`,
    extra,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function auditarResumo24h(verticalId: string): Promise<AuditLinha[]> {
  const [nBanco, tBanco, nUI, tUI] = await Promise.all([
    countDireto("noticias", { verticalId }),
    countDireto("tweets", { verticalId }),
    fetchNoticias(verticalId, 5000).then((a) => a.length),
    fetchTweets(verticalId, 5000).then((a) => a.length),
  ]);
  return [
    {
      metrica: "Notícias (24h)",
      descricao: "Dashboard · Resumo · card Notícias",
      sql: sqlBase("noticias", verticalId),
      totalBanco: nBanco,
      totalUI: nUI,
      diff: nBanco - nUI,
    },
    {
      metrica: "Tweets (24h)",
      descricao: "Dashboard · Resumo · card Tweets",
      sql: sqlBase("tweets", verticalId),
      totalBanco: tBanco,
      totalUI: tUI,
      diff: tBanco - tUI,
    },
    {
      metrica: "Menções (24h)",
      descricao: "Dashboard · Resumo · card Menções (Notícias + Tweets)",
      sql: `${sqlBase("noticias", verticalId)}\n-- + --\n${sqlBase("tweets", verticalId)}`,
      totalBanco: nBanco + tBanco,
      totalUI: nUI + tUI,
      diff: nBanco + tBanco - (nUI + tUI),
    },
  ];
}

export async function auditarTermometro(verticalId: string): Promise<AuditLinha[]> {
  const buckets: Array<"pos" | "neu" | "neg"> = ["pos", "neu", "neg"];
  const labels = { pos: "Positivo", neu: "Neutro", neg: "Negativo" } as const;
  const linhas: AuditLinha[] = [];
  for (const b of buckets) {
    const [nBanco, tBanco, nUI, tUI] = await Promise.all([
      countDireto("noticias", { verticalId, sentimento: b }),
      countDireto("tweets", { verticalId, sentimento: b }),
      buscarNoticiasPorSentimento(verticalId, b).then((a) => a.length),
      buscarTweetsPorSentimento(verticalId, b).then((a) => a.length),
    ]);
    linhas.push({
      metrica: `Termômetro · ${labels[b]} · Notícias`,
      descricao: `Briefing · cartão de sentimento ${labels[b]} (aba Notícias)`,
      sql: sqlBase("noticias", verticalId, `  AND sentimento = '${SENT_VALORES[b]}'`),
      totalBanco: nBanco,
      totalUI: nUI,
      diff: nBanco - nUI,
    });
    linhas.push({
      metrica: `Termômetro · ${labels[b]} · Tweets`,
      descricao: `Briefing · cartão de sentimento ${labels[b]} (aba Tweets)`,
      sql: sqlBase("tweets", verticalId, `  AND sentimento = '${SENT_VALORES[b]}'`),
      totalBanco: tBanco,
      totalUI: tUI,
      diff: tBanco - tUI,
    });
  }
  return linhas;
}

export async function auditarTopicos(verticalId: string, entidades: string[]): Promise<AuditLinha[]> {
  const linhas = await Promise.all(
    entidades.slice(0, 12).map(async (entidade) => {
      const [nBanco, tBanco, nUI, tUI] = await Promise.all([
        countDireto("noticias", { verticalId, entidade }),
        countDireto("tweets", { verticalId, entidade }),
        buscarNoticiasPorEntidade(verticalId, entidade).then((a) => a.length),
        buscarTweetsPorEntidade(verticalId, entidade).then((a) => a.length),
      ]);
      return {
        metrica: `Tópico · ${entidade}`,
        descricao: "Dashboard · Tópicos quentes / Mapa · ranking de menções",
        sql:
          sqlBase("noticias", verticalId, `  AND candidatos @> '["${entidade}"]'`) +
          "\n-- + --\n" +
          sqlBase("tweets", verticalId, `  AND candidatos @> '["${entidade}"]'`),
        totalBanco: nBanco + tBanco,
        totalUI: nUI + tUI,
        diff: nBanco + tBanco - (nUI + tUI),
      } satisfies AuditLinha;
    }),
  );
  return linhas;
}
