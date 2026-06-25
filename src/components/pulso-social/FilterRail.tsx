import type { Tweet } from "@/lib/types";
import { normSent } from "@/lib/types";
import { resolveEspectroTweet } from "@/lib/espectro";

interface FilterRailProps {
  tweets: Tweet[];
  sentFilter: Set<string>;
  setSentFilter: (s: Set<string>) => void;
  espFilter: Set<string>;
  setEspFilter: (s: Set<string>) => void;
  minEngagement: number;
  setMinEngagement: (n: number) => void;
  janela: "1h" | "24h" | "7d";
  setJanela: (j: "1h" | "24h" | "7d") => void;
}

function countBySent(tweets: Tweet[]) {
  const counts = { positivo: 0, neutro: 0, negativo: 0 };
  for (const t of tweets) {
    const s = normSent(t.sentimento);
    if (s === "pos") counts.positivo++;
    else if (s === "neg") counts.negativo++;
    else counts.neutro++;
  }
  return counts;
}

function countByEsp(tweets: Tweet[]) {
  const counts = { esquerda: 0, centro: 0, direita: 0 };
  for (const t of tweets) {
    const e = resolveEspectroTweet(t.autor_handle) ?? "centro";
    counts[e as keyof typeof counts]++;
  }
  return counts;
}

function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

const SENT_ITEMS = [
  { key: "positivo", label: "Positivo", color: "var(--pos)" },
  { key: "neutro", label: "Neutro", color: "var(--neu)" },
  { key: "negativo", label: "Negativo", color: "var(--neg)" },
] as const;

const ESP_ITEMS = [
  { key: "esquerda", label: "Esquerda", color: "var(--esquerda)" },
  { key: "centro", label: "Centro", color: "var(--centro)" },
  { key: "direita", label: "Direita", color: "var(--direita)" },
] as const;

const JANELAS = [
  { key: "1h" as const, label: "Última hora" },
  { key: "24h" as const, label: "24 horas" },
  { key: "7d" as const, label: "7 dias" },
];

export function FilterRail({
  tweets, sentFilter, setSentFilter, espFilter, setEspFilter,
  minEngagement, setMinEngagement, janela, setJanela,
}: FilterRailProps) {
  const sentCounts = countBySent(tweets);
  const espCounts = countByEsp(tweets);
  const totalActive = sentFilter.size + espFilter.size;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "11px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            fontWeight: 700,
            fontFamily: "var(--mono)",
          }}
        >
          Filtros
        </span>
        <span style={{ fontSize: "9px", color: "var(--ink-faint)" }}>
          {totalActive} ativos
        </span>
      </div>

      {/* Sentimento */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
        <div
          style={{
            fontSize: "9px",
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: "var(--ink-faint)",
            marginBottom: "9px",
            fontFamily: "var(--mono)",
          }}
        >
          Sentimento
        </div>
        {SENT_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => setSentFilter(toggle(sentFilter, item.key))}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              width: "100%",
              background: sentFilter.has(item.key) ? "var(--accent-soft)" : "none",
              border: "none",
              color: sentFilter.has(item.key) ? "var(--ink)" : "var(--ink-muted)",
              fontFamily: "var(--mono)",
              fontSize: "11.5px",
              padding: "5px 7px",
              borderRadius: "5px",
              cursor: "pointer",
              textAlign: "left",
              transition: "background .12s, color .12s",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                flexShrink: 0,
                background: item.color,
              }}
            />
            {item.label}
            <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--ink-faint)", fontVariantNumeric: "tabular-nums" }}>
              {sentCounts[item.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Espectro */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
        <div
          style={{
            fontSize: "9px",
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: "var(--ink-faint)",
            marginBottom: "9px",
            fontFamily: "var(--mono)",
          }}
        >
          Espectro
        </div>
        {ESP_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => setEspFilter(toggle(espFilter, item.key))}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              width: "100%",
              background: espFilter.has(item.key) ? "var(--accent-soft)" : "none",
              border: "none",
              color: espFilter.has(item.key) ? "var(--ink)" : "var(--ink-muted)",
              fontFamily: "var(--mono)",
              fontSize: "11.5px",
              padding: "5px 7px",
              borderRadius: "5px",
              cursor: "pointer",
              textAlign: "left",
              transition: "background .12s, color .12s",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                flexShrink: 0,
                background: item.color,
              }}
            />
            {item.label}
            <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--ink-faint)", fontVariantNumeric: "tabular-nums" }}>
              {espCounts[item.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Engajamento mínimo */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
        <div
          style={{
            fontSize: "9px",
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: "var(--ink-faint)",
            marginBottom: "9px",
            fontFamily: "var(--mono)",
          }}
        >
          Engajamento mínimo
        </div>
        <input
          type="range"
          min={0}
          max={1000}
          step={10}
          value={minEngagement}
          onChange={(e) => setMinEngagement(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--accent)" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9.5px", color: "var(--ink-faint)", marginTop: "3px" }}>
          <span>0</span>
          <span>{minEngagement >= 1000 ? `${(minEngagement / 1000).toFixed(1)}k+` : `${minEngagement}+`}</span>
        </div>
      </div>

      {/* Janela */}
      <div style={{ padding: "12px 14px" }}>
        <div
          style={{
            fontSize: "9px",
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: "var(--ink-faint)",
            marginBottom: "9px",
            fontFamily: "var(--mono)",
          }}
        >
          Janela
        </div>
        {JANELAS.map((item) => (
          <button
            key={item.key}
            onClick={() => setJanela(item.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              width: "100%",
              background: janela === item.key ? "var(--accent-soft)" : "none",
              border: "none",
              color: janela === item.key ? "var(--ink)" : "var(--ink-muted)",
              fontFamily: "var(--mono)",
              fontSize: "11.5px",
              padding: "5px 7px",
              borderRadius: "5px",
              cursor: "pointer",
              textAlign: "left",
              transition: "background .12s, color .12s",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                flexShrink: 0,
                background: "var(--accent)",
              }}
            />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
