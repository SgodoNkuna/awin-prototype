import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, MapPin, ChevronRight, CalendarX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events | A-WIN" },
      {
        name: "description",
        content:
          "Browse upcoming and past A-WIN events: masterclasses, summits, meetups and member-only workshops.",
      },
      { property: "og:title", content: "A-WIN Events" },
      {
        property: "og:description",
        content:
          "Masterclasses, summits and meetups for women investors across Africa.",
      },
    ],
  }),
  component: EventsPage,
});

type EventItem = {
  id: string;
  title: string;
  description: string;
  date: string; // ISO
  location: string;
};

// Placeholder data — wire to Supabase 'events' table later.
const PLACEHOLDER_EVENTS: EventItem[] = [
  {
    id: "1",
    title: "Investment 101 Masterclass",
    description:
      "Foundations for first-time investors: budgeting, brokers and building your first portfolio.",
    date: "2026-06-12T18:00:00Z",
    location: "Johannesburg",
  },
  {
    id: "2",
    title: "Women in Wealth Summit",
    description:
      "Our flagship two-day summit with keynotes, panels and member meetups.",
    date: "2026-06-24T09:00:00Z",
    location: "Cape Town",
  },
  {
    id: "3",
    title: "Property Portfolio Workshop",
    description:
      "Hands-on session on financing, vetting and managing your first property investment.",
    date: "2026-07-08T17:30:00Z",
    location: "Durban",
  },
  {
    id: "4",
    title: "Stock Market Bootcamp",
    description:
      "A four-week online bootcamp covering equities, ETFs and reading the market.",
    date: "2026-07-22T18:00:00Z",
    location: "Online",
  },
  {
    id: "5",
    title: "Q1 Member Meetup",
    description: "Quarterly community gathering for members across all tiers.",
    date: "2026-03-15T18:00:00Z",
    location: "Sandton",
  },
  {
    id: "6",
    title: "Crypto Demystified",
    description:
      "A clear-eyed conversation on digital assets, risk and where they fit in a portfolio.",
    date: "2026-02-20T18:00:00Z",
    location: "Online",
  },
];

type Filter = "all" | "upcoming" | "past";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateBadge(iso: string) {
  const d = new Date(iso);
  return {
    d: d.toLocaleDateString("en-ZA", { day: "2-digit" }),
    m: d.toLocaleDateString("en-ZA", { month: "short" }).toUpperCase(),
  };
}

function EventsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const now = Date.now();

  const events = PLACEHOLDER_EVENTS.filter((e) => {
    if (filter === "upcoming") return new Date(e.date).getTime() >= now;
    if (filter === "past") return new Date(e.date).getTime() < now;
    return true;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <>
      {/* HERO */}
      <section
        className="relative overflow-hidden px-4 py-24 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,var(--accent),transparent_55%)] opacity-25" />
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
            <span className="text-accent">Events</span>
          </nav>
          <h1 className="mt-5 font-serif">Events</h1>
          <p className="mt-5 max-w-2xl text-primary-foreground/85 md:text-lg">
            Masterclasses, summits and member meetups designed to move you
            forward as an investor.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          {/* Filter tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-medium transition-colors",
                  filter === f.id
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {events.length === 0 ? (
            <div className="mt-16 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-16 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
                <CalendarX className="h-7 w-7" />
              </div>
              <h3 className="mt-5 font-serif text-foreground">
                No events scheduled — check back soon
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                New events are added regularly. Follow us or join the community
                to be the first to hear.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => {
                const db = dateBadge(e.date);
                const isPast = new Date(e.date).getTime() < now;
                return (
                  <Card
                    key={e.id}
                    className="overflow-hidden border-border/60 shadow-[var(--shadow-elegant)] hover-scale"
                  >
                    <div
                      className="relative h-44 w-full"
                      style={{ background: "var(--gradient-hero)" }}
                    >
                      <div className="absolute left-4 top-4 rounded-lg bg-accent px-3 py-1.5 text-center text-accent-foreground shadow-md">
                        <div className="font-serif text-xl leading-none">
                          {db.d}
                        </div>
                        <div className="text-[10px] font-semibold tracking-widest">
                          {db.m}
                        </div>
                      </div>
                      {isPast && (
                        <Badge className="absolute right-4 top-4 bg-background/80 text-foreground">
                          Past
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <h3 className="font-serif text-lg text-foreground">
                        {e.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> {formatDate(e.date)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {e.location}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                        {e.description}
                      </p>
                      <Button
                        className={cn(
                          "mt-5 w-full",
                          !isPast &&
                            "bg-accent text-accent-foreground hover:bg-accent/90",
                        )}
                        variant={isPast ? "outline" : "default"}
                        disabled={isPast}
                      >
                        {isPast ? "Event Ended" : "Register"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
