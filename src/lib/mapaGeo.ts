// =============================================================================
// MAPA DE CALOR · Dados geográficos + bubble metrics
// =============================================================================
import { supabaseRevista } from "./supabaseRevista";
import { desde24h } from "./queries";
import type { TopicoQuente, MetricaDiaria } from "./types";

// ── Tipos ──────────────────────────────────────────────────────────────────
export type Scope = "br" | "world";
export type Layer = "sentimento" | "volume" | "momentum";
export type Periodo = "24h" | "7d" | "30d";

export interface GeoPoint {
  lat: number;
  lon: number;
  country?: string;
  flag?: string;
  uf?: string;
}

export interface BubbleData {
  entidade: string;
  volume: number;
  sentimentoScore: number;
  momentum: number;
  engajamento: number;
  sector: string;
  sparkline: number[];
  geo: GeoPoint | null;
  tipo?: string | null;
  variacaoPct?: number | null;
  topEntidades?: { key: string; nome: string; volume: number; sentimentoScore: number }[];
  allKeys?: string[];
  semLocalizacao?: boolean;
}

export interface MapaKpis {
  entidadesAtivas: number;
  mencoesPeriodo: number;
  sentimentoMedio: number;
  epicentro: string;
  semLocalizacao?: number;
}

// ── Geolocalização de entidades ────────────────────────────────────────────
// Mapeamento estático: entidade → coordenadas + metadados
const ENTITY_GEO: Record<string, GeoPoint> = {
  // ── Brasil: líderes e instituições ──
  "lula":                    { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "governo federal":         { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "bolsonaro":               { lat: -23.55, lon: -46.63, country: "Brasil", flag: "🇧🇷", uf: "SP" },
  "tarcísio de freitas":     { lat: -23.55, lon: -46.63, country: "Brasil", flag: "🇧🇷", uf: "SP" },
  "tarcisio de freitas":     { lat: -23.55, lon: -46.63, country: "Brasil", flag: "🇧🇷", uf: "SP" },
  "zema":                    { lat: -19.92, lon: -43.94, country: "Brasil", flag: "🇧🇷", uf: "MG" },
  "romeu zema":              { lat: -19.92, lon: -43.94, country: "Brasil", flag: "🇧🇷", uf: "MG" },
  "nikolas ferreira":        { lat: -19.92, lon: -43.94, country: "Brasil", flag: "🇧🇷", uf: "MG" },
  "haddad":                  { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "fernando haddad":         { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "pablo marçal":            { lat: -23.55, lon: -46.63, country: "Brasil", flag: "🇧🇷", uf: "SP" },
  "marina silva":            { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "flávio dino":             { lat: -2.53, lon: -44.28, country: "Brasil", flag: "🇧🇷", uf: "MA" },
  "deltan":                  { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "caiado":                  { lat: -16.68, lon: -49.26, country: "Brasil", flag: "🇧🇷", uf: "GO" },
  "carla zambelli":          { lat: -23.55, lon: -46.63, country: "Brasil", flag: "🇧🇷", uf: "SP" },
  "moro":                    { lat: -25.43, lon: -49.27, country: "Brasil", flag: "🇧🇷", uf: "PR" },
  "sergio moro":             { lat: -25.43, lon: -49.27, country: "Brasil", flag: "🇧🇷", uf: "PR" },
  "damares":                 { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "damares alves":           { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "janja":                   { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  " Gleisi":                 { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "gleisi hoffmann":         { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "pt":                      { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "partido dos trabalhadores": { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "pl":                      { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "partido liberal":         { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "congresso":               { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "senado":                  { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "câmara dos deputados":    { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "supremo tribunal federal": { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "stf":                     { lat: -15.78, lon: -47.93, country: "Brasil", flag: "🇧🇷", uf: "DF" },
  "cop30":                   { lat: -3.12, lon: -60.02, country: "Brasil", flag: "🇧🇷", uf: "AM" },

  // ── Internacional: países e líderes ──
  "estados unidos":          { lat: 38.90, lon: -77.04, country: "Estados Unidos", flag: "🇺🇸" },
  "eua":                     { lat: 38.90, lon: -77.04, country: "Estados Unidos", flag: "🇺🇸" },
  "trump":                   { lat: 38.90, lon: -77.04, country: "Estados Unidos", flag: "🇺🇸" },
  "china":                   { lat: 39.90, lon: 116.40, country: "China", flag: "🇨🇳" },
  "xi jinping":              { lat: 39.90, lon: 116.40, country: "China", flag: "🇨🇳" },
  "rússia":                  { lat: 55.75, lon: 37.62, country: "Rússia", flag: "🇷🇺" },
  "russia":                  { lat: 55.75, lon: 37.62, country: "Rússia", flag: "🇷🇺" },
  "putin":                   { lat: 55.75, lon: 37.62, country: "Rússia", flag: "🇷🇺" },
  "ucrânia":                 { lat: 50.45, lon: 30.52, country: "Ucrânia", flag: "🇺🇦" },
  "ucrania":                 { lat: 50.45, lon: 30.52, country: "Ucrânia", flag: "🇺🇦" },
  "zelensky":                { lat: 50.45, lon: 30.52, country: "Ucrânia", flag: "🇺🇦" },
  "israel":                  { lat: 31.77, lon: 35.23, country: "Israel", flag: "🇮🇱" },
  "netanyahu":               { lat: 31.77, lon: 35.23, country: "Israel", flag: "🇮🇱" },
  "palestina":               { lat: 31.95, lon: 35.20, country: "Palestina", flag: "🇵🇸" },
  "gaza":                    { lat: 31.50, lon: 34.47, country: "Palestina", flag: "🇵🇸" },
  "reino unido":             { lat: 51.51, lon: -0.13, country: "Reino Unido", flag: "🇬🇧" },
  "frança":                  { lat: 48.86, lon: 2.35, country: "França", flag: "🇫🇷" },
  "franca":                  { lat: 48.86, lon: 2.35, country: "França", flag: "🇫🇷" },
  "macron":                  { lat: 48.86, lon: 2.35, country: "França", flag: "🇫🇷" },
  "alemanha":                { lat: 52.52, lon: 13.41, country: "Alemanha", flag: "🇩🇪" },
  "japão":                   { lat: 35.68, lon: 139.69, country: "Japão", flag: "🇯🇵" },
  "japao":                   { lat: 35.68, lon: 139.69, country: "Japão", flag: "🇯🇵" },
  "índia":                   { lat: 28.61, lon: 77.21, country: "Índia", flag: "🇮🇳" },
  "india":                   { lat: 28.61, lon: 77.21, country: "Índia", flag: "🇮🇳" },
  "argentina":               { lat: -34.60, lon: -58.38, country: "Argentina", flag: "🇦🇷" },
  "milei":                   { lat: -34.60, lon: -58.38, country: "Argentina", flag: "🇦🇷" },
  "venezuela":               { lat: 10.48, lon: -66.90, country: "Venezuela", flag: "🇻🇪" },
  "maduro":                  { lat: 10.48, lon: -66.90, country: "Venezuela", flag: "🇻🇪" },
  "coreia do norte":         { lat: 39.02, lon: 125.75, country: "Coreia do Norte", flag: "🇰🇵" },
  "taiwan":                  { lat: 25.03, lon: 121.57, country: "Taiwan", flag: "🇹🇼" },

  // ── Organismos ──
  "onu":                     { lat: 40.75, lon: -73.97, country: "ONU", flag: "🇺🇳" },
  "nacoes unidas":           { lat: 40.75, lon: -73.97, country: "ONU", flag: "🇺🇳" },
  "nato":                    { lat: 50.85, lon: 4.35, country: "OTAN", flag: "🏴" },
  "otan":                    { lat: 50.85, lon: 4.35, country: "OTAN", flag: "🏴" },
  "g20":                     { lat: -15.78, lon: -47.93, country: "G20", flag: "🌍" },
  "g7":                      { lat: 48.86, lon: 2.35, country: "G7", flag: "🌍" },
  "brics":                   { lat: 39.90, lon: 116.40, country: "BRICS", flag: "🌍" },
  "fmi":                     { lat: 38.90, lon: -77.04, country: "FMI", flag: "🏦" },
  "banco mundial":           { lat: 38.90, lon: -77.04, country: "Banco Mundial", flag: "🏦" },
  "mercosul":                { lat: -34.60, lon: -58.38, country: "Mercosul", flag: "🌎" },
  "opep":                    { lat: 48.14, lon: 16.37, country: "OPEP", flag: "🛢️" },

  // ── Temas globais ──
  "guerra":                  { lat: 50.45, lon: 30.52, country: "Ucrânia", flag: "⚔️" },
  "sancoes":                 { lat: 55.75, lon: 37.62, country: "Rússia", flag: "🇷🇺" },
  "sanções":                 { lat: 55.75, lon: 37.62, country: "Rússia", flag: "🇷🇺" },
  "tarifaço":                { lat: 38.90, lon: -77.04, country: "Estados Unidos", flag: "🇺🇸" },
  "tarifas":                 { lat: 38.90, lon: -77.04, country: "Estados Unidos", flag: "🇺🇸" },
  "geopolítica":             { lat: 48.86, lon: 2.35, country: "Global", flag: "🌍" },
  "geopolitica":             { lat: 48.86, lon: 2.35, country: "Global", flag: "🌍" },
  "aquecimento global":      { lat: -3.12, lon: -60.02, country: "Brasil", flag: "🌍" },
};

// ── Coordenadas dos UFs brasileiros (centros) ─────────────────────────────
export const BR_UF_GEO: Record<string, GeoPoint> = {
  "AC": { lat: -8.77, lon: -70.56, uf: "AC", flag: "🇧🇷" },
  "AL": { lat: -9.57, lon: -36.65, uf: "AL", flag: "🇧🇷" },
  "AM": { lat: -3.12, lon: -60.02, uf: "AM", flag: "🇧🇷" },
  "AP": { lat: 1.41, lon: -51.77, uf: "AP", flag: "🇧🇷" },
  "BA": { lat: -12.97, lon: -38.51, uf: "BA", flag: "🇧🇷" },
  "CE": { lat: -3.72, lon: -38.54, uf: "CE", flag: "🇧🇷" },
  "DF": { lat: -15.78, lon: -47.93, uf: "DF", flag: "🇧🇷" },
  "ES": { lat: -20.32, lon: -40.34, uf: "ES", flag: "🇧🇷" },
  "GO": { lat: -16.68, lon: -49.26, uf: "GO", flag: "🇧🇷" },
  "MA": { lat: -2.53, lon: -44.28, uf: "MA", flag: "🇧🇷" },
  "MG": { lat: -19.92, lon: -43.94, uf: "MG", flag: "🇧🇷" },
  "MS": { lat: -20.47, lon: -54.62, uf: "MS", flag: "🇧🇷" },
  "MT": { lat: -15.60, lon: -56.10, uf: "MT", flag: "🇧🇷" },
  "PA": { lat: -1.45, lon: -48.50, uf: "PA", flag: "🇧🇷" },
  "PB": { lat: -7.12, lon: -34.86, uf: "PB", flag: "🇧🇷" },
  "PE": { lat: -8.05, lon: -34.87, uf: "PE", flag: "🇧🇷" },
  "PI": { lat: -5.09, lon: -42.80, uf: "PI", flag: "🇧🇷" },
  "PR": { lat: -25.43, lon: -49.27, uf: "PR", flag: "🇧🇷" },
  "RJ": { lat: -22.91, lon: -43.17, uf: "RJ", flag: "🇧🇷" },
  "RN": { lat: -5.79, lon: -35.21, uf: "RN", flag: "🇧🇷" },
  "RO": { lat: -10.97, lon: -63.03, uf: "RO", flag: "🇧🇷" },
  "RR": { lat: 2.82, lon: -60.67, uf: "RR", flag: "🇧🇷" },
  "RS": { lat: -30.03, lon: -51.23, uf: "RS", flag: "🇧🇷" },
  "SC": { lat: -27.59, lon: -48.55, uf: "SC", flag: "🇧🇷" },
  "SE": { lat: -10.91, lon: -37.07, uf: "SE", flag: "🇧🇷" },
  "SP": { lat: -23.55, lon: -46.63, uf: "SP", flag: "🇧🇷" },
  "TO": { lat: -10.17, lon: -48.33, uf: "TO", flag: "🇧🇷" },
};

// ── Mapeamento país → ISO2 (para escopo world) ─────────────────────────────
export const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  "Brasil": "BR", "Estados Unidos": "US", "China": "CN", "Rússia": "RU",
  "Ucrânia": "UA", "Israel": "IL", "Palestina": "PS", "Reino Unido": "GB",
  "França": "FR", "Alemanha": "DE", "Japão": "JP", "Índia": "IN",
  "Argentina": "AR", "Venezuela": "VE", "Coreia do Norte": "KP", "Taiwan": "TW",
  "OTAN": "GB", "ONU": "US", "G7": "FR", "BRICS": "CN", "Mercosul": "AR",
  "OPEP": "SA", "FMI": "US", "Banco Mundial": "US", "Global": "GLOBAL",
};

// ── Nomes das UFs ─────────────────────────────────────────────────────────
const UF_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá",
  BA: "Bahia", CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo",
  GO: "Goiás", MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul",
  MT: "Mato Grosso", PA: "Pará", PB: "Paraíba", PE: "Pernambuco",
  PI: "Piauí", PR: "Paraná", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RO: "Rondônia", RR: "Roraima", RS: "Rio Grande do Sul", SC: "Santa Catarina",
  SE: "Sergipe", SP: "São Paulo", TO: "Tocantins",
};

// ── Resolução de local por entidade (fallback quando uf/pais_iso são null) ──
function resolveLocal(
  entityName: string,
  scope: Scope,
): { key: string; nome: string; geo: GeoPoint } | null {
  const lower = entityName.toLowerCase().trim();
  const geo = resolveGeo(lower);
  if (geo) {
    if (scope === "br" && geo.uf) {
      return { key: geo.uf, nome: UF_NAMES[geo.uf] ?? geo.uf, geo: BR_UF_GEO[geo.uf] };
    }
    if (scope === "world" && geo.country) {
      const iso = COUNTRY_NAME_TO_ISO[geo.country] ?? "GLOBAL";
      const countryGeo = { ...geo };
      return { key: iso, nome: geo.country, geo: countryGeo };
    }
  }
  return null;
}

// ── Classificação de setor por nome da entidade ───────────────────────────
const SECTOR_KEYWORDS: [string, string[]][] = [
  ["Política", ["lula", "bolsonaro", "governo", "tarcísio", "tarcisio", "zema", "nikolas", "haddad",
    "pablo marçal", "marçal", "marcal", "dino", "deltan", "caiado", "zambelli", "moro", "damares",
    "janja", "gleisi", "pt", "partido", "pl ", "liberal", "congresso", "senado", "câmara", "camara",
    "stf", "supremo", "cop30", "esquerda", "direita", "petista", "bolsonarismo", "oposição", "oposicao"]],
  ["Economia", ["haddad", "economia", "fazenda", "selic", "pix", "imposto", "tribut", "inflação",
    "inflacao", "pib", "câmbio", "cambio", "dólar", "dolar", "juros", "reforma", "fmi", "banco mundial",
    "mercado", "bolsa", "ibovespa", "taxa", "orçamento", "orcamento", "gasto"]],
  ["Geopolítica", ["trump", "putin", "xi jinping", "zelensky", "netanyahu", "macron", "milei", "maduro",
    "guerra", "sancoes", "sanções", "tarifaço", "tarifas", "nato", "otan", "g20", "g7", "brics",
    "geopolit", "onu", "mercosul", "opep", "palestina", "israel", "gaza", "ucran", "russia"]],
  ["Meio Ambiente", ["aquecimento", "clima", "amazônia", "amazonia", "desmatamento", "cop30",
    "sustentab", "energia", "renovável", "renovavel", "petróleo", "petroleo"]],
  ["Segurança", ["pcc", "cv", "tráfico", "trafico", "polícia", "policia", "segurança", "seguranca",
    "homicídio", "homicidio", "crime", "violência", "violencia"]],
  ["Tecnologia", ["tech", "inteligência artificial", "inteligencia artificial", "ia", "openai",
    "google", "meta", "apple", "microsoft", "nvidia", "startup"]],
];

export function classifySector(entityName: string): string {
  const lower = entityName.toLowerCase();
  for (const [sector, keywords] of SECTOR_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return sector;
  }
  return "Outros";
}

// ── Resolução de geolocalização ───────────────────────────────────────────
export function resolveGeo(entityName: string): GeoPoint | null {
  const lower = entityName.toLowerCase().trim();
  // Match direto
  if (ENTITY_GEO[lower]) return ENTITY_GEO[lower];
  // Match parcial (a entidade contém uma chave do mapa)
  for (const [key, geo] of Object.entries(ENTITY_GEO)) {
    if (lower.includes(key) || key.includes(lower)) return geo;
  }
  return null;
}

// ── Cores por layer ───────────────────────────────────────────────────────
export const COLORS = {
  neg: [239, 68, 85] as [number, number, number],
  neu: [60, 72, 98] as [number, number, number],
  pos: [16, 185, 129] as [number, number, number],
  lo: [27, 39, 64] as [number, number, number],
  hi: [34, 211, 238] as [number, number, number],
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function rgb(c: [number, number, number]) {
  return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
}

export function sentColor(s: number): string {
  const t = Math.max(-1, Math.min(1, s));
  if (t < 0) {
    const k = Math.min(1, -t / 0.6);
    return rgb([lerp(COLORS.neu[0], COLORS.neg[0], k), lerp(COLORS.neu[1], COLORS.neg[1], k), lerp(COLORS.neu[2], COLORS.neg[2], k)]);
  }
  const k = Math.min(1, t / 0.6);
  return rgb([lerp(COLORS.neu[0], COLORS.pos[0], k), lerp(COLORS.neu[1], COLORS.pos[1], k), lerp(COLORS.neu[2], COLORS.pos[2], k)]);
}

export function volColor(v: number, max: number): string {
  const k = Math.sqrt(Math.min(1, v / Math.max(1, max)));
  return rgb([lerp(COLORS.lo[0], COLORS.hi[0], k), lerp(COLORS.lo[1], COLORS.hi[1], k), lerp(COLORS.lo[2], COLORS.hi[2], k)]);
}

export function momColor(m: number): string {
  const t = Math.max(-1, Math.min(1, m / 2));
  if (t < 0) {
    const k = Math.min(1, -t);
    return rgb([lerp(COLORS.neu[0], COLORS.neg[0], k), lerp(COLORS.neu[1], COLORS.neg[1], k), lerp(COLORS.neu[2], COLORS.neg[2], k)]);
  }
  const k = Math.min(1, t);
  return rgb([lerp(COLORS.neu[0], COLORS.pos[0], k), lerp(COLORS.neu[1], COLORS.pos[1], k), lerp(COLORS.neu[2], COLORS.pos[2], k)]);
}

export function colorForBubble(b: BubbleData, layer: Layer, maxVol: number): string {
  if (layer === "sentimento") return sentColor(b.sentimentoScore);
  if (layer === "momentum") return momColor(b.momentum);
  return volColor(b.volume, maxVol);
}

export function legendGradient(layer: Layer): string {
  if (layer === "volume") return `linear-gradient(90deg, ${rgb(COLORS.lo)}, ${rgb(COLORS.hi)})`;
  return `linear-gradient(90deg, ${rgb(COLORS.neg)}, ${rgb(COLORS.neu)}, ${rgb(COLORS.pos)})`;
}

export function legendLabels(layer: Layer): { left: string; right: string } {
  if (layer === "volume") return { left: "baixo", right: "alto" };
  if (layer === "momentum") return { left: "queda", right: "alta" };
  return { left: "negativo", right: "positivo" };
}

// ── Raio da bolha ─────────────────────────────────────────────────────────
export function bubbleRadius(volume: number, maxVolume: number): number {
  const minR = 5;
  const maxR = 20;
  const k = Math.sqrt(Math.min(1, volume / Math.max(1, maxVolume)));
  return minR + k * (maxR - minR);
}

// ── Projeção Mercator (mesma do referência HTML) ─────────────────────────
export function projMercator(lon: number, lat: number, _w?: number, _h?: number): { x: number; y: number } {
  const scale = 159.15;
  const tx = 500;
  const ty = 241.17;
  return {
    x: scale * (lon * Math.PI / 180) + tx,
    y: ty - scale * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
  };
}

// ── Projeção Robinson (para mapa mundial com world-map-country-shapes) ───
// Tabelas Robinson (Snyder, Map Projections—A Working Manual)
const ROB_R = [1.0000, 0.9986, 0.9954, 0.9900, 0.9822, 0.9730, 0.9600, 0.9427, 0.9216, 0.8962, 0.8679, 0.8350, 0.7986, 0.7597, 0.7186, 0.6732, 0.6213, 0.5722, 0.5322];
const ROB_P = [0.0000, 0.0605, 0.1212, 0.1820, 0.2430, 0.3043, 0.3658, 0.4276, 0.4896, 0.5517, 0.6136, 0.6752, 0.7364, 0.7969, 0.8566, 0.9152, 0.9725, 1.0000];

function robLookup(table: number[], lat: number): number {
  const a = Math.min(Math.abs(lat), 90);
  const idx = Math.floor(a / 5);
  const f = (a - idx * 5) / 5;
  return table[idx] + (table[Math.min(idx + 1, 18)] - table[idx]) * f;
}

// Robinson → SVG coords (calibrado para viewBox 2000×1001 do world-map-country-shapes)
export function projRobinson(lon: number, lat: number): { x: number; y: number } {
  const r = robLookup(ROB_R, lat);
  const p = robLookup(ROB_P, lat);
  const lonRad = lon * Math.PI / 180;
  // x proporcional a R×lon (Robinson), escalado para 0..2000
  const x = 337 * r * lonRad + 970;
  // y usa P (distância acumulada do equador): norte → y menor (topo), sul → y maior (fundo)
  const sign = lat >= 0 ? 1 : -1;
  const y = 570 - 513 * sign * p;
  return { x, y };
}

// ── Fetch de dados para bubbles ───────────────────────────────────────────
const TZ = "America/Sao_Paulo";
const _fmtDia = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

function diasBR(n: number): string[] {
  const hojeBR = _fmtDia.format(new Date());
  const base = new Date(`${hojeBR}T12:00:00Z`);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(_fmtDia.format(d));
  }
  return out;
}

function inicioJanela(periodo: Periodo): string {
  if (periodo === "24h") return desde24h();
  const n = periodo === "7d" ? 7 : 30;
  const dias = diasBR(n);
  return new Date(`${dias[0]}T00:00:00-03:00`).toISOString();
}

// Dedup canônico
function dedupePorUrl<T extends { url?: string | null; coletado_em?: string | null }>(items: T[]): T[] {
  const vistos = new Map<string, T>();
  const semUrl: T[] = [];
  for (const it of items) {
    const url = (it.url ?? "").trim();
    if (!url) { semUrl.push(it); continue; }
    const atual = vistos.get(url);
    const tNovo = it.coletado_em ? new Date(it.coletado_em).getTime() : 0;
    const tAtual = atual?.coletado_em ? new Date(atual.coletado_em).getTime() : -1;
    if (!atual || tNovo > tAtual) vistos.set(url, it);
  }
  return [...semUrl, ...vistos.values()];
}

type ItemLeve = { url: string | null; candidatos: string[] | null; coletado_em: string | null; sentimento?: string | null; sentimento_score?: number | null; likes?: number | null; retweets?: number | null; views?: number | null; engajamento?: number | null; fonte?: string | null; uf?: string | null; pais_iso?: string | null; escopo?: string | null };
const COLS_NOTICIA = "url, candidatos, coletado_em, sentimento, fonte, uf, pais_iso, escopo";
const COLS_TWEET = "url, candidatos, coletado_em, sentimento, sentimento_score, likes, retweets, views, uf, pais_iso, escopo";
const PAGE = 1000;

async function fetchTudoLeve(tabela: "noticias" | "tweets", verticalId: string, desde: string): Promise<ItemLeve[]> {
  const cols = tabela === "noticias" ? COLS_NOTICIA : COLS_TWEET;
  const out: ItemLeve[] = [];
  for (let off = 0; off <= 50000; off += PAGE) {
    const { data, error } = await supabaseRevista
      .from(tabela)
      .select(cols)
      .eq("vertical_id", verticalId)
      .gte("coletado_em", desde)
      .order("coletado_em", { ascending: false })
      .range(off, off + PAGE - 1);
    if (error) throw error;
    const lote = (data ?? []) as unknown as ItemLeve[];
    out.push(...lote);
    if (lote.length < PAGE) break;
  }
  return out;
}

export async function fetchMapaBubble(
  verticalId: string,
  periodo: Periodo,
  topicos: TopicoQuente[],
  scope: Scope = "br",
): Promise<{ bubbles: BubbleData[]; kpis: MapaKpis }> {
  const desde = inicioJanela(periodo);

  const [noticias, tweets] = await Promise.all([
    fetchTudoLeve("noticias", verticalId, desde),
    fetchTudoLeve("tweets", verticalId, desde),
  ]);

  // ── Agregação por LOCAL (UF no BR, país no world) ─────────────────────
  interface LocalAcc {
    key: string;
    nome: string;
    geo: GeoPoint;
    n: number;
    tw: number;
    eng: number;
    sentScores: number[];
    entidades: Map<string, { vol: number; sentSum: number; sentN: number; orig: string }>;
    sparkline: number[];
  }

  const porLocal = new Map<string, LocalAcc>();
  let semLocalN = 0;
  let semLocalTw = 0;

  const sparkDias = diasBR(7);
  const sparkIdx = new Map(sparkDias.map((d, i) => [d, i]));

  const processar = (arr: ItemLeve[], tipo: "noticia" | "tweet") => {
    for (const it of dedupePorUrl(arr)) {
      const d = it.coletado_em ? _fmtDia.format(new Date(it.coletado_em)) : null;
      const di = d ? sparkIdx.get(d) : undefined;

      // Usar APENAS uf/pais_iso do banco (classificação Gemini)
      // Itens sem classificação vão para "sem localização"
      let local: { key: string; nome: string; geo: GeoPoint } | null = null;

      if (scope === "br" && it.uf) {
        const uf = it.uf.toUpperCase();
        const geo = BR_UF_GEO[uf];
        if (geo) local = { key: uf, nome: UF_NAMES[uf] ?? uf, geo };
      } else if (scope === "world" && it.pais_iso) {
        const iso = it.pais_iso.toUpperCase();
        const countryGeo = resolveGeo(iso);
        if (countryGeo) {
          local = { key: iso, nome: countryGeo.country ?? iso, geo: countryGeo };
        }
      }

      if (!local) {
        if (tipo === "noticia") semLocalN++; else semLocalTw++;
        continue;
      }

      let acc = porLocal.get(local.key);
      if (!acc) {
        acc = {
          key: local.key,
          nome: local.nome,
          geo: local.geo,
          n: 0, tw: 0, eng: 0,
          sentScores: [],
          entidades: new Map(),
          sparkline: sparkDias.map(() => 0),
        };
        porLocal.set(local.key, acc);
      }

      if (tipo === "noticia") acc.n++; else acc.tw++;
      acc.eng += (it.likes ?? 0) + (it.retweets ?? 0) * 3 + (it.views ?? 0) * 0.01;
      if (it.sentimento_score != null) acc.sentScores.push(it.sentimento_score);
      if (di != null) acc.sparkline[di]++;

      // Acumular entidade dentro do local
      for (const ent of it.candidatos ?? []) {
        if (!ent) continue;
        const entKey = ent.toLowerCase().trim();
        const entAcc = acc.entidades.get(entKey) ?? { vol: 0, sentSum: 0, sentN: 0, orig: ent };
        entAcc.vol++;
        if (it.sentimento_score != null) { entAcc.sentSum += it.sentimento_score; entAcc.sentN++; }
        acc.entidades.set(entKey, entAcc);
      }
    }
  };

  processar(noticias, "noticia");
  processar(tweets, "tweet");

  // ── Montar BubbleData[] por local ──────────────────────────────────────
  const bubbles: BubbleData[] = [...porLocal.values()]
    .map((acc) => {
      const vol = acc.n + acc.tw;
      const avgSent = acc.sentScores.length > 0
        ? acc.sentScores.reduce((a, b) => a + b, 0) / acc.sentScores.length
        : 0;

      // Momentum: média dos tópicos quentes das entidades do local
      let momSum = 0, momN = 0;
      for (const [entKey] of acc.entidades) {
        const topico = topicos.find((t) => t.entidade.toLowerCase().trim() === entKey);
        if (topico?.variacao_pct != null) { momSum += topico.variacao_pct; momN++; }
      }
      const momentum = momN > 0 ? (momSum / momN) / 100 : 0;

      // Top 5 entidades por volume
      const topEntidades = [...acc.entidades.entries()]
        .map(([ek, ea]) => ({
          key: ea.orig,
          nome: topicos.find((t) => t.entidade.toLowerCase().trim() === ek)?.entidade
            ?? ek.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
          volume: ea.vol,
          sentimentoScore: ea.sentN > 0 ? ea.sentSum / ea.sentN : 0,
        }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5);

      // Setores das entidades
      const setores = new Set(topEntidades.map((e) => classifySector(e.nome)));
      const sector = setores.size === 1 ? [...setores][0] : "Política";

      return {
        entidade: acc.nome,
        volume: vol,
        sentimentoScore: avgSent,
        momentum,
        engajamento: acc.eng,
        sector,
        sparkline: acc.sparkline,
        geo: acc.geo,
        topEntidades,
        allKeys: [...acc.entidades.values()].map((e) => e.orig),
      };
    })
    .sort((a, b) => b.volume - a.volume);

  // ── KPIs ──────────────────────────────────────────────────────────────
  const totalMencoes = bubbles.reduce((a, b) => a + b.volume, 0) + semLocalN + semLocalTw;
  const epicentro = bubbles[0]?.entidade ?? "—";

  return {
    bubbles,
    kpis: {
      entidadesAtivas: bubbles.length,
      mencoesPeriodo: totalMencoes,
      sentimentoMedio: bubbles.length > 0
        ? bubbles.reduce((a, b) => a + b.sentimentoScore, 0) / bubbles.length
        : 0,
      epicentro,
      semLocalizacao: semLocalN + semLocalTw,
    },
  };
}

// ── Busca de notícias/tweets por entidade (para drawer) ───────────────────
const NOTICIA_COLS = "id, vertical_id, titulo, fonte, resumo, autor, imagem_url, url, candidatos, sentimento, tem_imagem, publicado_em, coletado_em, uf, pais_iso, escopo";
const TWEET_COLS = "id, vertical_id, autor_nome, autor_handle, autor_avatar_url, texto, url, likes, retweets, replies, views, sentimento, sentimento_score, periodo, candidatos, publicado_em, coletado_em, uf, pais_iso, escopo";

function intervaloPeriodo(periodo: Periodo): { inicio: string; fim: string | null } {
  if (periodo === "24h") return { inicio: desde24h(), fim: null };
  const n = periodo === "7d" ? 7 : 30;
  const dias = diasBR(n);
  const inicio = new Date(`${dias[0]}T00:00:00-03:00`).toISOString();
  return { inicio, fim: null };
}

export async function buscarNoticiasPorEntidadePeriodo(verticalId: string, entidade: string, periodo: Periodo) {
  const { inicio } = intervaloPeriodo(periodo);
  const { data, error } = await supabaseRevista
    .from("noticias")
    .select(NOTICIA_COLS)
    .eq("vertical_id", verticalId)
    .gte("coletado_em", inicio)
    .filter("candidatos", "cs", JSON.stringify([entidade]))
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) throw error;
  return dedupePorUrl((data ?? []) as any[]);
}

export async function buscarTweetsPorEntidadePeriodo(verticalId: string, entidade: string, periodo: Periodo) {
  const { inicio } = intervaloPeriodo(periodo);
  const { data, error } = await supabaseRevista
    .from("tweets")
    .select(TWEET_COLS)
    .eq("vertical_id", verticalId)
    .gte("coletado_em", inicio)
    .filter("candidatos", "cs", JSON.stringify([entidade]))
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) throw error;
  return dedupePorUrl((data ?? []) as any[]);
}

export async function buscarNoticiasPorLocal(verticalId: string, entidades: string[], periodo: Periodo) {
  if (entidades.length === 0) return [];
  const results = await Promise.all(
    entidades.map((e) => buscarNoticiasPorEntidadePeriodo(verticalId, e, periodo)),
  );
  return dedupePorUrl(results.flat());
}

export async function buscarTweetsPorLocal(verticalId: string, entidades: string[], periodo: Periodo) {
  if (entidades.length === 0) return [];
  const results = await Promise.all(
    entidades.map((e) => buscarTweetsPorEntidadePeriodo(verticalId, e, periodo)),
  );
  return dedupePorUrl(results.flat());
}
