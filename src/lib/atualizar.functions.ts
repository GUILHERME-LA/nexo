import { createServerFn } from "@tanstack/react-start";
import { preencherImagensBanco } from "./preencher-imagem.server";

const WEBHOOK_URL = "https://honorix.app.n8n.cloud/webhook/timeline";

export const triggerAtualizar = createServerFn({ method: "POST" }).handler(
  async () => {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "radar", triggeredAt: new Date().toISOString() }),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(`Webhook falhou: ${res.status} ${text.slice(0, 200)}`);
    }

    const imagens = await preencherImagensBanco().catch((e) => {
      console.error("[imagens] batch falhou:", e);
      return null;
    });

    return { ok: true, status: res.status, body: text.slice(0, 500), imagens };
  }
);
