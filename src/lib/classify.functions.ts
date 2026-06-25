import { createServerFn } from "@tanstack/react-start";
import { classifyPendingItems } from "./geo/geo-classifier.service";

export const classifyItems = createServerFn({ method: "POST" })
  .validator((data: { vertical_id?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const results = await classifyPendingItems(data.vertical_id);
      return {
        ok: true,
        classified: results.length,
        byMethod: {
          llm: results.filter(r => r.method === "llm").length,
          heuristic: results.filter(r => r.method === "heuristic").length,
          fallback: results.filter(r => r.method === "fallback").length,
        },
      };
    } catch (err) {
      console.error("[classify] Erro:", err);
      return { ok: false, error: String(err), classified: 0, byMethod: { llm: 0, heuristic: 0, fallback: 0 } };
    }
  });
