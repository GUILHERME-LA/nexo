import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useUI, abrirNoticia } from "@/lib/uiStore";
import {
  fetchAnaliseDestaque,
  fetchTermometro,
  fetchNoticias,
  fetchTopicosQuentes,
  buscarNoticiasPorSentimento,
  buscarTweetsPorSentimento,
} from "@/lib/queries";
import { type Noticia, type TopicoQuente } from "@/lib/types";
import { NewsCard } from "@/components/NewsCard";
import { TweetCard } from "@/components/TweetCard";
import { NewsCell } from "@/components/NewsCell";
import { ConveyorStrip } from "@/components/ConveyorStrip";
import { ScrollReveal } from "@/components/ScrollReveal";
import { SectionHeader } from "@/components/SectionHeader";
import { isInternacional, temSinalGlobal } from "@/lib/verticalGuard";
import { htmlDecode } from "@/lib/htmlDecode";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Briefing do dia — Nexo" },
      {
        name: "description",
        content: "Monitoramento político inteligente: análise editorial, termômetro de sentimento e as principais notícias do momento.",
      },
    ],
  }),
  component: BriefingPage,
});

const TERMOS_POLITICOS = [
  "lula", "bolsonaro", "haddad", "alckmin", "tarcisio", "gleisi", "boulos",
  "nikolas", "moraes", "gilmar", "barroso", "flavio dino", "fachin", "toffoli",
  "fux", "zanin", "damares", "zambelli", "malafaia", "marcal", "ciro gomes",
  "stf", "supremo", "tse", "tcu", "congresso", "senado", "camara dos deputados",
  "deputado", "senador", "ministro", "presidente lula", "governo federal",
  "planalto", "pgr", "policia federal", "alcolumbre", "hugo motta",
  "eleicoes 2026", "eleicao", "candidato", "pcc", "comando vermelho", "faccao",
  "anistia", "reforma tributaria", "arcabouco", "cpi", "pec", "orcamento",
  "emendas", "governador", "prefeito", "partido",
];

