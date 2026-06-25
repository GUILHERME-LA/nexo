import { createClient } from "@supabase/supabase-js";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const TIMEOUT_MS = 8_000;

function supabaseServer() {
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "revista_timeline" } },
  );
}

function resolveUrl(base: string, rel: string): string {
  try { return new URL(rel, base).href; } catch { return rel; }
}

function extractOgImage(html: string, baseUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const pat of patterns) {
    const m = html.match(pat);
    if (m) return resolveUrl(baseUrl, m[1]);
  }
  return null;
}

export async function scrapeOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return extractOgImage(html, url);
  } catch {
    return null;
  }
}

export async function preencherImagensBanco() {
  const sb = supabaseServer();
  const { data: semImagem, error } = await sb
    .from("noticias")
    .select("id, url")
    .is("imagem_url", null)
    .not("url", "is", null)
    .limit(30);

  if (error || !semImagem?.length) return { processados: 0, preenchidos: 0 };

  let preenchidos = 0;
  for (const n of semImagem) {
    const og = await scrapeOgImage(n.url);
    if (og) {
      await sb.from("noticias").update({ imagem_url: og }).eq("id", n.id);
      preenchidos++;
    }
  }
  return { processados: semImagem.length, preenchidos };
}
