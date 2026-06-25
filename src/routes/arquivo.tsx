import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Search, ChevronDown } from "lucide-react";
import { fetchTodasNoticias, fetchTodosTweets } from "@/lib/queries";
import { NewsCard } from "@/components/NewsCard";
import { TweetCard } from "@/components/TweetCard";
import type { Noticia, Tweet } from "@/lib/types";

const PAGE_SIZE = 30;

export const Route = createFileRoute("/arquivo")({
  head: () => ({
    meta: [
      { title: "Arquivo — Nexo" },
      { name: "description", content: "Histórico consolidado de notícias e tweets de todas as verticais." },
    ],
  }),
  component: ArquivoPage,
});

type Tab = "noticias" | "tweets";

function ArquivoPage() {
  const [tab, setTab] = useState<Tab>("noticias");
  const [q, setQ] = useState("");

  const noticiasQ = useInfiniteQuery({
    queryKey: ["arquivo-noticias"],
    queryFn: ({ pageParam = 0 }) => fetchTodasNoticias(PAGE_SIZE, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE),
    enabled: tab === "noticias",
  });

  const tweetsQ = useInfiniteQuery({
    queryKey: ["arquivo-tweets"],
    queryFn: ({ pageParam = 0 }) => fetchTodosTweets(PAGE_SIZE, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE),
    enabled: tab === "tweets",
  });

  const noticias: Noticia[] = useMemo(() => noticiasQ.data?.pages.flat() ?? [], [noticiasQ.data]);
  const tweets: Tweet[] = useMemo(() => tweetsQ.data?.pages.flat() ?? [], [tweetsQ.data]);

  const query = q.trim().toLowerCase();
  const filteredNoticias = useMemo(
    () =>
      !query
        ? noticias
        : noticias.filter((n) =>
            ((n.titulo ?? "") + " " + (n.resumo ?? "") + " " + (n.fonte ?? "")).toLowerCase().includes(query),
          ),
    [noticias, query],
  );
  const filteredTweets = useMemo(
    () =>
      !query
        ? tweets
        : tweets.filter((t) =>
            ((t.texto ?? "") + " " + (t.autor_nome ?? "") + " " + (t.autor_handle ?? "")).toLowerCase().includes(query),
          ),
    [tweets, query],
  );

  const active = tab === "noticias" ? noticiasQ : tweetsQ;

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
            Arquivo · todas as verticais
          </div>
          <h1 className="text-[30px] sm:text-[38px] leading-tight" style={{ fontFamily: "var(--serif)", color: "var(--ink)" }}>
            Histórico consolidado
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap mb-6">
        <div className="flex gap-2">
          {(["noticias", "tweets"] as const).map((k) => {
            const a = tab === k;
            return (
              <button
                key={k}
                onClick={() => setTab(k)}
                className="chip-filter"
                data-active={a}
              >
                {k === "noticias" ? "Notícias" : "Tweets"}
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 max-w-xl">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--ink-faint)" }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por texto..."
            className="w-full pl-10 pr-4 py-2.5 text-[13px] outline-none"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-editorial)",
              fontFamily: "var(--sans)",
              color: "var(--ink)",
            }}
          />
        </div>
      </div>

      <div>
        {active.isLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="card-editorial h-[140px] skeleton" />
            ))}
          </div>
        ) : tab === "noticias" ? (
          filteredNoticias.length === 0 ? (
            <Empty />
          ) : (
            filteredNoticias.map((n) => <NewsCard key={n.id} n={n} />)
          )
        ) : filteredTweets.length === 0 ? (
          <Empty />
        ) : (
          filteredTweets.map((t) => <TweetCard key={t.id} t={t} />)
        )}
      </div>

      {active.hasNextPage && (
        <div className="flex justify-center py-4">
          <button
            onClick={() => active.fetchNextPage()}
            disabled={active.isFetchingNextPage}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12.5px] font-semibold border"
            style={{ borderColor: "var(--border)", color: "var(--ink)" }}
          >
            {active.isFetchingNextPage ? "Carregando..." : "Carregar mais"} <ChevronDown size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

function Empty() {
  return (
    <div className="text-center py-16 text-[14px]" style={{ color: "var(--ink-faint)" }}>
      Nada encontrado.
    </div>
  );
}
