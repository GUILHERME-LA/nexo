import { Heart, Repeat2, Eye, ExternalLink } from "lucide-react";
import type { Tweet } from "@/lib/types";
import { normSent } from "@/lib/types";
import { relTime } from "@/lib/relTime";
import { cleanText } from "@/lib/htmlDecode";
import { resolveEspectroTweet, espectroCor, espectroLabel } from "@/lib/espectro";

const sentLabel = { pos: "Positivo", neg: "Negativo", neu: "Neutro" } as const;
function sentColor(s: string | null) {
  const v = normSent(s);
  return v === "pos"
    ? { c: "#1B7F4B", bg: "#E6F4EC", dot: "#1B7F4B", k: "pos" as const }
    : v === "neg"
      ? { c: "#B3261E", bg: "#FBEAE8", dot: "#B3261E", k: "neg" as const }
      : { c: "#4A4A52", bg: "#ECECEE", dot: "#6B6B72", k: "neu" as const };
}

function fmt(n: number | null | undefined) {
  const v = n ?? 0;
  return v >= 1000 ? (v / 1000).toFixed(1).replace(".0", "") + "k" : String(v);
}
function initials(s: string) {
  return s
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TweetCard({ t }: { t: Tweet }) {
  const col = sentColor(t.sentimento);
  const nome = t.autor_nome || "—";
  const handle = t.autor_handle ? (t.autor_handle.startsWith("@") ? t.autor_handle : `@${t.autor_handle}`) : "";
  const texto = cleanText(t.texto);
  const espectro = resolveEspectroTweet(t.autor_handle);
  const espCor = espectroCor(espectro);

  const openOriginal = () => {
    if (t.url) window.open(t.url, "_blank", "noopener,noreferrer");
  };

  return (
    <article
      className="card-editorial fade-in flex gap-3 p-4 mb-3 cursor-pointer hover:border-[var(--border-strong)] transition-colors"
      style={{ borderLeft: `3px solid ${espCor}` }}
      onClick={openOriginal}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openOriginal();
        }
      }}
      role={t.url ? "link" : undefined}
      tabIndex={t.url ? 0 : -1}
    >
      {t.autor_avatar_url ? (
        <img src={t.autor_avatar_url} alt="" className="shrink-0 w-10 h-10 rounded-full object-cover" loading="lazy" />
      ) : (
        <div
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold"
          style={{ background: "var(--surface-3)", color: "var(--ink-muted)" }}
        >
          {initials(nome)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 text-[12.5px] flex-wrap">
          <b style={{ color: "var(--ink)" }}>{nome}</b>
          {handle && <span style={{ color: "var(--ink-faint)" }}>{handle}</span>}
          <span style={{ color: "var(--ink-faint)" }}>· {relTime(t.publicado_em)}</span>
          <span
            className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ color: espCor, background: `${espCor}21` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: espCor }} />
            {espectroLabel(espectro)}
          </span>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ color: col.c, background: col.bg }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.dot }} />
            {sentLabel[col.k]}
          </span>
        </div>
        <p className="text-[13.5px] leading-[1.5] mb-2 whitespace-pre-line" style={{ color: "var(--ink)" }}>
          {texto}
        </p>
        <div className="flex items-center gap-5 text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
          <span className="inline-flex items-center gap-1.5">
            <Heart size={12} /> {fmt(t.likes)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Repeat2 size={12} /> {fmt(t.retweets)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye size={12} /> {fmt(t.views)}
          </span>
          {t.url && (
            <a
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-auto inline-flex items-center gap-1.5 font-medium text-[var(--ink-muted)] hover:text-[var(--accent)] transition-colors min-h-[36px] px-2 -mr-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Ver no X <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
