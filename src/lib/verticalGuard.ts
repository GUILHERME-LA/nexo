export const VERTICAL_BRASIL = "db8445c4-bb2a-4e65-b56a-f89639d528b6";
export const VERTICAL_GLOBAL = "9e48224b-a497-473b-a07c-fcc61e9fec0b";

export function isInternacional(verticalId: string | null | undefined): boolean {
  return verticalId === VERTICAL_GLOBAL;
}

const SINAIS_GLOBAIS = [
  // organismos
  "onu", "nacoes unidas", "nações unidas", "otan", "nato", "uniao europeia", "união europeia",
  "g20", "g7", "brics", "fmi", "banco mundial", "omc", "mercosul", "opep", "cop30", "haia",
  // países
  "estados unidos", "eua", "china", "russia", "rússia", "ucrania", "ucrânia", "israel",
  "palestina", "ira", "irã", "reino unido", "franca", "frança", "alemanha", "japao", "japão",
  "india", "índia", "venezuela", "argentina", "coreia do norte", "coréia do norte",
  "taiwan", "gaza",
  // líderes
  "trump", "biden", "putin", "xi jinping", "zelensky", "netanyahu", "macron", "milei", "maduro",
  // temas
  "guerra", "sancoes", "sanções", "tarifaco", "tarifaço", "tarifas", "geopolit",
  "comercio internacional", "comércio internacional",
  "crise migratoria", "crise migratória", "aquecimento global",
];

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function temSinalGlobal(...textos: (string | null | undefined)[]): boolean {
  const raw = textos.filter(Boolean).join(" ").toLowerCase();
  const norm = stripAccents(raw);
  return SINAIS_GLOBAIS.some((sinal) => {
    const s = sinal.toLowerCase();
    const sn = stripAccents(s);
    if (!s.includes(" ")) {
      const esc = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(^|[^a-záàãâéêíóôõúü])${esc}([^a-záàãâéêíóôõúü]|$)`);
      return re.test(raw) || re.test(norm);
    }
    return raw.includes(s) || norm.includes(sn);
  });
}
