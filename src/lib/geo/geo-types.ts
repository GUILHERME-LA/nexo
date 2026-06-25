export interface GeoClassification {
  escopo: "nacional" | "internacional" | "regional";
  uf: string | null;
  pais_iso: string | null;
  sentimento: "positivo" | "negativo" | "neutro";
}

export interface RawItem {
  id: string;
  tipo: "noticia" | "tweet";
  titulo: string | null;
  resumo: string | null;
  corpo: string | null;
  texto: string | null;
  fonte: string | null;
  candidatos: string[] | null;
  vertical_id: string;
}

export type ClassifyMethod = "llm" | "heuristic" | "fallback";
export type ClassifyConfidence = "high" | "medium" | "low";

export interface ClassifyResult {
  id: string;
  tipo: "noticia" | "tweet";
  geo: GeoClassification;
  confidence: ClassifyConfidence;
  method: ClassifyMethod;
  classifiedAt: string;
}

export interface ClassifyStats {
  total: number;
  byMethod: Record<ClassifyMethod, number>;
  byConfidence: Record<ClassifyConfidence, number>;
  pendingClassification: number;
}
