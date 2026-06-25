import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Search, RefreshCw, ChevronDown, Menu, X, Sparkles, LayoutDashboard, Newspaper, Twitter, Flame, Lightbulb, Archive, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { setVertical, useUI } from "@/lib/uiStore";
import { fetchUltimaColeta } from "@/lib/queries";
import { relTime } from "@/lib/relTime";
import { triggerAtualizar } from "@/lib/atualizar.functions";

const COOLDOWN_MS = 5 * 60 * 1000;
const STORAGE_KEY = "atualizar:lastTriggered";

const VERTICAIS_FIXAS = [
  { id: "db8445c4-bb2a-4e65-b56a-f89639d528b6", slug: "brasil", label: "Nacional" },
  { id: "9e48224b-a497-473b-a07c-fcc61e9fec0b", slug: "global", label: "Internacional" },
] as const;

// ── Tipos de navegação ────────────────────────────────────────────────────────
type NavTo = "/" | "/dashboard" | "/noticias" | "/tweets" | "/mapa" | "/pautas" | "/arquivo" | "/auditoria";
type NavItem = { to: NavTo; label: string; icon: typeof Sparkles; exact?: boolean };

const NAV_PRIMARY: NavItem[] = [
  { to: "/", label: "Briefing", icon: Sparkles, exact: true },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/noticias", label: "Notícias", icon: Newspaper },
  { to: "/tweets", label: "Pulso Social", icon: Twitter },
  { to: "/pautas", label: "Pautas", icon: Lightbulb },
];
const NAV_MORE: NavItem[] = [
  { to: "/mapa", label: "Mapa de Calor", icon: Flame },
  { to: "/arquivo", label: "Arquivo", icon: Archive },
  { to: "/auditoria", label: "Auditoria", icon: ShieldCheck },
];

function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.to : pathname.startsWith(item.to);
}

function isMoreActive(pathname: string): boolean {
  return NAV_MORE.some((item) => isActive(pathname, item));
}

const TODAY = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
}).format(new Date());

