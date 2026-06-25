export type Espectro = "esquerda" | "centro" | "direita";

// ── Espectro por AUTOR do perfil (tweets) ──────────────────────────────────
// O selo de um tweet reflete a orientação do AUTOR, não o assunto citado no
// texto (ex.: um perfil de direita falando do PT não vira "esquerda").
// Chave = @handle em minúsculas, sem "@". Edite livremente conforme seu
// monitoramento — perfis fora deste mapa caem em "centro".
const PERFIS: Record<string, Espectro> = {
  // Direita — políticos (filiação partidária) e comentaristas declarados
  carlosbolsonaro: "direita",
  bolsonarosp: "direita", // Eduardo Bolsonaro
  nikolas_dm: "direita",
  marcelvanhattem: "direita",
  biakicis: "direita",
  romeuzema: "direita",
  deltanmd: "direita",
  derritesp: "direita",
  paulobilynskyj1: "direita",
  gayergus: "direita",
  edugiraooficial: "direita",
  pastormalafaia: "direita",
  kimpaim: "direita",
  realpfigueiredo: "direita",
  rconstantino: "direita",
  anapaulahenkel: "direita",
  claudio_dantas_: "direita",

  // Esquerda
  ruicpimenta29: "esquerda",
  blogdosakamoto: "esquerda",
  demori: "esquerda",

  // (demais perfis monitorados → "centro" por padrão; ajuste aqui conforme quiser)
};

export function espectroDoPerfil(handle?: string | null): Espectro | null {
  if (!handle) return null;
  const h = handle.toLowerCase().replace(/^@/, "").trim();
  return PERFIS[h] ?? null;
}

// Resolve o espectro de um TWEET pela orientação do autor (fonte primária).
// Perfil fora do mapa → "centro" (não usa o espectro do banco, que é baseado
// no conteúdo do texto e foi o que marcou perfis pelo assunto citado).
export function resolveEspectroTweet(handle: string | null | undefined): Espectro {
  return espectroDoPerfil(handle) ?? "centro";
}

const ESQUERDA = [
  // Atores e lideranças
  "lula",
  "petista",
  "petismo",
  "lulismo",
  "boulos",
  "guilherme boulos",
  "haddad",
  "fernando haddad",
  "gleisi",
  "gleisi hoffmann",
  "janja",
  "flávio dino",
  "flavio dino",
  "dilma",
  "dilma rousseff",
  "marina silva",
  "randolfe",
  "lindbergh",
  "tarcísio motta",
  "tarcisio motta",
  "sonia guajajara",
  "anielle franco",
  "erika hilton",
  "manuela d'ávila",
  "jaques wagner",
  "wellington dias",
  "camilo santana",
  // Partidos e organizações
  "pt ",
  "partido dos trabalhadores",
  "psol",
  "pcdob",
  "pc do b",
  "psb",
  "rede sustentabilidade",
  "mst",
  "movimento sem terra",
  "cut",
  "frente brasil popular",
  "frente povo sem medo",
  "trabalhadores sem teto",
  // Bandeiras e temas usualmente associados à esquerda
  "esquerda",
  "gasto social",
  "bolsa família",
  "bolsa familia",
  "auxílio brasil",
  "transferência de renda",
  "minha casa minha vida",
  "reforma agrária",
  "reforma agraria",
  "demarcação",
  "terras indígenas",
  "cotas raciais",
  "justiça social",
  "direitos trabalhistas",
  "salário mínimo",
  "movimentos sociais",
  "sindical",
  "taxação dos super-ricos",
  "imposto sobre grandes fortunas",
  // Temas contestados — remova este bloco se preferir tratá-los como "centro"
  "regulação das plataformas",
  "regulação das big techs",
  "regulamentação das redes",
  "responsabilização das plataformas",
  "pl das fake news",
];

const DIREITA = [
  // Atores e lideranças
  "bolsonaro",
  "bolsonarismo",
  "flávio bolsonaro",
  "flavio bolsonaro",
  "eduardo bolsonaro",
  "carlos bolsonaro",
  "michelle bolsonaro",
  "nikolas",
  "nikolas ferreira",
  "tarcísio de freitas",
  "tarcisio de freitas",
  "zema",
  "caiado",
  "malafaia",
  "moro",
  "sergio moro",
  "deltan",
  "ciro nogueira",
  "magno malta",
  "damares",
  "damares alves",
  "girão",
  "carla zambelli",
  "zambelli",
  "bia kicis",
  "rogério marinho",
  "pablo marçal",
  "marçal",
  "marcos pontes",
  "gustavo gayer",
  "sóstenes",
  "marcel van hattem",
  "marcel van hatten",
  // Partidos
  " pl ",
  "partido liberal",
  "republicanos",
  "novo partido",
  "partido novo",
  "progressistas",
  "união brasil",
  "uniao brasil",
  "patriota",
  "valdemar costa neto",
  "ramagem",
  // Bandeiras e temas usualmente associados à direita
  "conservador",
  "conservadorismo",
  "direita",
  "oposição",
  "oposicao",
  "antipetismo",
  "armamentista",
  "porte de armas",
  "posse de armas",
  "agronegócio",
  "ruralista",
  "bancada ruralista",
  "bancada evangélica",
  "bancada evangelica",
  "valores cristãos",
  "família tradicional",
  "liberdade econômica",
  "liberdade economica",
  "privatização",
  "estado mínimo",
  "redução da maioridade penal",
  "escola sem partido",
  "homeschooling",
  "ensino domiciliar",
  "pcc terrorista",
  "cv terrorista",
  // Temas contestados — remova este bloco se preferir tratá-los como "centro"
  "liberdade de expressão",
  "censura",
];

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function countHits(haystack: string, terms: string[]): number {
  const norm = stripAccents(haystack);
  let n = 0;
  for (const t of terms) {
    const tn = stripAccents(t);
    if (haystack.includes(t) || norm.includes(tn)) n++;
  }
  return n;
}

export function classifyEspectro(...textos: (string | null | undefined)[]): Espectro {
  const raw = textos.filter(Boolean).join(" ").toLowerCase();
  if (!raw.trim()) return "centro";
  const e = countHits(raw, ESQUERDA);
  const d = countHits(raw, DIREITA);
  if (e === 0 && d === 0) return "centro";
  if (e > d) return "esquerda";
  if (d > e) return "direita";
  return "centro";
}

export function resolveEspectro(
  doBanco: string | null | undefined,
  ...textos: (string | null | undefined)[]
): Espectro {
  const v = String(doBanco ?? "")
    .toLowerCase()
    .trim();
  if (v === "esquerda" || v === "centro" || v === "direita") return v;
  return classifyEspectro(...textos);
}

export function espectroCor(e: Espectro): string {
  return e === "esquerda" ? "var(--esquerda)" : e === "direita" ? "var(--direita)" : "var(--centro)";
}

export function espectroLabel(e: Espectro): string {
  return e === "esquerda" ? "Esquerda" : e === "direita" ? "Direita" : "Centro";
}
