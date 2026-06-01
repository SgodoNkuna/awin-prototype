import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Calendar,
  ChevronRight,
  ChevronLeft,
  User,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Link as LinkIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ARTICLES } from "./news";

export const Route = createFileRoute("/news/$slug")({
  loader: ({ params }) => {
    const article = ARTICLES.find((a) => a.slug === params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData }) => {
    const a = loaderData?.article;
    const title = a ? `${a.title} | A-WIN News` : "Article | A-WIN News";
    const description = a?.excerpt ?? "Read the latest from the A-WIN network.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-serif">Article not found</h1>
      <p className="mt-3 text-muted-foreground">
        The article you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild className="mt-6">
        <Link to="/news">Back to News</Link>
      </Button>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center" role="alert">
      <h1 className="font-serif">Something went wrong</h1>
      <p className="mt-3 text-muted-foreground">{error.message}</p>
    </div>
  ),
  component: ArticlePage,
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function ArticlePage() {
  const { article } = Route.useLoaderData();
  const shareUrl =
    typeof window !== "undefined" ? window.location.href : `/news/${article.slug}`;
  const shareText = encodeURIComponent(article.title);
  const url = encodeURIComponent(shareUrl);

  const copyLink = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard?.writeText(shareUrl);
    }
  };

  return (
    <>
      {/* HERO */}
      <section
        className="relative overflow-hidden px-4 py-20 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,var(--accent),transparent_55%)] opacity-25" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative mx-auto max-w-3xl animate-fade-in">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary-foreground/70"
          >
            <Link to="/" className="hover:text-accent transition-colors">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/news" className="hover:text-accent transition-colors">
              News
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-accent">{article.category}</span>
          </nav>
          <Badge className="mt-5 bg-accent text-accent-foreground">
            {article.category}
          </Badge>
          <h1 className="mt-4 font-serif">{article.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-primary-foreground/80">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4" /> A-WIN Editorial
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> {formatDate(article.date)}
            </span>
          </div>
        </div>
      </section>

      {/* BODY */}
      <article className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div
            className="aspect-[16/9] w-full rounded-2xl shadow-[var(--shadow-elegant)]"
            style={{ background: "var(--gradient-gold)" }}
            aria-hidden="true"
          />

          <div className="prose prose-neutral mt-10 max-w-none text-foreground">
            <p className="text-lg leading-relaxed text-muted-foreground">
              {article.excerpt}
            </p>
            <p className="mt-6 leading-relaxed text-foreground/85">
              This is placeholder body copy for the article. Full editorial
              content will be loaded from the news database once the admin
              dashboard is connected. Members of the A-WIN editorial team will
              be able to draft, schedule and publish articles directly.
            </p>
            <h2 className="mt-10 font-serif text-foreground">Why it matters</h2>
            <p className="mt-4 leading-relaxed text-foreground/85">
              A-WIN's editorial pillars — Investment, Community and
              Announcements — exist to keep members informed, inspired and
              equipped. Every article is reviewed by the education team before
              publishing.
            </p>
            <h2 className="mt-10 font-serif text-foreground">What's next</h2>
            <p className="mt-4 leading-relaxed text-foreground/85">
              Watch this space for member events, upcoming masterclasses and
              deeper dives into the topics that matter most to women investors
              across Africa.
            </p>
          </div>

          {/* Share */}
          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Share2 className="h-4 w-4" /> Share this article
            </div>
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="icon"
                aria-label="Share on Twitter"
              >
                <a
                  href={`https://twitter.com/intent/tweet?url=${url}&text=${shareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="icon"
                aria-label="Share on Facebook"
              >
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="icon"
                aria-label="Share on LinkedIn"
              >
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={copyLink}
                aria-label="Copy link"
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-10">
            <Button asChild variant="ghost">
              <Link to="/news">
                <ChevronLeft className="mr-1 h-4 w-4" /> Back to News
              </Link>
            </Button>
          </div>
        </div>
      </article>
    </>
  );
}
