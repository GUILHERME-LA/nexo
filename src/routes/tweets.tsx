import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUI } from "@/lib/uiStore";
import { isInternacional, temSinalGlobal } from "@/lib/verticalGuard";
import { fetchTweets, fetchTopicosQuentes, fetchMetricaDiaria, fetchAnaliseDestaque } from "@/lib/queries";
import { normSent } from "@/lib/types";
import { resolveEspectroTweet } from "@/lib/espectro";
import { KpiStrip } from "@/components/pulso-social/KpiStrip";
import { FilterRail } from "@/components/pulso-social/FilterRail";
import { AiDigest } from "@/components/pulso-social/AiDigest";
import { SignalCard } from "@/components/pulso-social/SignalCard";
import { AsidePanel } from "@/components/pulso-social/AsidePanel";

export const Route = createFileRoute("/tweets")({
  head: () => ({
    meta: [
      { title: "Pulso Social — Nexo" },
      { name: "description", content: "Pulso social: monitoramento em tempo real de sentimento, espectro político e tendências." },
    ],
  }),
  component: PulsoSocialPage,
});

function PulsoSocialPage() {
  const ui = useUI();

  const [sentFilter, setSentFilter] = useState<Set<string>>(new Set(["positivo", "neutro", "negativo"]));
  const [espFilter, setEspFilter] = useState<Set<string>>(new Set(["esquerda", "centro", "direita"]));
  const [minEngagement, setMinEngagement] = useState(0);
  const [janela, setJanela] = useState<"1h" | "24h" | "7d">("24h");
  const [limit, setLimit] = useState(20);

  const tweetsQ = useQuery({
    queryKey: ["tweets", ui.verticalId, ui.refreshKey],
    queryFn: () => fetchTweets(ui.verticalId!, 5000),
    enabled: !!ui.verticalId,
  });

  const topicosQ = useQuery({
    queryKey: ["topicos", ui.verticalId],
    queryFn: () => fetchTopicosQuentes(ui.verticalId!),
    enabled: !!ui.verticalId,
  });

  const metricaQ = useQuery({
    queryKey: ["metrica", ui.verticalId],
    queryFn: () => fetchMetricaDiaria(ui.verticalId!),
    enabled: !!ui.verticalId,
  });

  const analiseQ = useQuery({
    queryKey: ["analise", ui.verticalId],
    queryFn: () => fetchAnaliseDestaque(ui.verticalId!),
    enabled: !!ui.verticalId,
  });

  const rawList = useMemo(() => {
    const raw = tweetsQ.data ?? [];
    return isInternacional(ui.verticalId) ? raw.filter((t) => temSinalGlobal(t.texto, t.autor_nome)) : raw;
  }, [tweetsQ.data, ui.verticalId]);

  const filtered = useMemo(() => {
    return rawList.filter((t) => {
      const sent = normSent(t.sentimento);
      const sentLabel = sent === "pos" ? "positivo" : sent === "neg" ? "negativo" : "neutro";
      if (!sentFilter.has(sentLabel)) return false;

      const esp = resolveEspectroTweet(t.autor_handle) ?? "centro";
      if (!espFilter.has(esp)) return false;

      const eng = (t.likes ?? 0) + (t.retweets ?? 0) * 3 + (t.views ?? 0) * 0.01;
      if (eng < minEngagement) return false;

      return true;
    });
  }, [rawList, sentFilter, espFilter, minEngagement]);

  const visible = filtered.slice(0, limit);
  const isLoading = tweetsQ.isLoading;

  if (!ui.verticalId) {
    return (
      <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "48px 16px" }}>
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            fontSize: "14px",
            color: "var(--ink-faint)",
            border: "1px solid var(--border)",
          }}
        >
          Selecione uma vertical no topo.
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "18px 20px 60px" }}>
      {/* KPI Strip */}
      <KpiStrip metrica={metricaQ.data ?? null} tweets={rawList} isLoading={isLoading} />

      {/* 3-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "200px 1fr 300px",
          gap: "16px",
          alignItems: "start",
        }}
        className="pulso-cols"
      >
        {/* Left: Filter Rail */}
        <div className="pulso-rail">
          <FilterRail
            tweets={rawList}
            sentFilter={sentFilter}
            setSentFilter={setSentFilter}
            espFilter={espFilter}
            setEspFilter={setEspFilter}
            minEngagement={minEngagement}
            setMinEngagement={setMinEngagement}
            janela={janela}
            setJanela={setJanela}
          />
        </div>

        {/* Center: AI Digest + Feed */}
        <div>
          <AiDigest
            analise={analiseQ.data ?? null}
            totalPosts={filtered.length}
            isLoading={analiseQ.isLoading}
          />

          {/* Feed header */}
          <div
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface)",
              padding: "11px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "10px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 700, fontFamily: "var(--mono)" }}>
              Sinais em destaque
            </span>
            <span style={{ fontSize: "10px", color: "var(--ink-faint)" }}>
              ordenado por impacto ▾
            </span>
          </div>

          {/* Feed */}
          <div style={{ marginTop: "9px", display: "flex", flexDirection: "column", gap: "9px" }}>
            {isLoading ? (
              [0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    height: "120px",
                    background: "var(--surface-2)",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    animation: "pulse 2s infinite",
                  }}
                />
              ))
            ) : visible.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", fontSize: "14px", color: "var(--ink-faint)" }}>
                Nenhum tweet com esses filtros.
              </div>
            ) : (
              visible.map((t) => {
                const topico = topicosQ.data?.find(
                  (tp) => t.candidatos?.includes(tp.entidade)
                );
                return (
                  <SignalCard
                    key={t.id}
                    t={t}
                    topicoVariacao={topico?.variacao_pct ?? null}
                  />
                );
              })
            )}
          </div>

          {/* Load more */}
          {visible.length < filtered.length && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "24px 0" }}>
              <div style={{ width: "100%", maxWidth: "320px", height: "4px", borderRadius: "2px", background: "var(--surface-2)" }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: "2px",
                    width: `${Math.min(100, (visible.length / Math.max(1, filtered.length)) * 100)}%`,
                    background: "var(--radar)",
                    transition: "width .3s",
                  }}
                />
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--ink-faint)" }}>
                Exibindo {visible.length} de {filtered.length} sinais
              </div>
              <button
                onClick={() => setLimit((l) => l + 12)}
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  border: "1px solid var(--accent)",
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "background .15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent-soft)"; e.currentTarget.style.color = "var(--accent)"; }}
              >
                Carregar mais
              </button>
            </div>
          )}
        </div>

        {/* Right: Aside */}
        <div className="pulso-aside">
          <AsidePanel
            topicos={topicosQ.data ?? []}
            tweets={filtered}
          />
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 980px) {
          .pulso-cols { grid-template-columns: 1fr !important; }
          .pulso-rail, .pulso-aside { display: none !important; }
        }
        @media (min-width: 981px) and (max-width: 1200px) {
          .pulso-cols { grid-template-columns: 180px 1fr 260px !important; }
        }
      `}</style>
    </div>
  );
}
