import type { BubbleData, Layer } from "@/lib/mapaGeo";
import { colorForBubble } from "@/lib/mapaGeo";

interface MapaSidebarProps {
  bubbles: BubbleData[];
  layer: Layer;
  maxVolume: number;
  totalMentions?: number;
  scope?: "br" | "world";
  onSelect?: (item: BubbleData) => void;
}

interface ClusterInfo {
  sector: string;
  count: number;
  totalVolume: number;
  avgSentiment: number;
}

export function MapaSidebar({ bubbles, layer, maxVolume, totalMentions, scope = "world", onSelect }: MapaSidebarProps) {
  const top7 = bubbles.slice(0, 7);
  const total = totalMentions ?? bubbles.reduce((a, b) => a + b.volume, 0);

  // Clusters por setor
  const clusterMap = new Map<string, { count: number; vol: number; sentSum: number }>();
  for (const b of bubbles) {
    const c = clusterMap.get(b.sector) ?? { count: 0, vol: 0, sentSum: 0 };
    c.count++;
    c.vol += b.volume;
    c.sentSum += b.sentimentoScore;
    clusterMap.set(b.sector, c);
  }
  const clusters: ClusterInfo[] = [...clusterMap.entries()]
    .map(([sector, c]) => ({
      sector,
      count: c.count,
      totalVolume: c.vol,
      avgSentiment: c.count > 0 ? c.sentSum / c.count : 0,
    }))
    .sort((a, b) => b.totalVolume - a.totalVolume);

  return (
    <div className="mapa-sidebar">
      {/* ── Ranking ────────────────────────────────────── */}
      <div className="ms-section">
        <div className="ms-header">
          <span className="ms-header-label">{scope === "br" ? "Estados em destaque" : "Países em destaque"}</span>
          <span className="ms-header-count">{total.toLocaleString("pt-BR")}</span>
        </div>
        {top7.length === 0 ? (
          <div className="ms-empty">Nenhuma entidade no período.</div>
        ) : (
          <div className="ms-ranking">
            {top7.map((b, i) => {
              const pct = maxVolume > 0 ? (b.volume / maxVolume) * 100 : 0;
              const sentNorm = b.sentimentoScore < -0.1 ? "neg" : b.sentimentoScore > 0.1 ? "pos" : "neu";
              const sentDotColor = sentNorm === "pos" ? "var(--pos)" : sentNorm === "neg" ? "var(--neg)" : "var(--ink-faint)";
              const momPct = Math.round(b.momentum * 100);
              const flag = b.geo?.flag ?? "📍";
              const barColor = colorForBubble(b, layer, maxVolume);
              return (
                <button
                  key={b.entidade}
                  className="ms-rank-row"
                  onClick={() => onSelect?.(b)}
                >
                  <span className="ms-rank-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="ms-rank-flag">{flag}</span>
                  <div className="ms-rank-info">
                    <div className="ms-rank-name">{b.entidade}</div>
                    <div className="ms-rank-sub">
                      {b.topEntidades && b.topEntidades.length > 0 && (
                        <span className="ms-rank-entities">{b.topEntidades.slice(0, 2).map((e) => e.nome).join(", ")} · </span>
                      )}
                      {b.volume.toLocaleString("pt-BR")} menções
                      <span
                        className="ms-rank-dot"
                        style={{ background: sentDotColor }}
                        title={`Sentimento: ${sentNorm}`}
                      />
                    </div>
                  </div>
                  <span className={`ms-rank-mom ${momPct >= 0 ? "up" : "down"}`}>
                    {momPct >= 0 ? "▲" : "▼"} {Math.abs(momPct)}%
                  </span>
                  <div className="ms-rank-bar">
                    <div className="ms-rank-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Clusters ───────────────────────────────────── */}
      {clusters.length > 0 && (
        <div className="ms-section">
          <div className="ms-header">
            <span className="ms-header-label">Clusters</span>
          </div>
          <div className="ms-clusters">
            {clusters.map((c) => {
              const sentLabel = c.avgSentiment < -0.1 ? "Negativo" : c.avgSentiment > 0.1 ? "Positivo" : "Neutro";
              const sentColorStr = c.avgSentiment < -0.1 ? "var(--neg)" : c.avgSentiment > 0.1 ? "var(--pos)" : "var(--ink-faint)";
              return (
                <div key={c.sector} className="ms-cluster-chip">
                  <span
                    className="ms-cluster-dot"
                    style={{ background: sentColorStr }}
                  />
                  <span className="ms-cluster-name">{c.sector}</span>
                  <span className="ms-cluster-count">{c.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
