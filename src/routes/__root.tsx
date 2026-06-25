import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Masthead } from "@/components/Masthead";
import { NewsTicker } from "@/components/NewsTicker";
import { BottomNav } from "@/components/BottomNav";
import { NoticiaDrawer } from "@/components/NoticiaDrawer";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="max-w-md text-center">
        <h1 className="text-7xl" style={{ fontFamily: "var(--serif)" }}>
          404
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
          A página que você procura não existe.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Voltar ao Briefing
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
          Não foi possível carregar esta página.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full px-4 py-2 text-sm font-semibold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Nexo — Inteligência Política" },
      {
        name: "description",
        content: "Monitoramento político inteligente: clipping, redes e tendências em tempo real.",
      },
      { property: "og:title", content: "Nexo — Inteligência Política" },
      { name: "twitter:title", content: "Nexo — Inteligência Política" },
      { name: "description", content: "Nexo is a political intelligence dashboard for media monitoring." },
      {
        property: "og:description",
        content: "Nexo is a political intelligence dashboard for media monitoring.",
      },
      {
        name: "twitter:description",
        content: "Nexo is a political intelligence dashboard for media monitoring.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/30589d00-0e01-4568-856c-2453468abbae/id-preview-ce3b1277--8791c203-f444-4480-838c-718e565def8b.lovable.app-1780346866973.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/30589d00-0e01-4568-856c-2453468abbae/id-preview-ce3b1277--8791c203-f444-4480-838c-718e565def8b.lovable.app-1780346866973.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;0,6..72,800;0,6..72,900;1,6..72,400&family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      {/* Editorial masthead (3-tier colapsável) + ticker */}
      <Masthead />
      <NewsTicker />
      {/* Main content — full-width editorial style */}
      <main id="conteudo" style={{ position: "relative", zIndex: 1 }}>
        <Outlet />
      </main>
      {/* Mobile bottom navigation */}
      <BottomNav />
      {/* Global slide-in article reader */}
      <NoticiaDrawer />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--surface-2)",
            color: "var(--ink)",
            border: "1px solid var(--border-strong)",
            fontFamily: "var(--sans)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
