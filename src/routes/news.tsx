import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, ChevronRight, ChevronLeft, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "News & Updates | A-WIN" },
      { name: "description", content: "Announcements, investment insights and community stories from A-WIN." },
      { property: "og:title", content: "A-WIN News & Updates" },
      { property: "og:description", content: "Announcements, investment insights and community stories from A-WIN." },
    ],
  }),
  component: NewsPage,
});

export type Article = {
  id: string;
  slug: string;
  category: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  published_at: string | null;
  created_at: string;
};

const CATEGORIES = ["All", "Announcements", "Investment", "Community"] as const;
type Category = (typeof CATEGORIES)[number];
const PAGE_SIZE = 6;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function NewsPage() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [category, setCategory] = useState<Category>("All");
  const [page, setPage] = useState(1);

  useEffect(() => {
    supabase
      .from("news_articles")
      .select("id, slug, category, title, excerpt, cover_image, published_at, created_at")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .then(({ data }) => setArticles((data as Article[]) ?? []));
  }, []);

  const filtered = useMemo(
    () => (articles ?? []).filter((a) => category === "All" || a.category === category),
    [articles, category],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <section className="relative overflow-hidden px-4 py-24 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,var(--accent),transparent_55%)] opacity-25" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative mx-auto max-w-5xl animate-fade-in">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary-foreground/70">
            <Link to="/" className="hover:text-accent transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-accent">News</span>
          </nav>
          <h1 className="mt-5 font-serif">News & Updates</h1>
          <p className="mt-5 max-w-2xl text-primary-foreground/85 md:text-lg">
            Announcements, investment insights and stories from inside the A-WIN community.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setCategory(c); setPage(1); }}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-medium transition-colors",
                  category === c ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {articles === null ? (
            <div className="mt-16 flex justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : pageItems.length === 0 ? (
            <div className="mt-16 text-center text-muted-foreground">No articles in this category yet.</div>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((a) => (
                <Card key={a.id} className="overflow-hidden border-border/60 shadow-[var(--shadow-elegant)] hover-scale">
                  <div className="h-44 w-full bg-cover bg-center" style={{ background: a.cover_image ? `url(${a.cover_image}) center/cover` : "var(--gradient-gold)" }} aria-hidden="true" />
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="bg-accent/15 text-accent">{a.category}</Badge>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDate(a.published_at ?? a.created_at)}
                      </span>
                    </div>
                    <h3 className="mt-3 font-serif text-lg text-foreground">{a.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">{a.excerpt}</p>
                    <Link to="/news/$slug" params={{ slug: a.slug }} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary story-link">
                      Read More <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const n = i + 1;
                const active = n === page;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={cn("h-9 min-w-9 rounded-md border px-3 text-sm font-medium transition-colors",
                      active ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background text-foreground hover:bg-secondary")}
                    aria-current={active ? "page" : undefined}
                  >
                    {n}
                  </button>
                );
              })}
              <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
