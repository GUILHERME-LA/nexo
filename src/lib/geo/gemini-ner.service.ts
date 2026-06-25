import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GeoClassification } from "./geo-types";
import { VALID_UFS } from "./geo-constants";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `Você é um classificador geográfico de notícias e tweets brasileiros.
Analise o TEXTO fornecido (título + corpo/resumo/texto) e extraia a localização geográfica do FATO noticiado.

═══ REGRAS OBRIGATÓRIAS ═══

1. CLASSIFIQUE PELO CONTEÚDO, NUNCA pelo veículo de imprensa/publicação.
   - Se uma notícia do "ND Mais" (Curitiba) fala sobre o STF em Brasília → uf="DF"
   - Se uma notícia da "Folha" fala sobre SP → uf="SP"
   - A origem da publicação é IRRELEVANTE.

2. INSTITUIÇÕES FEDERAIS sempre = DF:
   STF, STJ, TSE, Congresso Nacional, Senado, Câmara dos Deputados,
   Governo Federal, PF em operação nacional, Esplanada, Planalto,
   INSS, Receita Federal, Petrobras, IBAMA, ANVISA, Forças Armadas.

3. POLÍTICO AGINDO EM SEU ESTADO → uf do estado.
   - "Governador Zema anuncia em MG" → uf="MG"
   - "Tarcísio assina contrato em SP" → uf="SP"
   - Se o político está no DF (ex: votação no Senado) → uf="DF"

4. MÚLTIPLOS ESTADOS MENCIONADOS:
   - Escolha o estado onde o FATO principal acontece
   - Se é disputa entre estados → escolha o estado do protagonista
   - Se é notícia sobre cooperação entre estados → escolha o estado da ação principal

5. CIDADE/ESTADO BRASILEIRO MENCIONADO EXPLICITAMENTE → uf correspondente

6. NEGATION: Se o texto diz "não é em X" ou "X não é o foco" → NÃO escolha X

7. INTERNACIONAL: Se é sobre outro país → escopo="internacional", uf=null, pais_iso=código ISO

8. SEM INFORMAÇÃO GEográfica: Se não há local claro → escopo="nacional", uf=null, pais_iso="BR"

═══ FORMATO DE SAÍDA ═══
Retorne APENAS JSON válido (sem markdown, sem explicações):
{"escopo":"nacional","uf":"DF","pais_iso":"BR","sentimento":"neutro"}

Valores aceitos:
- escopo: "nacional" | "internacional" | "regional"
- uf: código UF de 2 letras ou null
- pais_iso: código ISO de 2 letras ou null
- sentimento: "positivo" | "negativo" | "neutro"`;

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function classifyWithGemini(
  titulo: string | null,
  resumo: string | null,
  corpo: string | null,
  texto: string | null,
): Promise<GeoClassification> {
  const text = [titulo, resumo, corpo, texto]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 8000);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 200,
      responseMimeType: "application/json",
    },
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent({
        systemInstruction: SYSTEM_PROMPT,
        contents: [{ role: "user", parts: [{ text }] }],
      });

      const raw = result.response.text();
      const parsed = JSON.parse(raw) as Record<string, unknown>;

      const geo: GeoClassification = {
        escopo: ["nacional", "internacional", "regional"].includes(parsed.escopo as string)
          ? (parsed.escopo as GeoClassification["escopo"])
          : "nacional",
        uf: typeof parsed.uf === "string" && VALID_UFS.includes(parsed.uf as typeof VALID_UFS[number])
          ? parsed.uf
          : null,
        pais_iso: typeof parsed.pais_iso === "string" && parsed.pais_iso.length === 2
          ? parsed.pais_iso.toUpperCase()
          : null,
        sentimento: ["positivo", "negativo", "neutro"].includes(parsed.sentimento as string)
          ? (parsed.sentimento as GeoClassification["sentimento"])
          : "neutro",
      };

      if (geo.uf && geo.pais_iso !== "BR") geo.pais_iso = "BR";

      return geo;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  console.error(`[gemini] Falha após ${MAX_RETRIES} tentativas:`, lastError?.message);
  return {
    escopo: "nacional",
    uf: null,
    pais_iso: "BR",
    sentimento: "neutro",
  };
}
