import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { z } from "zod";
import { useUI } from "@/lib/uiStore";
import { buscarNoticias, fetchNoticias } from "@/lib/queries";
import { NewsCard } from "@/components/NewsCard";
import { ScrollReveal } from "@/components/ScrollReveal";
import { SectionHeader } from "@/components/SectionHeader";
import { isInternacional, temSinalGlobal } from "@/lib/verticalGuard";

const searchSchema = z.object({
  tag: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/noticias")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Notícias — Nexo" },
      { name: "description", content: "Clipping de notícias com filtros por candidato, período e busca." },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  const ui = useUI();
  const { tag = "ALL", q = "" } = Route.useSearch();
  const navigate = useNavigate();

  const [localQ, setLocalQ] = useState(q);

  useEffect(() => {
    setLocalQ(q);
  }, [q, tag]);

  const termo = (q ?? "").trim();
  const serverSearchOn = termo.length >= 2;

  const noticias = useQuery({
    queryKey: ["noticias", ui.verticalId, ui.refreshKey],
    queryFn: () => fetchNoticias(ui.verticalId!, 60),
    enabled: !!ui.verticalId,
  });

  const busca = useQuery({
    queryKey: ["noticias-busca", ui.verticalId, termo, ui.refreshKey],
    queryFn: () => buscarNoticias(ui.verticalId!, termo, 120),
    enabled: !!ui.verticalId && serverSearchOn,
  });

  const ativa = serverSearchOn ? busca : noticias;
  const dados = ativa.data ?? [];

  const setSearch = (next: { tag?: string; q?: string }) =>
    navigate({ to: "/noticias", search: next as never, replace: true });

  const tags = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of dados) {
      const cs = Array.isArray(n.candidatos) ? n.candidatos : [];
      for (const c of cs) counts[c] = (counts[c] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [dados]);

  const list = useMemo(() => {
    const query = localQ.trim().toLowerCase();
    const onlyGlobal = isInternacional(ui.verticalId);
    return dados.filter((n) => {
      const cs = Array.isArray(n.candidatos) ? n.candidatos : [];
      const okTag = tag === "ALL" || !tag || cs.includes(tag);
      const okQ =
        serverSearchOn ||
        !query ||
        ((n.titulo ?? "") + " " + (n.resumo ?? "") + " " + (n.fonte ?? "") + " " + cs.join(" "))
          .toLowerCase()
          .includes(query);
      const okVertical = !onlyGlobal || temSinalGlobal(n.titulo, n.resumo, n.fonte);
      return okTag && okQ && okVertical;
    });
  }, [dados, tag, localQ, ui.verticalId, serverSearchOn]);

  if (!ui.verticalId) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-12">
        <div className="p-10 text-center text-[14px]" style={{ color: "var(--ink-faint)", border: "1px solid var(--border-editorial)" }}>
          Selecione uma vertical no topo.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-8 pb-20 lg:pb-0">
      {/* Hero do Clipping */}
      <div
        className="flex items-start justify-between gap-4 flex-wrap mb-6"
        style={{ borderBottom: "1px solid var(--border-editorial)", paddingBottom: "1rem" }}
      >
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.3em] font-bold mb-1"
            style={{ fontFamily: "var(--mono)", color: "var(--radar)" }}
          >
            Clipping · {ui.verticalNome}
          </div>
          <h1 className="text-[30px] sm:text-[38px] leading-tight" style={{ fontFamily: "var(--serif)", color: "var(--ink)" }}>
            Notícias monitoradas
          </h1>
        </div>
        <div className="flex gap-4 sm:gap-6">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em]" style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>
              {serverSearchOn ? "Encontradas" : "Carregadas"}
            </div>
            <div className="text-[22px] tabular-nums font-serif font-semibold" style={{ color: "var(--radar)" }}>
              {dados.length}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em]" style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>
              Filtradas
            </div>
            <div className="text-[22px] tabular-nums font-serif font-semibold" style={{ color: "var(--radar)" }}>
              {list.length}
            </div>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="relative max-w-xl mb-5">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-faint)" }} />
        <input
          value={localQ}
          onChange={(e) => {
            setLocalQ(e.target.value);
            setSearch({ tag, q: e.target.value || undefined });
          }}
          placeholder="Filtrar por título, fonte ou termo..."
          className="w-full pl-10 pr-4 py-2.5 text-[13px] outline-none"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-editorial)",
            fontFamily: "var(--sans)",
            color: "var(--ink)",
          }}
        />
      </div>

      <div className="text-[11px] mb-5" style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>
        Últimas 24h de coleta ·{" "}
        <a href="/arquivo" style={{ color: "var(--radar)", fontWeight: 600 }}>
          ver acervo completo →
        </a>
      </div>

      {/* Chips de candidatos — estilo editorial */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-2">
        <button
          data-active={tag === "ALL"}
          className="chip-filter shrink-0"
          onClick={() => setSearch({ tag: "ALL", q: localQ || undefined })}
        >
          Todos <span className="opacity-70 tabular-nums">{dados.length}</span>
        </button>
        {tags.map(([t, c]) => (
          <button
            key={t}
            data-active={tag === t}
            className="chip-filter shrink-0"
            onClick={() => setSearch({ tag: t, q: localQ || undefined })}
          >
            {t} <span className="opacity-70 tabular-nums">{c}</span>
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="mt-6">
        {ativa.isLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-[140px] skeleton" style={{ border: "1px solid var(--border-editorial)" }} />)}
          </div>
        ) : ativa.isError ? (
          <div className="p-6 text-[13px]" style={{ color: "var(--neg)", border: "1px solid var(--neg-soft)" }}>
            Não foi possível carregar as notícias.
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-16" style={{ color: "var(--ink-faint)" }}>
            <Search size={28} className="mx-auto mb-3 opacity-50" />
            <div className="text-[17px] font-serif" style={{ color: "var(--ink-muted)" }}>
              Nenhuma notícia encontrada
            </div>
            <div className="text-[12.5px] mt-1">Ajuste o filtro, o termo de busca ou o período.</div>
          </div>
        ) : (
          list.map((n) => <NewsCard key={n.id} n={n} />)
        )}
      </div>
    </div>
  );
}
