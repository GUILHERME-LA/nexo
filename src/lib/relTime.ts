// Horário relativo em pt-BR no fuso America/Sao_Paulo.
export function relTime(iso?: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diffMin = (Date.now() - t) / 60000;
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${Math.round(diffMin)}min`;
  const h = diffMin / 60;
  if (h < 24) return `há ${Math.round(h)}h`;
  const d = h / 24;
  if (d < 30) return `há ${Math.round(d)}d`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function dateLabelSP(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}
