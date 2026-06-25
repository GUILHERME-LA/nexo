import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { useUI } from "@/lib/uiStore";
import { auditarResumo24h, auditarTermometro, auditarTopicos, type AuditLinha } from "@/lib/audit";
import { fetchTopicosQuentes, fetchRankingMencoes } from "@/lib/queries";
import {
  estatisticasPorFonte,
  estatisticasPorAutorNoticia,
  estatisticasPorAutorTweet,
  estatisticasPorEspectro,
  validarConsistencia,
  type LinhaContagem,
  type CheckResultado,
} from "@/lib/stats";
import { espectroCor, espectroLabel, type Espectro } from "@/lib/espectro";

export const Route = createFileRoute("/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria — Nexo" },
      { name: "description", content: "Rastreabilidade de cada métrica: SQL, banco e UI lado a lado." },
    ],
  }),
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const ui = useUI();
  const enabled = !!ui.verticalId;

  const entidadesQ = useQuery({
    queryKey: ["audit-entidades", ui.verticalId, ui.refreshKey],
    queryFn: async () => {
      const [topicos, ranking] = await Promise.all([
        fetchTopicosQuentes(ui.verticalId!),
        fetchRankingMencoes(ui.verticalId!),
      ]);
      const set = new Set<string>();
      topicos.forEach((t) => set.add(t.entidade));
      ranking.forEach((r) => set.add(r.entidade));
      return Array.from(set);
    },
    enabled,
  });

  const resumoQ = useQuery({
    queryKey: ["audit-resumo", ui.verticalId, ui.refreshKey],
    queryFn: () => auditarResumo24h(ui.verticalId!),
    enabled,
  });
  const termoQ = useQuery({
    queryKey: ["audit-termometro", ui.verticalId, ui.refreshKey],
    queryFn: () => auditarTermometro(ui.verticalId!),
    enabled,
  });
  const topicosQ = useQuery({
    queryKey: ["audit-topicos", ui.verticalId, ui.refreshKey, entidadesQ.data?.length],
    queryFn: () => auditarTopicos(ui.verticalId!, entidadesQ.data ?? []),
    enabled: enabled && !!entidadesQ.data && entidadesQ.data.length > 0,
  });

  const fontesQ = useQuery({
    queryKey: ["audit-fontes", ui.verticalId, ui.refreshKey],
    queryFn: () => estatisticasPorFonte(ui.verticalId!),
    enabled,
  });
  const autoresNQ = useQuery({
    queryKey: ["audit-autores-n", ui.verticalId, ui.refreshKey],
    queryFn: () => estatisticasPorAutorNoticia(ui.verticalId!),
    enabled,
  });
  const autoresTQ = useQuery({
    queryKey: ["audit-autores-t", ui.verticalId, ui.refreshKey],
    queryFn: () => estatisticasPorAutorTweet(ui.verticalId!),
    enabled,
  });
  const espectroQ = useQuery({
    queryKey: ["audit-espectro", ui.verticalId, ui.refreshKey],
    queryFn: () => estatisticasPorEspectro(ui.verticalId!),
    enabled,
  });
  const checksQ = useQuery({
    queryKey: ["audit-checks", ui.verticalId, ui.refreshKey],
    queryFn: () => validarConsistencia(ui.verticalId!),
    enabled,
  });

  if (!enabled) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-12">
        <div className="p-10 text-center text-[14px]" style={{ color: "var(--ink-faint)", border: "1px solid var(--border-editorial)" }}>
          Selecione uma vertical no topo para auditar.
        </div>
      </div>
    );
  }

  const todas: AuditLinha[] = [
    ...(resumoQ.data ?? []),
    ...(termoQ.data ?? []),
    ...(topicosQ.data ?? []),
  ];
  const divergentes = todas.filter((l) => l.diff !== 0);
  const okCount = todas.length - divergentes.length;
  const carregando = resumoQ.isLoading || termoQ.isLoading || topicosQ.isLoading;

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-8 pb-20 lg:pb-0">
      <div
        className="flex items-start justify-between gap-4 flex-wrap mb-6"
        style={{ borderBottom: "1px solid var(--border-editorial)", paddingBottom: "1rem" }}
      >
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.3em] font-bold mb-1 flex items-center gap-2"
            style={{ fontFamily: "var(--mono)", color: "var(--radar)" }}
          >
            <ShieldCheck size={12} />
            Auditoria · {ui.verticalNome}
          </div>
          <h1 className="text-[30px] sm:text-[38px] leading-tight" style={{ fontFamily: "var(--serif)", color: "var(--ink)" }}>
            Rastreabilidade de métricas
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--ink-muted)" }}>
            Cada linha compara a contagem direta do banco (COUNT *) com o que a UI exibe (lista dedupada por URL).
            Divergências indicam duplicatas removidas pelo dedup canônico — não erro de cálculo.
          </p>
        </div>
        <div className="flex gap-4">
          <Kpi label="Métricas" value={todas.length} cor="var(--radar)" />
          <Kpi label="OK" value={okCount} cor="var(--pos)" />
          <Kpi label="Com diff" value={divergentes.length} cor={divergentes.length > 0 ? "var(--neg)" : "var(--ink-faint)"} />
        </div>
      </div>

      {carregando && (
        <div className="card-editorial p-6 flex items-center gap-3 text-[13px]" style={{ color: "var(--ink-muted)" }}>
          <RefreshCw size={14} className="animate-spin" />
          Recalculando todas as métricas contra o banco…
        </div>
      )}

      <Secao titulo="Visão consolidada (Dashboard)" linhas={resumoQ.data ?? []} />
      <Secao titulo="Termômetro de sentimento (Briefing)" linhas={termoQ.data ?? []} />
      <Secao titulo="Tópicos quentes / Mapa de calor" linhas={topicosQ.data ?? []} />

      <ChecksSecao checks={checksQ.data ?? []} />
      <EspectroSecao data={espectroQ.data} />
      <TopListaSecao
        titulo="Notícias por fonte"
        legenda="Agrupado pela coluna `fonte` (24h, dedupado)."
        total={fontesQ.data?.total ?? 0}
        semChave={fontesQ.data?.semFonte ?? 0}
        labelSemChave="Sem fonte"
        linhas={fontesQ.data?.linhas ?? []}
      />
      <TopListaSecao
        titulo="Notícias por autor"
        legenda="Agrupado pela coluna `autor` (24h, dedupado)."
        total={autoresNQ.data?.total ?? 0}
        semChave={autoresNQ.data?.semAutor ?? 0}
        labelSemChave="Sem autor"
        linhas={autoresNQ.data?.linhas ?? []}
      />
      <TopListaSecao
        titulo="Tweets por autor (@handle)"
        legenda="Agrupado por `autor_handle` (24h, dedupado)."
        total={autoresTQ.data?.total ?? 0}
        semChave={autoresTQ.data?.semAutor ?? 0}
        labelSemChave="Sem autor"
        linhas={autoresTQ.data?.linhas ?? []}
      />
    </div>
  );
}

