import { useState, useEffect } from "react";
import { abrirNoticia } from "@/lib/uiStore";
import { relTime } from "@/lib/relTime";
import { htmlDecode } from "@/lib/htmlDecode";
import { flickrUrl } from "@/lib/loremFlickr";
import { ThematicCover } from "@/components/ThematicCover";
import type { Noticia } from "@/lib/types";

interface NewsCellProps {
  n: Noticia;
  featured?: boolean;
  showImage?: boolean;
  className?: string;
}

export function NewsCell({ n, featured = false, showImage = false, className = "" }: NewsCellProps) {
  const handleClick = () => abrirNoticia(n.id);
  const titulo = htmlDecode(n.titulo);
  const fonte = n.fonte ?? "";

  const showImg = featured || showImage;

  // Resolve image: DB URL → loremflickr → null (ThematicCover)
  const [imgSrc, setImgSrc] = useState<string | null>(n.imagem_url ?? null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (n.imagem_url) {
      setImgSrc(n.imagem_url);
      setImgError(false);
      return;
    }
    // Generate loremflickr URL when no DB image
    setImgSrc(flickrUrl(n.titulo, n.id));
    setImgError(false);
  }, [n.imagem_url, n.titulo, n.id]);

  return (
    <article
      className={`np-cell group cursor-pointer transition-colors duration-300 ${className}`}
      onClick={handleClick}
    >
      <div className="h-full p-5 md:p-6 flex flex-col">
        {showImg && (
          <div
            className="overflow-hidden mb-4 shrink-0"
            style={{ aspectRatio: featured ? "16 / 10" : "16 / 9" }}
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
        )}

        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.08em] mb-2 shrink-0"
          style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}
        >
          <span>{fonte}</span>
          {fonte && n.coletado_em && <span style={{ color: "var(--border-editorial)" }}>·</span>}
          {n.coletado_em && <span>{relTime(n.coletado_em)}</span>}
        </div>

        <h3
          className={`font-serif font-bold tracking-tight leading-[1.12] ${
            featured
              ? "text-[28px] md:text-[32px] mb-3"
              : "text-base leading-snug line-clamp-2 mb-2"
          } flex-1`}
          style={{ color: "var(--ink)" }}
        >
          <span className="radar-underline">{titulo}</span>
        </h3>

        {featured && n.resumo && (
          <p
            className="text-sm mt-1 line-clamp-3 leading-relaxed shrink-0"
            style={{ color: "var(--ink-muted)" }}
          >
            {htmlDecode(n.resumo)}
          </p>
        )}

        {!featured && n.resumo && (
          <p
            className="text-sm leading-relaxed line-clamp-2 mt-auto shrink-0"
            style={{ color: "var(--ink-muted)" }}
          >
            {htmlDecode(n.resumo)}
          </p>
        )}
      </div>
    </article>
  );
}
