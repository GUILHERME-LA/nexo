import { useQuery } from "@tanstack/react-query";
import { useUI } from "@/lib/uiStore";
import { fetchNoticias } from "@/lib/queries";
import { htmlDecode } from "@/lib/htmlDecode";

// Categorias editoriais baseadas em candidatos/sentimento
function getLabel(n: { fonte?: string | null; sentimento?: string | null }): string {
  const s = (n.sentimento ?? "").toLowerCase();
  if (s === "pos" || s === "positivo") return "ANÁLISE";
  if (s === "neg" || s === "negativo") return "URGENTE";
  return "POLÍTICA";
}

export function NewsTicker() {
  const ui = useUI();

  const noticias = useQuery({
    queryKey: ["ticker-noticias", ui.verticalId, ui.refreshKey],
    queryFn: () => fetchNoticias(ui.verticalId!, 20),
    enabled: !!ui.verticalId,
    staleTime: 5 * 60_000,
  });

  const items = noticias.data ?? [];
  if (items.length === 0) return null;

  // Dobra os itens para criar loop infinito contínuo
  const doubled = [...items, ...items];

  return (
    <div
      className="w-full border-y overflow-hidden"
      style={{
        background: "var(--surface-dark)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        borderColor: "var(--border-editorial)",
        paddingBlock: "10px",
      }}
    >
      <div className="ticker-track">
        {doubled.map((n, idx) => (
          <span key={`${n.id}-${idx}`} className="flex items-center gap-3 mx-6 whitespace-nowrap">
            {idx === 0 && (
              <span className="live-dot mr-1" />
            )}
            <span
              className="text-[10px] font-bold uppercase tracking-[0.25em]"
              style={{ fontFamily: "var(--mono)", color: "var(--radar)" }}
            >
              {getLabel(n)}
            </span>
            <span
              className="text-[11px]"
              style={{ fontFamily: "var(--mono)", color: "#e2e8f0" }}
            >
              {htmlDecode(n.titulo ?? "")}
            </span>
            <span style={{ color: "var(--radar)", marginLeft: 8 }}>●</span>
          </span>
        ))}
      </div>
    </div>
  );
}
