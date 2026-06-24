import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team & Leadership | A-WIN" },
      {
        name: "description",
        content: "Meet the women leading the African Women Investment Network — founders, committee and advisors.",
      },
      { property: "og:title", content: "A-WIN Team & Leadership" },
      { property: "og:description", content: "Founders, committee and advisors building A-WIN." },
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
  useEffect(() => {
    supabase
      .from("team_members")
      .select("id, name, title, bio, photo_url, order_index")
      .eq("published", true)
      .order("order_index")
      .then(({ data }) => setTeam((data as Member[]) ?? []));
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
            <span className="text-accent">Team</span>
          </nav>
          <h1 className="mt-5 font-serif">Team & Leadership</h1>
          <p className="mt-5 max-w-2xl text-primary-foreground/85 md:text-lg">
            The founders, committee members and advisors who steward A-WIN.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          {team === null ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-72 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : team.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <h2 className="font-serif text-2xl">Team profiles coming soon</h2>
                <p className="text-muted-foreground mt-3">
                  We're collecting headshots and bios. Profiles will appear here as they're approved.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((m) => (
                <Card key={m.id} className="border-border/60 text-center shadow-[var(--shadow-elegant)] hover-scale">
                  <CardContent className="p-7">
                    {m.photo_url ? (
                      <div
                        className="mx-auto h-28 w-28 rounded-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${m.photo_url})` }}
                        aria-hidden="true"
                      />
                    ) : (
                      <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-muted text-2xl font-serif text-muted-foreground">
                        {initials(m.name)}
                      </div>
                    )}
                    <h3 className="mt-5 font-serif text-lg text-foreground">{m.name}</h3>
                    <div className="text-sm font-medium text-accent">{m.title}</div>
                    {m.bio && (
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{m.bio}</p>
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
