import { createServerFn } from "@tanstack/react-start";
import { classifyPendingItems } from "./geo/geo-classifier.service";

export const handleN8nWebhook = createServerFn({ method: "POST" })
  .validator((data: { vertical_id?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const results = await classifyPendingItems(data.vertical_id);
      const stats = {
        total: results.length,
        llm: results.filter(r => r.method === "llm").length,
        heuristic: results.filter(r => r.method === "heuristic").length,
        fallback: results.filter(r => r.method === "fallback").length,
      };
      return { ok: true, stats };
    } catch (err) {
      console.error("[webhook-n8n] Erro:", err);
      return { ok: false, error: String(err) };
    }
  });
