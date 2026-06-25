import { useState } from "react";

export interface HeatRow {
  entidade: string;
  valores: number[];
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

function heatColor(v: number, max: number) {
  if (!v) return "rgba(22,22,26,.025)";
  const a = Math.min(0.92, 0.08 + (v / Math.max(1, max)) * 0.84);
  return `rgba(28,42,70,${a.toFixed(2)})`;
}

export function HeatTable({
  cols,
  rows,
  onSelect,
  selected,
}: {
  cols: string[];
  rows: HeatRow[];
  onSelect?: (entidade: string, diaIndex?: number) => void;
  selected?: string | null;
}) {
  const [highlight, setHighlight] = useState<string | null>(null);
  const max = rows.reduce((m, r) => Math.max(m, ...r.valores), 1);
  const ativo = selected ?? highlight;

  function clicar(entidade: string, diaIndex?: number) {
    if (onSelect) onSelect(entidade, diaIndex);
    else setHighlight((h) => (h === entidade ? null : entidade));
  }

  if (rows.length === 0 || cols.length === 0) {
    return (
      <div className="card-editorial p-10 text-center text-[14px]" style={{ color: "var(--ink-faint)" }}>
        Sem dados de mapa de calor para esta vertical.
      </div>
    );
  }

  return (
    <div className="card-editorial overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: cols.length > 1 ? 520 : undefined }}>
          <div
            className="grid text-[10.5px] font-semibold uppercase tracking-wider"
            style={{
              gridTemplateColumns: `minmax(140px,1.4fr) repeat(${cols.length}, minmax(56px,1fr))`,
              background: "var(--surface-2)",
              color: "var(--ink-faint)",
            }}
          >
            <div className="px-4 py-3">Entidade</div>
            {cols.map((d) => (
              <div key={d} className="px-2 py-3 text-center border-l" style={{ borderColor: "var(--border)" }}>
                {d}
              </div>
            ))}
          </div>
          {rows.map((r) => {
            const isHL = ativo === r.entidade;
            return (
              <div
                key={r.entidade}
                className="grid border-t transition-colors"
                style={{
                  gridTemplateColumns: `minmax(140px,1.4fr) repeat(${cols.length}, minmax(56px,1fr))`,
                  borderColor: "var(--border)",
                  background: isHL ? "var(--accent-soft)" : "transparent",
                }}
              >
                <button
                  onClick={() => clicar(r.entidade)}
                  title="Ver notícias e tweets dos últimos 7 dias"
                  className="flex items-center gap-2.5 px-3 sm:px-4 py-3 text-left text-[13px] font-medium min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{ color: "var(--ink)" }}
                >
                  <span
                    className="w-7 h-7 shrink-0 rounded-full inline-flex items-center justify-center text-[10.5px] font-bold"
                    style={{ background: "var(--surface-3)", color: "var(--ink-muted)" }}
                  >
                    {initials(r.entidade)}
                  </span>
                  <span className="truncate">{r.entidade}</span>
                </button>
                {r.valores.map((v, i) => {
                  const clicavel = !!onSelect && v > 0;
                  const conteudo = (
                    <div
                      className="w-full h-full min-h-[40px] rounded flex items-center justify-center text-[11.5px] font-semibold tabular-nums"
                      style={{
                        background: heatColor(v, max),
                        color: v > max * 0.55 ? "#fff" : "var(--ink-muted)",
                      }}
                    >
                      {v || ""}
                    </div>
                  );
                  return (
                    <div key={i} className="p-1.5 border-l" style={{ borderColor: "var(--border)" }}>
                      {clicavel ? (
                        <button
                          type="button"
                          onClick={() => clicar(r.entidade, i)}
                          title={`${v} menções em ${cols[i]} · ver notícias e tweets`}
                          className="w-full h-full cursor-pointer transition-transform hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        >
                          {conteudo}
                        </button>
                      ) : (
                        <div title={`${v} menções`} className="w-full h-full">
                          {conteudo}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
