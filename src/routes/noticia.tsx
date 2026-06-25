import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { supabaseRevista } from "@/lib/supabaseRevista";
import type { Noticia } from "@/lib/types";
import { normSent } from "@/lib/types";
import { relTime } from "@/lib/relTime";
import { cleanText } from "@/lib/htmlDecode";
import { flickrUrl } from "@/lib/loremFlickr";
import { ThematicCover } from "@/components/ThematicCover";
import { resolveEspectro, espectroCor, espectroLabel } from "@/lib/espectro";

const searchSchema = z.object({ id: z.string() });

export const Route = createFileRoute("/noticia")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Leitura — Nexo" }, { name: "description", content: "Leitura interna da notícia." }],
  }),
  component: NoticiaPage,
});

const COLS =
  "id, vertical_id, titulo, fonte, resumo, autor, imagem_url, url, candidatos, sentimento, espectro, tem_imagem, publicado_em, coletado_em";

async function fetchNoticiaById(id: string): Promise<Noticia | null> {
  const { data, error } = await supabaseRevista.from("noticias").select(COLS).eq("id", id).limit(1).maybeSingle();
  if (error) throw error;
  return (data as Noticia | null) ?? null;
}

function sentDot(s: string | null) {
  const v = normSent(s);
  return v === "pos" ? "var(--pos)" : v === "neg" ? "var(--neg)" : "var(--neu)";
}
const sentLabel: Record<string, string> = { pos: "Positivo", neg: "Negativo", neu: "Neutro" };

function NoticiaPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const {
    data: n,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["noticia", id],
    queryFn: () => fetchNoticiaById(id),
    enabled: !!id,
  });

  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!n) return;
    if (n.imagem_url) {
      setImgSrc(n.imagem_url);
      setImgError(false);
      return;
    }
    setImgSrc(flickrUrl(n.titulo, n.id));
    setImgError(false);
  }, [n]);

  const Voltar = (
    <button
      onClick={() => {
        if (window.history.length > 1) navigate({ to: ".." as never });
        else navigate({ to: "/noticias" });
      }}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 min-h-[36px] rounded-full border border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <ArrowLeft size={14} /> Voltar
    </button>
  );

  if (isLoading) {
    return (
      <div className="mx-auto w-full" style={{ maxWidth: 720 }}>
        <div className="mb-4">{Voltar}</div>
        <div className="card-editorial p-8 animate-pulse">
          <div className="h-5 w-40 mb-4 rounded" style={{ background: "var(--surface-2)" }} />
          <div className="h-8 w-full mb-3 rounded" style={{ background: "var(--surface-2)" }} />
          <div className="h-8 w-2/3 mb-6 rounded" style={{ background: "var(--surface-2)" }} />
          <div className="h-4 w-full mb-2 rounded" style={{ background: "var(--surface-2)" }} />
          <div className="h-4 w-11/12 mb-2 rounded" style={{ background: "var(--surface-2)" }} />
          <div className="h-4 w-10/12 rounded" style={{ background: "var(--surface-2)" }} />
        </div>
      </div>
    );
  }

  if (isError || !n) {
    return (
      <div className="mx-auto w-full" style={{ maxWidth: 720 }}>
        <div className="mb-4">{Voltar}</div>
        <div className="card-editorial p-10 text-center">
          <p className="text-[15px]" style={{ color: "var(--ink)" }}>
            {isError ? "Erro ao carregar a notícia." : "Notícia não encontrada."}
          </p>
        </div>
      </div>
    );
  }

  const fonte = n.fonte || "—";
  const titulo = cleanText(n.titulo);
  const resumo = cleanText(n.resumo);
  const candidatos = Array.isArray(n.candidatos) ? n.candidatos : [];
  const espectro = resolveEspectro(n.espectro, n.titulo, n.resumo);
  const espCor = espectroCor(espectro);
  const sentKey = normSent(n.sentimento);

  return (
    <div className="mx-auto w-full fade-in" style={{ maxWidth: 720 }}>
      <div className="mb-4 flex items-center justify-between gap-2">
        {Voltar}
        {n.url && (
          <a
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3.5 min-h-[36px] rounded-full border border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Ver na fonte <ExternalLink size={12} />
          </a>
        )}
      </div>

      <article className="card-editorial p-6 sm:p-8">
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
          className="text-[30px] sm:text-[34px] leading-[1.15] mb-6"
          style={{ fontFamily: "var(--serif)", fontWeight: 600, letterSpacing: "-0.015em", color: "var(--ink)" }}
        >
          {titulo}
        </h1>

        {resumo ? (
          <div
            className="text-[17px] whitespace-pre-line space-y-4"
            style={{ color: "var(--ink)", fontFamily: "var(--serif)", lineHeight: 1.75 }}
          >
            {resumo.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : (
          <p className="text-[14px]" style={{ color: "var(--ink-faint)" }}>
            Sem resumo disponível. Use o botão abaixo para abrir a matéria original.
          </p>
        )}

        {candidatos.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-8 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
            {candidatos.map((t) => (
              <Link key={t} to="/noticias" search={{ tag: t } as never} className="tag-topic">
                {t}
              </Link>
            ))}
          </div>
        )}

        {n.url && (
          <div className="mt-8 flex justify-center">
            <a
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Abrir matéria original <ExternalLink size={14} />
            </a>
          </div>
        )}
      </article>
    </div>
  );
}
