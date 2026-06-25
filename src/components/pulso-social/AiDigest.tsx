import type { AnaliseIA } from "@/lib/types";

interface AiDigestProps {
  analise: AnaliseIA | null;
  totalPosts: number;
  isLoading: boolean;
}

function relTimeFull(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  return `há ${days}d`;
}

export function AiDigest({ analise, totalPosts, isLoading }: AiDigestProps) {
  if (isLoading) {
    return (
      <div
        style={{
          background: "linear-gradient(135deg, rgba(6,182,212,.10), rgba(16,185,129,.06))",
          border: "1px solid var(--border)",
          padding: "14px",
          marginBottom: "14px",
        }}
      >
        <div style={{ height: "16px", width: "200px", background: "var(--surface-2)", borderRadius: "4px", marginBottom: "10px" }} />
        <div style={{ height: "20px", width: "80%", background: "var(--surface-2)", borderRadius: "4px", marginBottom: "10px" }} />
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: "12px", width: `${90 - i * 10}%`, background: "var(--surface-2)", borderRadius: "4px", marginBottom: "7px" }} />
        ))}
      </div>
    );
  }

  if (!analise) return null;

  const topicos = (analise.topicos as Array<{ nome: string; descricao?: string }>) ?? [];
  const entities = (analise.entidades as string[]) ?? [];
  const bullets: string[] = [];

  if (analise.resumo) {
    const lines = analise.resumo.split(/\n|•|–|- /).map(s => s.trim()).filter(Boolean);
    bullets.push(...lines.slice(0, 5));
  }

  if (topicos.length > 0 && bullets.length < 5) {
    for (const t of topicos.slice(0, 5 - bullets.length)) {
      if (t.nome) {
        if (t.descricao) bullets.push(`**${t.nome}:** ${t.descricao}`);
        else bullets.push(t.nome);
      }
    }
  }

  if (entities.length > 0 && bullets.length < 5) {
    bullets.push(`Entidades-chave: ${entities.slice(0, 5).join(", ")}`);
  }

  const clusterCount = topicos.length;
  const ts = relTimeFull(analise.created_at);

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(6,182,212,.10), rgba(16,185,129,.06))",
        border: "1px solid var(--border)",
        padding: "14px",
        marginBottom: "14px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: "var(--accent-light)",
            border: "1px solid rgba(34,211,238,.35)",
            padding: "2px 7px",
            borderRadius: "20px",
          }}
        >
          ✦ Síntese IA
        </span>
        <span style={{ fontSize: "10px", color: "var(--ink-faint)", marginLeft: "auto" }}>
          gerado {ts} · {clusterCount > 0 ? `${clusterCount} clusters · ` : ""}{totalPosts} posts
        </span>
      </div>

      {/* Título */}
      {analise.titulo && (
        <h3
          style={{
            fontFamily: "var(--serif)",
            fontSize: "17px",
            fontWeight: 600,
            margin: "0 0 9px",
            lineHeight: 1.3,
            color: "var(--ink)",
          }}
        >
          {analise.titulo}
        </h3>
      )}

      {/* Bullets */}
      {bullets.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "7px" }}>
          {bullets.map((b, i) => (
            <li
              key={i}
              style={{
                fontSize: "12.5px",
                color: "var(--ink-muted)",
                paddingLeft: "16px",
                position: "relative",
                lineHeight: 1.45,
              }}
            >
              <span style={{ position: "absolute", left: 0, color: "var(--radar)" }}>▸</span>
              <span dangerouslySetInnerHTML={{ __html: (b || "").replace(/\*\*(.*?)\*\*/g, '<b style="color:var(--ink);font-weight:600">$1</b>') }} />
            </li>
          ))}
        </ul>
      )}

      {/* Watch for */}
      {analise.watch_for && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "rgba(239,68,85,.08)",
            border: "1px solid rgba(239,68,85,.2)",
            borderRadius: "6px",
            fontSize: "11px",
            color: "var(--neg)",
          }}
        >
          ⚠ {analise.watch_for}
        </div>
      )}
    </div>
  );
}
