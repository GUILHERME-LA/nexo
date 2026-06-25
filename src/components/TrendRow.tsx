import { useNavigate } from "@tanstack/react-router";
import { Filter, ChevronRight } from "lucide-react";
import type { TopicoQuente } from "@/lib/types";

export function TrendRow({
  t,
  i,
  max,
  onSelect,
  active = false,
  espectroColor,
}: {
  t: TopicoQuente;
  i: number;
  max: number;
  onSelect?: (entidade: string) => void;
  active?: boolean;
  espectroColor?: string;
}) {
  const navigate = useNavigate();
  const score = t.score ?? 0;
  const bar = max > 0 ? (score / max) * 100 : 0;
  const varPct = t.variacao_pct ?? 0;

  const handleClick = () => {
    if (onSelect) onSelect(t.entidade);
    else navigate({ to: "/noticias", search: { q: t.entidade } as never });
  };

  return (
    <button
      onClick={handleClick}
      aria-expanded={onSelect ? active : undefined}
      className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-2)] text-left border-b last:border-b-0"
      style={{
        borderColor: "var(--border)",
        background: active ? "var(--surface-2)" : undefined,
        // Acessibilidade: highlight lateral da cor do espectro quando selecionado
        borderLeft: active && espectroColor ? `3px solid ${espectroColor}` : "3px solid transparent",
        paddingLeft: active && espectroColor ? "calc(1rem - 3px)" : undefined,
      }}
    >
      {/* Rank */}
      <span
        className="font-bold tabular-nums text-[11px] shrink-0 w-5 text-center"
        style={{ color: "var(--ink-faint)", fontFamily: "var(--mono)" }}
      >
        {String(i + 1).padStart(2, "0")}
      </span>

      {/* Dot de espectro */}
      {espectroColor && (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: espectroColor,
            flexShrink: 0,
            opacity: 0.85,
          }}
          aria-hidden
        />
      )}

      {/* Nome + menções */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[13px] sm:text-[14px] font-semibold" style={{ color: "var(--ink)" }}>
          <span className="truncate">{t.entidade}</span>
          {t.tipo && t.tipo.toLowerCase() !== "unknown" && (
            <span
              className="hidden sm:inline text-[9.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
              style={{ background: "var(--surface-2)", color: "var(--ink-faint)" }}
            >
              {t.tipo}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--ink-faint)" }}>
          <span>{(t.num_mencoes ?? 0).toLocaleString("pt-BR")} menções</span>
          {varPct !== 0 && (
            <span
              className="font-semibold"
              style={{ color: varPct >= 0 ? "var(--pos)" : "var(--neg)" }}
            >
              {varPct >= 0 ? "▲" : "▼"} {Math.abs(varPct).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* Barra + score — oculto em telas muito pequenas */}
      <div className="hidden xs:flex items-center gap-2 shrink-0">
        <div className="w-20 sm:w-28 h-1.5 rounded-full" style={{ background: "var(--surface-3)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${bar}%`, background: espectroColor ?? "var(--accent)" }}
          />
        </div>
        <span
          className="text-[12px] sm:text-[13px] font-bold tabular-nums w-8 text-right shrink-0"
          style={{ color: espectroColor ?? "var(--accent)" }}
        >
          {Math.round(score)}
        </span>
      </div>

      {/* Score só no mobile (sem barra) */}
      <span
        className="xs:hidden text-[12px] font-bold tabular-nums shrink-0"
        style={{ color: espectroColor ?? "var(--accent)" }}
      >
        {Math.round(score)}
      </span>

      {onSelect ? (
        <ChevronRight
          size={15}
          className="shrink-0"
          style={{
            color: active ? (espectroColor ?? "var(--accent)") : "var(--ink-faint)",
            transform: active ? "rotate(90deg)" : "none",
            transition: "transform .15s",
          }}
        />
      ) : (
        <Filter size={13} className="shrink-0" style={{ color: "var(--ink-faint)" }} />
      )}
    </button>
  );
}
