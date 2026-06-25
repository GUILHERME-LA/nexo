// =============================================================================
// MAPA DE CALOR · janela deslizante de 7 dias (entidade × dia) — v2
// =============================================================================
import { supabaseRevista } from "./supabaseRevista";
import type { Noticia, Tweet } from "./types";

const TZ = "America/Sao_Paulo";
const _fmtDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export interface DiaCol {
  full: string;
  label: string;
}
export interface LinhaCalor {
  entidade: string;
  valores: number[];
  total: number;
}
export interface MapaCalor7d {
  dias: DiaCol[];
  linhas: LinhaCalor[];
}

function diaBR(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return _fmtDia.format(d);
}

export function diasBR(n = 7): DiaCol[] {
  const hojeBR = _fmtDia.format(new Date());
  const base = new Date(`${hojeBR}T12:00:00Z`);
  const out: DiaCol[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    const full = _fmtDia.format(d);
    const [, M, D] = full.split("-");
    out.push({ full, label: `${D}/${M}` });
  }
  return out;
}

function inicioJanelaISO(dias: DiaCol[]): string {
  return new Date(`${dias[0].full}T00:00:00-03:00`).toISOString();
}

function intervaloDiaISO(full: string): { inicio: string; fim: string } {
  const inicio = new Date(`${full}T00:00:00-03:00`);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

function dedupePorUrl<T extends { url?: string | null; coletado_em?: string | null }>(items: T[]): T[] {
  const vistos = new Map<string, T>();
  const semUrl: T[] = [];
  for (const it of items) {
    const url = (it.url ?? "").trim();
    if (!url) {
      semUrl.push(it);
      continue;
    }
    const atual = vistos.get(url);
    const tNovo = it.coletado_em ? new Date(it.coletado_em).getTime() : 0;
    const tAtual = atual?.coletado_em ? new Date(atual.coletado_em).getTime() : -1;
    if (!atual || tNovo > tAtual) vistos.set(url, it);
  }
  return [...semUrl, ...vistos.values()];
}

type ItemLeve = { url: string | null; candidatos: string[] | null; coletado_em: string | null };
const COLS_LEVE = "url, candidatos, coletado_em";
const PAGE = 1000;
const MAX_LINHAS = 40;

async function fetchTudoLeve(tabela: "noticias" | "tweets", verticalId: string, desde: string): Promise<ItemLeve[]> {
  const out: ItemLeve[] = [];
  for (let off = 0; off <= 50000; off += PAGE) {
    const { data, error } = await supabaseRevista
      .from(tabela)
      .select(COLS_LEVE)
      .eq("vertical_id", verticalId)
      .gte("coletado_em", desde)
      .order("coletado_em", { ascending: false })
      .range(off, off + PAGE - 1);
    if (error) throw error;
    const lote = (data ?? []) as ItemLeve[];
    out.push(...lote);
    if (lote.length < PAGE) break;
  }
  return out;
}

export async function fetchMapaCalor7Dias(verticalId: string): Promise<MapaCalor7d> {
  const dias = diasBR(7);
  const desde = inicioJanelaISO(dias);

  const [noticias, tweets] = await Promise.all([
    fetchTudoLeve("noticias", verticalId, desde),
    fetchTudoLeve("tweets", verticalId, desde),
  ]);

  const idx = new Map(dias.map((d, i) => [d.full, i]));
  const mapa = new Map<string, LinhaCalor>();

  const contar = (arr: ItemLeve[]) => {
    const porDia = new Map<string, ItemLeve[]>();
    for (const it of arr) {
      const dia = diaBR(it.coletado_em);
      if (dia === null || !idx.has(dia)) continue;
      const lista = porDia.get(dia);
      if (lista) lista.push(it);
      else porDia.set(dia, [it]);
    }
    for (const [dia, itens] of porDia) {
      const col = idx.get(dia)!;
      for (const it of dedupePorUrl(itens)) {
        for (const ent of it.candidatos ?? []) {
          if (!ent) continue;
          let row = mapa.get(ent);
          if (!row) {
            row = { entidade: ent, valores: dias.map(() => 0), total: 0 };
            mapa.set(ent, row);
          }
          row.valores[col]++;
          row.total++;
        }
      }
    }
  };
  contar(noticias);
  contar(tweets);

  const linhas = [...mapa.values()].sort((a, b) => b.total - a.total).slice(0, MAX_LINHAS);
  return { dias, linhas };
}

const NOTICIA_COLS =
  "id, vertical_id, titulo, fonte, resumo, autor, imagem_url, url, candidatos, sentimento, tem_imagem, publicado_em, coletado_em";
const TWEET_COLS =
  "id, vertical_id, autor_nome, autor_handle, autor_avatar_url, texto, url, likes, retweets, replies, views, sentimento, sentimento_score, periodo, candidatos, publicado_em, coletado_em";

export async function buscarNoticiasPorEntidadeNoDia(verticalId: string, entidade: string, diaFull: string): Promise<Noticia[]> {
  const { inicio, fim } = intervaloDiaISO(diaFull);
  const { data, error } = await supabaseRevista
    .from("noticias")
    .select(NOTICIA_COLS)
    .eq("vertical_id", verticalId)
    .gte("coletado_em", inicio)
    .lt("coletado_em", fim)
    .filter("candidatos", "cs", JSON.stringify([entidade]))
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .limit(1000);
  if (error) throw error;
  return dedupePorUrl((data ?? []) as Noticia[]);
}

export async function buscarTweetsPorEntidadeNoDia(verticalId: string, entidade: string, diaFull: string): Promise<Tweet[]> {
  const { inicio, fim } = intervaloDiaISO(diaFull);
  const { data, error } = await supabaseRevista
    .from("tweets")
    .select(TWEET_COLS)
    .eq("vertical_id", verticalId)
    .gte("coletado_em", inicio)
    .lt("coletado_em", fim)
    .filter("candidatos", "cs", JSON.stringify([entidade]))
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .limit(1000);
  if (error) throw error;
  return dedupePorUrl((data ?? []) as Tweet[]);
}

export async function buscarNoticiasPorEntidade7d(verticalId: string, entidade: string): Promise<Noticia[]> {
  const desde = inicioJanelaISO(diasBR(7));
  const { data, error } = await supabaseRevista
    .from("noticias")
    .select(NOTICIA_COLS)
    .eq("vertical_id", verticalId)
    .gte("coletado_em", desde)
    .filter("candidatos", "cs", JSON.stringify([entidade]))
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .limit(1000);
  if (error) throw error;
  return dedupePorUrl((data ?? []) as Noticia[]);
}

export async function buscarTweetsPorEntidade7d(verticalId: string, entidade: string): Promise<Tweet[]> {
  const desde = inicioJanelaISO(diasBR(7));
  const { data, error } = await supabaseRevista
    .from("tweets")
    .select(TWEET_COLS)
    .eq("vertical_id", verticalId)
    .gte("coletado_em", desde)
    .filter("candidatos", "cs", JSON.stringify([entidade]))
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .limit(1000);
  if (error) throw error;
  return dedupePorUrl((data ?? []) as Tweet[]);
}
