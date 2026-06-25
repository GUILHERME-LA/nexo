export const VALID_UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

export const UF_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas",
  BA: "Bahia", CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo",
  GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul",
  MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná",
  PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina",
  SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

export const UF_KEYWORDS: Record<string, string> = {
  // ── Capitais ──
  "são paulo": "SP", "sao paulo": "SP", "capital paulista": "SP",
  "rio de janeiro": "RJ",
  "belo horizonte": "MG", "bh": "MG",
  "curitiba": "PR",
  "porto alegre": "RS",
  "salvador": "BA",
  "recife": "PE",
  "fortaleza": "CE",
  "goiânia": "GO", "goiania": "GO",
  "manaus": "AM",
  "belém": "PA", "belem": "PA",
  "florianópolis": "SC", "florianopolis": "SC",
  "vitória": "ES", "vitoria": "ES",
  "campo grande": "MS",
  "brasília": "DF", "brasilia": "DF", "distrito federal": "DF",
  "rio branco": "AC", "maceió": "AL", "macapa": "AP", "manaus": "AM",
  "porto velho": "RO", "boa vista": "RR", "macapá": "AP",
  "joão pessoa": "PB", "natal": "RN", "teresina": "PI",
  "aracaju": "SE", "palmas": "TO",

  // ── Demônios estaduais (gentílicos) ──
  "paulista": "SP", "paulistas": "SP",
  "carioca": "RJ", "cariocas": "RJ", "fluminense": "RJ", "fluminenses": "RJ",
  "mineiro": "MG", "mineiros": "MG",
  "paranaense": "PR", "paranaenses": "PR",
  "gaúcho": "RS", "gaúchos": "RS", "gaicho": "RS", "gauchos": "RS",
  "sul-rio-grandense": "RS",
  "baiano": "BA", "baiana": "BA", "baianos": "BA",
  "pernambucano": "PE", "pernambucana": "PE", "pernambucanos": "PE",
  "cearense": "CE", "cearenses": "CE",
  "goiano": "GO", "goiana": "GO", "goianos": "GO",
  "amazônico": "AM", "amazonense": "AM",
  "paraense": "PA", "paraenses": "PA",
  "catarinense": "SC", "catarinenses": "SC",
  "capixaba": "ES", "capixabas": "ES",
  "sul-mato-grossense": "MS",
  "maranhense": "MA", "maranhenses": "MA",
  "piauiense": "PI", "piauienses": "PI",
  "potiguar": "RN", "potiguaras": "RN",
  "paraibano": "PB", "paraibanos": "PB",
  "sergipano": "SE", "sergipanos": "SE",
  "tocantinense": "TO", "tocantinenses": "TO",
  "acreano": "AC", "acreanos": "AC",
  "alagoano": "AL", "alagoanos": "AL",
  "amapaense": "AP", "amapaenses": "AP",
  "rondoniense": "RO", "rondonienses": "RO",
  "roraimense": "RR", "roraimenses": "RR",

  // ── Termos compostos / expressões ──
  "capital federal": "DF",
  "cidade de são paulo": "SP",
  "cidade do rio de janeiro": "RJ",
  "grande são paulo": "SP",
  "grande rio": "RJ",
  "litoral paulista": "SP",
  "litoral norte": "SP",
  "abc paulista": "SP",
  "região metropolitana de são paulo": "SP",
  "região metropolitana do rio": "RJ",
  "região sul": null,  // Ambíguo — não fixar UF
  "região norte": null,
  "região nordeste": null,
  "região centro-oeste": null,
};

// ── Termos que indicam ação/evento federal (→ DF) ──
export const DF_FEDERAL_TERMS = [
  "stf", "supremo tribunal federal", "supremo tribunal",
  "congresso nacional", "esplanada dos ministérios", "esplanada",
  "polícia federal", "policia federal",
  "governo federal", "ministério público", "ministerio publico",
  "tribunal superior", "tse", "tst", "cgf", "procuradoria-geral",
  "operacão compliance zero", "operacao compliance zero",
  "senado federal", "câmara dos deputados", "camara dos deputados",
  "planalto central", "planalto",
  "alto comando", "forças armadas", "forcas armadas",
  "ibama", "icmbio", "anvisa", "ans", "petrobras",  // empresas/agências federais
  "inss", "receita federal",
];

// ── Mapeamento país nome → ISO2 ──
export const COUNTRY_KEYWORDS: Record<string, string> = {
  "estados unidos": "US", "eua": "US", "américa": "US",
  "argentina": "AR", "chile": "CL", "colômbia": "CO", "colombia": "CO",
  "venezuela": "VE", "méxico": "MX", "mexico": "MX",
  "uruguai": "UY", "paraguai": "PY", "bolívia": "BO", "bolivia": "BO",
  "peru": "PE", "equador": "EC",
  "portugal": "PT", "espanha": "ES", "frança": "FR", "francia": "FR",
  "alemanha": "DE", "itália": "IT", "italia": "IT",
  "inglaterra": "GB", "reino unido": "GB", "uk": "GB",
  "rússia": "RU", "russia": "RU", "china": "CN", "japão": "JP", "japao": "JP",
  "coreia": "KR", "índia": "IN", "india": "IN",
  "irã": "IR", "iran": "IR", "israel": "IL",
  "turquia": "TR", "austrália": "AU", "australia": "AU",
  "canadá": "CA", "canada": "CA",
  "egito": "EG", "nigéria": "NG", "nigeria": "NG",
  "arábia saudita": "SA", "emirados": "AE",
  "ucrânia": "UA", "ucrania": "UA",
};

// ── Mapeamento política UF por político forte ──
export const POLITICIAN_UF: Record<string, string> = {
  "lula": "DF", "governo lula": "DF",
  "bolsonaro": "SP", "jair bolsonaro": "SP",
  "tarcísio": "SP", "tarcisio": "SP", "tarcísio de freitas": "SP",
  "zema": "MG", "romeu zema": "MG",
  "nikolas": "MG", "nikolas ferreira": "MG",
  "haddad": "DF", "fernando haddad": "DF",
  "pablo marçal": "SP", "marçal": "SP",
  "marina silva": "DF",
  "flávio dino": "MA", "flavio dino": "MA",
  "deltan": "DF", "deltan dallagnol": "DF",
  "caiado": "GO", "ronaldo caiado": "GO",
  "carla zambelli": "SP",
  "moro": "PR", "sergio moro": "PR",
  "damares": "DF", "damares alves": "DF",
  "janja": "DF",
  "gleisi": "DF", "gleisi hoffmann": "DF",
};

export const KNOWN_COUNTRIES = Object.values(COUNTRY_KEYWORDS);
