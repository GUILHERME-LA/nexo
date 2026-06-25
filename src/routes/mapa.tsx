import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useUI } from "@/lib/uiStore";
import { VERTICAL_BRASIL } from "@/lib/verticalGuard";
import {
  fetchMapaBubble,
  buscarNoticiasPorLocal,
  buscarTweetsPorLocal,
  legendGradient,
  legendLabels,
} from "@/lib/mapaGeo";
import type { BubbleData, Layer, Scope, Periodo, MapaKpis } from "@/lib/mapaGeo";
import { fetchTopicosQuentes } from "@/lib/queries";
import { KpiStrip, type KpiItem } from "@/components/KpiStrip";
import { BubbleMap } from "@/components/BubbleMap";
import { MapaSidebar } from "@/components/MapaSidebar";
import { MapaTooltip } from "@/components/MapaTooltip";
import { NewsCard } from "@/components/NewsCard";
import { TweetCard } from "@/components/TweetCard";

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa de calor — Nexo" },
      { name: "description", content: "Mapa de calor geográfico de menções por entidade." },
    ],
  }),
  component: HeatPage,
});

function HeatPage() {
  const ui = useUI();

  // ── State ──────────────────────────────────────────────────────────────
  const scope: Scope = ui.verticalId === VERTICAL_BRASIL ? "br" : "world";
  const [layer, setLayer] = useState<Layer>("sentimento");
  const [periodo, setPeriodo] = useState<Periodo>("24h");
  const [hovered, setHovered] = useState<BubbleData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [selectedEntidades, setSelectedEntidades] = useState<string[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"noticias" | "tweets">("noticias");

  // ── Queries ────────────────────────────────────────────────────────────
  const topicosQ = useQuery({
    queryKey: ["topicos-quentes", ui.verticalId, ui.refreshKey],
    queryFn: () => fetchTopicosQuentes(ui.verticalId!),
    enabled: !!ui.verticalId,
    placeholderData: (prev) => prev,
  });

  const bubbleQ = useQuery({
    queryKey: ["mapa-bubble", ui.verticalId, periodo, ui.refreshKey, scope],
    queryFn: () => fetchMapaBubble(ui.verticalId!, periodo, topicosQ.data ?? [], scope),
    enabled: !!ui.verticalId && topicosQ.status === "success",
    placeholderData: (prev) => prev,
  });

  const noticiasQ = useQuery({
    queryKey: ["mapa-drawer-noticias", ui.verticalId, selectedEntidades, periodo],
    queryFn: () => buscarNoticiasPorLocal(ui.verticalId!, selectedEntidades, periodo),
    enabled: !!ui.verticalId && selectedEntidades.length > 0,
    placeholderData: (prev) => prev,
  });

  const tweetsQ = useQuery({
    queryKey: ["mapa-drawer-tweets", ui.verticalId, selectedEntidades, periodo],
    queryFn: () => buscarTweetsPorLocal(ui.verticalId!, selectedEntidades, periodo),
    enabled: !!ui.verticalId && selectedEntidades.length > 0,
    placeholderData: (prev) => prev,
  });

  // ── Dados derivados ────────────────────────────────────────────────────
  const { bubbles, kpis } = bubbleQ.data ?? { bubbles: [], kpis: null as MapaKpis | null };
  const maxVol = useMemo(() => Math.max(...bubbles.map((b) => b.volume), 1), [bubbles]);

  // Filtrar bolhas por escopo (br: só entidades com UF, world: só com geo e sem UF)
  const filteredBubbles = useMemo(() => {
    if (scope === "br") {
      return bubbles.filter((b) => b.geo?.uf);
    }
    return bubbles.filter((b) => b.geo && !b.geo.uf);
  }, [bubbles, scope]);

  // ── Drawer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedEntity) return;
    const id = requestAnimationFrame(() => setDrawerVisible(true));
    return () => cancelAnimationFrame(id);
  }, [selectedEntity]);

  useEffect(() => {
    if (!selectedEntity) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerVisible(false);
        setTimeout(() => setSelectedEntity(null), 260);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedEntity]);

  function handleSelect(bubble: BubbleData | string) {
    const entidade = typeof bubble === "string" ? bubble : bubble.entidade;
    if (selectedEntity === entidade) {
      closeDrawer();
      return;
    }
    setSelectedEntity(entidade);
    // Extract entity names for location-based drawer query
    const b = typeof bubble === "object" ? bubble : filteredBubbles.find((x) => x.entidade === entidade);
    setSelectedEntidades(b?.allKeys ?? [entidade]);
    setDrawerTab("noticias");
  }

  function closeDrawer() {
    setDrawerVisible(false);
    setTimeout(() => setSelectedEntity(null), 260);
  }

  // ── KPIs ───────────────────────────────────────────────────────────────
  const kpiItems: KpiItem[] = kpis
    ? [
        {
          label: scope === "br" ? "UFs ativos" : "Países ativos",
          value: kpis.entidadesAtivas,
          color: "var(--ink)",
        },
        {
          label: `Menções ${periodo}`,
          value: kpis.mencoesPeriodo,
          color: "var(--ink)",
        },
        {
          label: "Sentimento",
          value: kpis.sentimentoMedio > 0.1 ? "Positivo" : kpis.sentimentoMedio < -0.1 ? "Negativo" : "Neutro",
          color: kpis.sentimentoMedio > 0.1 ? "var(--pos)" : kpis.sentimentoMedio < -0.1 ? "var(--neg)" : "var(--ink-muted)",
          mono: false,
        },
        {
          label: "Epicentro",
          value: kpis.epicentro,
          color: "var(--accent)",
          mono: false,
        },
        ...(kpis.semLocalizacao && kpis.semLocalizacao > 0 ? [{
          label: "Sem localização",
          value: kpis.semLocalizacao.toLocaleString("pt-BR"),
          color: "var(--ink-faint)",
          mono: true as const,
        }] : []),
      ]
    : [];

  // ── Not ready ──────────────────────────────────────────────────────────
  if (!ui.verticalId) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-12">
        <div className="p-10 text-center text-[14px]" style={{ color: "var(--ink-faint)", border: "1px solid var(--border-editorial)" }}>
          Selecione uma vertical no topo.
        </div>
      </div>
    );
  }

  const noticiasFiltradas = noticiasQ.data ?? [];
  const tweetsFiltrados = tweetsQ.data ?? [];

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-8 pb-12">
      {/* ── Header ────────────────────────────────────────── */}
      <div
        className="flex items-start justify-between gap-4 flex-wrap mb-6"
        style={{ borderBottom: "1px solid var(--border-editorial)", paddingBottom: "1rem" }}
      >
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.3em] font-bold mb-1"
            style={{ fontFamily: "var(--mono)", color: "var(--radar)" }}
          >
            {scope === "br" ? "Nacional (UF)" : "Internacional"}
          </div>
          <h1 className="text-[30px] sm:text-[38px] leading-tight" style={{ fontFamily: "var(--serif)", color: "var(--ink)" }}>
            {scope === "br" ? "Menções por estado" : "Menções no mundo"}
          </h1>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────── */}
      {kpis && <KpiStrip items={kpiItems} columns={kpis.semLocalizacao ? 5 : 4} />}

      {/* ── Controls + Legend ──────────────────────────────── */}
      <div className="mapa-controls">
        {/* Layer toggle */}
        <div className="mc-group">
          {(["sentimento", "volume", "momentum"] as Layer[]).map((l) => (
            <button
              key={l}
              className={`mc-btn ${layer === l ? "on" : ""}`}
              onClick={() => setLayer(l)}
            >
              {l === "sentimento" ? "Sentimento" : l === "volume" ? "Volume" : "Momentum"}
            </button>
          ))}
        </div>

        <div className="mc-separator" />

        {/* Period toggle */}
        <div className="mc-group">
          {(["24h", "7d", "30d"] as Periodo[]).map((p) => (
            <button
              key={p}
              className={`mc-btn ${periodo === p ? "on" : ""}`}
              onClick={() => setPeriodo(p)}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Legend (inline, right-aligned) */}
        <div className="mc-legend">
          <span className="mc-legend-label">{legendLabels(layer).left}</span>
          <div className="mc-legend-bar" style={{ background: legendGradient(layer) }} />
          <span className="mc-legend-label">{legendLabels(layer).right}</span>
        </div>
      </div>

      {/* ── Main layout ───────────────────────────────────── */}
      <div className="mapa-layout">
        {/* Mapa */}
        <div className="mapa-main">
          {bubbleQ.isLoading ? (
            <div className="skeleton" style={{ height: 400, border: "1px solid var(--border-editorial)", borderRadius: "var(--radius)" }} />
          ) : filteredBubbles.length === 0 ? (
            <div className="card-editorial p-10 text-center text-[14px]" style={{ color: "var(--ink-faint)" }}>
              Nenhuma entidade com dados para "{scope === "br" ? "Nacional" : "Internacional"}" no período {periodo}.
            </div>
          ) : (
            <div className="card-editorial overflow-hidden">
              <BubbleMap
                bubbles={filteredBubbles}
                layer={layer}
                scope={scope}
                onBubbleClick={(b) => handleSelect(b)}
                onBubbleHover={(b, pos) => { setHovered(b); setTooltipPos(pos); }}
              />
            </div>
          )}

          {/* Nota */}
          <div className="mapa-note">
            {scope === "br"
              ? "Clique em qualquer bolha para explorar as menções por estado. Bolhas maiores = mais menções no período."
              : "Clique em qualquer bolha para explorar as menções por país. Bolhas maiores = mais menções no período."}
          </div>
        </div>

        {/* Sidebar */}
        <div className="mapa-sidebar-wrap">
          <MapaSidebar
            bubbles={filteredBubbles}
            layer={layer}
            maxVolume={maxVol}
            totalMentions={kpis?.mencoesPeriodo}
            scope={scope}
            onSelect={handleSelect}
          />
        </div>
      </div>

      {/* ── Tooltip ───────────────────────────────────────── */}
      <MapaTooltip
        item={hovered}
        layer={layer}
        position={tooltipPos}
        maxVolume={maxVol}
      />

      {/* ── Drawer ────────────────────────────────────────── */}
      {selectedEntity && (
        <>
          <div onClick={closeDrawer} className="fixed inset-0 z-40" />
          <aside
            className="fixed top-0 right-0 z-50 h-full flex flex-col"
            style={{
              width: "min(720px, 90vw)",
              background: "var(--surface)",
              borderLeft: "1px solid var(--border)",
              boxShadow: "-16px 0 48px rgba(0,0,0,0.20)",
              transform: drawerVisible ? "translateX(0)" : "translateX(100%)",
              transition: "transform .26s cubic-bezier(.22,.61,.36,1)",
            }}
          >
            {/* Drawer header */}
            <div className="shrink-0 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-start gap-3 px-5 pt-4 pb-2">
                <div className="flex flex-col min-w-0">
                  <span className="label-eyebrow">Menções · {periodo} · {ui.verticalNome}</span>
                  <span
                    className="text-[22px] leading-tight truncate"
                    style={{ fontFamily: "var(--serif)", color: "var(--ink)" }}
                  >
                    {selectedEntity}
                  </span>
                </div>
                <button
                  onClick={closeDrawer}
                  aria-label="Fechar"
                  className="ml-auto shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-md transition-colors hover:bg-[var(--surface-3)]"
                  style={{ color: "var(--ink-muted)" }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex items-center gap-1 px-5">
                {([
                  { k: "noticias" as const, l: "Notícias", n: noticiasFiltradas.length },
                  { k: "tweets" as const, l: "Tweets", n: tweetsFiltrados.length },
                ]).map((tab) => {
                  const at = drawerTab === tab.k;
                  return (
                    <button
                      key={tab.k}
                      onClick={() => setDrawerTab(tab.k)}
                      className="px-4 py-2.5 text-[13px] font-semibold transition-colors"
                      style={{
                        color: at ? "var(--accent)" : "var(--ink-muted)",
                        borderBottom: at ? "2px solid var(--accent)" : "2px solid transparent",
                        marginBottom: -1,
                      }}
                    >
                      {tab.l} <span className="tabular-nums opacity-70">{tab.n}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer content */}
            <div className="flex-1 overflow-y-auto p-4">
              {drawerTab === "noticias" ? (
                noticiasQ.isLoading ? (
                  <div className="card-editorial h-[120px] skeleton" />
                ) : noticiasFiltradas.length === 0 ? (
                  <DrawerEmpty termo={selectedEntity} escopo={periodo} tipo="notícia" />
                ) : (
                  noticiasFiltradas.map((n) => <NewsCard key={n.id} n={n} />)
                )
              ) : tweetsQ.isLoading ? (
                <div className="card-editorial h-[120px] skeleton" />
              ) : tweetsFiltrados.length === 0 ? (
                <DrawerEmpty termo={selectedEntity} escopo={periodo} tipo="tweet" />
              ) : (
                <div className="flex flex-col gap-3">
                  {tweetsFiltrados.map((tw) => (
                    <TweetCard key={tw.id} t={tw} />
                  ))}
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function DrawerEmpty({ termo, escopo, tipo }: { termo: string; escopo: string; tipo: "notícia" | "tweet" }) {
  return (
    <div className="p-8 text-center text-[13px]" style={{ color: "var(--ink-faint)" }}>
      Nenhuma {tipo === "notícia" ? "notícia" : "menção em tweet"} sobre "{termo}" no período {escopo}.
    </div>
  );
}