// ── Componente principal ───────────────────────────────────────────────────────
export function Masthead() {
  const ui = useUI();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // ── Atualizar cooldown ────────────────────────────────────────────────────
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => {
      const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
      const left = Math.max(0, last + COOLDOWN_MS - Date.now());
      setRemaining(left);
      setRunning(left > 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const mmss = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  };

  const atualizar = async () => {
    if (running) return;
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setRunning(true);
    setRemaining(COOLDOWN_MS);
    try {
      await triggerAtualizar();
    } catch (err) {
      console.error("[atualizar] webhook falhou:", err);
      localStorage.removeItem(STORAGE_KEY);
      setRunning(false);
      setRemaining(0);
    }
  };

  // ── Última coleta ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ui.verticalId) {
      const first = VERTICAIS_FIXAS[0];
      setVertical(first.id, first.label);
    }
  }, [ui.verticalId]);

  const coleta = useQuery({
    queryKey: ["ultima-coleta", ui.verticalId, ui.refreshKey],
    queryFn: () => fetchUltimaColeta(ui.verticalId!),
    enabled: !!ui.verticalId,
    refetchInterval: 60_000,
  });

  // ── Scroll listener — RAF throttle + dedup + hysteresis ─────────────────
  const scrolledRef = useRef(false);
  const rafRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const y = window.scrollY;
        const next = scrolledRef.current
          ? y > 60
          : y > 120;
        if (next !== scrolledRef.current) {
          scrolledRef.current = next;
          setScrolled(next);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Altura real dos tiers colapsáveis (para animação suave via height) ──
  const collapseRef = useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (collapseRef.current) {
        setContentH(collapseRef.current.scrollHeight);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (collapseRef.current) ro.observe(collapseRef.current);
    return () => ro.disconnect();
  }, []);

  // ── ⌘K abre busca ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setShowMore(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ── Fecha dropdown "Mais" ao clicar fora ──────────────────────────────────
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    if (showMore) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [showMore]);

  // ── Mobile nav drawer ────────────────────────────────────────────────────
  useEffect(() => {
    if (mobileOpen) {
      setMounted(true);
      const r = requestAnimationFrame(() => setMobileVisible(true));
      document.body.style.overflow = "hidden";
      return () => cancelAnimationFrame(r);
    }
    setMobileVisible(false);
    const t = setTimeout(() => {
      setMounted(false);
      document.body.style.overflow = "";
    }, 240);
    return () => clearTimeout(t);
  }, [mobileOpen]);

  // ── Fecha mobile ao mudar de rota ─────────────────────────────────────────
  useEffect(() => {
    setMobileOpen(false);
    setShowMore(false);
    setShowSearch(false);
  }, [path]);

  return (
    <>
      <header
        data-scrolled={scrolled}
        className="sticky top-0 z-50 group/nav"
        style={{
          backgroundColor: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          isolation: "isolate",
        }}
      >
        {/* ── Collapsible tiers 1+2 wrapper (measured height for smooth animation) ── */}
        <div
          ref={collapseRef}
          className="masthead-collapse"
          style={{
            height: scrolled ? 0 : contentH || undefined,
          }}
        >
          {/* ── TIER 1: Info strip (data, vertical switcher, live) ─────────── */}
          <div className="masthead-tier border-b" style={{ borderColor: "var(--border-editorial)" }}>
            <div className="max-w-[1440px] mx-auto px-4 md:px-12 h-9 flex items-center justify-between gap-4">
              {/* Data */}
              <span
                className="hidden sm:inline text-[10px] uppercase tracking-[0.22em] font-semibold"
                style={{ fontFamily: "var(--mono)", color: "var(--ink-muted)" }}
              >
                {TODAY}
              </span>

              {/* Vertical switcher — Nacional / Internacional */}
              <div
                className="flex items-center gap-1"
                role="tablist"
                aria-label="Vertical de monitoramento"
              >
                {VERTICAIS_FIXAS.map((v) => {
                  const active = ui.verticalId === v.id;
                  return (
                    <button
                      key={v.id}
                      role="tab"
                      aria-selected={active}
                      onClick={() => !active && setVertical(v.id, v.label)}
                      className="px-3 h-6 rounded text-[10px] font-bold uppercase tracking-[0.18em] transition-colors cursor-pointer"
                      style={{
                        fontFamily: "var(--mono)",
                        background: active ? "var(--ink)" : "transparent",
                        color: active ? "var(--bg)" : "var(--ink-muted)",
                        border: active ? "none" : "1px solid transparent",
                      }}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>

              {/* Live + última coleta */}
              <div className="flex items-center gap-3">
                {/* Waveform decoration */}
                <div className="hidden md:flex items-center gap-[3px] h-4">
                  {[1,2,3,4,5].map((i) => (
                    <span key={i} className="waveform-bar" />
                  ))}
                </div>
                <span className="hidden md:block text-[10px] uppercase tracking-[0.2em]"
                  style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>
                  {coleta.data ? `coleta ${relTime(coleta.data)}` : "monitorando"}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ fontFamily: "var(--mono)", color: "var(--radar)" }}>
                  <span className="live-dot" />
                  Ao vivo
                </span>
              </div>
            </div>
          </div>

          {/* ── TIER 2: Masthead title ─────────────────────────────────────── */}
          <div className="masthead-tier border-b" style={{ borderColor: "var(--border-editorial)" }}>
            <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-4 md:py-5 flex flex-col items-center text-center">
              {/* Eyebrow */}
              <div
                className="text-[9px] uppercase tracking-[0.5em] mb-1"
                style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}
              >
                Centro de Inteligência
              </div>
              {/* Logo title */}
              <Link to="/" aria-label="Nexo — início" className="inline-flex items-center gap-3">
                <div
                  className="radar-sweep shrink-0"
                  style={{ width: "clamp(1.8rem, 4.5vw, 3.5rem)", height: "clamp(1.8rem, 4.5vw, 3.5rem)" }}
                >
                  <svg
                    viewBox="0 0 40 40"
                    className="shrink-0"
                    style={{ width: "100%", height: "100%" }}
                    fill="none"
                    stroke="var(--radar)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle cx="20" cy="20" r="16" opacity="0.25" />
                    <circle cx="20" cy="20" r="10" opacity="0.4" />
                    <circle cx="20" cy="20" r="4" opacity="0.6" />
                    <line x1="20" y1="20" x2="32" y2="20" strokeWidth="2.5" />
                    <line x1="20" y1="20" x2="10" y2="10" strokeWidth="1.5" opacity="0.6" />
                    <circle cx="20" cy="20" r="2" fill="var(--radar)" stroke="none" />
                  </svg>
                </div>
                <h1
                  className="masthead-title leading-none"
                  style={{ fontSize: "clamp(2.6rem, 7vw, 5.5rem)" }}
                >
                  Nexo
                </h1>
              </Link>
              {/* Sub-rule */}
              <div
                className="mt-3 w-full max-w-[600px] flex items-center justify-center pt-2"
                style={{
                  borderTop: "1px solid var(--border-editorial)",
                  borderBottom: "1px solid var(--border-editorial)",
                }}
              >
                <span
                  className="text-[10px] uppercase tracking-[0.3em] font-semibold"
                  style={{ fontFamily: "var(--mono)", color: "var(--ink-muted)" }}
                >
                  Vol. I · Tempo real
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── TIER 3: Navigation bar ────────────────────────────────────── */}
        <div
          className="border-b-2"
          style={{ borderColor: "var(--border-editorial)", position: "relative", zIndex: 1 }}
        >
          <div
            className="max-w-[1440px] mx-auto px-4 md:px-12 flex items-center justify-between gap-4"
            style={{
              height: scrolled ? 40 : 48,
              transition: "height 300ms cubic-bezier(0.22,1,0.36,1)",
              willChange: "height",
            }}
          >
            {/* Logo compacto (aparece só quando scrolled) — in flow, width-based toggle */}
            <Link
              to="/"
              aria-label="Nexo — início"
              className="shrink-0 font-display font-black text-[1.1rem] tracking-tight leading-none overflow-hidden whitespace-nowrap"
              style={{
                color: "var(--ink)",
                textDecoration: "none",
                maxWidth: scrolled ? "80px" : "0px",
                marginRight: scrolled ? "12px" : "0px",
                opacity: scrolled ? 1 : 0,
                transition: "max-width 300ms cubic-bezier(0.22,1,0.36,1), opacity 300ms cubic-bezier(0.22,1,0.36,1), margin-right 300ms cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              Nexo
            </Link>

            {/* Nav links desktop */}
            <nav
              className="hidden md:flex items-center gap-5 lg:gap-7 overflow-visible flex-1"
              aria-label="Navegação principal"
            >
              {NAV_PRIMARY.map((item) => {
                const active = isActive(path, item);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    data-active={String(active)}
                    className="nav-link"
                  >
                    {item.label}
                  </Link>
                );
              })}

              {/* Dropdown "Mais ▾" */}
              <div className="relative" ref={moreRef}>
                <button
                  onClick={() => setShowMore((p) => !p)}
                  data-active={String(isMoreActive(path))}
                  className="nav-link flex items-center gap-1"
                  aria-expanded={showMore}
                  aria-haspopup="true"
                >
                  Mais
                  <ChevronDown
                    size={11}
                    className="transition-transform duration-200"
                    style={{ transform: showMore ? "rotate(180deg)" : "none" }}
                  />
                </button>
                {showMore && (
                  <div
                    className="absolute top-full left-0 mt-2 py-1 border shadow-lg z-50 min-w-[180px]"
                    style={{
                      background: "var(--bg)",
                      borderColor: "var(--border-editorial)",
                    }}
                  >
                    {NAV_MORE.map((item) => {
                      const active = isActive(path, item);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          aria-current={active ? "page" : undefined}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-medium transition-colors"
                          style={{
                            fontFamily: "var(--sans)",
                            color: active ? "var(--ink)" : "var(--ink-muted)",
                            background: active ? "var(--surface-2)" : "transparent",
                            textDecoration: "none",
                          }}
                          onMouseEnter={(e) => {
                            if (!active) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
                          }}
                          onMouseLeave={(e) => {
                            if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                          }}
                        >
                          <Icon size={14} strokeWidth={1.75} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>

            {/* Ações à direita */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Busca — expandível */}
              <div className="hidden md:flex items-center">
                {showSearch ? (
                  <form
                    role="search"
                    className="flex items-center border-b border-[var(--border-editorial)]"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const v = searchRef.current?.value.trim();
                      if (v) navigate({ to: "/noticias", search: { q: v } as never });
                      setShowSearch(false);
                    }}
                  >
                    <Search size={14} style={{ color: "var(--ink-faint)" }} />
                    <input
                      ref={searchRef}
                      type="search"
                      placeholder="Buscar notícias..."
                      aria-label="Buscar"
                      autoFocus
                      className="w-44 px-2 py-1 bg-transparent text-[13px] outline-none"
                      style={{ fontFamily: "var(--sans)", color: "var(--ink)" }}
                      onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                    />
                  </form>
                ) : (
                  <button
                    aria-label="Buscar"
                    className="icon-btn"
                    onClick={() => {
                      setShowSearch(true);
                      setTimeout(() => searchRef.current?.focus(), 50);
                    }}
                  >
                    <Search size={15} />
                  </button>
                )}
              </div>

              {/* Atualizar */}
              <button
                type="button"
                onClick={atualizar}
                disabled={running}
                title={running ? `Em andamento — pronta em ${mmss(remaining)}` : "Atualizar dados (~5 min)"}
                className="hidden md:inline-flex items-center gap-1.5 px-3 h-7 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors border disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  fontFamily: "var(--mono)",
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  border: "1px solid color-mix(in oklab, var(--accent) 40%, transparent)",
                }}
              >
                <RefreshCw size={11} className={running ? "animate-spin" : ""} />
                {running ? mmss(remaining) : "Atualizar"}
              </button>

              {/* Hamburger mobile */}
              <button
                className="md:hidden icon-btn"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menu"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Nav Drawer ──────────────────────────────────────────────── */}
      {mounted && (
        <div
          className="md:hidden fixed inset-0 z-[80]"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navegação"
        >
          {/* Backdrop */}
          <div
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 transition-opacity duration-240"
            style={{ background: "rgba(0,0,0,0.25)", opacity: mobileVisible ? 1 : 0 }}
          />
          {/* Panel */}
          <nav
            aria-label="Navegação principal"
            className="absolute top-0 left-0 h-full flex flex-col"
            style={{
              width: "min(300px, 82vw)",
              background: "var(--bg)",
              borderRight: "1px solid var(--border-editorial)",
              boxShadow: "10px 0 40px rgba(0,0,0,0.15)",
              transform: mobileVisible ? "translateX(0)" : "translateX(-100%)",
              transition: "transform .24s cubic-bezier(.22,.61,.36,1)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 h-14 border-b shrink-0"
              style={{ borderColor: "var(--border-editorial)" }}
            >
              <Link
                to="/"
                className="masthead-title text-xl"
                style={{ textDecoration: "none" }}
              >
                Nexo
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                className="icon-btn"
              >
                <X size={18} />
              </button>
            </div>

            {/* Vertical switcher */}
            <div
              className="px-5 py-3 border-b"
              style={{ borderColor: "var(--border-editorial)" }}
            >
              <div
                className="text-[9px] uppercase tracking-[0.3em] mb-2"
                style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}
              >
                Vertical
              </div>
              <div className="flex gap-2">
                {VERTICAIS_FIXAS.map((v) => {
                  const active = ui.verticalId === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => !active && setVertical(v.id, v.label)}
                      className="flex-1 py-2 text-[11px] font-bold uppercase tracking-[0.15em] transition-colors border"
                      style={{
                        fontFamily: "var(--mono)",
                        background: active ? "var(--ink)" : "transparent",
                        color: active ? "var(--bg)" : "var(--ink-muted)",
                        borderColor: active ? "var(--ink)" : "var(--border-editorial)",
                      }}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div
                className="text-[9px] uppercase tracking-[0.3em] px-1 mb-3"
                style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}
              >
                Monitoramento
              </div>
              <ul className="flex flex-col gap-0.5">
                {[...NAV_PRIMARY, ...NAV_MORE].map((item) => {
                  const active = isActive(path, item);
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        aria-current={active ? "page" : undefined}
                        className="flex items-center gap-3 px-3 min-h-[46px] text-[14px] font-medium transition-colors"
                        style={{
                          fontFamily: "var(--sans)",
                          background: active ? "var(--surface-2)" : "transparent",
                          color: active ? "var(--ink)" : "var(--ink-muted)",
                          textDecoration: "none",
                        }}
                      >
                        <Icon size={16} strokeWidth={1.75} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Footer status */}
            <div
              className="px-5 py-3 border-t"
              style={{ borderColor: "var(--border-editorial)" }}
            >
              <div className="flex items-center gap-2">
                <span className="live-dot" />
                <span
                  className="text-[10px] uppercase tracking-[0.2em]"
                  style={{ fontFamily: "var(--mono)", color: "var(--ink-muted)" }}
                >
                  Ao vivo · coleta {relTime(coleta.data)}
                </span>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
