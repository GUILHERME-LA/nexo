/**
 * Gera uma URL de imagem via loremflickr.com (gratuito, sem API key).
 *
 * Formato: https://loremflickr.com/{w}/{h}/{keyword}/{category}?lock={seed}
 *
 * - Keyword: primeira palavra significativa (>3 chars) do título
 * - Category: "all" por padrão
 * - Lock: hash numérico do ID para resultado consistente
 */

const STOP_WORDS = new Set([
  "para", "com", "por", "sem", "que", "como", "mais", "mas", "ou",
  "the", "and", "for", "with", "from", "this", "that", "has", "have",
  "são", "está", "foi", "ser", "ter", "dos", "das", "nos", "nas",
  "sobre", "entre", "até", "após", "antes", "desde", "contra",
]);

function extractKeyword(titulo: string): string {
  const words = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  return words[0] || "news";
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function flickrUrl(titulo: string, id: string, w = 800, h = 500): string {
  const keyword = extractKeyword(titulo);
  const seed = hashString(id);
  return `https://loremflickr.com/${w}/${h}/${keyword}/all?lock=${seed}`;
}