function ChecksSecao({ checks }: { checks: CheckResultado[] }) {
  if (checks.length === 0) return null;
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-[16px]" style={{ fontFamily: "var(--serif)" }}>
          Validador runtime · reconciliação cruzada
        </h2>
        <div className="editorial-rule" />
      </div>
      <div className="flex flex-col gap-3">
        {checks.map((c, i) => (
          <div
            key={i}
            className="card-editorial p-4"
            style={{ borderLeft: `3px solid ${c.ok ? "var(--pos)" : "var(--neg)"}` }}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {c.ok ? (
                    <CheckCircle2 size={14} style={{ color: "var(--pos)" }} />
                  ) : (
                    <AlertTriangle size={14} style={{ color: "var(--neg)" }} />
                  )}
                  <span className="text-[14px] font-semibold" style={{ color: "var(--ink)" }}>
                    {c.nome}
                  </span>
                </div>
                <div className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
                  {c.detalhe}
                </div>
              </div>
              <div className="flex gap-6 shrink-0">
                <Stat label="Esperado" v={c.esperado} cor="var(--ink-muted)" />
                <Stat label="Obtido" v={c.obtido} cor={c.ok ? "var(--ink)" : "var(--neg)"} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EspectroSecao({
  data,
}: {
  data:
    | {
        noticias: Record<Espectro, number>;
        tweets: Record<Espectro, number>;
        totalNoticias: number;
        totalTweets: number;
      }
    | undefined;
}) {
  if (!data) return null;
  const buckets: Espectro[] = ["esquerda", "centro", "direita"];
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-[16px]" style={{ fontFamily: "var(--serif)" }}>
          Distribuição por espectro
        </h2>
        <div className="editorial-rule" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <EspectroCard titulo="Notícias" total={data.totalNoticias} valores={data.noticias} buckets={buckets} />
        <EspectroCard titulo="Tweets" total={data.totalTweets} valores={data.tweets} buckets={buckets} />
      </div>
    </section>
  );
}

function EspectroCard({
  titulo,
  total,
  valores,
  buckets,
}: {
  titulo: string;
  total: number;
  valores: Record<Espectro, number>;
  buckets: Espectro[];
}) {
  return (
    <div className="card-editorial p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
          {titulo}
        </span>
        <span className="text-[11px] tabular-nums" style={{ color: "var(--ink-faint)" }}>
          total {total.toLocaleString("pt-BR")}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {buckets.map((b) => {
          const n = valores[b];
          const pct = total > 0 ? Math.round((n / total) * 100) : 0;
          return (
            <div key={b}>
              <div className="flex items-center justify-between text-[11.5px] mb-1">
                <span style={{ color: espectroCor(b), fontWeight: 600 }}>{espectroLabel(b)}</span>
                <span className="tabular-nums" style={{ color: "var(--ink-muted)" }}>
                  {n.toLocaleString("pt-BR")} · {pct}%
                </span>
              </div>
              <div className="h-1.5 rounded" style={{ background: "var(--surface-2)" }}>
                <div
                  className="h-full rounded"
                  style={{ width: `${pct}%`, background: espectroCor(b) }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopListaSecao({
  titulo,
  legenda,
  total,
  semChave,
  labelSemChave,
  linhas,
}: {
  titulo: string;
  legenda: string;
  total: number;
  semChave: number;
  labelSemChave: string;
  linhas: LinhaContagem[];
}) {
  if (total === 0) return null;
  const top = linhas.slice(0, 10);
  const soma = linhas.reduce((s, l) => s + l.total, 0) + semChave;
  const ok = soma === total;
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-[16px]" style={{ fontFamily: "var(--serif)" }}>
          {titulo}
        </h2>
        <div className="editorial-rule" />
      </div>
      <div className="card-editorial p-4" style={{ borderLeft: `3px solid ${ok ? "var(--pos)" : "var(--neg)"}` }}>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
            {legenda}
          </div>
          <div className="flex gap-6">
            <Stat label="Total UI" v={total} cor="var(--ink)" />
            <Stat label="Σ + sem categoria" v={soma} cor={ok ? "var(--ink-muted)" : "var(--neg)"} />
          </div>
        </div>
        <ul className="flex flex-col gap-1.5">
          {top.map((l) => {
            const pct = total > 0 ? Math.round((l.total / total) * 100) : 0;
            return (
              <li key={l.chave} className="flex items-center justify-between text-[12.5px]">
                <span className="truncate pr-2" style={{ color: "var(--ink)" }}>
                  {l.chave}
                </span>
                <span className="tabular-nums shrink-0" style={{ color: "var(--ink-muted)" }}>
                  {l.total.toLocaleString("pt-BR")} · {pct}%
                </span>
              </li>
            );
          })}
          {semChave > 0 && (
            <li className="flex items-center justify-between text-[12.5px] pt-1 mt-1 border-t" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--ink-faint)", fontStyle: "italic" }}>{labelSemChave}</span>
              <span className="tabular-nums" style={{ color: "var(--ink-faint)" }}>
                {semChave.toLocaleString("pt-BR")}
              </span>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

function Secao({ titulo, linhas }: { titulo: string; linhas: AuditLinha[] }) {
  if (linhas.length === 0) return null;
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-[16px]" style={{ fontFamily: "var(--serif)" }}>
          {titulo}
        </h2>
        <div className="editorial-rule" />
      </div>
      <div className="flex flex-col gap-3">
        {linhas.map((l, i) => (
          <Linha key={`${l.metrica}-${i}`} linha={l} />
        ))}
      </div>
    </section>
  );
}

function Linha({ linha }: { linha: AuditLinha }) {
  const ok = linha.diff === 0;
  return (
    <div
      className="card-editorial p-4 sm:p-5"
      style={{ borderLeft: `3px solid ${ok ? "var(--pos)" : "var(--neg)"}` }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {ok ? (
              <CheckCircle2 size={14} style={{ color: "var(--pos)" }} />
            ) : (
              <AlertTriangle size={14} style={{ color: "var(--neg)" }} />
            )}
            <span className="text-[14px] font-semibold" style={{ color: "var(--ink)" }}>
              {linha.metrica}
            </span>
          </div>
          <div className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
            {linha.descricao}
          </div>
        </div>
        <div className="flex gap-4 sm:gap-6 shrink-0">
          <Stat label="Banco" v={linha.totalBanco} cor="var(--ink-muted)" />
          <Stat label="UI (dedup)" v={linha.totalUI} cor="var(--ink)" />
          <Stat
            label="Duplicatas"
            v={linha.diff}
            cor={linha.diff === 0 ? "var(--ink-faint)" : "var(--neg)"}
            prefix={linha.diff > 0 ? "−" : ""}
            abs
          />
        </div>
      </div>
      <details className="mt-3">
        <summary
          className="cursor-pointer text-[11.5px] font-semibold"
          style={{ color: "var(--accent)" }}
        >
          Ver SQL equivalente
        </summary>
        <pre
          className="mt-2 p-3 rounded text-[11.5px] overflow-x-auto"
          style={{
            background: "var(--surface-2)",
            color: "var(--ink-muted)",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
          }}
        >
          {linha.sql}
        </pre>
      </details>
    </div>
  );
}

function Kpi({ label, value, cor }: { label: string; value: number; cor: string }) {
  return (
    <div>
      <div className="label-eyebrow mb-0.5">{label}</div>
      <div className="text-[22px] tabular-nums" style={{ fontFamily: "var(--serif)", fontWeight: 600, color: cor }}>
        {value.toLocaleString("pt-BR")}
      </div>
    </div>
  );
}

function Stat({
  label,
  v,
  cor,
  prefix = "",
  abs = false,
}: {
  label: string;
  v: number;
  cor: string;
  prefix?: string;
  abs?: boolean;
}) {
  return (
    <div className="text-right">
      <div className="label-eyebrow mb-0.5">{label}</div>
      <div className="text-[18px] tabular-nums" style={{ fontFamily: "var(--serif)", fontWeight: 600, color: cor }}>
        {prefix}
        {(abs ? Math.abs(v) : v).toLocaleString("pt-BR")}
      </div>
    </div>
  );
}
