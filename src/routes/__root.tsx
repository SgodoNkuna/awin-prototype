import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";

import appCss from "../styles.css?url";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { LogoThemeProvider } from "@/lib/logo-theme";
import { AuthProvider } from "@/lib/use-auth";

function NotFoundComponent() {
  return (
    <div
      className="flex min-h-[70vh] items-center justify-center px-4 text-primary-foreground"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="max-w-md text-center">
        <p className="font-serif text-7xl text-accent md:text-9xl">404</p>
        <h1 className="mt-4 font-serif text-2xl">Page not found</h1>
        <p className="mt-2 text-sm text-primary-foreground/70">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Try again
          </Button>
          <Button asChild variant="outline">
            <a href="/">Go home</a>
          </Button>
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
      { title: "A-WIN — African Women in Investment Network" },
      {
        name: "description",
        content:
          "A-WIN empowers African women to build generational wealth through investment education, networking, and mentorship.",
      },
      { name: "author", content: "A-WIN" },
      { property: "og:title", content: "A-WIN — African Women in Investment Network" },
      {
        property: "og:description",
        content:
          "Empowering African women to build generational wealth through investment education, community, and access.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "A-WIN" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "A-WIN — African Women in Investment Network" },
      {
        name: "description",
        content:
          "A-WIN is a women's investment network and stokvel empowering African women to build generational wealth through collective investment, mentorship, and community",
      },
      {
        property: "og:description",
        content:
          "A-WIN is a women's investment network and stokvel empowering African women to build generational wealth through collective investment, mentorship, and community",
      },
      {
        name: "twitter:description",
        content:
          "A-WIN is a women's investment network and stokvel empowering African women to build generational wealth through collective investment, mentorship, and community",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/2cff2693-d322-4fd7-af36-5cc90130733e",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/2cff2693-d322-4fd7-af36-5cc90130733e",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Analytics />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LogoThemeProvider>
          <SiteLayout />
          <Toaster richColors position="top-right" />
        </LogoThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
