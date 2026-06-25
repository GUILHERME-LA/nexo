import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import type { Noticia } from "@/lib/types";
import { normSent } from "@/lib/types";
import { relTime } from "@/lib/relTime";
import { flickrUrl } from "@/lib/loremFlickr";
import { ThematicCover } from "@/components/ThematicCover";
import { cleanText } from "@/lib/htmlDecode";
import { resolveEspectro, espectroCor, espectroLabel } from "@/lib/espectro";
import { abrirNoticia } from "@/lib/uiStore";

function sentDot(s: string | null) {
  const v = normSent(s);
  return v === "pos" ? "var(--pos)" : v === "neg" ? "var(--neg)" : "var(--neu)";
}

export function NewsCard({ n }: { n: Noticia }) {
  const navigate = useNavigate();
  const fonte = n.fonte || "—";
  const candidatos = Array.isArray(n.candidatos) ? n.candidatos : [];
  const titulo = cleanText(n.titulo);
  const resumo = cleanText(n.resumo);
  const espectro = resolveEspectro(n.espectro, n.titulo, n.resumo);
  const espCor = espectroCor(espectro);

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

  const openReader = () => abrirNoticia(n.id);

  return (
    <article
      className="card-editorial fade-in grid gap-4 p-3 sm:gap-5 sm:p-4 mb-4 cursor-pointer hover:border-[var(--border-strong)] transition-colors grid-cols-1 sm:[grid-template-columns:180px_1fr]"
      style={{ borderLeft: `3px solid ${espCor}` }}
      onClick={openReader}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openReader();
        }
      }}
      role="link"
      tabIndex={0}
    >
      <div
        className="relative rounded-lg overflow-hidden aspect-[16/9] sm:aspect-[4/3]"
        style={{ background: "var(--surface-2)" }}
      >
        {imgSrc && !imgError ? (
          <img
            src={imgSrc}
            alt=""
            width={480}
            height={360}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <ThematicCover fonte={fonte} />
        )}
      </div>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2 mb-2 text-[11.5px] flex-wrap" style={{ color: "var(--ink-faint)" }}>
          <span
            className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider"
            style={{ color: "var(--ink-muted)" }}
          >
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold"
              style={{ background: "var(--surface-3)", color: "var(--ink)" }}
            >
              {fonte[0]}
            </span>
            {fonte}
          </span>
          <span className="w-1 h-1 rounded-full" style={{ background: "var(--ink-faint)" }} />
          <span>{relTime(n.publicado_em)}</span>
          <span className="w-1 h-1 rounded-full" style={{ background: sentDot(n.sentimento) }} />
          {n.autor && <span className="hidden sm:inline">· {n.autor}</span>}
          <span
            className="sm:ml-auto inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ color: espCor, background: `${espCor}21` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: espCor }} />
            {espectroLabel(espectro)}
          </span>
        </div>
        <h3
          className="text-[17px] sm:text-[20px] leading-[1.25] sm:leading-[1.22] mb-2"
          style={{ fontFamily: "var(--serif)", fontWeight: 600, letterSpacing: "-0.01em" }}
        >
          {titulo}
        </h3>
        {resumo && (
          <p
            className="text-[13px] leading-[1.55] mb-3"
            style={{
              color: "var(--ink-muted)",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {resumo}
          </p>
        )}
        {candidatos.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-auto">
            {candidatos.slice(0, 6).map((t) => (
              <button
                key={t}
                className="tag-topic"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate({ to: "/noticias", search: { tag: t } as never });
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        {n.url && (
          <div className="flex justify-end mt-2">
            <a
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3.5 min-h-[36px] rounded-full border border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Ver na fonte <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
