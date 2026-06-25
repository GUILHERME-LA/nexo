// Tipos espelhando o schema revista_timeline.
export type SentimentoEnum = string; // enum no banco — tratamos como string

export interface Vertical {
  id: string;
  name: string | null;
  slug?: string | null;
  [k: string]: unknown;
}

export interface AnaliseIA {
  id: string;
  vertical_id: string;
  titulo: string | null;
  resumo: string | null;
  topicos: unknown;
  sentimento: SentimentoEnum | null;
  impacto: string | null;
  num_fontes: number | null;
  fontes_urls: unknown;
  entities: unknown;
  categoria: string | null;
  entidades: unknown;
  tickers: unknown;
  watch_for: string | null;
  created_at: string;
}

export interface MetricaDiaria {
  id: string;
  vertical_id: string;
  data_referencia: string;
  total_tweets: number | null;
  total_noticias: number | null;
  total_mencoes: number | null;
  engajamento_total: number | null;
  sentimento_medio: number | null;
  distribuicao_sentimento: Record<string, number> | null;
  perfis_unicos: number | null;
  veiculos_unicos: number | null;
  created_at: string;
  updated_at: string;
}

export interface TopicoQuente {
  id: string;
  vertical_id: string;
  entidade: string;
  score: number | null;
  num_mencoes: number | null;
  engajamento: number | null;
  sentimento: SentimentoEnum | null;
  sentimento_score: number | null;
  variacao_pct: number | null;
  periodo: string | null;
  tipo: string | null;
  categoria: string | null;
  data_referencia: string;
  created_at: string;
}

export interface MapaCalor {
  id: string;
  vertical_id: string;
  entidade: string;
  tipo: string | null;
  label: string;
  valor: number | null;
  data_referencia: string;
  created_at: string;
}

export interface Noticia {
  id: string;
  vertical_id: string;
  titulo: string;
  fonte: string | null;
  resumo: string | null;
  autor: string | null;
  imagem_url: string | null;
  url: string | null;
  candidatos: string[] | null;
  sentimento: SentimentoEnum | null;
  tem_imagem: boolean | null;
  publicado_em: string | null;
  coletado_em: string | null;
  created_at: string;
  espectro?: string | null;
  corpo?: string | null;
}

export interface Tweet {
  id: string;
  vertical_id: string;
  autor_nome: string | null;
  autor_handle: string | null;
  autor_avatar_url: string | null;
  texto: string | null;
  url: string | null;
  likes: number | null;
  retweets: number | null;
  replies: number | null;
  views: number | null;
  sentimento: SentimentoEnum | null;
  sentimento_score: number | null;
  periodo: string | null;
  candidatos: string[] | null;
  publicado_em: string | null;
  coletado_em: string | null;
  espectro?: string | null;
}

export interface PautaFonte {
  titulo?: string;
  url?: string;
  fonte?: string;
  tipo?: string;
}

export interface Pauta {
  id: string;
  vertical_id: string;
  data_referencia: string;
  titulo: string;
  angulo: string | null;
  resumo: string | null;
  contexto: string | null;
  tipo_fonte: string | null;
  fontes: PautaFonte[] | null;
  link_principal: string | null;
  relevancia: number | null;
  sentimento: string | null;
  entidades: string[] | null;
  categoria: string | null;
  espectro: string | null;
  ordem: number | null;
  status: string | null;
  created_at: string;
}

// Normalização de sentimento: mapeia para "pos" | "neu" | "neg".
export function normSent(s: unknown): "pos" | "neu" | "neg" {
  const v = String(s ?? "").toLowerCase();
  if (["pos", "positivo", "positive", "bullish", "bull"].includes(v)) return "pos";
  if (["neg", "negativo", "negative", "bearish", "bear"].includes(v)) return "neg";
  return "neu";
}
