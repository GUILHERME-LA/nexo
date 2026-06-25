import { createClient } from "@supabase/supabase-js";
import { classifyWithGemini } from "./gemini-ner.service";
import { validateGeo } from "./geo-rules.validator";
import type { RawItem, ClassifyResult, ClassifyStats } from "./geo-types";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 2000;
const MAX_ITEMS_PER_TYPE = 500;

function supabaseServer() {
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "revista_timeline" } },
  );
}

export async function classifyPendingItems(verticalId?: string): Promise<ClassifyResult[]> {
  const sb = supabaseServer();

  let noticiasQ = sb
    .from("noticias")
    .select("id, titulo, resumo, corpo, fonte, candidatos, vertical_id")
    .is("uf", null)
    .not("titulo", "is", null)
    .order("coletado_em", { ascending: false })
    .limit(MAX_ITEMS_PER_TYPE);
  if (verticalId) noticiasQ = noticiasQ.eq("vertical_id", verticalId);

  let tweetsQ = sb
    .from("tweets")
    .select("id, texto, fonte, candidatos, vertical_id")
    .is("uf", null)
    .not("texto", "is", null)
    .order("coletado_em", { ascending: false })
    .limit(MAX_ITEMS_PER_TYPE);
  if (verticalId) tweetsQ = tweetsQ.eq("vertical_id", verticalId);

  const [noticiasRes, tweetsRes] = await Promise.all([noticiasQ, tweetsQ]);
  const noticiasRaw: RawItem[] = (noticiasRes.data ?? []).map(n => ({
    ...n, tipo: "noticia" as const, texto: null,
  }));
  const tweetsRaw: RawItem[] = (tweetsRes.data ?? []).map(t => ({
    ...t, tipo: "tweet" as const, titulo: null, resumo: null, corpo: null,
  }));
  const allItems = [...noticiasRaw, ...tweetsRaw];
  if (allItems.length === 0) return [];

  console.log(`[geo] Classificando ${allItems.length} itens (${noticiasRaw.length} notícias, ${tweetsRaw.length} tweets)`);

  const results: ClassifyResult[] = [];

  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    const batch = allItems.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        try {
          const llmResult = await classifyWithGemini(
            item.titulo, item.resumo, item.corpo, item.texto,
          );
          const { geo, method } = validateGeo(llmResult, item);
          return {
            id: item.id,
            tipo: item.tipo,
            geo,
            confidence: method === "llm" ? "high" as const
              : method === "heuristic" ? "medium" as const
              : "low" as const,
            method,
            classifiedAt: new Date().toISOString(),
          };
        } catch (err) {
          console.error(`[geo] Erro ${item.tipo} ${item.id}:`, err);
          return {
            id: item.id,
            tipo: item.tipo,
            geo: { escopo: "nacional" as const, uf: "DF", pais_iso: "BR", sentimento: "neutro" as const },
            confidence: "low" as const,
            method: "fallback" as const,
            classifiedAt: new Date().toISOString(),
          };
        }
      }),
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled") results.push(r.value);
    }

    if (i + BATCH_SIZE < allItems.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // ── Batch UPDATE com colunas de auditoria ────────────────────────────
  const updates: Promise<{ error: unknown }>[] = [];
  for (const result of results) {
    const table = result.tipo === "noticia" ? "noticias" : "tweets";
    updates.push(
      sb.from(table).update({
        uf: result.geo.uf,
        pais_iso: result.geo.pais_iso,
        escopo: result.geo.escopo,
        classified_at: result.classifiedAt,
        classify_method: result.method,
        classify_confidence: result.confidence,
      }).eq("id", result.id),
    );
  }
  await Promise.all(updates);

  console.log(`[geo] Classificação completa: ${results.length} itens processados`);

  return results;
}

export async function getClassificationStats(verticalId?: string): Promise<ClassifyStats> {
  const sb = supabaseServer();

  const filter = verticalId ? (q: any) => q.eq("vertical_id", verticalId) : (q: any) => q;

  const [noticiasClassified, tweetsClassified, noticiasTotal, tweetsTotal] = await Promise.all([
    filter(sb.from("noticias").select("classify_method, classify_confidence").not("classify_method", "is", null)),
    filter(sb.from("tweets").select("classify_method, classify_confidence").not("classify_method", "is", null)),
    filter(sb.from("noticias").select("id", { count: "exact", head: true })),
    filter(sb.from("tweets").select("id", { count: "exact", head: true })),
  ]);

  const allClassified = [
    ...(noticiasClassified.data ?? []),
    ...(tweetsClassified.data ?? []),
  ];

  const total = (noticiasTotal.count ?? 0) + (tweetsTotal.count ?? 0);
  const classified = allClassified.length;

  const byMethod = { llm: 0, heuristic: 0, fallback: 0 };
  const byConfidence = { high: 0, medium: 0, low: 0 };

  for (const row of allClassified) {
    const m = (row as any).classify_method;
    const c = (row as any).classify_confidence;
    if (m in byMethod) byMethod[m as keyof typeof byMethod]++;
    if (c in byConfidence) byConfidence[c as keyof typeof byConfidence]++;
  }

  return {
    total,
    byMethod,
    byConfidence,
    pendingClassification: total - classified,
  };
}
