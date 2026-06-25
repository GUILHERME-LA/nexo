import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ExternalLink, X, Loader2, RefreshCw } from "lucide-react";
import { supabaseRevista } from "@/lib/supabaseRevista";
import type { Noticia } from "@/lib/types";
import { normSent } from "@/lib/types";
import { relTime } from "@/lib/relTime";
import { cleanText, htmlDecode } from "@/lib/htmlDecode";
import { flickrUrl } from "@/lib/loremFlickr";
import { ThematicCover } from "@/components/ThematicCover";
import { resolveEspectro, espectroCor, espectroLabel } from "@/lib/espectro";
import { useUI, fecharNoticia } from "@/lib/uiStore";

const COLS =
  "id, vertical_id, titulo, fonte, resumo, autor, imagem_url, url, candidatos, sentimento, espectro, corpo, tem_imagem, publicado_em, coletado_em";

// Limpeza do corpo preservando parágrafos (não colapsa \n como o cleanText).
function limparCorpo(s: string | null | undefined): string {
  if (!s) return "";
  return htmlDecode(htmlDecode(s))
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchNoticiaById(id: string): Promise<Noticia | null> {
  const { data, error } = await supabaseRevista.from("noticias").select(COLS).eq("id", id).limit(1).maybeSingle();
  if (error) throw error;
  return (data as Noticia | null) ?? null;
}

/**
 * Busca o conteúdo da matéria on-demand via Jina Reader.
 * O Jina baixa a página e devolve markdown limpo, contornando CORS.
 * Quando o site bloqueia, retorna string vazia.
 */
async function fetchConteudoLeitura(url: string): Promise<string> {
  const endpoint = `https://r.jina.ai/${url}`;
  const res = await fetch(endpoint, {
    headers: { Accept: "text/plain", "X-Return-Format": "text" },
  });
  if (!res.ok) throw new Error(`Jina ${res.status}`);
  const txt = await res.text();
  const idx = txt.indexOf("Markdown Content:");
  let corpo = idx >= 0 ? txt.slice(idx + "Markdown Content:".length) : txt;

  corpo = corpo
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");

  const LIXO = [
    /leia\s+(também|mais|tamb[eé]m)/i,
    /veja\s+(também|mais)/i,
    /continue\s+lendo/i,
    /siga\s+(o\s+)?(nosso|no)\s+/i,
    /assine\s+(a\s+)?(nossa\s+)?newsletter/i,
    /receba\s+(as\s+)?(nossas\s+)?(novidades|not[ií]cias)/i,
    /cadastre[- ]se/i,
    /inscreva[- ]se/i,
    /compartilh(e|ar)/i,
    /publicidade/i,
    /an[úu]ncio/i,
    /patrocinado/i,
    /publi[- ]?editorial/i,
    /^\s*(facebook|twitter|instagram|whatsapp|telegram|linkedin|threads|x\.com)\b/i,
    /copyright|todos os direitos reservados|all rights reserved/i,
    /^\s*(home|in[ií]cio|menu|pesquisar|buscar|login|entrar|cadastro)\s*$/i,
    /pol[ií]tica de privacidade|termos de uso/i,
    /clique aqui/i,
    /baixe (o )?(nosso )?(app|aplicativo)/i,
    /tags?:/i,
    /===|---|___/,
    // Promocional / institucional
    /enviar\s+e[- ]?mail/i,
    /elogie,?\s*critique/i,
    /envie\s+(uma\s+)?(sugest[ãa]o|dica|mensagem)/i,
    /entre\s+em\s+contato/i,
    /fale\s+conosco/i,
    /parcerias?\s+e\s+projetos/i,
    /projetos?\s+especiais/i,
    /^\s*arquivo\s*$/i,
    /^\s*blog(\s+\w+)*\s*$/i,
    /^\s*editorias?\s*$/i,
    /^\s*colunistas?\s*$/i,
    /^\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]{8,}$/, // linha 100% caixa-alta (banners/seções)
  ];

  const linhas = corpo.split("\n").map((l) => l.trim());
  const limpas: string[] = [];
  for (const l of linhas) {
    if (!l) { limpas.push(""); continue; }
    if (LIXO.some((re) => re.test(l))) continue;
    // Parágrafo de verdade precisa terminar com pontuação OU ter >120 chars
    if (!/[.!?…"”']$/.test(l) && l.length < 120) continue;
    // Evita listas de manchetes coladas (várias frases curtas sem terminar com ponto)
    if (l.length < 60 && !/[.!?]/.test(l)) continue;
    limpas.push(l);
  }

  // Remove "manchetes relacionadas" no início/fim (sequências de 3+ linhas curtas seguidas)
  const filtradas: string[] = [];
  for (let i = 0; i < limpas.length; i++) {
    const atual = limpas[i];
    if (!atual) { filtradas.push(""); continue; }
    // Conta vizinhos curtos
    let curtos = 0;
    for (let j = Math.max(0, i - 2); j <= Math.min(limpas.length - 1, i + 2); j++) {
      if (limpas[j] && limpas[j].length < 140) curtos++;
    }
    if (curtos >= 4 && atual.length < 140) continue;
    filtradas.push(atual);
  }

  return filtradas
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sentDot(s: string | null) {
  const v = normSent(s);
  return v === "pos" ? "var(--pos)" : v === "neg" ? "var(--neg)" : "var(--neu)";
}
const sentLabel: Record<string, string> = { pos: "Positivo", neg: "Negativo", neu: "Neutro" };

export function NoticiaDrawer() {
  const ui = useUI();
  const id = ui.noticiaId;
  const navigate = useNavigate();
  const [visivel, setVisivel] = useState(false);

  // anima a entrada
  useEffect(() => {
    if (!id) return;
    const r = requestAnimationFrame(() => setVisivel(true));
    return () => cancelAnimationFrame(r);
  }, [id]);

  // fecha no ESC
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function fechar() {
    setVisivel(false);
    setTimeout(() => fecharNoticia(), 220);
  }

  const {
    data: n,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["noticia-drawer", id],
    queryFn: () => fetchNoticiaById(id!),
    enabled: !!id,
  });

  if (!id) return null;

  return (
    <>
      {/* camada para fechar ao clicar fora (sem escurecer) */}
      <div onClick={fechar} className="fixed inset-0" style={{ zIndex: 60 }} />

      <aside
        className="fixed top-0 right-0 h-full flex flex-col"
        style={{
          zIndex: 70,
          width: "min(900px, 94vw)",
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-16px 0 48px rgba(0,0,0,0.20)",
          transform: visivel ? "translateX(0)" : "translateX(100%)",
          transition: "transform .26s cubic-bezier(.22,.61,.36,1)",
        }}
      >
        <div className="shrink-0 flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="label-eyebrow">Leitura</span>
          {n?.url && (
            <a
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              Ver na fonte <ExternalLink size={12} />
            </a>
          )}
          <button
            onClick={fechar}
            aria-label="Fechar"
            className={`inline-flex items-center justify-center w-9 h-9 rounded-md transition-colors hover:bg-[var(--surface-3)] ${n?.url ? "" : "ml-auto"}`}
            style={{ color: "var(--ink-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 sm:p-8 mx-auto w-full" style={{ maxWidth: 760 }}>
              <div className="card-editorial p-8 animate-pulse">
                <div className="h-5 w-40 mb-4 rounded" style={{ background: "var(--surface-2)" }} />
                <div className="h-8 w-full mb-3 rounded" style={{ background: "var(--surface-2)" }} />
                <div className="h-8 w-2/3 mb-6 rounded" style={{ background: "var(--surface-2)" }} />
                <div className="h-4 w-full mb-2 rounded" style={{ background: "var(--surface-2)" }} />
                <div className="h-4 w-11/12 mb-2 rounded" style={{ background: "var(--surface-2)" }} />
              </div>
            </div>
          ) : isError || !n ? (
            <div className="p-6 sm:p-8 mx-auto w-full" style={{ maxWidth: 760 }}>
              <div className="card-editorial p-10 text-center">
                <p className="text-[15px]" style={{ color: "var(--ink)" }}>
                  {isError ? "Erro ao carregar a notícia." : "Notícia não encontrada."}
                </p>
              </div>
            </div>
          ) : (
            <NoticiaConteudo
              n={n}
              fechar={fechar}
              navegarTag={(t) => {
                fechar();
                navigate({ to: "/noticias", search: { tag: t } as never });
              }}
            />
          )}
        </div>
      </aside>
    </>
  );
}

function NoticiaConteudo({ n, navegarTag }: { n: Noticia; fechar: () => void; navegarTag: (t: string) => void }) {
  const fonte = n.fonte || "—";
  const titulo = cleanText(n.titulo);
  const resumo = cleanText(n.resumo);
  const corpoBanco = limparCorpo(n.corpo);
  const fallback = corpoBanco && corpoBanco.length > resumo.length ? corpoBanco : resumo;
  const candidatos = Array.isArray(n.candidatos) ? n.candidatos : [];
  const espectro = resolveEspectro(n.espectro, n.titulo, n.resumo);
  const espCor = espectroCor(espectro);
  const sentKey = normSent(n.sentimento);

  const [imgSrc, setImgSrc] = useState<string | null>(n.imagem_url ?? null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (n.imagem_url) {
      setImgSrc(n.imagem_url);
      setImgError(false);
      return;
    }
    setImgSrc(flickrUrl(n.titulo, n.id));
    setImgError(false);
  }, [n.imagem_url, n.titulo, n.id]);

  // Busca on-demand do conteúdo completo via Jina Reader
  const leitura = useQuery({
    queryKey: ["leitura-jina", n.url],
    queryFn: () => fetchConteudoLeitura(n.url!),
    enabled: !!n.url,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const textoCompleto = leitura.data && leitura.data.length > fallback.length ? leitura.data : "";
  const textoLeitura = textoCompleto || fallback;
  const usandoFallback = !textoCompleto;

  return (
    <article className="fade-in p-6 sm:p-8 mx-auto w-full" style={{ maxWidth: 760 }}>
      {imgSrc && !imgError ? (
        <div className="mb-6 rounded-lg overflow-hidden" style={{ background: "var(--surface-2)" }}>
          <img src={imgSrc} alt="" className="w-full h-auto object-cover" onError={() => setImgError(true)} />
        </div>
      ) : (
        <div className="mb-6 rounded-lg overflow-hidden aspect-[16/7]" style={{ background: "var(--surface-2)" }}>
          <ThematicCover fonte={fonte} />
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 text-[12px] flex-wrap" style={{ color: "var(--ink-faint)" }}>
        <span className="font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
          {fonte}
        </span>
        <span>·</span>
        <span>{relTime(n.publicado_em)}</span>
        {n.autor && <span>· {n.autor}</span>}
        <span
          className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ml-1"
          style={{ background: "var(--surface-2)", color: "var(--ink-muted)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sentDot(n.sentimento) }} />
          {sentLabel[sentKey] ?? "Neutro"}
        </span>
        <span
          className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
          style={{ color: espCor, background: `${espCor}21` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: espCor }} />
          {espectroLabel(espectro)}
        </span>
      </div>

      <h1
        className="text-[28px] sm:text-[34px] leading-[1.15] mb-6"
        style={{ fontFamily: "var(--serif)", fontWeight: 600, letterSpacing: "-0.015em", color: "var(--ink)" }}
      >
        {titulo}
      </h1>

      {leitura.isLoading && (
        <div
          className="flex items-center gap-2 mb-4 text-[12px] px-3 py-2 rounded-md"
          style={{ background: "var(--surface-2)", color: "var(--ink-muted)" }}
        >
          <Loader2 size={13} className="animate-spin" />
          Buscando matéria completa na fonte…
        </div>
      )}

      {!leitura.isLoading && usandoFallback && n.url && (
        <div
          className="flex items-center gap-2 mb-4 text-[12px] px-3 py-2 rounded-md border"
          style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
        >
          <span className="flex-1">
            {leitura.isError
              ? "Não foi possível carregar os dados desta matéria."
              : "Exibindo resumo. Clique para tentar carregar a matéria completa."}
          </span>
          <button
            onClick={() => leitura.refetch()}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold hover:bg-[var(--surface-2)]"
            style={{ color: "var(--accent)" }}
          >
            <RefreshCw size={11} /> Tentar de novo
          </button>
        </div>
      )}

      {textoLeitura ? (
        <div
          className="text-[17px] whitespace-pre-line space-y-4"
          style={{ color: "var(--ink)", fontFamily: "var(--serif)", lineHeight: 1.75 }}
        >
          {textoLeitura.split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      ) : (
        <p className="text-[14px]" style={{ color: "var(--ink-faint)" }}>
          Sem texto disponível. Use o botão acima para abrir a matéria original.
        </p>
      )}

      {candidatos.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mt-8 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
          {candidatos.map((t) => (
            <button key={t} className="tag-topic" onClick={() => navegarTag(t)}>
              {t}
            </button>
          ))}
        </div>
      )}

      {n.url && (
        <div className="mt-8 flex justify-center">
          <a
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-semibold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Abrir matéria original <ExternalLink size={14} />
          </a>
        </div>
      )}
    </article>
  );
}
