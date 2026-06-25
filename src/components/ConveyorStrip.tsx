import { useState, useEffect } from "react";
import { abrirNoticia } from "@/lib/uiStore";
import { relTime } from "@/lib/relTime";
import { htmlDecode } from "@/lib/htmlDecode";
import { flickrUrl } from "@/lib/loremFlickr";
import { ThematicCover } from "@/components/ThematicCover";
import type { Noticia } from "@/lib/types";

interface ConveyorStripProps {
  items: Noticia[];
}

function ConveyorItem({ n }: { n: Noticia }) {
  const titulo = htmlDecode(n.titulo);
  const fonte = n.fonte ?? "";

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

  return (
    <button
      onClick={() => abrirNoticia(n.id)}
      className="group mx-4 shrink-0 text-left"
      style={{ width: "clamp(260px, 25vw, 320px)" }}
      aria-label={titulo}
    >
      <div
        className="overflow-hidden border"
        style={{ aspectRatio: "4 / 3", borderColor: "var(--border-editorial)", background: "var(--surface-2)" }}
      >
        {imgSrc && !imgError ? (
          <img
            src={imgSrc}
            alt={titulo}
            loading="lazy"
            className="w-full h-full object-cover photo-aged transition-transform duration-700 ease-out group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <ThematicCover fonte={fonte} />
        )}
      </div>

      {/* Info */}
      <div className="pt-3">
        <div
          className="text-[9px] uppercase tracking-[0.3em] font-bold mb-1"
          style={{ fontFamily: "var(--mono)", color: "var(--radar)" }}
        >
          {fonte}
          {fonte && n.coletado_em ? " · " : ""}
          {n.coletado_em ? relTime(n.coletado_em) : ""}
        </div>
        <h3
          className="font-serif font-bold text-[15px] leading-[1.15] line-clamp-3"
          style={{ color: "var(--ink)" }}
        >
          <span className="radar-underline">{titulo}</span>
        </h3>
      </div>
    </button>
  );
}

export function ConveyorStrip({ items }: ConveyorStripProps) {
  if (items.length === 0) return null;

  // Double items for seamless infinite loop
  const doubled = [...items, ...items];

  return (
    <section
      className="relative border-y-2 overflow-hidden py-8"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-editorial)",
      }}
    >
      {/* Header */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-12 mb-6 flex items-end justify-between">
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.35em] font-bold"
            style={{ fontFamily: "var(--mono)", color: "var(--radar)" }}
          >
            ─ Newswire ─
          </div>
          <h2 className="masthead-title text-2xl md:text-3xl mt-1">A esteira do dia</h2>
        </div>
        <div
          className="hidden md:block text-[10px] uppercase tracking-[0.25em]"
          style={{ fontFamily: "var(--mono)", color: "var(--ink-muted)" }}
        >
          Passe o mouse para pausar
        </div>
      </div>

      {/* Scrolling strip */}
      <div className="relative">
        {/* Fade masks */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10"
          style={{ background: `linear-gradient(to right, var(--surface), transparent)` }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10"
          style={{ background: `linear-gradient(to left, var(--surface), transparent)` }}
        />

        <div className="conveyor-track">
          {doubled.map((n, idx) => (
            <ConveyorItem key={`${n.id}-${idx}`} n={n} />
          ))}
        </div>
      </div>
    </section>
  );
}
