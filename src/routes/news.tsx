import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Calendar, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { WCWGallery } from "@/components/site/WCWGallery";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "News & Gallery | A-WIN" },
      { name: "description", content: "Stories, insights and event photography from the African Women Investment Network." },
      { property: "og:title", content: "A-WIN News & Gallery" },
      { property: "og:description", content: "Member stories, market insights and the Women Creating Wealth Summit gallery." },
    ],
  }),
  component: NewsAndGalleryPage,
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

function NewsAndGalleryPage() {
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
        className="relative overflow-hidden px-4 py-20 text-primary-foreground md:py-24"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-primary-deep/10" />
        <div className="relative mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/90">
            <Link to="/" className="hover:text-accent">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-accent">News &amp; Gallery</span>
          </nav>
          <h1 className="mt-5 font-serif text-white">News &amp; Gallery</h1>
          <p className="mt-5 max-w-2xl text-white/95 md:text-lg">
            Member stories, investment insights and photography from A-WIN events.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          <Tabs defaultValue="news" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="news">News &amp; Insights</TabsTrigger>
              <TabsTrigger value="gallery">Event Gallery</TabsTrigger>
            </TabsList>

            <TabsContent value="news" className="mt-8">
              {articles === null ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
                </div>
              ) : articles.length === 0 ? (
                <EmptyState
                  title="First stories coming soon"
                  description="Our editorial team is preparing the first articles. Check back shortly."
                />
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {articles.map((a) => (
                    <Card key={a.id} className="overflow-hidden border-border/60 transition-transform hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]">
                      <div
                        className="aspect-video w-full bg-cover bg-center"
                        style={{ background: a.cover_image ? `url(${a.cover_image}) center/cover` : "var(--gradient-hero)" }}
                        aria-hidden="true"
                      />
                      <CardContent className="p-6">
                        {a.category && <Badge variant="outline" className="mb-3">{a.category}</Badge>}
                        <h3 className="font-serif text-xl text-foreground">{a.title}</h3>
                        {a.excerpt && <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{a.excerpt}</p>}
                        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {a.published_at ? new Date(a.published_at).toLocaleDateString() : "—"}
                          </div>
                          {a.author_name && <span>{a.author_name}</span>}
                        </div>
                        {a.slug && (
                          <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                            Read more <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="gallery" className="mt-8">
              <WCWGallery />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </>
  );
}
