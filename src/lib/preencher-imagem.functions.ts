import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { preencherImagensBanco, scrapeOgImage } from "./preencher-imagem.server";

export const preencherImagens = createServerFn({ method: "POST" }).handler(
  async () => {
    return await preencherImagensBanco();
  },
);

export const preencherNoticia = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), url: z.string().url() }))
  .handler(async ({ data }) => {
    return { imagem_url: await scrapeOgImage(data.url) };
  });
