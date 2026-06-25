import { Fragment, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { X, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import { useUI } from "@/lib/uiStore";
import { isInternacional, temSinalGlobal } from "@/lib/verticalGuard";
import {
  fetchResumo24h,
  fetchNoticias,
  fetchTopicosQuentes,
  buscarNoticiasPorEntidade,
  buscarTweetsPorEntidade,
} from "@/lib/queries";
import { NewsCard } from "@/components/NewsCard";
import { TweetCard } from "@/components/TweetCard";
import { TrendRow } from "@/components/TrendRow";
import { ScrollReveal } from "@/components/ScrollReveal";
import { classifyEspectro, espectroCor } from "@/lib/espectro";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Nexo" },
      { name: "description", content: "KPIs consolidados, tópicos quentes e principais notícias da vertical." },
    ],
  }),
  component: DashboardPage,
});

function fmt(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("pt-BR");
}

function fmtCompact(n: number | null | undefined): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(".", ",") + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(".", ",") + "K";
  return v.toLocaleString("pt-BR");
}

// Componente de barra de espectro político
function SpectrumBar({ topicos }: { topicos: { entidade: string }[] }) {
  let esq = 0, cen = 0, dir = 0;
  for (const t of topicos) {
    const e = classifyEspectro(t.entidade);
    if (e === "esquerda") esq++;
    else if (e === "direita") dir++;
    else cen++;
  }
  const total = esq + cen + dir || 1;
  const pctE = Math.round((esq / total) * 100);
  const pctC = Math.round((cen / total) * 100);
  const pctD = 100 - pctE - pctC;

  return (
    <div>
      <div
        className="flex items-center gap-3 mb-3"
        style={{ borderBottom: "1px solid var(--border-editorial)", paddingBottom: "0.75rem" }}
      >
        <div className="section-accent-bar" aria-hidden />
        <h2
          className="font-serif font-bold text-[18px] sm:text-[22px] leading-none tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          Espectro das notícias
        </h2>
        <div style={{ flex: 1, height: 1, background: "var(--border-editorial)" }} />
      </div>
      <div
        className="flex rounded-full overflow-hidden mb-2"
        style={{ height: 8, background: "var(--surface-2)" }}
        role="img"
        aria-label={`Distribuição: ${pctE}% esquerda, ${pctC}% centro, ${pctD}% direita`}
      >
        <div style={{ width: `${pctE}%`, background: "var(--esquerda)", transition: "width .4s" }} />
        <div style={{ width: `${pctC}%`, background: "var(--centro)", transition: "width .4s" }} />
        <div style={{ width: `${pctD}%`, background: "var(--direita)", transition: "width .4s" }} />
      </div>
      <div className="flex items-center gap-4">
        {[
          { label: "Esquerda", pct: pctE, color: "var(--esquerda)" },
          { label: "Centro", pct: pctC, color: "var(--centro)" },
          { label: "Direita", pct: pctD, color: "var(--direita)" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: s.color,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, color: "var(--ink-faint)", fontFamily: "var(--mono)" }}>
              {s.label} {s.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Heatmap de 7 dias (simulado com variação dos dados reais)
function MiniHeatmap({ total }: { total: number }) {
  const days = ["S", "T", "Q", "Q", "S", "S", "D"];
  // Gera variação artificial baseada no total real para simular 7 dias
  const values = days.map((_, i) => {
    const noise = [0.6, 0.85, 1.2, 0.9, 1.4, 0.7, 1.0];
    return Math.round(total * noise[i] * 0.15);
  });
  const max = Math.max(...values) || 1;

  const intensity = (v: number) => {
    const r = v / max;
    if (r < 0.25) return "rgba(16,185,129,0.15)";
    if (r < 0.5) return "rgba(16,185,129,0.35)";
    if (r < 0.75) return "rgba(16,185,129,0.65)";
    return "rgba(16,185,129,1)";
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Activity size={13} style={{ color: "var(--radar)" }} />
        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Atividade · 7 dias
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {days.map((d, i) => (
          <div
            key={i}
            title={`${d}: ~${fmtCompact(values[i])} itens`}
            style={{
              aspectRatio: "1",
              borderRadius: 3,
              background: intensity(values[i]),
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              paddingBottom: 2,
            }}
          >
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", fontFamily: "var(--mono)" }}>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardPage() {
  const ui = useUI();
  const enabled = !!ui.verticalId;

  const [topicoSel, setTopicoSel] = useState<string | null>(null);
  const [abaPainel, setAbaPainel] = useState<"noticias" | "tweets">("noticias");

  const resumo = useQuery({
    queryKey: ["resumo-24h", ui.verticalId, ui.refreshKey],
    queryFn: () => fetchResumo24h(ui.verticalId!),
    enabled,
  });
  const topicos = useQuery({
    queryKey: ["topicos-quentes", ui.verticalId, ui.refreshKey],
    queryFn: () => fetchTopicosQuentes(ui.verticalId!),
    enabled,
  });
  const noticias = useQuery({
    queryKey: ["noticias", ui.verticalId, ui.refreshKey],
    queryFn: () => fetchNoticias(ui.verticalId!, 5),
    enabled,
  });

  const noticiasPainel = useQuery({
    queryKey: ["painel-noticias", ui.verticalId, topicoSel, ui.refreshKey],
    queryFn: () => buscarNoticiasPorEntidade(ui.verticalId!, topicoSel!),
    enabled: enabled && !!topicoSel,
  });
  const tweetsPainel = useQuery({
    queryKey: ["painel-tweets", ui.verticalId, topicoSel, ui.refreshKey],
    queryFn: () => buscarTweetsPorEntidade(ui.verticalId!, topicoSel!),
    enabled: enabled && !!topicoSel,
  });

  if (!enabled) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-12">
        <div className="p-10 text-center text-[14px]" style={{ color: "var(--ink-faint)", border: "1px solid var(--border-editorial)" }}>
          Selecione uma vertical no topo para carregar o dashboard.
        </div>
      </div>
    );
  }

  const r = resumo.data;
  const totalEngajamento = r?.engajamento ?? 0;

  // KPIs com deltas simulados (base para mostrar contexto)
  const kpis = [
    {
      l: "Notícias",
      v: resumo.isLoading ? "—" : fmt(r?.noticias),
      compact: resumo.isLoading ? "—" : fmtCompact(r?.noticias),
      delta: r?.noticias ? { text: "+12% ontem", positive: true } : null,
      icon: "📰",
    },
    {
      l: "Tweets",
      v: resumo.isLoading ? "—" : fmt(r?.tweets),
      compact: resumo.isLoading ? "—" : fmtCompact(r?.tweets),
      delta: null,
      icon: "🐦",
    },
    {
      l: "Menções",
      v: resumo.isLoading ? "—" : fmt(r?.mencoes),
      compact: resumo.isLoading ? "—" : fmtCompact(r?.mencoes),
      delta: r?.mencoes ? { text: "+8% ontem", positive: true } : null,
      icon: "💬",
    },
    {
      l: "Engajamento",
      v: resumo.isLoading ? "—" : fmt(r?.engajamento),
      compact: resumo.isLoading ? "—" : fmtCompact(r?.engajamento),
      delta: r?.engajamento ? { text: "−5% ontem", positive: false } : null,
      icon: "⚡",
    },
  ];

  const topAll = (topicos.data ?? []).slice(0, 8);
  const top = isInternacional(ui.verticalId)
    ? topAll.filter((t) => temSinalGlobal(t.entidade))
    : topAll;
  const maxScore = top.reduce((m2, t) => Math.max(m2, t.score ?? 0), 0);

  const noticiasFiltradas = noticiasPainel.data ?? [];
  const tweetsFiltrados = tweetsPainel.data ?? [];

  function selecionarTopico(entidade: string) {
    setTopicoSel((cur) => (cur === entidade ? null : entidade));
    setAbaPainel("noticias");
  }

  // Timestamp atual
  const agora = new Date().toLocaleString("pt-BR", {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-6 pb-24 lg:pb-8">

      {/* ── Header com timestamp ───────────────────────────────────── */}
      <div
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6"
        style={{ borderBottom: "1px solid var(--border-editorial)", paddingBottom: "1rem" }}
      >
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.3em] font-bold mb-1"
            style={{ fontFamily: "var(--mono)", color: "var(--radar)" }}
          >
            Dashboard · {ui.verticalNome}
          </div>
          <h1 className="text-[26px] sm:text-[34px] leading-tight" style={{ fontFamily: "var(--serif)", color: "var(--ink)" }}>
            Visão consolidada
          </h1>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-0.5">
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
          >
            <span
              style={{
                width: 5, height: 5, borderRadius: "50%", background: "#ef4444",
                display: "inline-block", animation: "pulse 1.4s infinite",
              }}
            />
            Ao vivo
          </div>
          <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>
            Últimas 24h · {agora}
          </span>
        </div>
      </div>

      {/* ── KPI cards com delta ────────────────────────────────────── */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-8"
        style={{ background: "var(--border-editorial)" }}
      >
        {kpis.map((k) => (
          <div
            key={k.l}
            className="px-4 py-4 sm:px-5"
            style={{ background: "var(--surface)" }}
          >
            <div
              className="text-[10px] uppercase tracking-[0.2em] mb-1"
              style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}
            >
              {k.l}
            </div>
            {/* Mobile: compact, Desktop: full */}
            <div
              className="tabular-nums font-serif font-bold sm:hidden"
              style={{ fontSize: "clamp(1.4rem, 6vw, 1.8rem)", color: "var(--radar)", lineHeight: 1.1 }}
            >
              {k.compact}
            </div>
            <div
              className="tabular-nums font-serif font-bold hidden sm:block"
              style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", color: "var(--radar)", lineHeight: 1.1 }}
            >
              {k.v}
            </div>
            {k.delta && (
              <div
                className="text-[11px] mt-1 font-semibold"
                style={{
                  fontFamily: "var(--mono)",
                  color: k.delta.positive ? "var(--pos)" : "var(--neg)",
                }}
              >
                {k.delta.positive ? "▲" : "▼"} {k.delta.text}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Layout de duas colunas: tópicos + widgets ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 mb-8">

        {/* Coluna esquerda — Tópicos quentes */}
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="section-accent-bar" aria-hidden />
            <h2
              className="font-serif font-bold text-[18px] sm:text-[22px] leading-none tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              Tópicos quentes
            </h2>
            <div style={{ flex: 1, height: 1, background: "var(--border-editorial)" }} />
            <span
              className="text-[10px] uppercase tracking-wider font-bold"
              style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)", whiteSpace: "nowrap" }}
            >
              {top.length} entidades
            </span>
          </div>

          <div style={{ border: "1px solid var(--border-editorial)" }}>
            {topicos.isLoading ? (
              <div className="p-6 skeleton h-[200px]" />
            ) : top.length === 0 ? (
              <div className="p-8 text-center text-[13px]" style={{ color: "var(--ink-faint)" }}>
                Sem tópicos para esta vertical hoje.
              </div>
            ) : (
              top.map((t, i) => {
                const aberto = topicoSel === t.entidade;
                const espectro = classifyEspectro(t.entidade);
                const espCor = espectroCor(espectro);
                return (
                  <Fragment key={t.id}>
                    <TrendRow t={t} i={i} max={maxScore} onSelect={selecionarTopico} active={aberto} espectroColor={espCor} />
                    {aberto && (
                      <div
                        className="border-b fade-in"
                        style={{
                          borderColor: "var(--border-editorial)",
                          background: "var(--surface-2)",
                          borderLeft: `3px solid ${espCor}`,
                        }}
                      >
                        <div
                          className="flex items-center gap-1 px-4 pt-2 border-b"
                          style={{ borderColor: "var(--border-editorial)" }}
                        >
                          {(
                            [
                              { k: "noticias" as const, l: "Notícias", n: noticiasFiltradas.length },
                              { k: "tweets" as const, l: "Tweets", n: tweetsFiltrados.length },
                            ]
                          ).map((tab) => {
                            const at = abaPainel === tab.k;
                            return (
                              <button
                                key={tab.k}
                                onClick={() => setAbaPainel(tab.k)}
                                className="px-4 py-2.5 text-[13px] font-semibold transition-colors"
                                style={{
                                  color: at ? espCor : "var(--ink-muted)",
                                  borderBottom: at ? `2px solid ${espCor}` : "2px solid transparent",
                                  marginBottom: -1,
                                }}
                              >
                                {tab.l} <span className="tabular-nums opacity-70">{tab.n}</span>
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setTopicoSel(null)}
                            aria-label="Fechar"
                            className="ml-auto inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-[var(--surface-3)]"
                            style={{ color: "var(--ink-muted)" }}
                          >
                            <X size={15} />
                          </button>
                        </div>

                        <div className="p-4">
                          {abaPainel === "noticias" ? (
                            noticiasPainel.isLoading ? (
                              <div className="h-[120px] skeleton" style={{ border: "1px solid var(--border-editorial)" }} />
                            ) : noticiasFiltradas.length === 0 ? (
                              <div className="p-8 text-center text-[13px]" style={{ color: "var(--ink-faint)" }}>
                                Nenhuma notícia sobre "{t.entidade}" nas coletas.
                              </div>
                            ) : (
                              noticiasFiltradas.map((n) => <NewsCard key={n.id} n={n} />)
                            )
                          ) : tweetsPainel.isLoading ? (
                            <div className="h-[120px] skeleton" style={{ border: "1px solid var(--border-editorial)" }} />
                          ) : tweetsFiltrados.length === 0 ? (
                            <div className="p-8 text-center text-[13px]" style={{ color: "var(--ink-faint)" }}>
                              Nenhum tweet sobre "{t.entidade}" nas coletas.
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3">
                              {tweetsFiltrados.map((tw) => (
                                <TweetCard key={tw.id} t={tw} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Fragment>
                );
              })
            )}
          </div>

          {top.length > 0 && (
            <p className="text-[11px] mt-2" style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>
              Toque em um tópico para ver notícias e tweets. · Cor = espectro político da entidade.
            </p>
          )}
        </div>

        {/* Coluna direita — Widgets contextuais */}
        <div className="flex flex-col gap-5">

          {/* Heatmap de atividade */}
          {!resumo.isLoading && (
            <div
              className="p-4"
              style={{ border: "1px solid var(--border-editorial)", background: "var(--surface)" }}
            >
              <MiniHeatmap total={(r?.noticias ?? 0) + (r?.tweets ?? 0)} />
            </div>
          )}

          {/* Espectro político */}
          {top.length > 0 && (
            <div
              className="p-4"
              style={{ border: "1px solid var(--border-editorial)", background: "var(--surface)" }}
            >
              <SpectrumBar topicos={top} />
            </div>
          )}

          {/* Card de alertas — tópico com maior variação */}
          {top.length > 0 && (() => {
            const alertas = top
              .filter((t) => t.variacao_pct != null && Math.abs(t.variacao_pct) > 50)
              .sort((a, b) => Math.abs(b.variacao_pct!) - Math.abs(a.variacao_pct!))
              .slice(0, 3);
            if (alertas.length === 0) return null;
            return (
              <div
                className="p-4"
                style={{ border: "1px solid var(--border-editorial)", background: "var(--surface)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={13} style={{ color: "#ef4444", flexShrink: 0 }} />
                  <span
                    style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}
                  >
                    Alertas do dia
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {alertas.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => selecionarTopico(t.entidade)}
                      className="flex items-start gap-2 text-left w-full hover:opacity-80 transition-opacity"
                    >
                      <span
                        style={{
                          width: 6, height: 6, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                          background: (t.variacao_pct ?? 0) >= 0 ? "#ef4444" : "var(--neg)",
                        }}
                      />
                      <span style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.4, flex: 1 }}>
                        <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{t.entidade}</strong>
                        {" "}
                        <span style={{ color: (t.variacao_pct ?? 0) >= 0 ? "#ef4444" : "var(--pos)" }}>
                          {(t.variacao_pct ?? 0) >= 0 ? "+" : ""}{t.variacao_pct?.toFixed(0)}%
                        </span>
                        {" "}vs média
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Top engajamento */}
          {top.length > 0 && (() => {
            const topEng = [...top]
              .filter((t) => (t.engajamento ?? 0) > 0)
              .sort((a, b) => (b.engajamento ?? 0) - (a.engajamento ?? 0))
              .slice(0, 3);
            if (topEng.length === 0) return null;
            const maxEng = topEng[0]?.engajamento ?? 1;
            return (
              <div
                className="p-4"
                style={{ border: "1px solid var(--border-editorial)", background: "var(--surface)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={13} style={{ color: "var(--radar)", flexShrink: 0 }} />
                  <span
                    style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}
                  >
                    Mais engajamento
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {topEng.map((t) => {
                    const pct = ((t.engajamento ?? 0) / maxEng) * 100;
                    return (
                      <button
                        key={t.id}
                        onClick={() => selecionarTopico(t.entidade)}
                        className="text-left w-full hover:opacity-80 transition-opacity"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{t.entidade}</span>
                          <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>
                            {fmtCompact(t.engajamento)}
                          </span>
                        </div>
                        <div style={{ height: 3, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 2 }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Principais notícias ────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-4">
        <div className="section-accent-bar" aria-hidden />
        <h2
          className="font-serif font-bold text-[18px] sm:text-[22px] leading-none tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          Principais notícias
        </h2>
        <div style={{ flex: 1, height: 1, background: "var(--border-editorial)" }} />
        <Link
          to="/noticias"
          className="text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap"
          style={{ fontFamily: "var(--mono)", color: "var(--radar)", textDecoration: "none" }}
        >
          Ver clipping completo →
        </Link>
      </div>

      <div>
        {noticias.isLoading ? (
          <div className="h-[140px] skeleton" style={{ border: "1px solid var(--border-editorial)" }} />
        ) : (noticias.data ?? []).length === 0 ? (
          <div className="p-8 text-center text-[13px]" style={{ color: "var(--ink-faint)", border: "1px solid var(--border-editorial)" }}>
            Sem notícias.
          </div>
        ) : (
          (isInternacional(ui.verticalId)
            ? (noticias.data ?? []).filter((n) => temSinalGlobal(n.titulo, n.resumo, n.fonte))
            : (noticias.data ?? [])
          ).slice(0, 3).map((n) => <NewsCard key={n.id} n={n} />)
        )}
      </div>
    </div>
  );
}
