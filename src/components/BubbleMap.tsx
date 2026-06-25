import { useMemo, useCallback } from "react";
import countryShapes from "world-map-country-shapes";
import type { BubbleData, Layer, Scope } from "@/lib/mapaGeo";
import { bubbleRadius, colorForBubble, projRobinson, COUNTRY_NAME_TO_ISO } from "@/lib/mapaGeo";
import { BR_STATE_OUTLINES } from "@/lib/brStateOutlines";

// ── Parse SVG path to absolute coordinates (for centroid computation) ─────
function parseSvgPath(shape: string): [number, number][] {
  const tokens = shape.match(/[a-zA-Z]|[-+]?\d*\.?\d+/g);
  if (!tokens) return [];
  const pts: [number, number][] = [];
  let cx = 0, cy = 0, sx = 0, sy = 0, cmd = "";
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[a-zA-Z]/.test(t)) { cmd = t; i++; continue; }
    switch (cmd) {
      case "M": cx = +tokens[i]; cy = +tokens[i + 1]; sx = cx; sy = cy; i += 2; pts.push([cx, cy]); break;
      case "m": cx += +tokens[i]; cy += +tokens[i + 1]; sx = cx; sy = cy; i += 2; pts.push([cx, cy]); break;
      case "L": cx = +tokens[i]; cy = +tokens[i + 1]; i += 2; pts.push([cx, cy]); break;
      case "l": cx += +tokens[i]; cy += +tokens[i + 1]; i += 2; pts.push([cx, cy]); break;
      case "H": cx = +tokens[i]; i++; pts.push([cx, cy]); break;
      case "h": cx += +tokens[i]; i++; pts.push([cx, cy]); break;
      case "V": cy = +tokens[i]; i++; pts.push([cx, cy]); break;
      case "v": cy += +tokens[i]; i++; pts.push([cx, cy]); break;
      case "S": case "C": i += 6; break;
      case "s": case "c": i += 6; break;
      case "Q": i += 4; break;
      case "q": i += 4; break;
      case "A": i += 7; break;
      case "a": i += 7; break;
      case "Z": case "z": cx = sx; cy = sy; break;
      default: i++; break;
    }
  }
  return pts;
}

// ── Pre-computed centroid for each country (ISO2 → SVG centroid) ──────────
const COUNTRY_CENTROIDS: Record<string, [number, number]> = {};
for (const c of countryShapes as { id: string; shape: string }[]) {
  const pts = parseSvgPath(c.shape);
  if (pts.length === 0) continue;
  let sx = 0, sy = 0;
  for (const p of pts) { sx += p[0]; sy += p[1]; }
  COUNTRY_CENTROIDS[c.id] = [sx / pts.length, sy / pts.length];
}

// ── Brasil: equirectangular projection for state outlines ──────────────────
const BR_VIEWBOX = { w: 480, h: 380 };
const BR_LAT = { min: -34, max: 6 };
const BR_LON = { min: -74, max: -34 };

function brProject(lon: number, lat: number): { x: number; y: number } {
  const x = ((lon - BR_LON.min) / (BR_LON.max - BR_LON.min)) * BR_VIEWBOX.w;
  const y = ((BR_LAT.max - lat) / (BR_LAT.max - BR_LAT.min)) * BR_VIEWBOX.h;
  return { x, y };
}

