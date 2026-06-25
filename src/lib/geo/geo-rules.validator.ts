import type { GeoClassification, RawItem, ClassifyResult } from "./geo-types";
import {
  DF_FEDERAL_TERMS, UF_KEYWORDS, COUNTRY_KEYWORDS,
  POLITICIAN_UF, VALID_UFS,
} from "./geo-constants";

export function validateGeo(
  geo: GeoClassification,
  item: RawItem,
): { geo: GeoClassification; method: ClassifyResult["method"] } {
  const text = `${item.titulo ?? ""} ${item.resumo ?? ""} ${item.corpo ?? ""} ${item.texto ?? ""}`.toLowerCase();

  // ── REGRA 1: Termos federais → sempre DF ──────────────────────────────
  if (geo.escopo !== "internacional" && DF_FEDERAL_TERMS.some(t => text.includes(t))) {
    // Só forçar DF se o LLM não retornou uma UF mais específica que faz sentido
    if (!geo.uf || !isUfInText(geo.uf, text)) {
      return { geo: { ...geo, uf: "DF", pais_iso: "BR", escopo: "nacional" }, method: "heuristic" };
    }
  }

  // ── REGRA 2: Político forte → UF de origem (se ação no estado) ────────
  if (geo.escopo !== "internacional") {
    const politicianUf = matchPoliticianUf(text);
    if (politicianUf) {
      // Se o LLM já retornou DF mas o político está agindo em seu estado
      if (geo.uf === "DF" && !textAconteceEmDf(text)) {
        return { geo: { ...geo, uf: politicianUf, pais_iso: "BR" }, method: "heuristic" };
      }
      // Se não tem UF nenhuma, usar a do político
      if (!geo.uf) {
        return { geo: { ...geo, uf: politicianUf, pais_iso: "BR" }, method: "heuristic" };
      }
    }
  }

  // ── REGRA 3: UF do LLM inválida → extrair do texto ───────────────────
  if (geo.uf && !VALID_UFS.includes(geo.uf as typeof VALID_UFS[number])) {
    const textUf = extractUfFromText(text);
    if (textUf) {
      return { geo: { ...geo, uf: textUf, pais_iso: "BR" }, method: "heuristic" };
    }
    return { geo: { ...geo, uf: null }, method: "heuristic" };
  }

  // ── REGRA 4: UF presente mas país inconsistente ──────────────────────
  if (geo.uf && geo.pais_iso !== "BR") {
    return { geo: { ...geo, pais_iso: "BR" }, method: "heuristic" };
  }

  // ── REGRA 5: Nacional sem UF → tentar extrair do texto ───────────────
  if (geo.escopo === "nacional" && !geo.uf) {
    const textUf = extractUfFromText(text);
    if (textUf) {
      return { geo: { ...geo, uf: textUf, pais_iso: "BR" }, method: "heuristic" };
    }
  }

  // ── REGRA 6: Internacional com UF → resolver conflito ────────────────
  if (geo.escopo === "internacional" && geo.uf) {
    const hasForeignMention = Object.keys(COUNTRY_KEYWORDS).some(k => text.includes(k));
    if (hasForeignMention) {
      return { geo: { ...geo, uf: null }, method: "heuristic" };
    }
    return { geo: { ...geo, escopo: "nacional" }, method: "heuristic" };
  }

  // ── REGRA 7: Sem UF e sem país → tentar tudo ─────────────────────────
  if (!geo.uf && !geo.pais_iso) {
    const textUf = extractUfFromText(text);
    if (textUf) {
      return { geo: { ...geo, uf: textUf, pais_iso: "BR", escopo: "nacional" }, method: "heuristic" };
    }
    if (isTextAboutFederalPolitics(text)) {
      return { geo: { ...geo, uf: "DF", pais_iso: "BR", escopo: "nacional" }, method: "fallback" };
    }
  }

  // ── REGRA 8: Nacional com UF do LLM mas texto menciona outra UF ──────
  // Se o LLM retornou uma UF e o texto menciona explicitamente outra UF,
  // e a UF do texto tem mais menções, pode ser que o LLM errou.
  if (geo.uf && geo.escopo === "nacional") {
    const textUf = extractUfFromText(text);
    if (textUf && textUf !== geo.uf) {
      // Contar menções de cada UF no texto
      const countLlm = countUfMentions(geo.uf, text);
      const countText = countUfMentions(textUf, text);
      if (countText > countLlm * 2) {
        return { geo: { ...geo, uf: textUf, pais_iso: "BR" }, method: "heuristic" };
      }
    }
  }

  return { geo, method: "llm" };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function isUfInText(uf: string, text: string): boolean {
  const stateNames: Record<string, string[]> = {
    SP: ["são paulo", "paulista"],
    RJ: ["rio de janeiro", "carioca", "fluminense"],
    MG: ["minas gerais", "belo horizonte", "mineiro"],
    BA: ["bahia", "salvador", "baiano"],
    DF: ["distrito federal", "brasília", "brasilia", "planalto"],
    RS: ["rio grande do sul", "porto alegre", "gaúcho"],
    PR: ["paraná", "curitiba", "paranaense"],
    PE: ["pernambuco", "recife", "pernambucano"],
    CE: ["ceará", "fortaleza", "cearense"],
    GO: ["goiás", "goiânia", "goiano"],
    AM: ["amazonas", "manaus", "amazônico"],
    PA: ["pará", "belém", "paraense"],
    SC: ["santa catarina", "florianópolis", "catarinense"],
    ES: ["espírito santo", "vitória", "capixaba"],
    MA: ["maranhão", "são luís", "maranhense"],
    MS: ["mato grosso do sul", "campo grande"],
    MT: ["mato grosso", "cuiabá"],
    PB: ["paraíba", "joão pessoa"],
    RN: ["rio grande do norte", "natal"],
    PI: ["piauí", "teresina"],
    AL: ["alagoas", "maceió"],
    SE: ["sergipe", "aracaju"],
    TO: ["tocantins", "palmas"],
    RO: ["rondônia", "porto velho"],
    AC: ["acre", "rio branco"],
    AP: ["amapá", "macapá"],
    RR: ["roraima", "boa vista"],
  };
  const keywords = stateNames[uf] ?? [];
  return keywords.some(k => text.includes(k));
}

function extractUfFromText(text: string): string | null {
  // Primeiro verificar termos compostos (mais longos = mais específicos)
  const sorted = Object.entries(UF_KEYWORDS)
    .filter(([, uf]) => uf !== null)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [keyword, uf] of sorted) {
    if (text.includes(keyword)) return uf;
  }
  return null;
}

