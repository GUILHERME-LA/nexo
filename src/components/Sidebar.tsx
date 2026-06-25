import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles, LayoutDashboard, Newspaper, Twitter, Flame, Lightbulb, Archive, Lock, Menu, X, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useUI, abrirMenu, fecharMenu } from "@/lib/uiStore";
import { fetchNoticias, fetchTweets } from "@/lib/queries";

// ── Navegação compartilhada (desktop + mobile) ─────────────────────────────
type NavTo = "/" | "/dashboard" | "/noticias" | "/tweets" | "/mapa" | "/pautas" | "/arquivo" | "/auditoria";

type NavItem = { to: NavTo; label: string; icon: typeof Sparkles; exact?: boolean };

const NAV_PRINCIPAL: NavItem[] = [
  { to: "/", label: "Briefing do dia", icon: Sparkles, exact: true },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/noticias", label: "Notícias", icon: Newspaper },
  { to: "/tweets", label: "Pulso Social", icon: Twitter },
  { to: "/mapa", label: "Mapa de calor", icon: Flame },
  { to: "/pautas", label: "Pautas do dia", icon: Lightbulb },
  { to: "/arquivo", label: "Arquivo", icon: Archive },
  { to: "/auditoria", label: "Auditoria", icon: ShieldCheck },
];

function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.to : pathname.startsWith(item.to);
}

function ConexaoBadge() {
  return (
    <div
      className="m-3 p-3 rounded-md border flex items-center gap-2.5 text-[11.5px] shrink-0"
      style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--ink-muted)" }}
      title="Conectado em modo somente leitura"
    >
      <span
        className="relative shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full"
        style={{ background: "var(--surface-3)" }}
      >
        <Lock size={12} style={{ color: "var(--ink-muted)" }} />
        <span className="pulse-dot absolute -top-0.5 -right-0.5" aria-hidden />
      </span>
      <div className="flex-1 leading-snug min-w-0">
        <div className="font-semibold truncate" style={{ color: "var(--ink)" }}>
          Conectado · Nexo
        </div>
        <div>Somente leitura</div>
      </div>
    </div>
  );
}

