import { useState, useEffect, useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles, Newspaper, Twitter, Lightbulb, MoreHorizontal, LayoutDashboard, Flame, Archive, ShieldCheck, X } from "lucide-react";

type NavItem = { to: string; label: string; icon: typeof Sparkles; exact?: boolean };

const BOTTOM_NAV: NavItem[] = [
  { to: "/", label: "Briefing", icon: Sparkles, exact: true },
  { to: "/noticias", label: "Notícias", icon: Newspaper },
  { to: "/tweets", label: "Pulso Social", icon: Twitter },
  { to: "/pautas", label: "Pautas", icon: Lightbulb },
];

const MORE_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/mapa", label: "Mapa", icon: Flame },
  { to: "/arquivo", label: "Arquivo", icon: Archive },
  { to: "/auditoria", label: "Auditoria", icon: ShieldCheck },
];

function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.to : pathname.startsWith(item.to);
}

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [showMore, setShowMore] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const moreIsActive = MORE_NAV.some((item) => isActive(path, item));

  useEffect(() => {
    if (showMore) {
      setMounted(true);
      const r = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(r);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(t);
  }, [showMore]);

  // Close panel when navigating
  useEffect(() => setShowMore(false), [path]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMore(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* More panel sheet */}
      {mounted && (
        <div className="md:hidden fixed inset-0 z-[70]">
          <div
            onClick={() => setShowMore(false)}
            className="absolute inset-0 transition-opacity duration-200"
            style={{ background: "rgba(10,10,8,0.4)", opacity: visible ? 1 : 0 }}
          />
          <div
            ref={panelRef}
            className="absolute bottom-0 inset-x-0 border-t"
            style={{
              background: "var(--bg)",
              borderColor: "var(--border-editorial)",
              paddingBottom: "calc(64px + env(safe-area-inset-bottom))",
              transform: visible ? "translateY(0)" : "translateY(100%)",
              transition: "transform .2s cubic-bezier(.22,.61,.36,1)",
            }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <span
                className="text-[9px] uppercase tracking-[0.3em]"
                style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}
              >
                Mais páginas
              </span>
              <button onClick={() => setShowMore(false)} className="icon-btn">
                <X size={16} />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-1 px-4 pb-2">
              {MORE_NAV.map((item) => {
                const active = isActive(path, item);
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to as any}
                      aria-current={active ? "page" : undefined}
                      className="flex flex-col items-center gap-1.5 py-3 transition-colors"
                      style={{
                        color: active ? "var(--ink)" : "var(--ink-muted)",
                        textDecoration: "none",
                      }}
                    >
                      <Icon size={20} strokeWidth={1.75} />
                      <span
                        className="text-[10px] font-medium"
                        style={{ fontFamily: "var(--sans)" }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t-2"
        style={{
          background: "rgba(15,23,42,0.96)",
          backdropFilter: "blur(12px)",
          borderColor: "var(--border-editorial)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        aria-label="Navegação móvel"
      >
        <ul className="grid grid-cols-5">
          {BOTTOM_NAV.map((item) => {
            const active = isActive(path, item);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to as any}
                  aria-current={active ? "page" : undefined}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
                  style={{
                    color: active ? "var(--radar)" : "var(--ink-muted)",
                    textDecoration: "none",
                  }}
                >
                  <Icon size={18} strokeWidth={1.75} />
                  <span
                    className="text-[9px] font-medium"
                    style={{
                      fontFamily: "var(--mono)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
          {/* Mais */}
          <li>
            <button
              onClick={() => setShowMore((p) => !p)}
              aria-expanded={showMore}
              className="w-full flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
              style={{ color: moreIsActive ? "var(--radar)" : "var(--ink-muted)" }}
            >
              <MoreHorizontal size={18} strokeWidth={1.75} />
              <span
                className="text-[9px] font-medium"
                style={{
                  fontFamily: "var(--mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Mais
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
