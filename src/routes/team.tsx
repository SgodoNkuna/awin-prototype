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
  profile_card_url: string | null;
  category: string | null;
  expertise: string[] | null;
  location: string | null;
  contact_email: string | null;
  website: string | null;
  linkedin_url: string | null;
  social_url: string | null;
  portfolio_images: string[] | null;
  committee: string | null;
  committee_position: string | null;
  committee_order: number | null;
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
  "Marketing & PR",
  "Technology & Digital",
  "Creatives & Designers",
  "Consultants",
  "Healthcare & Wellness",
  "Hospitality & Events",
  "Retail & Fashion",
  "Construction & Trades",
  "Non-Profit & Community",
  "Students",
  "Other",
] as const;

const COMMITTEES = [
  { key: "main", label: "Main Committee" },
  { key: "property", label: "Property Investment Committee" },
  { key: "website", label: "Website Committee" },
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
  const previewSrc = m.profile_card_url || m.photo_url;
  return (
    <button
      type="button"
      onClick={() => onOpen(m)}
      className="group block h-full w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
    >
      <Card className="h-full overflow-hidden border-border/60 bg-card shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-1 hover:shadow-[var(--shadow-gold-glow)] flex flex-col">
        {previewSrc ? (
          <div
            className="aspect-[3/4] w-full bg-cover bg-center bg-secondary"
            style={{ backgroundImage: `url(${previewSrc})` }}
            aria-hidden="true"
          />
        ) : (
          <div className="aspect-[3/4] w-full bg-accent/15 flex items-center justify-center">
            <span className="font-serif text-5xl text-accent-deep">{initials(m.name)}</span>
          </div>
        )}
        <CardContent className="p-4 flex flex-col gap-2 flex-1">
          <h3 className="font-serif text-lg font-bold text-foreground leading-tight">{m.name}</h3>
          {m.category && (
            <Badge className="self-start bg-accent text-accent-foreground text-[11px]">{m.category}</Badge>
          )}
          <div className="mt-auto pt-2">
            <span className="inline-flex items-center text-xs font-semibold text-accent-deep">
              View Profile <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function CommitteeCard({ m, onOpen }: { m: Member; onOpen: (m: Member) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(m)}
      className="flex w-44 shrink-0 flex-col items-center rounded-2xl border border-border/60 bg-card p-4 text-center shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-52"
    >
      {m.photo_url ? (
        <div
          className="size-20 rounded-full bg-cover bg-center ring-2 ring-accent/40 sm:size-24"
          style={{ backgroundImage: `url(${m.photo_url})` }}
          aria-hidden="true"
        />
      ) : (
        <div className="size-20 rounded-full bg-muted flex items-center justify-center text-xl font-serif text-muted-foreground sm:size-24">
          {initials(m.name)}
        </div>
      )}
      <div className="mt-3 font-serif text-base font-semibold text-foreground leading-tight">{m.name || "[Name]"}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wider text-accent">
        {m.committee_position || "[Position]"}
      </div>
    </button>
  );
}

export function MembersPage() {
  const [team, setTeam] = useState<Member[] | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [active, setActive] = useState<Member | null>(null);

  useEffect(() => {
    supabase
      .from("team_members")
      .select("id, name, title, bio, photo_url, profile_card_url, category, expertise, location, contact_email, website, linkedin_url, social_url, portfolio_images, committee, committee_position, committee_order" as any)
      .eq("published", true)
      .order("order_index")
      .then(({ data }) => setTeam(((data ?? []) as unknown) as Member[]));
  }, []);

  // General (non-committee) members feed search + category filter + A–Z directory.
  const generalMembers = useMemo(
    () => (team ?? []).filter((m) => !m.committee),
    [team],
  );

  const committeeMembers = useMemo(() => {
    const map = new Map<string, Member[]>();
    (team ?? []).forEach((m) => {
      if (!m.committee) return;
      if (!map.has(m.committee)) map.set(m.committee, []);
      map.get(m.committee)!.push(m);
    });
    map.forEach((list) =>
      list.sort((a, b) => (a.committee_order ?? 0) - (b.committee_order ?? 0)),
    );
    return map;
  }, [team]);

  const filtered = useMemo(() => {
    if (!team) return null;
    const q = query.trim().toLowerCase();
    return generalMembers.filter((m) => {
      if (!q) return true;
      const hay = [m.name, m.title, m.bio ?? "", m.location ?? "", m.category ?? "", (m.expertise ?? []).join(" ")].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [team, generalMembers, query]);

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
            A-WIN brings together women from all walks of life, united by one goal:
            building wealth together. Whether you are a professional, an entrepreneur,
            a student, or simply someone who wants to change their relationship with
            money, you belong here.
          </p>
        </div>
      </section>

      {/* Pinned committee sections */}
      <section className="border-b border-border bg-secondary/30 py-10">
        <div className="mx-auto max-w-6xl space-y-10 px-4">
          {COMMITTEES.map((c) => {
            const list = committeeMembers.get(c.key) ?? [];
            const cards = list.length > 0 ? list : Array.from({ length: 3 }).map((_, i) => ({
              id: `placeholder-${c.key}-${i}`,
              name: "",
              title: "",
              bio: null, photo_url: null, profile_card_url: null, category: null, expertise: null, location: null,
              contact_email: null, website: null, linkedin_url: null, social_url: null,
              portfolio_images: null, committee: c.key, committee_position: "",
              committee_order: i,
            } as Member));
            return (
              <div key={c.key}>
                <div className="mb-4 flex items-end justify-between gap-3">
                  <h2 className="font-serif text-xl text-foreground md:text-2xl">{c.label}</h2>
                  {list.length === 0 && (
                    <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Placeholder · admin to confirm
                    </span>
                  )}
                </div>
                <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:thin]">
                  {cards.map((m) =>
                    list.length > 0 ? (
                      <CommitteeCard key={m.id} m={m} onOpen={setActive} />
                    ) : (
                      <div key={m.id} className="flex w-44 shrink-0 flex-col items-center rounded-2xl border border-dashed border-border bg-card p-4 text-center sm:w-52">
                        <div className="size-20 rounded-full bg-muted sm:size-24" aria-hidden="true" />
                        <div className="mt-3 font-serif text-base text-muted-foreground">[Name]</div>
                        <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">[Position]</div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-b border-border bg-background py-8">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-serif text-2xl text-foreground">Our Members</h2>
          <h3 className="mt-2 font-serif text-lg text-foreground">Find a Member by Service</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Some of our members offer professional services. Use the filter below to connect with them.
          </p>

          <div className="relative mt-5 w-full">
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
                          <CarouselItem key={m.id} className="basis-[85%] pl-4 sm:basis-1/2 lg:basis-1/2 xl:basis-[40%]">
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
              <div className="px-4 pb-6 pt-4 sm:px-6 sm:pt-6">
                <DialogHeader className="text-left">
                  <DialogTitle className="font-serif text-2xl text-foreground">{active.name}</DialogTitle>
                  <DialogDescription className="flex flex-wrap gap-2 pt-2">
                    {active.category && (
                      <Badge className="bg-accent text-accent-foreground">{active.category}</Badge>
                    )}
                    {active.committee_position && (
                      <Badge variant="outline">{active.committee_position}</Badge>
                    )}
                  </DialogDescription>
                </DialogHeader>

                {/* IMAGE-FIRST: full profile card if uploaded */}
                {active.profile_card_url ? (
                  <div className="mt-4 overflow-hidden rounded-xl border border-border bg-secondary">
                    <img
                      src={active.profile_card_url}
                      alt={`${active.name} profile card`}
                      className="block w-full h-auto"
                      loading="lazy"
                    />
                  </div>
                ) : active.photo_url ? (
                  <div className="mt-4 overflow-hidden rounded-xl border border-border bg-secondary">
                    <img
                      src={active.photo_url}
                      alt={active.name}
                      className="block w-full h-auto max-h-[70vh] object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-border bg-secondary/40 p-8 text-center">
                    <div className="mx-auto size-24 rounded-full bg-accent/15 flex items-center justify-center font-serif text-3xl text-accent-deep">
                      {initials(active.name)}
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      This member has not yet uploaded a profile card.
                    </p>
                  </div>
                )}

                {active.bio && (
                  <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{active.bio}</p>
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
