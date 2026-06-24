import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Calendar, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "News & Insights | A-WIN" },
      {
        name: "description",
        content: "Latest stories, investment insights and announcements from the African Women Investment Network.",
      },
      { property: "og:title", content: "A-WIN News & Insights" },
      { property: "og:description", content: "Member stories, market insights and announcements." },
    ],
  }),
  component: NewsPage,
});

type Article = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  cover_image: string | null;
  category: string | null;
  published_at: string | null;
  author_name: string | null;
};

function NewsPage() {
  const [articles, setArticles] = useState<Article[] | null>(null);

  useEffect(() => {
    supabase
      .from("news_articles")
      .select("id, title, slug, excerpt, cover_image, category, published_at, author_name")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .then(({ data }) => setArticles((data as Article[]) ?? []));
  }, []);

  return (
    <>
      <section
        className="relative overflow-hidden px-4 py-24 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary-foreground/70">
            <Link to="/" className="hover:text-accent">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-accent">News</span>
          </nav>
          <h1 className="mt-5 font-serif">News & Insights</h1>
          <p className="mt-5 max-w-2xl text-primary-foreground/85 md:text-lg">
            Member stories, investment insights and announcements from the A-WIN community.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          {articles === null ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-72 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <h2 className="font-serif text-2xl">First stories coming soon</h2>
                <p className="text-muted-foreground mt-3">
                  Our editorial team is preparing the first batch of articles. Check back shortly.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((a) => (
                <Card key={a.id} className="overflow-hidden border-border/60 hover-scale">
                  <div
                    className="aspect-video w-full bg-cover bg-center"
                    style={{
                      background: a.cover_image_url
                        ? `url(${a.cover_image_url}) center/cover`
                        : "var(--gradient-hero)",
                    }}
                    aria-hidden="true"
                  />
                  <CardContent className="p-6">
                    {a.category && <Badge variant="outline" className="mb-3">{a.category}</Badge>}
                    <h3 className="font-serif text-xl text-foreground">{a.title}</h3>
                    {a.excerpt && (
                      <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{a.excerpt}</p>
                    )}
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {a.published_at ? new Date(a.published_at).toLocaleDateString() : "—"}
                      </div>
                      {a.author_name && <span>{a.author_name}</span>}
                    </div>
                    {a.slug && (
                      <div className="mt-4 text-sm font-medium text-accent inline-flex items-center gap-1">
                        Read more <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
