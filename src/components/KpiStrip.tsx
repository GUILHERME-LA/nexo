export interface KpiItem {
  label: string;
  value: string | number;
  delta?: { text: string; positive: boolean };
  color?: string;
  mono?: boolean;
}

export function KpiStrip({ items, columns = 4 }: { items: KpiItem[]; columns?: number }) {
  return (
    <div className="kpi-strip" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {items.map((k, i) => (
        <div key={i} className="kpi-cell">
          <div className="kpi-label">{k.label}</div>
          <div
            className="kpi-value"
            style={{
              color: k.color ?? "var(--ink)",
              fontFamily: k.mono === false ? "var(--serif)" : undefined,
            }}
          >
            {typeof k.value === "number" ? k.value.toLocaleString("pt-BR") : k.value}
          </div>
          {k.delta && (
            <div className={`kpi-delta ${k.delta.positive ? "up" : "down"}`}>
              {k.delta.positive ? "\u25B2" : "\u25BC"} {k.delta.text}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
