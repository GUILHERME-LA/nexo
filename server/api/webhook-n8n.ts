import { defineEventHandler, readBody } from "h3";
import { classifyPendingItems } from "@/lib/geo/geo-classifier.service";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const verticalId = body?.vertical_id ?? undefined;

  const results = await classifyPendingItems(verticalId);

  return {
    ok: true,
    classified: results.length,
    byMethod: {
      llm: results.filter((r) => r.method === "llm").length,
      heuristic: results.filter((r) => r.method === "heuristic").length,
      fallback: results.filter((r) => r.method === "fallback").length,
    },
  };
});