// ── Sidebar desktop (≥ lg) ─────────────────────────────────────────────────
export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const ui = useUI();

  const noticias = useQuery({
    queryKey: ["noticias", ui.verticalId, ui.refreshKey],
    queryFn: () => fetchNoticias(ui.verticalId!, 60),
    enabled: !!ui.verticalId,
  });
  const tweets = useQuery({
    queryKey: ["tweets", ui.verticalId, ui.refreshKey],
    queryFn: () => fetchTweets(ui.verticalId!, 80),
    enabled: !!ui.verticalId,
  });
  const counts: Record<string, number | undefined> = {
    "/noticias": noticias.data?.length,
    "/tweets": tweets.data?.length,
  };

  return (
    <aside
      className="hidden lg:flex flex-col sticky top-0 h-screen border-r"
      style={{ width: 248, background: "linear-gradient(180deg,#f6f5f2,#edeae4)", borderColor: "var(--border)" }}
    >
      <div className="px-5 pt-6 pb-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--radar)" }}>
            <span style={{ fontFamily: "var(--display)", color: "#ffffff", fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
              N
            </span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-tight" style={{ fontFamily: "var(--display)" }}>
              Nexo
            </span>
            <span className="text-[10.5px] tracking-[0.18em] uppercase" style={{ color: "var(--ink-faint)" }}>
              Inteligência
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navegação principal">
        <div className="label-eyebrow px-3 mb-3">Monitoramento</div>
        <ul className="flex flex-col gap-1">
          {NAV_PRINCIPAL.map((it) => {
            const active = isActive(path, it);
            const Icon = it.icon;
            const count = counts[it.to];
            return (
              <li key={it.to}>
                <Link
                  to={it.to}
                  aria-current={active ? "page" : undefined}
                  className="group flex items-center gap-3 px-3 py-2 rounded-md text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{
                    background: active ? "var(--accent-soft)" : "transparent",
                    color: active ? "var(--accent)" : "var(--ink-muted)",
                  }}
                >
                  <Icon size={16} strokeWidth={1.75} />
                  <span className="flex-1">{it.label}</span>
                  {typeof count === "number" && (
                    <span
                      className="text-[10.5px] font-semibold px-1.5 rounded tabular-nums"
                      style={{ background: "var(--surface-2)", color: "var(--ink-muted)" }}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <ConexaoBadge />
    </aside>
  );
}

// ── Header mobile (< lg): logo + hambúrguer ────────────────────────────────
export function MobileHeader() {
  return (
    <header
      className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 h-14 border-b backdrop-blur"
      style={{ background: "color-mix(in oklab, var(--bg) 90%, transparent)", borderColor: "var(--border)" }}
    >
      <button
        onClick={abrirMenu}
        aria-label="Abrir menu de navegação"
        className="inline-flex items-center justify-center w-11 h-11 -ml-2 rounded-md transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        style={{ color: "var(--ink)" }}
      >
        <Menu size={22} />
      </button>

      <Link to="/" className="flex items-center gap-2.5 min-w-0" aria-label="Nexo — início">
        <span
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--radar)" }}
        >
          <span style={{ fontFamily: "var(--display)", color: "#ffffff", fontSize: 18, fontWeight: 700, lineHeight: 1 }}>
            N
          </span>
        </span>
        <span className="text-[15px] font-semibold tracking-tight truncate" style={{ fontFamily: "var(--display)" }}>
          Nexo
        </span>
      </Link>
    </header>
  );
}

// ── Drawer de navegação mobile (< lg) ──────────────────────────────────────
export function MobileNav() {
  const ui = useUI();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const aberto = ui.menuAberto;
  const [montado, setMontado] = useState(false);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (aberto) {
      setMontado(true);
      const r = requestAnimationFrame(() => setVisivel(true));
      return () => cancelAnimationFrame(r);
    }
    setVisivel(false);
    const t = setTimeout(() => setMontado(false), 240);
    return () => clearTimeout(t);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fecharMenu();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [aberto]);

  if (!montado) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Menu de navegação">
      <div
        onClick={fecharMenu}
        className="absolute inset-0 transition-opacity duration-200"
        style={{ background: "rgba(0,0,0,0.25)", opacity: visivel ? 1 : 0 }}
      />
      <nav
        aria-label="Navegação principal"
        className="absolute top-0 left-0 h-full flex flex-col"
        style={{
          width: "min(310px, 86vw)",
          background: "linear-gradient(180deg,#f6f5f2,#edeae4)",
          borderRight: "1px solid var(--border)",
          boxShadow: "12px 0 40px rgba(0,0,0,0.18)",
          transform: visivel ? "translateX(0)" : "translateX(-100%)",
          transition: "transform .24s cubic-bezier(.22,.61,.36,1)",
        }}
      >
        <div className="flex items-center gap-3 px-5 h-14 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--radar)" }}>
            <span style={{ fontFamily: "var(--display)", color: "#ffffff", fontSize: 18, fontWeight: 700, lineHeight: 1 }}>
              N
            </span>
          </span>
          <div className="flex flex-col leading-tight flex-1 min-w-0">
            <span className="text-[14px] font-semibold tracking-tight" style={{ fontFamily: "var(--display)" }}>
              Nexo
            </span>
            <span className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--ink-faint)" }}>
              Inteligência
            </span>
          </div>
          <button
            onClick={fecharMenu}
            aria-label="Fechar menu"
            className="inline-flex items-center justify-center w-10 h-10 -mr-2 rounded-md transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            style={{ color: "var(--ink-muted)" }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <div className="label-eyebrow px-3 mb-3">Monitoramento</div>
          <ul className="flex flex-col gap-1">
            {NAV_PRINCIPAL.map((it) => {
              const active = isActive(path, it);
              const Icon = it.icon;
              return (
                <li key={it.to}>
                  <Link
                    to={it.to}
                    onClick={fecharMenu}
                    aria-current={active ? "page" : undefined}
                    className="flex items-center gap-3 px-3 min-h-[44px] rounded-md text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    style={{
                      background: active ? "var(--accent-soft)" : "transparent",
                      color: active ? "var(--accent)" : "var(--ink-muted)",
                    }}
                  >
                    <Icon size={18} strokeWidth={1.75} />
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <ConexaoBadge />
      </nav>
    </div>
  );
}
