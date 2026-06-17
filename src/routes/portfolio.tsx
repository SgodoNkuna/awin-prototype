import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Instagram, Linkedin, Twitter, Globe, ExternalLink, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/portfolio")({
  component: PortfolioPage,
  head: () => ({
    meta: [
      { title: "Portfolio | A-WIN Members" },
      {
        name: "description",
        content:
          "A curated showcase of women-led businesses, funds, and ventures in the A-WIN network.",
      },
      { property: "og:title", content: "Portfolio — A-WIN Members" },
      {
        property: "og:description",
        content: "Discover the women-led businesses in the A-WIN network.",
      },
    ],
  }),
});

type SocialLinks = {
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
};

type Item = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  cover_image: string | null;
  social_links: SocialLinks;
  status: string;
  sort_order: number;
};

function PortfolioPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Item | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("portfolio_items")
      .select("id,title,slug,summary,body,cover_image,social_links,status,sort_order")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setItems((data as Item[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!items) return null;
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.summary ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <div className="container mx-auto px-4 py-20 md:px-8 md:py-28">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          A-WIN Network
        </p>
        <h1 className="mt-3 font-serif text-4xl text-foreground md:text-6xl">
          Member Portfolio
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          A curated showcase of the women-led businesses, funds, and ventures
          driving the A-WIN network forward.
        </p>
      </header>

      <div className="mx-auto mt-10 max-w-md">
        <label htmlFor="portfolio-search" className="sr-only">
          Search portfolio
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="portfolio-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members…"
            className="pl-9"
          />
        </div>
      </div>

      {filtered === null ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="mx-auto mt-16 max-w-xl text-center text-sm text-muted-foreground">
          No matching members yet. Members can opt in to be featured from their portal.
        </p>
      ) : (
        <div className="mx-auto mt-12 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <PortfolioCard key={item.id} item={item} onOpen={() => setActive(item)} />
          ))}
        </div>
      )}

      <QuickViewDialog item={active} onClose={() => setActive(null)} />
    </div>
  );
}

function PortfolioCard({ item, onOpen }: { item: Item; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
      aria-label={`Quick view: ${item.title}`}
    >
      <Card className="overflow-hidden border-border/60 shadow-[var(--shadow-elegant)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-gold-glow)]">
        <div
          className="aspect-[4/5] w-full"
          style={{
            background: item.cover_image
              ? `center/cover no-repeat url(${item.cover_image})`
              : "var(--gradient-hero)",
          }}
          aria-hidden="true"
        />
        <CardContent className="p-5">
          <h3 className="font-serif text-lg text-foreground">{item.title}</h3>
          {item.summary && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
              {item.summary}
            </p>
          )}
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
            Quick view <ExternalLink className="size-3" />
          </span>
        </CardContent>
      </Card>
    </button>
  );
}

function QuickViewDialog({ item, onClose }: { item: Item | null; onClose: () => void }) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        {item && (
          <>
            <div
              className="-mx-6 -mt-6 mb-4 aspect-[16/9] w-[calc(100%+3rem)]"
              style={{
                background: item.cover_image
                  ? `center/cover no-repeat url(${item.cover_image})`
                  : "var(--gradient-hero)",
              }}
              aria-hidden="true"
            />
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">{item.title}</DialogTitle>
              {item.summary && (
                <DialogDescription>{item.summary}</DialogDescription>
              )}
            </DialogHeader>
            {item.body && (
              <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-line">
                {item.body}
              </p>
            )}
            <SocialRow links={item.social_links} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SocialRow({ links }: { links: SocialLinks }) {
  const entries: Array<{ key: keyof SocialLinks; label: string; Icon: typeof Instagram }> = [
    { key: "website", label: "Website", Icon: Globe },
    { key: "instagram", label: "Instagram", Icon: Instagram },
    { key: "linkedin", label: "LinkedIn", Icon: Linkedin },
    { key: "twitter", label: "Twitter", Icon: Twitter },
  ];
  const active = entries.filter((e) => !!links[e.key]);
  if (active.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2 pt-3 border-t border-border/60">
      {active.map(({ key, label, Icon }) => (
        <Button
          key={key}
          asChild
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <a href={links[key]} target="_blank" rel="noopener noreferrer">
            <Icon className="size-3.5" /> {label}
          </a>
        </Button>
      ))}
    </div>
  );
}
