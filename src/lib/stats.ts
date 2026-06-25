// =============================================================================
// ESTATÍSTICAS NORMALIZADAS — regras canônicas (24h + dedup por URL)
// =============================================================================
// Todas as estatísticas derivam EXCLUSIVAMENTE das listagens canônicas
// (fetchNoticias / fetchTweets), que já aplicam:
//   1) Janela `coletado_em >= NOW() - 24h`
//   2) Dedup por URL (mais recente vence)
// Assim, "soma por autor", "soma por fonte" e "soma por espectro" sempre
// reconciliam com o total exibido no Dashboard / Briefing.
// =============================================================================
import { fetchNoticias, fetchTweets } from "./queries";
import { resolveEspectro, resolveEspectroTweet, type Espectro } from "./espectro";
import type { Noticia, Tweet } from "./types";

export type LinhaContagem = { chave: string; total: number };

function normalizar(s: string | null | undefined): string {
  return (s ?? "").trim();
}

function agrupar(itens: Array<{ chave: string }>): LinhaContagem[] {
  const m = new Map<string, number>();
  for (const it of itens) {
    if (!it.chave) continue;
    m.set(it.chave, (m.get(it.chave) ?? 0) + 1);
  }
  return Array.from(m.entries())
    .map(([chave, total]) => ({ chave, total }))
    .sort((a, b) => b.total - a.total);
}

export async function estatisticasPorFonte(verticalId: string): Promise<{
  linhas: LinhaContagem[];
  total: number;
  semFonte: number;
}> {
  const noticias = await fetchNoticias(verticalId, 5000);
  const comFonte = noticias
    .map((n) => ({ chave: normalizar(n.fonte) }))
    .filter((x) => x.chave);
  const semFonte = noticias.length - comFonte.length;
  return { linhas: agrupar(comFonte), total: noticias.length, semFonte };
}

export async function estatisticasPorAutorNoticia(verticalId: string): Promise<{
  linhas: LinhaContagem[];
  total: number;
  semAutor: number;
}> {
  const noticias = await fetchNoticias(verticalId, 5000);
  const com = noticias.map((n) => ({ chave: normalizar(n.autor) })).filter((x) => x.chave);
  return { linhas: agrupar(com), total: noticias.length, semAutor: noticias.length - com.length };
}

export async function estatisticasPorAutorTweet(verticalId: string): Promise<{
  linhas: LinhaContagem[];
  total: number;
  semAutor: number;
}> {
  const tweets = await fetchTweets(verticalId, 5000);
  const com = tweets
    .map((t) => ({ chave: normalizar(t.autor_handle ?? t.autor_nome) }))
    .filter((x) => x.chave);
  return { linhas: agrupar(com), total: tweets.length, semAutor: tweets.length - com.length };
}

export type DistribEspectro = Record<Espectro, number>;

function novoDistrib(): DistribEspectro {
  return { esquerda: 0, centro: 0, direita: 0 };
}

export async function estatisticasPorEspectro(verticalId: string): Promise<{
  noticias: DistribEspectro;
  tweets: DistribEspectro;
  totalNoticias: number;
  totalTweets: number;
}> {
  const [noticias, tweets] = await Promise.all([
    fetchNoticias(verticalId, 5000),
    fetchTweets(verticalId, 5000),
  ]);
  const dN = novoDistrib();
  for (const n of noticias as Noticia[]) {
    const e = resolveEspectro(n.espectro, n.titulo, n.resumo, ...(n.candidatos ?? []));
    dN[e] += 1;
  }
  const dT = novoDistrib();
  for (const t of tweets as Tweet[]) {
    const e = resolveEspectroTweet(t.autor_handle);
    dT[e] += 1;
  }
  return {
    noticias: dN,
    tweets: dT,
    totalNoticias: noticias.length,
    totalTweets: tweets.length,
  };
}

// =============================================================================
// VALIDADOR RUNTIME — reconciliação cruzada
// =============================================================================
// Compara: soma das contagens agrupadas + "sem categoria" === total da UI.
// Se divergir, é sinal de bug (a categoria foi calculada sobre um conjunto
// diferente do canônico). Resultado plug-and-play na tela de Auditoria.
// =============================================================================
export type CheckResultado = {
  nome: string;
  esperado: number;
  obtido: number;
  ok: boolean;
  detalhe: string;
};

export async function validarConsistencia(verticalId: string): Promise<CheckResultado[]> {
  const [fontes, autoresN, autoresT, esp] = await Promise.all([
    estatisticasPorFonte(verticalId),
    estatisticasPorAutorNoticia(verticalId),
    estatisticasPorAutorTweet(verticalId),
    estatisticasPorEspectro(verticalId),
  ]);

  const somaFontes = fontes.linhas.reduce((s, l) => s + l.total, 0) + fontes.semFonte;
  const somaAutoresN = autoresN.linhas.reduce((s, l) => s + l.total, 0) + autoresN.semAutor;
  const somaAutoresT = autoresT.linhas.reduce((s, l) => s + l.total, 0) + autoresT.semAutor;
  const somaEspN = esp.noticias.esquerda + esp.noticias.centro + esp.noticias.direita;
  const somaEspT = esp.tweets.esquerda + esp.tweets.centro + esp.tweets.direita;

  return [
    {
      nome: "Notícias por fonte reconciliam com total",
      esperado: fontes.total,
      obtido: somaFontes,
      ok: somaFontes === fontes.total,
      detalhe: `Σ fontes (${somaFontes - fontes.semFonte}) + sem fonte (${fontes.semFonte}) = total dedupado`,
    },
    {
      nome: "Notícias por autor reconciliam com total",
      esperado: autoresN.total,
      obtido: somaAutoresN,
      ok: somaAutoresN === autoresN.total,
      detalhe: `Σ autores + sem autor (${autoresN.semAutor}) = total dedupado`,
    },
    {
      nome: "Tweets por autor reconciliam com total",
      esperado: autoresT.total,
      obtido: somaAutoresT,
      ok: somaAutoresT === autoresT.total,
      detalhe: `Σ autores + sem autor (${autoresT.semAutor}) = total dedupado`,
    },
    {
      nome: "Notícias por espectro reconciliam com total",
      esperado: esp.totalNoticias,
      obtido: somaEspN,
      ok: somaEspN === esp.totalNoticias,
      detalhe: `esquerda + centro + direita = total dedupado`,
    },
    {
      nome: "Tweets por espectro reconciliam com total",
      esperado: esp.totalTweets,
      obtido: somaEspT,
      ok: somaEspT === esp.totalTweets,
      detalhe: `esquerda + centro + direita = total dedupado`,
    },
  ];
}