function brPathFromCoords(coords: number[][]): string {
  return coords.map((c, i) => {
    const { x, y } = brProject(c[0], c[1]);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + "Z";
}

// ── Get bubble position in world SVG coordinates ───────────────────────────
function getWorldBubblePos(b: BubbleData): { x: number; y: number } | null {
  if (b.geo?.lon != null && b.geo?.lat != null) {
    return projRobinson(b.geo.lon, b.geo.lat);
  }
  // Fallback: try to find country centroid from entity geo data
  if (b.geo?.country) {
    const iso = COUNTRY_NAME_TO_ISO[b.geo.country];
    if (iso && COUNTRY_CENTROIDS[iso]) {
      const [cx, cy] = COUNTRY_CENTROIDS[iso];
      return { x: cx, y: cy };
    }
  }
  return null;
}

interface BubbleMapProps {
  bubbles: BubbleData[];
  layer: Layer;
  scope: Scope;
  onBubbleClick?: (item: BubbleData) => void;
  onBubbleHover?: (item: BubbleData | null, pos: { x: number; y: number }) => void;
}

export function BubbleMap({ bubbles, layer, scope, onBubbleClick, onBubbleHover }: BubbleMapProps) {
  const WORLD_VB = { w: 2000, h: 1001 };
  const VIEWBOX_W = scope === "br" ? BR_VIEWBOX.w : WORLD_VB.w;
  const VIEWBOX_H = scope === "br" ? BR_VIEWBOX.h : WORLD_VB.h;

  const maxVol = useMemo(() => Math.max(...bubbles.map((b) => b.volume), 1), [bubbles]);

  // Bubble positions (memoized) — 1 per location, no overlap by design
  const bubblePositions = useMemo(() => {
    return bubbles.map((b) => {
      if (scope === "br") {
        if (b.geo?.uf) {
          const outline = BR_STATE_OUTLINES[b.geo.uf];
          if (outline) {
            let sx = 0, sy = 0;
            for (const c of outline) { sx += c[0]; sy += c[1]; }
            const cx = sx / outline.length;
            const cy = sy / outline.length;
            const { x, y } = brProject(cx, cy);
            return { ...b, cx: x, cy: y };
          }
        }
        // SEM_LOCAL: position off-screen (filtered out below)
        return { ...b, cx: -100, cy: -100 };
      }
      const pos = getWorldBubblePos(b);
      if (pos) return { ...b, cx: pos.x, cy: pos.y };
      return { ...b, cx: -100, cy: -100 };
    }).filter((b) => b.cx > 0 && b.cy > 0);
  }, [bubbles, scope]);

  const handleMouseEnter = useCallback(
    (b: BubbleData, e: React.MouseEvent) => {
      onBubbleHover?.(b, { x: e.clientX, y: e.clientY });
    },
    [onBubbleHover],
  );

  const handleMouseMove = useCallback(
    (b: BubbleData, e: React.MouseEvent) => {
      onBubbleHover?.(b, { x: e.clientX, y: e.clientY });
    },
    [onBubbleHover],
  );

  const handleMouseLeave = useCallback(() => {
    onBubbleHover?.(null, { x: 0, y: 0 });
  }, [onBubbleHover]);

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      className="mapa-svg"
      style={{ width: "100%", height: "auto", display: "block", maxHeight: "520px", objectFit: "contain" }}
    >
      {/* Fundo */}
      <rect width={VIEWBOX_W} height={VIEWBOX_H} fill="var(--bg)" />

      {/* Grid decorativa */}
      {Array.from({ length: 9 }).map((_, i) => (
        <line
          key={`hg-${i}`}
          x1={0}
          y1={(VIEWBOX_H / 9) * (i + 1)}
          x2={VIEWBOX_W}
          y2={(VIEWBOX_H / 9) * (i + 1)}
          stroke="rgba(148,163,184,0.04)"
          strokeWidth={0.5}
        />
      ))}
      {Array.from({ length: 11 }).map((_, i) => (
        <line
          key={`vg-${i}`}
          x1={(VIEWBOX_W / 11) * (i + 1)}
          y1={0}
          x2={(VIEWBOX_W / 11) * (i + 1)}
          y2={VIEWBOX_H}
          stroke="rgba(148,163,184,0.04)"
          strokeWidth={0.5}
        />
      ))}

      {/* ── Mapa base ────────────────────────────────────── */}
      {scope === "world" ? (
        /* World: real country outlines from world-map-country-shapes */
        (countryShapes as { id: string; shape: string }[]).map((c) => {
          const iso = c.id;
          const countryBubbles = bubbles.filter((b) => {
            const countryName = b.geo?.country;
            return countryName && COUNTRY_NAME_TO_ISO[countryName] === iso;
          });
          const avgSent = countryBubbles.length > 0
            ? countryBubbles.reduce((a, b) => a + b.sentimentoScore, 0) / countryBubbles.length
            : 0;
          const t = Math.max(-1, Math.min(1, avgSent));
          let fill = "#16213a";
          if (countryBubbles.length > 0) {
            if (t < -0.1) fill = `rgba(239,68,85,${Math.min(0.45, 0.12 + Math.abs(t) * 0.33)})`;
            else if (t > 0.1) fill = `rgba(16,185,129,${Math.min(0.45, 0.12 + t * 0.33)})`;
            else fill = "rgba(60,72,98,0.35)";
          }
          return (
            <path
              key={iso}
              d={c.shape}
              fill={fill}
              stroke="#243150"
              strokeWidth={0.5}
              strokeLinejoin="round"
            />
          );
        })
      ) : (
        /* Brazil: real state outlines from IBGE */
        Object.entries(BR_STATE_OUTLINES).map(([sigla, coords]) => {
          const ufBubbles = bubbles.filter((b) => b.geo?.uf === sigla);
          const avgSent = ufBubbles.length > 0
            ? ufBubbles.reduce((a, b) => a + b.sentimentoScore, 0) / ufBubbles.length
            : 0;
          const t = Math.max(-1, Math.min(1, avgSent));
          let fill = "#16213a";
          if (ufBubbles.length > 0) {
            if (t < -0.1) fill = `rgba(239,68,85,${Math.min(0.5, 0.15 + Math.abs(t) * 0.35)})`;
            else if (t > 0.1) fill = `rgba(16,185,129,${Math.min(0.5, 0.15 + t * 0.35)})`;
            else fill = "rgba(60,72,98,0.4)";
          }
          const d = brPathFromCoords(coords);
          // Compute label position from centroid
          let cx = 0, cy = 0;
          for (const c of coords) { cx += c[0]; cy += c[1]; }
          cx /= coords.length;
          cy /= coords.length;
          const lp = brProject(cx, cy);
          return (
            <g key={sigla}>
              <path
                d={d}
                fill={fill}
                stroke="#2b3a5c"
                strokeWidth={0.8}
                strokeLinejoin="round"
                style={{ cursor: "pointer", transition: "fill .25s, filter .15s" }}
              />
              <text
                x={lp.x}
                y={lp.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.7)"
                fontSize={7}
                fontFamily="var(--mono)"
                fontWeight={700}
                style={{ pointerEvents: "none", textShadow: "0 1px 2px #000" }}
              >
                {sigla}
              </text>
            </g>
          );
        })
      )}

      {/* ── Bolhas ───────────────────────────────────────── */}
      {bubblePositions.map((b) => {
        const r = bubbleRadius(b.volume, maxVol);
        const color = colorForBubble(b, layer, maxVol);
        const isSpike = b.momentum > 1.0;
        return (
          <g
            key={b.entidade}
            style={{ cursor: "pointer" }}
            onMouseEnter={(e) => handleMouseEnter(b, e)}
            onMouseMove={(e) => handleMouseMove(b, e)}
            onMouseLeave={handleMouseLeave}
            onClick={() => onBubbleClick?.(b)}
          >
            {isSpike && (
              <>
                <circle
                  cx={b.cx} cy={b.cy} r={r + 6}
                  fill="none" stroke={color} strokeWidth={2}
                  opacity={0.3} className="spike-glow"
                />
                <circle
                  cx={b.cx} cy={b.cy} r={r + 10}
                  fill="none" stroke={color} strokeWidth={1.5}
                  opacity={0.2} className="spike-ring"
                />
              </>
            )}
            <circle
              cx={b.cx} cy={b.cy} r={r}
              fill={color} opacity={0.15} filter="blur(4px)"
            />
            <circle
              cx={b.cx} cy={b.cy} r={r}
              fill={color} opacity={0.75}
              stroke={color} strokeWidth={1.5} strokeOpacity={0.4}
              style={{ transition: "filter .15s" }}
              className={isSpike ? "spike-pulse" : ""}
            />
            {r > 10 && (
              <text
                x={b.cx} y={b.cy + 1}
                textAnchor="middle" dominantBaseline="middle"
                fill="#fff"
                fontSize={Math.min(10, r * 0.4)}
                fontFamily="var(--sans)" fontWeight={700}
                style={{ pointerEvents: "none", textShadow: "0 1px 3px #000" }}
              >
                {b.volume}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
