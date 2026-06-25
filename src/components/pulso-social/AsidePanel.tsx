import type { TopicoQuente, Tweet } from "@/lib/types";
import { normSent } from "@/lib/types";
import { resolveEspectroTweet } from "@/lib/espectro";

interface AsidePanelProps {
  topicos: TopicoQuente[];
  tweets: Tweet[];
}

function fmtDelta(pct: number | null): string {
  if (pct == null) return "—";
  const sign = pct >= 0 ? "▲" : "▼";
  const val = Math.abs(pct);
  return `${sign}${val >= 100 ? val.toFixed(0) : val.toFixed(0)}%`;
}

function deltaColor(pct: number | null): string {
  if (pct == null) return "var(--ink-faint)";
  return pct >= 0 ? "var(--pos)" : "var(--neg)";
}

function SentBar({ label, color, score }: { label: string; color: string; score: number }) {
  const width = Math.min(100, Math.max(5, (1 - score) * 50 + 25));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", marginBottom: "3px" }}>
        <span style={{ color }}>{label}</span>
        <span style={{ color: score < -0.1 ? "var(--neg)" : "var(--ink-faint)", fontVariantNumeric: "tabular-nums" }}>
          {score >= 0 ? "+" : ""}{score.toFixed(2)}
        </span>
      </div>
      <div style={{ height: "5px", background: "var(--surface-3)", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ width: `${width}%`, height: "100%", background: score < -0.1 ? "var(--neg)" : score > 0.1 ? "var(--pos)" : "var(--neu)", borderRadius: "3px" }} />
      </div>
    </div>
  );
}

export function AsidePanel({ topicos, tweets }: AsidePanelProps) {
  const top5 = topicos
    .filter(t => t.variacao_pct != null)
    .sort((a, b) => Math.abs(b.variacao_pct ?? 0) - Math.abs(a.variacao_pct ?? 0))
    .slice(0, 5);

  const espCounts = { esquerda: 0, centro: 0, direita: 0 };
  const espSent = { esquerda: 0, centro: 0, direita: 0 };
  const espCount = { esquerda: 0, centro: 0, direita: 0 };

  for (const t of tweets) {
    const e = (resolveEspectroTweet(t.autor_handle) ?? "centro") as keyof typeof espCounts;
    espCounts[e]++;
    const s = t.sentimento_score ?? 0;
    espSent[e] += s;
    espCount[e]++;
  }

  const espAvg = {
    esquerda: espCount.esquerda > 0 ? espSent.esquerda / espCount.esquerda : 0,
    centro: espCount.centro > 0 ? espSent.centro / espCount.centro : 0,
    direita: espCount.direita > 0 ? espSent.direita / espCount.direita : 0,
  };

  const totalEsp = espCounts.esquerda + espCounts.centro + espCounts.direita;
  const sovPct = {
    esquerda: totalEsp > 0 ? Math.round((espCounts.esquerda / totalEsp) * 100) : 33,
    centro: totalEsp > 0 ? Math.round((espCounts.centro / totalEsp) * 100) : 34,
    direita: totalEsp > 0 ? Math.round((espCounts.direita / totalEsp) * 100) : 33,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Em alta agora */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div style={{ padding: "11px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "10px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 700, fontFamily: "var(--mono)" }}>
            Em alta agora
          </span>
          <span style={{ fontSize: "9px", color: "var(--ink-faint)" }}>24h</span>
        </div>

        {top5.length === 0 ? (
          <div style={{ padding: "14px", fontSize: "11px", color: "var(--ink-faint)", textAlign: "center" }}>
            Sem dados de tendência disponíveis
          </div>
        ) : (
          top5.map((t, i) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderBottom: i < top5.length - 1 ? "1px solid var(--border)" : "none",
                cursor: "pointer",
                transition: "background .12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontFamily: "var(--serif)", fontSize: "15px", fontWeight: 600, color: "var(--ink-faint)", width: "18px", fontVariantNumeric: "tabular-nums" }}>
                {i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>{t.entidade}</div>
                <div style={{ fontSize: "10px", color: "var(--ink-faint)" }}>
                  {t.num_mencoes ?? "—"} menções{t.categoria ? ` · ${t.categoria}` : ""}
                </div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: deltaColor(t.variacao_pct) }}>
                {fmtDelta(t.variacao_pct)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Share of voice */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div style={{ padding: "11px 14px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: "10px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 700, fontFamily: "var(--mono)" }}>
            Share of voice
          </span>
        </div>
        <div style={{ padding: "14px" }}>
          {/* Bar */}
          <div style={{ display: "flex", height: "30px", borderRadius: "5px", overflow: "hidden", margin: "8px 0" }}>
            <span style={{ width: `${sovPct.esquerda}%`, background: "var(--esquerda)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#06121a" }}>
              {sovPct.esquerda}%
            </span>
            <span style={{ width: `${sovPct.centro}%`, background: "var(--centro)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#06121a" }}>
              {sovPct.centro}%
            </span>
            <span style={{ width: `${sovPct.direita}%`, background: "var(--direita)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#06121a" }}>
              {sovPct.direita}%
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--ink-faint)" }}>
            <span style={{ color: "var(--esquerda)" }}>Esquerda</span>
            <span style={{ color: "var(--centro)" }}>Centro</span>
            <span style={{ color: "var(--direita)" }}>Direita</span>
          </div>

          {/* Sentimento por espectro */}
          <div style={{ marginTop: "14px", fontSize: "10px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "8px" }}>
            Sentimento por espectro
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <SentBar label="Esquerda" color="var(--esquerda)" score={espAvg.esquerda} />
            <SentBar label="Centro" color="var(--centro)" score={espAvg.centro} />
            <SentBar label="Direita" color="var(--direita)" score={espAvg.direita} />
          </div>
        </div>
      </div>
    </div>
  );
}
