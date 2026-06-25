/**
 * Decodifica entidades HTML (numéricas decimais/hexa e nomeadas) em texto plano UTF-8.
 * Cobre: &#8221; → ", &#8220; → ", &amp; → &, &#8211; → –, etc.
 */
export function htmlDecode(str: string | null | undefined): string {
  if (!str) return "";
  let out = str;

  // Entidades numéricas decimais: &#8221;
  out = out.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));

  // Entidades numéricas hexadecimais: &#x201C;
  out = out.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

  // Entidades nomeadas (mais comuns)
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    ndash: "–",
    mdash: "—",
    ldquo: '"',
    rdquo: '"',
    lsquo: "'",
    rsquo: "'",
    hellip: "…",
    bull: "•",
    trade: "™",
    copy: "©",
    reg: "®",
    euro: "€",
    pound: "£",
    yen: "¥",
    cent: "¢",
    deg: "°",
    plusmn: "±",
    times: "×",
    divide: "÷",
    frac14: "¼",
    frac12: "½",
    frac34: "¾",
    laquo: "«",
    raquo: "»",
    iexcl: "¡",
    iquest: "¿",
    middot: "·",
    sect: "§",
    para: "¶",
  };

  out = out.replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (_, e: string) => {
    return named[e.toLowerCase()] ?? `&${e};`;
  });

  return out;
}

/**
 * Limpa texto vindo de RSS/API: decodifica entidades, remove tags HTML, colapsa espaços.
 */
export function cleanText(s?: string | null): string {
  if (!s) return "";
  // Dupla passada para casos como &amp;lt; → &lt; → <
  let out = htmlDecode(htmlDecode(s));
  // Remove tags HTML reais
  out = out.replace(/<[^>]+>/g, " ");
  // Colapsa espaços
  return out.replace(/\s+/g, " ").trim();
}
