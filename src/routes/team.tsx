import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Search, Mail, Globe, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Members & Leadership | A-WIN" },
      {
        name: "description",
        content: "Search the African Women Investment Network — founders, members, expertise and locations.",
      },
      { property: "og:title", content: "A-WIN Members & Leadership" },
      { property: "og:description", content: "Founders, members and advisors building A-WIN." },
    ],
  }),
  component: TeamPage,
});

type Member = {
  id: string;
  name: string;
  title: string;
  bio: string | null;
  photo_url: string | null;
  order_index: number | null;
  category: string | null;
  expertise: string[] | null;
  location: string | null;
  contact_email: string | null;
  website: string | null;
};

function initials(name: string) {
  return name
    .replace(/\[|\]/g, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function TeamPage() {
  const [team, setTeam] = useState<Member[] | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [active, setActive] = useState<Member | null>(null);

  useEffect(() => {
    supabase
      .from("team_members")
      .select("id, name, title, bio, photo_url, order_index, category, expertise, location, contact_email, website")
      .eq("published", true)
      .order("order_index")
      .then(({ data }) => setTeam((data as Member[]) ?? []));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    (team ?? []).forEach((m) => m.category && set.add(m.category));
    return ["All", ...Array.from(set).sort()];
  }, [team]);

  const filtered = useMemo(() => {
    if (!team) return null;
    const q = query.trim().toLowerCase();
    return team.filter((m) => {
      if (category !== "All" && m.category !== category) return false;
      if (!q) return true;
      const hay = [
        m.name,
        m.title,
        m.bio ?? "",
        m.location ?? "",
        m.category ?? "",
        (m.expertise ?? []).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [team, query, category]);

  return (
    <>
      <section
        className="relative overflow-hidden px-4 py-24 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary-foreground/85">
            <Link to="/" className="hover:text-accent">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-accent">Members & Leadership</span>
          </nav>
          <h1 className="mt-5 font-serif">Members & Leadership</h1>
          <p className="mt-5 max-w-2xl text-primary-foreground md:text-lg">
            The founders, members and advisors who steward A-WIN. Search by name, expertise or category to find a member who can help.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          {/* Search + categories */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search members, expertise, location…"
                className="pl-9"
                aria-label="Search members"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-medium transition-colors border",
                    category === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="mt-8">
            {team === null ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-72 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : (filtered?.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <h2 className="font-serif text-2xl">No matching members</h2>
                  <p className="text-muted-foreground mt-3">Try a different search or category.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered!.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActive(m)}
                    className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
                  >
                    <Card className="h-full border-border/60 shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-1 hover:shadow-[var(--shadow-gold-glow)]">
                      <CardContent className="p-6">
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
                            <h3 className="font-serif text-lg text-foreground leading-tight">{m.name}</h3>
                            <div className="text-xs font-medium text-accent line-clamp-2">{m.title}</div>
                            {m.location && (
                              <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                                <MapPin className="size-3" /> {m.location}
                              </div>
                            )}
                          </div>
                        </div>
                        {m.category && (
                          <Badge variant="outline" className="mt-4 text-[10px]">{m.category}</Badge>
                        )}
                        {m.expertise && m.expertise.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {m.expertise.slice(0, 3).map((e) => (
                              <span key={e} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">{e}</span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <div className="flex gap-4">
                  {active.photo_url ? (
                    <div
                      className="size-24 shrink-0 rounded-full bg-cover bg-center ring-2 ring-accent/40"
                      style={{ backgroundImage: `url(${active.photo_url})` }}
                      aria-hidden="true"
                    />
                  ) : (
                    <div className="size-24 shrink-0 rounded-full bg-muted flex items-center justify-center text-2xl font-serif text-muted-foreground">
                      {initials(active.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <DialogTitle className="font-serif text-2xl text-left">{active.name}</DialogTitle>
                    <DialogDescription className="text-accent font-medium text-left">{active.title}</DialogDescription>
                    {active.location && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" /> {active.location}
                      </div>
                    )}
                  </div>
                </div>
              </DialogHeader>
              {active.expertise && active.expertise.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {active.expertise.map((e) => (
                    <span key={e} className="rounded-full bg-accent/10 text-accent px-2.5 py-1 text-xs font-medium">{e}</span>
                  ))}
                </div>
              )}
              {active.bio && (
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{active.bio}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                {active.contact_email && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`mailto:${active.contact_email}`}><Mail className="size-3.5 mr-1.5" /> Email</a>
                  </Button>
                )}
                {active.website && (
                  <Button asChild variant="outline" size="sm">
                    <a href={active.website} target="_blank" rel="noopener noreferrer"><Globe className="size-3.5 mr-1.5" /> Website</a>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
