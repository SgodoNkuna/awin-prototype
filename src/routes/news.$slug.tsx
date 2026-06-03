import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Calendar, ChevronRight, ChevronLeft, User, Share2, Facebook, Twitter, Linkedin, Link as LinkIcon, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/news/$slug")({
  component: ArticlePage,
  head: ({ params }) => ({
    meta: [
      { title: `Article | A-WIN News` },
      { name: "description", content: `Read the latest from A-WIN.` },
      { property: "og:title", content: `A-WIN News: ${params.slug}` },
    ],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-serif">Article not found</h1>
      <Button asChild className="mt-6"><Link to="/news">Back to News</Link></Button>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center" role="alert">
      <h1 className="font-serif">Something went wrong</h1>
      <p className="mt-3 text-muted-foreground">{error.message}</p>
    </div>
  ),
});

type Article = {
  id: string;
  title: string;
  slug: string;
  category: string;
  cover_image: string | null;
  excerpt: string | null;
  content: string;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" });
}

function ArticlePage() {
  const { slug } = Route.useParams();
  const [article, setArticle] = useState<Article | null | undefined>(undefined);

  useEffect(() => {
    supabase
      .from("news_articles")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle()
      .then(({ data }) => setArticle((data as Article) ?? null));
  }, [slug]);

  if (article === undefined) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }
  if (article === null) throw notFound();

  const shareUrl = typeof window !== "undefined" ? window.location.href : `/news/${article.slug}`;
  const url = encodeURIComponent(shareUrl);
  const shareText = encodeURIComponent(article.title);

  const copyLink = () => navigator.clipboard?.writeText(shareUrl);

  return (
    <>
      <section className="relative overflow-hidden px-4 py-20 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,var(--accent),transparent_55%)] opacity-25" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative mx-auto max-w-3xl animate-fade-in">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary-foreground/70">
            <Link to="/" className="hover:text-accent transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/news" className="hover:text-accent transition-colors">News</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-accent">{article.category}</span>
          </nav>
          <Badge className="mt-5 bg-accent text-accent-foreground">{article.category}</Badge>
          <h1 className="mt-4 font-serif">{article.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-primary-foreground/80">
            <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" /> {article.author_name ?? "A-WIN Editorial"}</span>
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {formatDate(article.published_at ?? article.created_at)}</span>
          </div>
        </div>
      </section>

      <article className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="aspect-[16/9] w-full rounded-2xl shadow-[var(--shadow-elegant)] bg-cover bg-center" style={{ background: article.cover_image ? `url(${article.cover_image}) center/cover` : "var(--gradient-gold)" }} />
          {article.excerpt && (
            <p className="mt-8 text-lg leading-relaxed text-muted-foreground">{article.excerpt}</p>
          )}
          <div className="prose prose-neutral mt-8 max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: article.content }} />

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Share2 className="h-4 w-4" /> Share this article
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="icon" aria-label="Share on Twitter">
                <a href={`https://twitter.com/intent/tweet?url=${url}&text=${shareText}`} target="_blank" rel="noopener noreferrer"><Twitter className="h-4 w-4" /></a>
              </Button>
              <Button asChild variant="outline" size="icon" aria-label="Share on Facebook">
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${url}`} target="_blank" rel="noopener noreferrer"><Facebook className="h-4 w-4" /></a>
              </Button>
              <Button asChild variant="outline" size="icon" aria-label="Share on LinkedIn">
                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${url}`} target="_blank" rel="noopener noreferrer"><Linkedin className="h-4 w-4" /></a>
              </Button>
              <Button variant="outline" size="icon" onClick={copyLink} aria-label="Copy link"><LinkIcon className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="mt-10">
            <Button asChild variant="ghost">
              <Link to="/news"><ChevronLeft className="mr-1 h-4 w-4" /> Back to News</Link>
            </Button>
          </div>
        </div>
      </article>
    </>
  );
}
