/**
 * ThematicCover — fallback offline para notícias sem imagem.
 * Tema claro editorial (Honorix), sem dependência externa.
 */

const ACCENTS = [
  "var(--radar)",
  "var(--accent)",
  "var(--ink-muted)",
  "var(--radar)",
];

function hashFonte(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function ThematicCover({ fonte, className }: { fonte: string; className?: string }) {
  const f = (fonte || "·").trim();
  const initial = f[0]?.toUpperCase() ?? "·";
  const accent = ACCENTS[hashFonte(f) % ACCENTS.length];

  return (
    <div
      aria-hidden
      className={`relative w-full h-full overflow-hidden ${className ?? ""}`}
      style={{ background: "var(--surface-2)" }}
    >
      {/* Top filete */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "var(--border-editorial)" }}
      />

      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 70% 30%, rgba(16,185,129,0.06) 0%, transparent 60%)`,
        }}
      />

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <span
          className="leading-none"
          style={{
            fontFamily: "var(--serif)",
            fontWeight: 600,
            fontSize: "clamp(40px, 8vw, 72px)",
            color: accent,
            opacity: 0.35,
            letterSpacing: "-0.02em",
          }}
        >
          {initial}
        </span>
        <span
          className="mt-2 max-w-[90%] truncate text-[10px] font-semibold uppercase"
          style={{
            fontFamily: "var(--mono)",
            color: "var(--ink-faint)",
            letterSpacing: "0.18em",
          }}
        >
          {f}
        </span>
      </div>

      {/* Bottom border line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "var(--border-editorial)" }}
      />
    </div>
  );
}
