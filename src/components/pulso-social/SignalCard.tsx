import type { Tweet } from "@/lib/types";
import { normSent } from "@/lib/types";
import { relTime } from "@/lib/relTime";
import { cleanText } from "@/lib/htmlDecode";
import { resolveEspectroTweet, espectroCor, espectroLabel } from "@/lib/espectro";

function fmt(n: number | null | undefined): string {
  const v = n ?? 0;
  return v >= 1000 ? (v / 1000).toFixed(1).replace(".0", "") + "k" : String(v);
}

function initials(s: string): string {
  return s.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

const SENT_LABEL: Record<string, string> = { pos: "Positivo", neg: "Negativo", neu: "Neutro" };
const SENT_COLOR: Record<string, string> = { pos: "var(--pos)", neg: "var(--neg)", neu: "var(--neu)" };

interface SignalCardProps {
  t: Tweet;
  topicoVariacao?: number | null;
}

export function SignalCard({ t, topicoVariacao }: SignalCardProps) {
  const nome = t.autor_nome || "—";
  const handle = t.autor_handle ? (t.autor_handle.startsWith("@") ? t.autor_handle : `@${t.autor_handle}`) : "";
  const texto = cleanText(t.texto);
  const espectro = resolveEspectroTweet(t.autor_handle);
  const espCor = espectroCor(espectro);
  const sent = normSent(t.sentimento);
  const cluster = t.candidatos?.[0] ?? null;
  const eng = (t.likes ?? 0) + (t.retweets ?? 0) * 3 + (t.views ?? 0) * 0.01;

  const openOriginal = () => {
    if (t.url) window.open(t.url, "_blank", "noopener,noreferrer");
  };

  return (
    <article
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${espCor}`,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "border-color .14s, transform .14s",
      }}
      onClick={openOriginal}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "none";
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openOriginal();
        }
      }}
      role={t.url ? "link" : undefined}
      tabIndex={t.url ? 0 : -1}
    >
      {/* Top: avatar + nome + badges */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px", flexWrap: "wrap" }}>
        {t.autor_avatar_url ? (
          <img
            src={t.autor_avatar_url}
            alt=""
            style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            loading="lazy"
          />
        ) : (
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "var(--surface-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--ink-muted)",
              flexShrink: 0,
            }}
          >
            {initials(nome)}
          </div>
        )}

        <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: "12.5px" }}>{nome}</span>
        <span style={{ color: "var(--ink-faint)", fontSize: "11.5px" }}>{handle}</span>

        {/* Spike badge */}
        {topicoVariacao != null && topicoVariacao > 100 && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: "8.5px",
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              padding: "2px 7px",
              borderRadius: "4px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              color: "var(--accent-light)",
              background: "rgba(34,211,238,.12)",
            }}
          >
            ▲ {topicoVariacao.toFixed(0)}% spike
          </span>
        )}

        {/* Espectro badge */}
        <span
          style={{
            fontSize: "8.5px",
            fontWeight: 700,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            padding: "2px 7px",
            borderRadius: "4px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            color: espCor,
            background: `${espCor}21`,
          }}
        >
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: espCor }} />
          {espectroLabel(espectro)}
        </span>

        {/* Sentimento badge */}
        <span
          style={{
            fontSize: "8.5px",
            fontWeight: 700,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            padding: "2px 7px",
            borderRadius: "4px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            color: SENT_COLOR[sent],
            background: `${SENT_COLOR[sent]}21`,
          }}
        >
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: SENT_COLOR[sent] }} />
          {SENT_LABEL[sent]}
        </span>
      </div>

      {/* Texto em serif */}
      <p
        style={{
          fontFamily: "var(--serif)",
          fontSize: "14.5px",
          lineHeight: 1.45,
          color: "var(--ink)",
          margin: "0 0 9px",
        }}
      >
        {texto}
      </p>

      {/* Bottom: cluster + métricas + sparkline */}
      <div style={{ display: "flex", gap: "16px", fontSize: "10.5px", color: "var(--ink-faint)", fontVariantNumeric: "tabular-nums", alignItems: "center" }}>
        {cluster && (
          <span
            style={{
              fontSize: "9px",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--accent-light)",
              fontWeight: 700,
            }}
          >
            ◆ {cluster}
          </span>
        )}
        <span>♥ {fmt(t.likes)}</span>
        <span>↻ {fmt(t.retweets)}</span>
        <span>👁 {fmt(t.views)}</span>

        {/* Sparkline simples */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "flex-end", gap: "2px", height: "18px" }}>
          {[0.3, 0.5, 0.4, 0.7, 0.9, 1].map((h, i) => (
            <div
              key={i}
              style={{
                width: "3px",
                height: `${h * 18}px`,
                background: "var(--accent)",
                opacity: 0.55,
                borderRadius: "1px",
              }}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
