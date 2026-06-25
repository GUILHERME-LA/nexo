import type { MetricaDiaria, Tweet } from "@/lib/types";

interface KpiStripProps {
  metrica: MetricaDiaria | null;
  tweets: Tweet[];
  isLoading: boolean;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(".0", "") + "k";
  return String(n);
}

function fmtPct(n: number): string {
  const s = n >= 0 ? `▲ ${Math.abs(n).toFixed(0)}%` : `▼ ${Math.abs(n).toFixed(0)}%`;
  return s;
}

function sentAvg(tweets: Tweet[]): number {
  if (tweets.length === 0) return 0;
  const sum = tweets.reduce((acc, t) => acc + (t.sentimento_score ?? 0), 0);
  return sum / tweets.length;
}

function topMention(tweets: Tweet[]): { name: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const t of tweets) {
    for (const c of t.candidatos ?? []) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }
  let best: { name: string; count: number } | null = null;
  for (const [name, count] of counts) {
    if (!best || count > best.count) best = { name, count };
  }
  return best;
}

export function KpiStrip({ metrica, tweets, isLoading }: KpiStripProps) {
  const volume = metrica?.total_tweets ?? tweets.length;
  const engajamento = metrica?.engajamento_total ?? tweets.reduce((s, t) => s + (t.likes ?? 0) + (t.retweets ?? 0) + (t.replies ?? 0), 0);
  const perfis = metrica?.perfis_unicos ?? new Set(tweets.map(t => t.autor_handle).filter(Boolean)).size;
  const sentLiq = metrica?.sentimento_medio ?? sentAvg(tweets);
  const pico = topMention(tweets);

  const kpis = [
    {
      label: "Volume 24h",
      value: fmtNum(volume),
      delta: null as string | null,
      color: "var(--ink)",
    },
    {
      label: "Sentimento líquido",
      value: (sentLiq >= 0 ? "+" : "") + sentLiq.toFixed(2),
      delta: null,
      color: sentLiq < 0 ? "var(--neg)" : sentLiq > 0 ? "var(--pos)" : "var(--ink-muted)",
    },
    {
      label: "Engajamento",
      value: fmtNum(engajamento),
      delta: null,
      color: "var(--ink)",
    },
    {
      label: "Perfis únicos",
      value: String(perfis),
      delta: null,
      color: "var(--ink)",
    },
    {
      label: "Pico de menções",
      value: pico?.name ?? "—",
      delta: pico ? `${pico.count} posts` : null,
      color: "var(--ink)",
      serif: true,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "1px",
        background: "var(--border)",
        border: "1px solid var(--border)",
        marginBottom: "16px",
      }}
    >
      {kpis.map((kpi, i) => (
        <div
          key={i}
          style={{
            background: "var(--surface)",
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
              marginBottom: "6px",
              fontFamily: "var(--mono)",
            }}
          >
            {kpi.label}
          </div>
          <div
            style={{
              fontFamily: kpi.serif ? "var(--serif)" : "var(--serif)",
              fontSize: kpi.serif ? "18px" : "26px",
              fontWeight: 600,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              color: kpi.color,
            }}
          >
            {isLoading ? (
              <span style={{ display: "inline-block", width: "60px", height: "20px", background: "var(--surface-2)", borderRadius: "4px" }} />
            ) : (
              kpi.value
            )}
          </div>
          {kpi.delta && (
            <div
              style={{
                fontSize: "10.5px",
                marginTop: "5px",
                fontVariantNumeric: "tabular-nums",
                color: "var(--ink-faint)",
              }}
            >
              {kpi.delta}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
