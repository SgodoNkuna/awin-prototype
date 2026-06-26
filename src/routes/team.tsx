import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Search, Mail, Globe, MapPin, Linkedin, X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Our Members | A-WIN" },
      { name: "description", content: "Meet A-WIN members — psychologists, coaches, attorneys, accountants, property and financial specialists, medical pros, entrepreneurs and educators. Search by category or name." },
      { property: "og:title", content: "A-WIN — Our Members" },
      { property: "og:description", content: "Discover the women behind the African Women Investment Network." },
    ],
  }),
  component: MembersPage,
});

type Member = {
  id: string;
  name: string;
  title: string;
  bio: string | null;
  photo_url: string | null;
  category: string | null;
  expertise: string[] | null;
  location: string | null;
  contact_email: string | null;
  website: string | null;
  linkedin_url: string | null;
  social_url: string | null;
  portfolio_images: string[] | null;
};

const CATEGORIES = [
  "All",
  "Psychologists",
  "Coaches",
  "Attorneys",
  "Accountants",
  "Property Specialists",
  "Financial Advisors",
  "Medical Professionals",
  "Entrepreneurs",
  "Educators",
  "Other",
] as const;

function initials(name: string) {
  return name
    .replace(/\[|\]/g, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function MemberCard({ m, onOpen }: { m: Member; onOpen: (m: Member) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(m)}
      className="block h-full w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
    >
      <Card className="h-full border-border/60 bg-card shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-1 hover:shadow-[var(--shadow-gold-glow)]">
        <CardContent className="p-5">
          <div className="flex gap-4">
            {m.photo_url ? (
              <div
                className="size-20 shrink-0 rounded-full bg-cover bg-center ring-2 ring-accent/30"
                style={{ backgroundImage: `url(${m.photo_url})` }}
                aria-hidden="true"
              />
            ) : (
              <div className="size-20 shrink-0 rounded-full bg-muted flex items-center justify-center text-xl font-serif text-muted-foreground">
                {initials(m.name)}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-serif text-lg text-foreground leading-tight truncate">{m.name}</h3>
              <div className="text-xs font-medium text-accent line-clamp-2">{m.title}</div>
              {m.category && (
                <Badge variant="outline" className="mt-2 border-primary/30 text-[10px] text-primary">
                  {m.category}
                </Badge>
              )}
            </div>
          </div>
          {m.bio && <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{m.bio}</p>}
          <div className="mt-4 inline-flex items-center text-sm font-semibold text-accent">
            View Portfolio <ChevronRight className="ml-1 h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function MembersPage() {
  const [team, setTeam] = useState<Member[] | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [active, setActive] = useState<Member | null>(null);

  useEffect(() => {
    supabase
      .from("team_members")
      .select("id, name, title, bio, photo_url, category, expertise, location, contact_email, website, linkedin_url, social_url, portfolio_images")
      .eq("published", true)
      .order("order_index")
      .then(({ data }) => setTeam((data as Member[]) ?? []));
  }, []);

  const filtered = useMemo(() => {
    if (!team) return null;
    const q = query.trim().toLowerCase();
    return team.filter((m) => {
      if (!q) return true;
      const hay = [m.name, m.title, m.bio ?? "", m.location ?? "", m.category ?? "", (m.expertise ?? []).join(" ")].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [team, query]);

  const byCategory = useMemo(() => {
    const map = new Map<string, Member[]>();
    (filtered ?? []).forEach((m) => {
      const c = m.category || "Other";
      const key = (CATEGORIES as readonly string[]).includes(c) ? c : "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return map;
  }, [filtered]);

  const directoryAZ = useMemo(() => {
    const groups = new Map<string, Member[]>();
    (filtered ?? []).forEach((m) => {
      const letter = (m.name?.[0] ?? "#").toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : "#";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const activeCategories = category === "All" ? CATEGORIES.filter((c) => c !== "All" && byCategory.has(c)) : [category];

  return (
    <>
      <section
        className="relative overflow-hidden px-4 py-20 text-primary-foreground md:py-24"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/90">
            <Link to="/" className="hover:text-accent">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-accent">Our Members</span>
          </nav>
          <h1 className="mt-5 font-serif text-white">Our Members</h1>
          <p className="mt-5 max-w-2xl text-white/95 md:text-lg">
            Meet the women of A-WIN — investors, founders and trusted advisors. Search by name, browse by category, or jump to a letter.
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-background py-6">
        <div className="mx-auto max-w-6xl px-4">
          <div className="relative w-full">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, expertise, location…"
              className="pl-9 text-base"
              style={{ fontSize: "16px" }}
              aria-label="Search members"
            />
          </div>
          <div className="mt-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                  category === c
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-background text-foreground hover:bg-secondary",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          {team === null ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-56 rounded-2xl" />
              ))}
            </div>
          ) : (filtered?.length ?? 0) === 0 ? (
            <EmptyState
              title="No members yet"
              description={
                query
                  ? "Try a different search or pick another category."
                  : "Our membership directory will appear here as members join. Be the first by joining today."
              }
              action={{ label: query ? "Clear search" : "Become a Member", onClick: query ? () => setQuery("") : undefined, href: query ? undefined : "/membership" }}
            />
          ) : (
            <div className="space-y-14">
              {activeCategories.map((cat) => {
                const list = byCategory.get(cat);
                if (!list || list.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="mb-4 flex items-end justify-between gap-4">
                      <h2 className="font-serif text-2xl text-foreground">{cat}</h2>
                      <span className="text-xs uppercase tracking-widest text-muted-foreground">
                        {list.length} member{list.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <Carousel
                      opts={{ align: "start", dragFree: true }}
                      className="relative"
                      aria-label={`${cat} members carousel`}
                    >
                      <CarouselContent className="-ml-4">
                        {list.map((m) => (
                          <CarouselItem key={m.id} className="basis-[85%] pl-4 sm:basis-1/2 lg:basis-1/3">
                            <MemberCard m={m} onOpen={setActive} />
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious className="hidden sm:flex" aria-label="Previous member" />
                      <CarouselNext className="hidden sm:flex" aria-label="Next member" />
                    </Carousel>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {filtered && filtered.length > 0 && (
        <section className="border-t border-border bg-secondary/40 py-12">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="font-serif text-2xl text-foreground">Directory · A–Z</h2>
            <p className="mt-1 text-sm text-muted-foreground">Jump straight to a member by surname or first name.</p>
            <div className="mt-6 space-y-6">
              {directoryAZ.map(([letter, list]) => (
                <div key={letter}>
                  <div className="mb-2 inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-primary px-3 text-sm font-bold text-white">
                    {letter}
                  </div>
                  <ul className="ml-1 grid gap-1 sm:grid-cols-2 md:grid-cols-3">
                    {list.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => setActive(m)}
                          className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-background hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="font-medium">{m.name}</span>
                          {m.category && <span className="text-muted-foreground"> · {m.category}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent
          className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 sm:rounded-2xl
                     data-[state=open]:bottom-0 data-[state=open]:top-auto sm:data-[state=open]:top-1/2
                     data-[state=open]:translate-y-0 sm:data-[state=open]:-translate-y-1/2
                     data-[state=open]:rounded-t-2xl sm:data-[state=open]:rounded-2xl"
        >
          {active && (
            <>
              <div className="sticky top-0 z-10 mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted sm:hidden" aria-hidden="true" />
              <div className="px-6 pb-6 pt-4 sm:pt-6">
                <DialogHeader>
                  <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
                    {active.photo_url ? (
                      <div
                        className="size-28 shrink-0 rounded-full bg-cover bg-center ring-4 ring-accent/30"
                        style={{ backgroundImage: `url(${active.photo_url})` }}
                        aria-hidden="true"
                      />
                    ) : (
                      <div className="size-28 shrink-0 rounded-full bg-muted flex items-center justify-center text-3xl font-serif text-muted-foreground">
                        {initials(active.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <DialogTitle className="font-serif text-2xl text-foreground">{active.name}</DialogTitle>
                      <DialogDescription className="text-accent font-semibold">{active.title}</DialogDescription>
                      <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                        {active.category && (
                          <Badge className="bg-primary text-white">{active.category}</Badge>
                        )}
                        {active.location && (
                          <Badge variant="outline" className="border-border">
                            <MapPin className="mr-1 size-3" /> {active.location}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                {active.expertise && active.expertise.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {active.expertise.map((e) => (
                      <span key={e} className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent-deep">
                        {e}
                      </span>
                    ))}
                  </div>
                )}

                {active.bio && (
                  <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{active.bio}</p>
                )}

                {active.portfolio_images && active.portfolio_images.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-serif text-base text-foreground">Portfolio</h4>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {active.portfolio_images.map((src, i) => (
                        <a
                          key={`${src}-${i}`}
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative block aspect-square overflow-hidden rounded-lg border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Open portfolio image ${i + 1}`}
                        >
                          <img src={src} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
                  {active.linkedin_url && (
                    <Button asChild className="bg-[#0A66C2] text-white hover:bg-[#0a5dab]">
                      <a href={active.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="size-4 mr-1.5" /> LinkedIn
                      </a>
                    </Button>
                  )}
                  {active.social_url && (
                    <Button asChild variant="outline">
                      <a href={active.social_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-4 mr-1.5" /> Social
                      </a>
                    </Button>
                  )}
                  {active.contact_email && (
                    <Button asChild variant="outline">
                      <a href={`mailto:${active.contact_email}`}><Mail className="size-4 mr-1.5" /> Email</a>
                    </Button>
                  )}
                  {active.website && (
                    <Button asChild variant="outline">
                      <a href={active.website} target="_blank" rel="noopener noreferrer"><Globe className="size-4 mr-1.5" /> Website</a>
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActive(null)}
                    className="ml-auto inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" /> Close
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