function normTxt(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
function mencionaEntidade(textoNorm: string, termo: string): boolean {
  const t = normTxt(termo).trim();
  if (!t) return false;
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(textoNorm);
}
function relevanciaPolitica(n: Noticia, topicos: TopicoQuente[]): number {
  const alvo = normTxt(`${n.titulo} ${n.resumo ?? ""}`);
  let rel = 0;
  for (const tp of topicos) {
    if (mencionaEntidade(alvo, tp.entidade)) rel += (tp.score ?? 1) + 5;
  }
  for (const termo of TERMOS_POLITICOS) {
    if (mencionaEntidade(alvo, termo)) rel += 3;
  }
  return rel;
}

function BriefingPage() {
  const ui = useUI();
  const enabled = !!ui.verticalId;

  const analise = useQuery({
    queryKey: ["analise-destaque", ui.verticalId, ui.refreshKey],
    queryFn: () => fetchAnaliseDestaque(ui.verticalId!),
    enabled,
    placeholderData: keepPreviousData,
  });
  const termometro = useQuery({
    queryKey: ["termometro", ui.verticalId, ui.refreshKey],
    queryFn: () => fetchTermometro(ui.verticalId!),
    enabled,
    placeholderData: keepPreviousData,
  });
  const noticiasQ = useQuery({
    queryKey: ["noticias-home", ui.verticalId, ui.refreshKey],
    queryFn: () => fetchNoticias(ui.verticalId!, 40),
    enabled,
    placeholderData: keepPreviousData,
  });
  const topicos = useQuery({
    queryKey: ["topicos-quentes", ui.verticalId, ui.refreshKey],
    queryFn: () => fetchTopicosQuentes(ui.verticalId!),
    enabled,
    placeholderData: keepPreviousData,
  });

  const topicosData = topicos.data ?? [];
  const noticiasData = noticiasQ.data ?? [];
  const filteredData = isInternacional(ui.verticalId)
    ? noticiasData.filter((n) => temSinalGlobal(n.titulo, n.resumo, n.fonte))
    : noticiasData;

  // Relevância política — ordena todas as notícias e pega as top 8
  const ranked = filteredData
    .map((n, i) => ({ n, i, rel: relevanciaPolitica(n, topicosData) }))
    .sort((a, b) => b.rel - a.rel || a.i - b.i);

  const top3 = ranked.slice(0, 3).map((x) => x.n);
  const top5 = ranked.slice(0, 5).map((x) => x.n);
  // Hero = most relevant
  const heroNoticia = top3[0] ?? filteredData[0];
  // For conveyor = all noticias except hero & main grid items
  const gridIds = new Set(top5.map((n) => n.id));
  const conveyorItems = filteredData.filter((n) => !gridIds.has(n.id)).slice(0, 10);

  // Sentiment state (keeps existing functionality)
  const term = termometro.data ?? null;
  const sentCounts = {
    pos: (term?.pos.noticias ?? 0) + (term?.pos.tweets ?? 0),
    neu: (term?.neu.noticias ?? 0) + (term?.neu.tweets ?? 0),
    neg: (term?.neg.noticias ?? 0) + (term?.neg.tweets ?? 0),
  };
  const total = sentCounts.pos + sentCounts.neu + sentCounts.neg;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const [sentSel, setSentSel] = useState<"pos" | "neu" | "neg" | null>(null);
  const [abaSent, setAbaSent] = useState<"noticias" | "tweets">("noticias");
  const [visivelSent, setVisivelSent] = useState(false);

  useEffect(() => {
    if (!sentSel) return;
    const id = requestAnimationFrame(() => setVisivelSent(true));
    return () => cancelAnimationFrame(id);
  }, [sentSel]);

  useEffect(() => {
    if (!sentSel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fecharSent();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sentSel]);

  const noticiasSent = useQuery({
    queryKey: ["sent-noticias", ui.verticalId, sentSel, ui.refreshKey],
    queryFn: () => buscarNoticiasPorSentimento(ui.verticalId!, sentSel!),
    enabled: enabled && !!sentSel,
  });
  const tweetsSent = useQuery({
    queryKey: ["sent-tweets", ui.verticalId, sentSel, ui.refreshKey],
    queryFn: () => buscarTweetsPorSentimento(ui.verticalId!, sentSel!),
    enabled: enabled && !!sentSel,
  });

  function fecharSent() {
    setVisivelSent(false);
    setTimeout(() => setSentSel(null), 220);
  }
  function abrirSent(k: "pos" | "neu" | "neg") {
    if (sentSel === k) { fecharSent(); return; }
    setSentSel(k);
    setAbaSent("noticias");
  }

  const analiseVisivel = analise.data && (
    !isInternacional(ui.verticalId) || temSinalGlobal(analise.data.titulo, analise.data.resumo)
  );

  const SENT_META = {
    pos: { l: "Positivo", c: "var(--pos)" },
    neu: { l: "Neutro", c: "var(--neu)" },
    neg: { l: "Negativo", c: "var(--neg)" },
  } as const;

  if (!enabled) return <div className="text-center py-20" style={{ color: "var(--ink-faint)" }}>Selecione uma vertical no topo para começar.</div>;

  return (
    <div className="pb-20 lg:pb-0" style={{ background: "var(--bg)" }}>
      {/* =================================================================== */}
      {/* HERO SECTION — EDITORIAL FULLBLEED                                */}
      {/* =================================================================== */}
      <section className="group relative w-full min-h-[80vh] md:min-h-[88vh] overflow-hidden flex items-end">
        {/* Background */}
        <div className="absolute inset-0" style={{ transform: "scale(1.02)" }}>
          {heroNoticia?.imagem_url ? (
            <img
              src={heroNoticia.imagem_url}
              alt={heroNoticia.titulo}
              className="w-full h-full object-cover photo-aged hero-img"
              width="1920"
              height="1280"
              fetchpriority="high"
              style={{ aspectRatio: "1920 / 1280" }}
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(135deg, var(--surface-dark) 0%, var(--bg) 100%)`,
              }}
            />
          )}
          {/* Overlay layers */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, rgba(15,23,42,0.15) 0%, rgba(15,23,42,0.5) 60%, rgba(15,23,42,0.95) 95%)`,
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-[1440px] mx-auto px-4 md:px-12 pb-12 md:pb-20 w-full">
          <div
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] mb-5 animate-load-in animate-load-in-delay-0"
            style={{ fontFamily: "var(--mono)", color: "var(--radar)" }}
          >
            <span className="live-dot" />
            BRIEFING DO DIA · {ui.verticalNome}
          </div>

          {heroNoticia ? (
            <>
              <h1
                className="font-serif font-extrabold tracking-tighter leading-[0.95] animate-load-in animate-load-in-delay-80"
                style={{
                  fontSize: "clamp(2.2rem, 7vw, 5.5rem)",
                  color: "var(--ink)",
                  maxWidth: "1000px",
                }}
              >
                {htmlDecode(heroNoticia.titulo).split(" ").map((word, i) => (
                  <span key={i} className="inline-block overflow-hidden align-bottom">
                    <span
                      className="inline-block"
                      style={{
                        animation: `word-reveal 0.5s ease ${i * 0.04}s both`,
                      }}
                    >
                      {word}&nbsp;
                    </span>
                  </span>
                ))}
              </h1>

              <p
                className="font-serif italic text-base md:text-xl mt-6 max-w-[640px] leading-relaxed animate-load-in animate-load-in-delay-160"
                style={{ color: "var(--ink-muted)" }}
              >
                {(heroNoticia.resumo ?? "").length > 150
                  ? htmlDecode(heroNoticia.resumo).slice(0, 150) + "…"
                  : htmlDecode(heroNoticia.resumo ?? "")}
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mt-8 animate-load-in animate-load-in-delay-240">
                <div
                  className="text-[10px] uppercase tracking-[0.2em] flex items-center gap-3"
                  style={{ fontFamily: "var(--mono)", color: "var(--ink-muted)" }}
                >
                  <span>{heroNoticia.fonte ?? ""}</span>
                  {heroNoticia.coletado_em && (
                    <>
                      <span>·</span>
                      <span>{new Date(heroNoticia.coletado_em).toLocaleDateString("pt-BR")}</span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => abrirNoticia(heroNoticia.id)}
                  className="btn-radar"
                >
                  Ler reportagem
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
              </div>
            </>
          ) : (
            <h1
              className="font-serif font-extrabold tracking-tighter leading-[0.95]"
              style={{ fontSize: "clamp(2.2rem, 7vw, 5rem)", color: "var(--ink)", maxWidth: "1000px" }}
            >
              Monitoramento político em tempo real
            </h1>
          )}

          {/* Scroll indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:block">
            <div
              className="w-5 h-8 rounded-full flex items-start justify-center pt-2"
              style={{ border: "2px solid rgba(26,22,18,0.25)" }}
            >
              <span
                className="block w-1 h-2 rounded-full"
                style={{ background: "var(--radar)", animation: "radar-ping 1.8s infinite" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* PRINCIPAIS NOTÍCIAS — NEWSPAPER GRID                               */}
      {/* =================================================================== */}
      <SectionHeader
        title="Principais notícias"
        subtitle={`últimas ${filteredData.length} horas`}
        linkTo="/noticias"
        linkLabel="Ver todas →"
      />

      <section className="max-w-[1440px] mx-auto px-4 md:px-12 py-6 relative">
        <div className="timeline-rail" />
        <div className="border border-[--border-editorial] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Featured — 1 col, full height */}
            <div className="border-b lg:border-b-0 lg:border-r border-[--border-editorial] animate-load-in animate-load-in-delay-0">
              {top5[0] && <NewsCell n={top5[0]} featured />}
            </div>

            {/* Secondary — sub-grid 2×2 */}
            <div className="grid grid-cols-2">
              {top5.slice(1).map((n, i) => (
                <div
                  key={n.id}
                  className={[
                    (i === 0 || i === 2) ? "border-r" : "",
                    i < 2 ? "border-b" : "",
                    "border-[--border-editorial]",
                    "animate-load-in",
                    i === 0 ? "animate-load-in-delay-80" : "",
                    i === 1 ? "animate-load-in-delay-160" : "",
                    i === 2 ? "animate-load-in-delay-240" : "",
                    i === 3 ? "animate-load-in-delay-320" : "",
                  ].join(" ")}
                >
                  <NewsCell n={n} showImage />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* TOP 5 DO DIA — RANKED LIST                                        */}
      {/* =================================================================== */}
      <SectionHeader
        title="Top 5 do dia"
        subtitle="por relevância política"
        linkTo="/noticias"
        linkLabel="Ver todas →"
      />

      <section className="max-w-[1440px] mx-auto px-4 md:px-12 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 mt-2">
          {top5.map((n, idx) => {
            const rel = relevanciaPolitica(n, topicosData);
            return (
              <ScrollReveal key={n.id} direction="left">
                <button
                  onClick={() => abrirNoticia(n.id)}
                  className="flex items-start gap-4 md:gap-5 py-5 border-b w-full text-left group transition-colors"
                  style={{ borderColor: "var(--border-editorial)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span
                    className="font-sans font-extrabold leading-none select-none min-w-[44px] tabular-nums transition-opacity"
                    style={{
                      fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
                      color: "var(--radar)",
                      opacity: 0.5,
                    }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[10px] uppercase tracking-[0.25em] mb-1.5"
                      style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}
                    >
                      {n.fonte ?? ""} · {n.coletado_em ? new Date(n.coletado_em).toLocaleDateString("pt-BR") : ""}
                    </div>
                    <h3
                      className="font-serif font-semibold text-[16px] md:text-lg tracking-tight leading-[1.15]"
                      style={{ color: "var(--ink)" }}
                    >
                      <span className="radar-underline">{htmlDecode(n.titulo)}</span>
                    </h3>
                    {rel > 0 && (
                      <div
                        className="text-[11px] mt-1 font-semibold tabular-nums"
                        style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}
                      >
                        Score {rel}
                      </div>
                    )}
                  </div>
                </button>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      {/* =================================================================== */}
      {/* ESTEIRA DO DIA — CONVEYOR STRIP                                    */}
      {/* =================================================================== */}
      {conveyorItems.length > 0 && (
        <ConveyorStrip items={conveyorItems} />
      )}

      {/* =================================================================== */}
      {/* ANÁLISE DO DIA — EDITORIAL BOX WITH BORDER-BEAM                    */}
      {/* =================================================================== */}
      {analiseVisivel && (
        <section className="max-w-[1440px] mx-auto px-4 md:px-12 py-8">
          <div
            className="relative p-8 md:p-12 overflow-hidden mt-6"
            style={{
              background: "rgba(19,28,46,0.62)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "2px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Beam */}
            <div className="border-beam" />

            {/* Radial glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(circle at 20% 0%, rgba(16,185,129,0.06) 0%, transparent 50%)` }}
            />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "var(--surface-dark)" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--radar)" }}>
                    <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>
                    <path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>
                  </svg>
                </div>
                <div>
                  <div
                    className="text-[10px] uppercase tracking-[0.25em] font-bold"
                    style={{ fontFamily: "var(--mono)", color: "var(--radar)" }}
                  >
                    Análise do dia
                  </div>
                  <div
                    className="text-[10px] uppercase tracking-[0.2em]"
                    style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}
                  >
                    Gerada por IA · Nexo
                  </div>
                </div>
              </div>

              <h3
                className="font-serif font-black text-2xl md:text-4xl tracking-tight leading-[1.05] mb-4 max-w-[820px]"
                style={{ color: "var(--ink)" }}
              >
                {htmlDecode(analise.data.titulo ?? "Análise do panorama político")}
              </h3>

              {analise.data.resumo && (
                <p
                  className="font-serif text-base md:text-lg leading-relaxed max-w-[760px]"
                  style={{ color: "var(--ink-muted)" }}
                >
                  {htmlDecode(analise.data.resumo)}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* =================================================================== */}
      {/* TERMÔMETRO DE SENTIMENTO (preserving full functionality)           */}
      {/* =================================================================== */}
      <SectionHeader
        title="Termômetro de sentimento"
        subtitle="hoje"
      />

      <section className="max-w-[1440px] mx-auto px-4 md:px-12 py-4 pb-12">
        {total === 0 ? (
          <div
            className="p-8 text-center text-[14px]"
            style={{ color: "var(--ink-faint)", border: "1px solid var(--border-editorial)" }}
          >
            Sem dados de sentimento para hoje.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            {[
              { k: "pos" as const, l: "Positivo", c: "var(--pos)", v: sentCounts.pos },
              { k: "neu" as const, l: "Neutro", c: "var(--neu)", v: sentCounts.neu },
              { k: "neg" as const, l: "Negativo", c: "var(--neg)", v: sentCounts.neg },
            ].map((s) => {
              const ativo = sentSel === s.k;
              return (
                <button
                  key={s.k}
                  onClick={() => abrirSent(s.k)}
                  aria-expanded={ativo}
                  className="text-left transition-all"
                  style={{
                    background: "var(--surface)",
                    border: ativo ? `2px solid ${s.c}` : "1px solid var(--border-editorial)",
                    boxShadow: ativo ? `0 0 0 1px ${s.c}` : "none",
                  }}
                >
                  <div style={{ height: 4, background: s.c }} />
                  <div className="p-5">
                    <div
                      className="text-[10px] uppercase tracking-[0.2em] font-bold mb-2 flex items-center justify-between"
                      style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}
                    >
                      <span>{s.l}</span>
                      <span style={{ color: "var(--ink-faint)" }}>ver →</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className="font-serif font-bold"
                        style={{ fontSize: "clamp(1.8rem, 5vw, 2.5rem)", color: s.c }}
                      >
                        {pct(s.v)}%
                      </span>
                      <span className="text-[13px]" style={{ color: "var(--ink-faint)" }}>
                        {s.v.toLocaleString("pt-BR")} menções
                      </span>
                    </div>
                    <div
                      className="mt-3 h-1.5 rounded-full overflow-hidden"
                      style={{ background: "var(--surface-2)" }}
                    >
                      <div
                        style={{
                          width: `${pct(s.v)}%`,
                          height: "100%",
                          background: s.c,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* =================================================================== */}
      {/* CTA NEWSLETTER — PLACEHOLDER VISUAL                                */}
      {/* =================================================================== */}
      <section
        className="relative py-24 md:py-28 overflow-hidden border-y-2"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border-editorial)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center 50%, rgba(16,185,129,0.08) 0%, transparent 70%)`,
          }}
        />
        <div className="relative z-10 max-w-[640px] mx-auto text-center px-6 animate-load-in">
          <div
            className="text-[10px] uppercase tracking-[0.4em] font-bold mb-4"
            style={{ fontFamily: "var(--mono)", color: "var(--radar)" }}
          >
            ─ Monitoramento Diário ─
          </div>
          <h2
            className="font-serif font-black text-3xl md:text-5xl tracking-tight leading-[1.05]"
            style={{ color: "var(--ink)" }}
          >
            Inteligência política direto no seu radar.
          </h2>
          <p
            className="text-base mt-6 leading-relaxed"
            style={{ color: "var(--ink-muted)" }}
          >
            Receba os principais sinais do cenário político. Curadoria Nexo.
          </p>
        </div>
      </section>

      {/* =================================================================== */}
      {/* SENTIMENT DRAWER (preserved from original)                        */}
      {/* =================================================================== */}
      {sentSel && term && (
        <>
          <div onClick={fecharSent} className="fixed inset-0 z-40" />
          <aside
            className="fixed top-0 right-0 z-50 h-full flex flex-col"
            style={{
              width: "min(720px, 90vw)",
              background: "var(--surface)",
              borderLeft: "1px solid var(--border-editorial)",
              boxShadow: "-16px 0 48px rgba(0,0,0,0.20)",
              transform: visivelSent ? "translateX(0)" : "translateX(100%)",
              transition: "transform .26s cubic-bezier(.22,.61,.36,1)",
            }}
          >
            <div className="shrink-0 border-b" style={{ borderColor: "var(--border-editorial)" }}>
              <div className="flex items-start gap-3 px-5 pt-4 pb-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase tracking-[0.2em]" style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>
                    Sentimento · {ui.verticalNome}
                  </span>
                  <span className="font-serif text-[22px] leading-tight flex items-center gap-2" style={{ color: "var(--ink)" }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: SENT_META[sentSel].c }} />
                    {SENT_META[sentSel].l}
                  </span>
                </div>
                <button
                  onClick={fecharSent}
                  aria-label="Fechar"
                  className="ml-auto shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-md transition-colors hover:bg-[var(--surface-3)]"
                  style={{ color: "var(--ink-muted)" }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex items-center gap-1 px-5">
                {(
                  [
                    { k: "noticias" as const, l: "Notícias", n: term[sentSel].noticias },
                    { k: "tweets" as const, l: "Tweets", n: term[sentSel].tweets },
                  ]
                ).map((tab) => {
                  const at = abaSent === tab.k;
                  return (
                    <button
                      key={tab.k}
                      onClick={() => setAbaSent(tab.k)}
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

            <div className="flex-1 overflow-y-auto p-4">
              {abaSent === "noticias" ? (
                noticiasSent.isLoading ? (
                  <div className="h-[120px] skeleton" style={{ border: "1px solid var(--border-editorial)" }} />
                ) : (noticiasSent.data ?? []).length === 0 ? (
                  <div className="p-8 text-center text-[13px]" style={{ color: "var(--ink-faint)" }}>
                    Nenhuma notícia com sentimento "{SENT_META[sentSel].l}" nas últimas 24h.
                  </div>
                ) : (
                  <>
                    {(noticiasSent.data ?? []).map((n) => (
                      <NewsCard key={n.id} n={n} />
                    ))}
                    {term[sentSel].noticias > (noticiasSent.data ?? []).length && (
                      <div className="pt-3 pb-1 text-center text-[12px]" style={{ color: "var(--ink-faint)" }}>
                        Mostrando os {(noticiasSent.data ?? []).length.toLocaleString("pt-BR")} mais recentes de {term[sentSel].noticias.toLocaleString("pt-BR")}.
                      </div>
                    )}
                  </>
                )
              ) : tweetsSent.isLoading ? (
                <div className="h-[120px] skeleton" style={{ border: "1px solid var(--border-editorial)" }} />
              ) : (tweetsSent.data ?? []).length === 0 ? (
                <div className="p-8 text-center text-[13px]" style={{ color: "var(--ink-faint)" }}>
                  Nenhum tweet com sentimento "{SENT_META[sentSel].l}" nas últimas 24h.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(tweetsSent.data ?? []).map((tw) => (
                    <TweetCard key={tw.id} t={tw} />
                  ))}
                  {term[sentSel].tweets > (tweetsSent.data ?? []).length && (
                    <div className="pt-3 pb-1 text-center text-[12px]" style={{ color: "var(--ink-faint)" }}>
                      Mostrando os {(tweetsSent.data ?? []).length.toLocaleString("pt-BR")} mais recentes de {term[sentSel].tweets.toLocaleString("pt-BR")}.
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