function matchPoliticianUf(text: string): string | null {
  for (const [name, uf] of Object.entries(POLITICIAN_UF)) {
    if (text.includes(name)) return uf;
  }
  return null;
}

function textAconteceEmDf(text: string): boolean {
  return DF_FEDERAL_TERMS.some(t => text.includes(t))
    || text.includes("em brasília")
    || text.includes("em brasilia")
    || text.includes("no planalto")
    || text.includes("no congresso")
    || text.includes("no senado")
    || text.includes("na câmara");
}

function isTextAboutFederalPolitics(text: string): boolean {
  return text.includes("política") || text.includes("governo")
    || text.includes("senado") || text.includes("câmara")
    || text.includes("congresso") || text.includes("ministro")
    || text.includes("deputado") || text.includes("senador");
}

function countUfMentions(uf: string, text: string): number {
  const stateNames: Record<string, string[]> = {
    SP: ["são paulo", "paulista"],
    RJ: ["rio de janeiro", "carioca"],
    MG: ["minas gerais", "mineiro"],
    BA: ["bahia", "baiano"],
    DF: ["distrito federal", "brasília"],
    RS: ["rio grande do sul"],
    PR: ["paraná", "curitiba"],
    PE: ["pernambuco"],
    CE: ["ceará"],
    GO: ["goiás"],
    AM: ["amazonas"],
    PA: ["pará"],
    SC: ["santa catarina"],
    ES: ["espírito santo"],
    MA: ["maranhão"],
    MS: ["mato grosso do sul"],
    MT: ["mato grosso"],
    PB: ["paraíba"],
    RN: ["rio grande do norte"],
    PI: ["piauí"],
    AL: ["alagoas"],
    SE: ["sergipe"],
    TO: ["tocantins"],
    RO: ["rondônia"],
    AC: ["acre"],
    AP: ["amapá"],
    RR: ["roraima"],
  };
  const keywords = stateNames[uf] ?? [];
  let count = 0;
  for (const k of keywords) {
    let idx = 0;
    while ((idx = text.indexOf(k, idx)) !== -1) {
      count++;
      idx += k.length;
    }
  }
  return count;
}
