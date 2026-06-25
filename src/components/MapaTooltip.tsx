import { useRef, useState, useEffect } from "react";
import type { BubbleData, Layer } from "@/lib/mapaGeo";
import { sentColor, momColor, volColor } from "@/lib/mapaGeo";

interface MapaTooltipProps {
  item: BubbleData | null;
  layer: Layer;
  position: { x: number; y: number };
  maxVolume: number;
}

export function MapaTooltip({ item, layer, position, maxVolume }: MapaTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!item) {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [item]);

  useEffect(() => {
    if (!ref.current || !item) return;
    const r = ref.current.getBoundingClientRect();
    let x = position.x + 16;
    let y = position.y - 8;
    // Flip horizontal
    if (x + r.width > window.innerWidth - 12) x = position.x - r.width - 16;
    // Flip vertical
    if (y + r.height > window.innerHeight - 12) y = position.y - r.height + 8;
    if (y < 12) y = 12;
    if (x < 12) x = 12;
    setPos({ x, y });
  }, [position, item]);

  if (!item || !visible) return null;

  const sentLabel = item.sentimentoScore < -0.1 ? "Negativo" : item.sentimentoScore > 0.1 ? "Positivo" : "Neutro";
  const sentClr = item.sentimentoScore < -0.1 ? "var(--neg)" : item.sentimentoScore > 0.1 ? "var(--pos)" : "var(--ink-muted)";
  const momPct = Math.round(item.momentum * 100);
  const momClr = item.momentum < 0 ? "var(--neg)" : "var(--pos)";
  const flag = item.geo?.flag ?? "📍";
  const spark = item.sparkline ?? [];
  const sparkMax = Math.max(...spark, 1);

  // Cor da bolha no layer atual
  let bubbleClr: string;
  if (layer === "sentimento") bubbleClr = sentColor(item.sentimentoScore);
  else if (layer === "momentum") bubbleClr = momColor(item.momentum);
  else bubbleClr = volColor(item.volume, maxVolume);

  return (
    <div
      ref={ref}
      className="mapa-tooltip"
      style={{
        left: pos.x,
        top: pos.y,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(4px) scale(0.97)",
      }}
    >
      {/* Header */}
      <div className="mt-header">
        <span className="mt-flag">{flag}</span>
        <div className="mt-title-group">
          <div className="mt-name">{item.entidade}</div>
          <div className="mt-sector">{item.sector}</div>
        </div>
      </div>

      {/* Métricas */}
      <div className="mt-metrics">
        <div className="mt-metric">
          <span className="mt-metric-label">Menções</span>
          <span className="mt-metric-value" style={{ color: bubbleClr }}>
            {item.volume.toLocaleString("pt-BR")}
          </span>
        </div>
        <div className="mt-metric">
          <span className="mt-metric-label">Sentimento</span>
          <span className="mt-metric-value" style={{ color: sentClr }}>
            {sentLabel} ({item.sentimentoScore > 0 ? "+" : ""}{item.sentimentoScore.toFixed(2)})
          </span>
        </div>
        <div className="mt-metric">
          <span className="mt-metric-label">Momentum</span>
          <span className="mt-metric-value" style={{ color: momClr }}>
            {momPct > 0 ? "▲ +" : "▼ "}{Math.abs(momPct)}%
          </span>
        </div>
        <div className="mt-metric">
          <span className="mt-metric-label">Engajamento</span>
          <span className="mt-metric-value">
            {item.engajamento >= 1000 ? `${(item.engajamento / 1000).toFixed(1)}k` : Math.round(item.engajamento).toLocaleString("pt-BR")}
          </span>
        </div>
      </div>

      {/* Tags */}
      {item.tipo && (
        <div className="mt-tags">
          <span className="mt-tag">{item.tipo}</span>
        </div>
      )}

      {/* Top entities (drill-down) */}
      {item.topEntidades && item.topEntidades.length > 0 && (
        <div className="mt-entities">
          <div className="mt-entities-label">Entidades</div>
          {item.topEntidades.map((e) => (
            <div key={e.nome} className="mt-entity-row">
              <span className="mt-entity-name">{e.nome}</span>
              <span className="mt-entity-vol">{e.volume.toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sparkline */}
      {spark.length > 0 && (
        <div className="mt-spark">
          {spark.map((v, i) => (
            <div
              key={i}
              className="mt-spark-bar"
              style={{
                height: `${Math.max(2, (v / sparkMax) * 18)}px`,
                background: v > 0 ? bubbleClr : "var(--surface-3)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
