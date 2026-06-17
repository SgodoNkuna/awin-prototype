import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  MapPin,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogoHero } from "@/components/site/LogoHero";
import { PortfolioCarousel } from "@/components/site/PortfolioCarousel";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "A-WIN | African Women in Investment Network" },
      {
        name: "description",
        content:
          "A-WIN is a community of women building wealth, knowledge, and legacy together through investment, education, and networking.",
      },
      { property: "og:title", content: "A-WIN | African Women in Investment Network" },
      {
        property: "og:description",
        content:
          "Join a community of women building wealth, knowledge, and legacy together.",
      },
    ],
  }),
  component: Index,
});

const DEFAULT_STATS = {
  members: "Growing Community",
  events: "Regular Events",
  years: "Est. 2024",
};

function useHomepageStats() {
  const [stats, setStats] = useState(DEFAULT_STATS);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "stats")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data?.value) return;
        const v = data.value as Partial<typeof DEFAULT_STATS>;
        setStats({
          members: v.members || DEFAULT_STATS.members,
          events: v.events || DEFAULT_STATS.events,
          years: v.years || DEFAULT_STATS.years,
        });
      });
    return () => { cancelled = true; };
  }, []);
  return stats;
}

const tiers = [
  {
    name: "Starter",
    price: "R250",
    cadence: "/month",
    benefits: [
      "Access to community forum",
      "Monthly newsletter",
      "Beginner investment guides",
    ],
    featured: false,
  },
  {
    name: "Premium",
    price: "R650",
    cadence: "/month",
    benefits: [
      "Everything in Starter",
      "Live investment masterclasses",
      "Member-only events & meetups",
      "1:1 mentorship sessions",
    ],
    featured: true,
  },
  {
    name: "Elite",
    price: "R1,500",
    cadence: "/month",
    benefits: [
      "Everything in Premium",
      "Exclusive deal flow access",
      "Private advisory circle",
      "Annual retreat invitation",
    ],
    featured: false,
  },
];

const events = [
  {
    title: "Investment 101 Masterclass",
    date: { d: "12", m: "JUN" },
    location: "Johannesburg",
  },
  {
    title: "Women in Wealth Summit",
    date: { d: "24", m: "JUN" },
    location: "Cape Town",
  },
  {
    title: "Property Portfolio Workshop",
    date: { d: "08", m: "JUL" },
    location: "Durban",
  },
  {
    title: "Stock Market Bootcamp",
    date: { d: "22", m: "JUL" },
    location: "Online",
  },
  {
    title: "Annual A-WIN Gala",
    date: { d: "15", m: "AUG" },
    location: "Sandton",
  },
];

// Articles removed — Portfolio carousel replaces News section


function Index() {
  const liveStats = useHomepageStats();
  const statCards = [
    { label: "Members", value: liveStats.members },
    { label: "Events", value: liveStats.events },
    { label: "Founded", value: liveStats.years },
  ];
  return (
    <>
      {/* HERO with animated A-WIN logos */}
      <LogoHero />


      {/* MISSION STRIP */}
      <section id="mission" className="border-b border-border bg-card py-14">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 sm:grid-cols-3">
          {statCards.map((s) => (
            <Card
              key={s.label}
              className="border-border/60 text-center shadow-[var(--shadow-elegant)]"
            >
              <CardContent className="p-8">
                <div className="font-serif text-2xl md:text-3xl text-primary">{s.value}</div>
                <div className="mt-2 text-sm uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-xl px-4 text-center text-xs italic text-muted-foreground">
          Stats to be confirmed by A-WIN.
        </p>
      </section>

      {/* ABOUT PREVIEW */}
      <section className="py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 md:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              About A-WIN
            </span>
            <h2 className="mt-3 font-serif text-foreground">Who We Are</h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              A-WIN is a movement of African women rewriting the rules of wealth.
              Through education, mentorship and a powerful peer network, we help
              members move from financial curiosity to confident, lifelong
              investing. Every event, course and conversation is built around one
              belief: when women invest, communities transform.
            </p>
            <Link
              to="/about"
              className="mt-6 inline-flex items-center gap-1 font-medium text-primary story-link"
            >
              Read More <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div
            className="aspect-[4/3] w-full rounded-2xl shadow-[var(--shadow-elegant)]"
            style={{ background: "var(--gradient-hero)" }}
            aria-hidden="true"
          />
        </div>
      </section>

      {/* MEMBERSHIP PREVIEW */}
      <section className="bg-secondary/50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              Membership
            </span>
            <h2 className="mt-3 font-serif">Choose Your Path</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Flexible tiers designed to meet you wherever you are on your
              investment journey.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                className={
                  tier.featured
                    ? "relative border-2 border-accent shadow-[var(--shadow-gold-glow)] hover-scale"
                    : "border-border/60 shadow-[var(--shadow-elegant)] hover-scale"
                }
              >
                {tier.featured && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
                    Recommended
                  </Badge>
                )}
                <CardContent className="p-8">
                  <h3 className="font-serif text-foreground">{tier.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="font-serif text-4xl text-primary">
                      {tier.price}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {tier.cadence}
                    </span>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {tier.benefits.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-foreground/85">{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className={
                      tier.featured
                        ? "mt-7 w-full bg-accent text-accent-foreground hover:bg-accent/90"
                        : "mt-7 w-full"
                    }
                  >
                    <Link to="/membership">Join Now</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* UPCOMING EVENTS */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-accent">
                What's On
              </span>
              <h2 className="mt-3 font-serif">Upcoming Events</h2>
            </div>
            <Link
              to="/events"
              className="hidden text-sm font-medium text-primary story-link sm:inline-flex items-center gap-1"
            >
              All events <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 -mx-4 overflow-x-auto px-4 pb-4">
            <div className="flex gap-5 snap-x snap-mandatory">
              {events.map((e) => (
                <Card
                  key={e.title}
                  className="w-72 shrink-0 snap-start overflow-hidden border-border/60 shadow-[var(--shadow-elegant)] hover-scale"
                >
                  <div
                    className="relative h-40 w-full"
                    style={{ background: "var(--gradient-hero)" }}
                  >
                    <div className="absolute left-4 top-4 rounded-lg bg-accent px-3 py-1.5 text-center text-accent-foreground shadow-md">
                      <div className="font-serif text-xl leading-none">
                        {e.date.d}
                      </div>
                      <div className="text-[10px] font-semibold tracking-widest">
                        {e.date.m}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-serif text-lg text-foreground">
                      {e.title}
                    </h3>
                    <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {e.location}
                    </div>
                    <Link
                      to="/contact"
                      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary story-link"
                    >
                      View Details <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PORTFOLIO CAROUSEL */}
      <PortfolioCarousel />


      {/* CTA BANNER */}
      <section
        className="relative overflow-hidden py-20 text-accent-foreground"
        style={{ background: "var(--gradient-gold)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,oklch(1_0_0/0.25),transparent_55%)]" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-serif text-accent-foreground">
            Ready to Start Your Investment Journey?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-accent-foreground/85">
            Join hundreds of women already building generational wealth with A-WIN.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 bg-foreground text-background hover:bg-foreground/90"
          >
            <Link to="/membership">
              Discover How to Join <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
