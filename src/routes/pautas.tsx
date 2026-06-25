import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lightbulb, ExternalLink, Copy, Check } from "lucide-react";
import { useUI } from "@/lib/uiStore";
import { fetchPautas } from "@/lib/queries";
import { normSent, type Pauta, type PautaFonte } from "@/lib/types";
import { htmlDecode } from "@/lib/htmlDecode";
import { resolveEspectro, type Espectro } from "@/lib/espectro";

// Resolve o espectro de uma pauta: usa o valor do banco se existir,
// senão classifica pelo conteúdo (título, resumo, contexto, ângulo, entidades).
function espectroDe(p: Pauta): Espectro {
  return resolveEspectro(
    p.espectro,
    p.titulo,
    p.resumo,
    p.contexto,
    p.angulo,
    Array.isArray(p.entidades) ? p.entidades.join(" ") : null,
  );
}

export const Route = createFileRoute("/pautas")({
  head: () => ({
    meta: [
      { title: "Pautas do dia — Nexo" },
      {
        name: "description",
        content: "Sugestões editoriais geradas pela IA a partir das notícias e posts mais marcantes.",
      },
    ],
  }),
  component: PautasPage,
});

function formatDateBR(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso + "T12:00:00"));
  } catch {
    return iso;
  }
}

function sentColor(s: unknown): string {
  const n = normSent(s);
  if (n === "pos") return "#16a34a";
  if (n === "neg") return "#dc2626";
  return "#9ca3af";
}

function espectroCor(e: string | null): string {
  const v = String(e ?? "").toLowerCase();
  if (v === "esquerda") return "#C0392B";
  if (v === "direita") return "#2E5C9E";
  return "#7F8C8D";
}

function formatPautaText(p: Pauta): string {
  const lines: string[] = [];
  lines.push(htmlDecode(p.titulo));
  if (p.angulo) lines.push(`\nÂngulo: ${htmlDecode(p.angulo)}`);
  if (p.resumo) lines.push(`\nResumo:\n${htmlDecode(p.resumo)}`);
  if (p.contexto) lines.push(`\nContexto:\n${htmlDecode(p.contexto)}`);
  if (p.link_principal) lines.push(`\nMatéria-âncora: ${p.link_principal}`);
  const fontes = Array.isArray(p.fontes) ? p.fontes.filter((f) => f?.url) : [];
  if (fontes.length) {
    lines.push("\nFontes:");
    for (const f of fontes) {
      lines.push(`- ${htmlDecode(f.titulo || f.fonte || f.url)}${f.url ? ` (${f.url})` : ""}`);
    }
  }
  return lines.join("\n");
}

