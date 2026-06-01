import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, ChevronRight, ChevronLeft, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "News & Updates | A-WIN" },
      {
        name: "description",
        content:
          "Announcements, investment insights and community stories from the A-WIN network.",
      },
      { property: "og:title", content: "A-WIN News & Updates" },
      {
        property: "og:description",
        content:
          "Announcements, investment insights and community stories from A-WIN.",
      },
    ],
  }),
  component: NewsPage,
});

export type Article = {
  slug: string;
  category: "Announcements" | "Investment" | "Community";
  title: string;
  date: string;
  excerpt: string;
};

export const ARTICLES: Article[] = [
  {
    slug: "5-habits-of-women-who-build-wealth",
    category: "Investment",
    title: "5 Habits of Women Who Build Lasting Wealth",
    date: "2026-05-28",
    excerpt:
      "From budgeting rituals to long-term thinking — the small daily moves that compound over decades.",
  },
  {
    slug: "cape-town-member-meetup",
    category: "Community",
    title: "Inside Our Cape Town Member Meetup",
    date: "2026-05-18",
    excerpt:
      "Highlights from a night of honest conversation about money, mentorship and momentum.",
  },
  {
    slug: "etfs-explained",
    category: "Investment",
    title: "ETFs Explained for First-Time Investors",
    date: "2026-05-02",
    excerpt:
      "A plain-language breakdown of how ETFs work and why they belong in a starter portfolio.",
  },
  {
    slug: "a-win-2026-summit-announcement",
    category: "Announcements",
    title: "A-WIN 2026 Summit Dates Announced",
    date: "2026-04-26",
    excerpt:
      "Two days, three stages and 40+ women leaders — here's what to expect at our flagship event.",
  },
  {
    slug: "new-mentorship-circle",
    category: "Announcements",
    title: "Introducing the Premium Mentorship Circle",
    date: "2026-04-14",
    excerpt:
      "Small-group mentorship sessions are now open to all Premium and Elite members.",
  },
  {
    slug: "durban-chapter-launch",
    category: "Community",
    title: "Durban Chapter Officially Launches",
    date: "2026-03-30",
    excerpt:
      "Our newest local chapter held its first event with over 80 women in attendance.",
  },
  {
    slug: "diversifying-beyond-savings",
    category: "Investment",
    title: "Diversifying Beyond Your Savings Account",
    date: "2026-03-18",
    excerpt:
      "Why letting cash sit idle is its own kind of risk — and four ways to start moving it.",
  },
  {
    slug: "member-spotlight-naledi",
    category: "Community",
    title: "Member Spotlight: Naledi's Property Journey",
    date: "2026-03-05",
    excerpt:
      "How one A-WIN member went from first-time saver to two-property owner in four years.",
  },
  {
    slug: "tax-season-checklist",
    category: "Investment",
    title: "Your Tax Season Investor Checklist",
    date: "2026-02-22",
    excerpt:
      "A simple checklist of records, returns and deductions to gather before filing.",
  },
];

const CATEGORIES = ["All", "Announcements", "Investment", "Community"] as const;
type Category = (typeof CATEGORIES)[number];

const PAGE_SIZE = 6;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function NewsPage() {
  const [category, setCategory] = useState<Category>("All");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      ARTICLES.filter((a) => category === "All" || a.category === category).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [category],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCategory = (c: Category) => {
    setCategory(c);
    setPage(1);
  };

  return (
    <>
      {/* HERO */}
      <section
        className="relative overflow-hidden px-4 py-24 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,var(--accent),transparent_55%)] opacity-25" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative mx-auto max-w-5xl animate-fade-in">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary-foreground/70"
          >
            <Link to="/" className="hover:text-accent transition-colors">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-accent">News</span>
          </nav>
          <h1 className="mt-5 font-serif">News & Updates</h1>
          <p className="mt-5 max-w-2xl text-primary-foreground/85 md:text-lg">
            Announcements, investment insights and stories from inside the A-WIN
            community.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          {/* Category tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleCategory(c)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-medium transition-colors",
                  category === c
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((a) => (
              <Card
                key={a.slug}
                className="overflow-hidden border-border/60 shadow-[var(--shadow-elegant)] hover-scale"
              >
                <div
                  className="h-44 w-full"
                  style={{ background: "var(--gradient-gold)" }}
                  aria-hidden="true"
                />
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge
                      variant="secondary"
                      className="bg-accent/15 text-accent"
                    >
                      {a.category}
                    </Badge>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatDate(a.date)}
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-lg text-foreground">
                    {a.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                    {a.excerpt}
                  </p>
                  <Link
                    to="/news/$slug"
                    params={{ slug: a.slug }}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary story-link"
                  >
                    Read More <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
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
                    className={cn(
                      "h-9 min-w-9 rounded-md border px-3 text-sm font-medium transition-colors",
                      active
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-background text-foreground hover:bg-secondary",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {n}
                  </button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
