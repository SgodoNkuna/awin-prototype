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
import { WCWGallery } from "@/components/site/WCWGallery";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "A-WIN | African Women Investment Network" },
      {
        name: "description",
        content:
          "A-WIN is a community of women building wealth, knowledge, and legacy together through investment, education, and networking.",
      },
      { property: "og:title", content: "A-WIN | African Women Investment Network" },
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
  members: "50+ Women",
  invested: "Growing Together",
  years: "Est. 2025",
  supported: "Community First",
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
        const v = data.value as Partial<typeof DEFAULT_STATS> & { events?: string };
        setStats({
          members: v.members || DEFAULT_STATS.members,
          invested: v.invested || v.events || DEFAULT_STATS.invested,
          years: v.years || DEFAULT_STATS.years,
          supported: v.supported || DEFAULT_STATS.supported,
        });
      });
    return () => { cancelled = true; };
  }, []);
  return stats;
}

// A-WIN follows a single membership model (not multi-tier):
//   R200 / year nominal membership fee + R500 / month collective investment contribution.
const membership = {
  fee: "R200",
  feeCadence: "/ year",
  contribution: "R500",
  contributionCadence: "/ month",
  benefits: [
    "Offshore tax-free and curated investment opportunities",
    "Consultation with a qualified financial advisor",
    "Workshops, mentorship and a supportive sisterhood",
    "Business collaboration, crowdfunding and referrals",
  ],
};

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
    { label: "Total Invested", value: liveStats.invested },
    { label: "Years Active", value: liveStats.years },
    { label: "Women Supported", value: liveStats.supported },
  ];
  return (
    <>
      {/* HERO with animated A-WIN logos */}
      <LogoHero />


      {/* COMMUNITY STATS STRIP */}
      <section id="mission" className="border-b border-border bg-card py-14">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 sm:grid-cols-4">
          {statCards.map((s) => (
            <Card
              key={s.label}
              className="border-border/60 text-center shadow-[var(--shadow-elegant)]"
            >
              <CardContent className="p-6">
                <div className="font-serif text-xl md:text-2xl text-primary">{s.value}</div>
                <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-xl px-4 text-center text-xs italic text-muted-foreground">
          Numbers grow as our community grows. Updated by A-WIN.
        </p>
      </section>

      {/* ABOUT PREVIEW */}
      <section className="py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 md:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              About A-WIN
            </span>
            <h2 className="mt-3 font-serif text-foreground">Every Woman Belongs Here</h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              A-WIN welcomes every woman, regardless of profession, background,
              or where she is starting from. The common thread is a commitment
              to saving and investing over consumerism and debt. Together we
              break the debt cycle, build collective wealth, and create
              generational change for our families and communities.
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
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              Membership
            </span>
            <h2 className="mt-3 font-serif">One Membership · Built for Long-Term Wealth</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              A-WIN follows a single, transparent membership model. A small annual
              fee plus a monthly contribution toward collective investments, reviewed
              annually by the community.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="border-border/60 shadow-[var(--shadow-elegant)] hover-scale">
              <CardContent className="p-8">
                <div className="text-xs font-semibold uppercase tracking-widest text-accent">
                  Annual Membership Fee
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-serif text-4xl text-primary">{membership.fee}</span>
                  <span className="text-sm text-muted-foreground">{membership.feeCadence}</span>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Covers administration, member services and access to the A-WIN community.
                </p>
              </CardContent>
            </Card>
            <Card className="relative border-2 border-accent shadow-[var(--shadow-gold-glow)] hover-scale">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
                Investment Commitment
              </Badge>
              <CardContent className="p-8">
                <div className="text-xs font-semibold uppercase tracking-widest text-accent">
                  Monthly Contribution
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-serif text-4xl text-primary">{membership.contribution}</span>
                  <span className="text-sm text-muted-foreground">{membership.contributionCadence} minimum</span>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Directed into collective investment opportunities curated for women investors.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 border-border/60 shadow-[var(--shadow-elegant)]">
            <CardContent className="p-8">
              <h3 className="font-serif text-foreground">What every member gets</h3>
              <ul className="mt-5 grid gap-3 md:grid-cols-2">
                {membership.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground/85">{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link to="/membership">Apply for Membership</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/about">Read Our Story</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
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

      {/* WCW SUMMIT GALLERY */}
      <WCWGallery />

      {/* PORTFOLIO CAROUSEL */}
      <PortfolioCarousel />



      {/* CTA BANNER */}
      <section
        className="relative overflow-hidden py-20 text-accent-foreground"
        style={{ background: "var(--gradient-gold)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.25),transparent_55%)]" />
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
