import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, RefreshCw } from "lucide-react";
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

export function Topbar() {
  const ui = useUI();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);


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
      alert("Não foi possível acionar a automação. Veja o console para detalhes.");
    }
  };

  const mmss = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  };

  return (
    <header
      className="sticky top-0 z-30 backdrop-blur border-b lg:top-0"
      style={{
        background: "color-mix(in oklab, var(--bg) 88%, transparent)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-3">
        {/* Verticais — viram pílulas roláveis no mobile */}
        <div
          className="order-2 sm:order-1 flex-1 flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-full border min-w-0"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="inline-flex items-center gap-1 shrink-0" role="tablist" aria-label="Vertical">
            {VERTICAIS_FIXAS.map((v) => {
              const active = ui.verticalId === v.id;
              return (
                <button
                  key={v.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    if (!active) {
                      setVertical(v.id, v.label);
                    }
                  }}
                  className="px-3.5 min-h-[36px] inline-flex items-center rounded-full text-[12.5px] font-semibold transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{
                    background: active ? "var(--accent)" : "transparent",
                    color: active ? "#fff" : "var(--ink-muted)",
                  }}
                >
                  {v.label}
                </button>
              );
            })}
          </div>

          <span className="h-6 w-px mx-1 shrink-0" style={{ background: "var(--border)" }} aria-hidden />

          <form
            className="flex-1 relative min-w-0"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const v = inputRef.current?.value.trim();
              if (v) navigate({ to: "/noticias", search: { q: v } as never });
            }}
          >
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--ink-faint)" }}
            />
            <input
              ref={inputRef}
              type="search"
              placeholder="Buscar..."
              aria-label={`Buscar em ${ui.verticalNome || "vertical"}`}
              className="w-full pl-9 pr-12 py-2 rounded-full text-[14px] sm:text-[13px] outline-none bg-transparent focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            />
            <kbd
              className="hidden sm:block absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold px-1.5 py-0.5 rounded border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--ink-faint)" }}
            >
              ⌘K
            </kbd>
          </form>
        </div>

        {/* Meta */}
        <div
          className="order-1 sm:order-2 flex items-center justify-between sm:justify-end gap-3 text-[12px]"
          style={{ color: "var(--ink-faint)" }}
        >
          <span className="truncate">Última coleta {relTime(coleta.data)}</span>
          <button
            type="button"
            onClick={atualizar}
            disabled={running}
            title={running ? `Atualização em andamento — pronta em ${mmss(remaining)}` : "Atualizar dados (leva ~5 min)"}
            className="inline-flex items-center gap-1.5 px-3 min-h-[32px] rounded-full border text-[12px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--ink)" }}
          >
            <RefreshCw size={13} className={running ? "animate-spin" : ""} />
            {running ? `Atualizando ${mmss(remaining)}` : "Atualizar"}
          </button>
        </div>
      </div>
    </header>
  );
}