function PautasPage() {
  const ui = useUI();

  const q = useQuery({
    queryKey: ["pautas", ui.verticalId, ui.refreshKey],
    queryFn: () => fetchPautas(ui.verticalId!),
    enabled: !!ui.verticalId,
  });

  if (!ui.verticalId) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-12">
        <div className="p-10 text-center text-[14px]" style={{ color: "var(--ink-faint)", border: "1px solid var(--border-editorial)" }}>
          Selecione uma vertical no topo.
        </div>
      </div>
    );
  }

  const todas = q.data ?? [];
  const dref = todas[0]?.data_referencia;
  const lista = todas;

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-8 pb-20 lg:pb-0">
      <div
        className="flex items-start justify-between gap-4 flex-wrap mb-6"
        style={{ borderBottom: "1px solid var(--border-editorial)", paddingBottom: "1rem" }}
      >
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.3em] font-bold mb-1"
            style={{ fontFamily: "var(--mono)", color: "var(--radar)" }}
          >
            Sugestões editoriais · {ui.verticalNome}
            {dref ? ` · ${formatDateBR(dref)}` : ""}
          </div>
          <h1 className="text-[30px] sm:text-[38px] leading-tight" style={{ fontFamily: "var(--serif)", color: "var(--ink)" }}>
            Pautas do dia
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--ink-muted)" }}>
            Geradas pela IA a partir das notícias e posts mais marcantes
          </p>
        </div>
        <div
          className="px-4 py-2 flex flex-col items-center"
          style={{ border: "1px solid var(--border-editorial)" }}
        >
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ fontFamily: "var(--mono)", color: "var(--radar)" }}>
            Pautas
          </div>
          <div className="text-[28px] tabular-nums font-serif font-bold" style={{ color: "var(--radar)" }}>
            {todas.length}
          </div>
        </div>
      </div>

      {q.isLoading ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-editorial h-[180px] skeleton" />
          ))}
        </div>
      ) : q.isError ? (
        <div className="card-editorial p-6 text-[13.5px]" style={{ color: "#dc2626" }}>
          Erro ao carregar pautas: {(q.error as Error)?.message ?? "desconhecido"}
        </div>
      ) : todas.length === 0 ? (
        <div
          className="card-editorial p-10 flex flex-col items-center text-center gap-3"
          style={{ color: "var(--ink-muted)" }}
        >
          <Lightbulb size={32} style={{ color: "var(--accent)" }} strokeWidth={1.5} />
          <div className="text-[15px]" style={{ fontFamily: "var(--serif)", color: "var(--ink)" }}>
            Nenhuma pauta ainda
          </div>
          <div className="text-[13px]">As pautas aparecem aqui após a próxima coleta e análise da IA.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {lista.map((p, idx) => (
            <PautaCard key={p.id} pauta={p} rank={idx + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function PautaCard({ pauta, rank }: { pauta: Pauta; rank: number }) {
  const [copied, setCopied] = useState(false);
  const fontes: PautaFonte[] = Array.isArray(pauta.fontes) ? pauta.fontes.filter((f) => f && f.url) : [];
  const entidades: string[] = Array.isArray(pauta.entidades) ? pauta.entidades : [];

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatPautaText(pauta));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <article className="card-editorial p-4 sm:p-6 flex gap-3 sm:gap-5">
      <div
        className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-semibold tabular-nums"
        style={{
          background: "var(--accent-soft)",
          color: "var(--accent)",
          fontFamily: "var(--serif)",
        }}
      >
        {rank}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 text-[11.5px]" style={{ color: "var(--ink-muted)" }}>
            {pauta.categoria && (
              <span
                className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wider"
                style={{ background: "var(--surface-2)", color: "var(--ink)" }}
              >
                {pauta.categoria}
              </span>
            )}
            {(() => {
              const esp = espectroDe(pauta);
              return (
                <span
                  className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wider"
                  style={{
                    color: espectroCor(esp),
                    background: `${espectroCor(esp)}22`,
                  }}
                >
                  {esp}
                </span>
              );
            })()}
            {typeof pauta.relevancia === "number" && (
              <span className="tabular-nums">relevância {pauta.relevancia}</span>
            )}
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: sentColor(pauta.sentimento) }}
              title={String(pauta.sentimento ?? "neutro")}
            />
          </div>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-md border transition-colors"
            style={{
              borderColor: "var(--border)",
              color: copied ? "var(--accent)" : "var(--ink-muted)",
              background: copied ? "var(--accent-soft)" : "transparent",
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>

        <h2 className="text-[19px] leading-snug" style={{ fontFamily: "var(--serif)" }}>
          {htmlDecode(pauta.titulo)}
        </h2>

        {pauta.angulo && (
          <p className="text-[13.5px] italic" style={{ color: "var(--ink-muted)" }}>
            {htmlDecode(pauta.angulo)}
          </p>
        )}

        {pauta.resumo && (
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--ink)" }}>
            {htmlDecode(pauta.resumo)}
          </p>
        )}

        {pauta.contexto && (
          <div className="rounded-md p-4 flex flex-col gap-1.5" style={{ background: "var(--surface-2)" }}>
            <span className="label-eyebrow">Contexto</span>
            <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--ink)" }}>
              {htmlDecode(pauta.contexto)}
            </p>
          </div>
        )}

        {entidades.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {entidades.map((e) => (
              <span
                key={e}
                className="px-2.5 py-0.5 rounded-full text-[11.5px]"
                style={{ background: "var(--surface-2)", color: "var(--ink-muted)" }}
              >
                {e}
              </span>
            ))}
          </div>
        )}

        {fontes.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="label-eyebrow">Fontes</span>
            <ul className="flex flex-col gap-1">
              {fontes.map((f, i) => (
                <li key={i} className="text-[13px]">
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 hover:underline"
                    style={{ color: "var(--ink)" }}
                  >
                    <ExternalLink size={12} style={{ color: "var(--ink-faint)" }} />
                    <span>{htmlDecode(f.titulo || f.fonte || f.url)}</span>
                    {f.fonte && f.titulo && <span style={{ color: "var(--ink-faint)" }}>· {htmlDecode(f.fonte)}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {pauta.link_principal && (
          <div>
            <a
              href={pauta.link_principal}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3.5 py-2 rounded-md"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <ExternalLink size={13} /> Abrir matéria-âncora
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
