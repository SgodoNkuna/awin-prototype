import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronDown,
  Calendar,
  MapPin,
  Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

const stats = [
  { label: "Active Members", value: "1,200+" },
  { label: "Years Running", value: "8" },
  { label: "Investment Events", value: "150+" },
];

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

const articles = [
  {
    category: "Investing",
    title: "5 Habits of Women Who Build Lasting Wealth",
    date: "May 28, 2026",
    excerpt:
      "From budgeting rituals to long-term thinking — the small daily moves that compound over decades.",
  },
  {
    category: "Community",
    title: "Inside Our Cape Town Member Meetup",
    date: "May 18, 2026",
    excerpt:
      "Highlights from a night of honest conversation about money, mentorship, and momentum.",
  },
  {
    category: "Education",
    title: "ETFs Explained for First-Time Investors",
    date: "May 02, 2026",
    excerpt:
      "A plain-language breakdown of how ETFs work and why they belong in a starter portfolio.",
  },
];

function Index() {
  return (
    <>
      {/* HERO */}
      <section
        className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-24 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--accent),transparent_55%)] opacity-25" />
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative mx-auto max-w-4xl text-center animate-fade-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            African Women in Investment Network
          </span>

          <h1 className="mt-6 font-serif text-primary-foreground">
            Empowering Women Through Investment
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-primary-foreground/85 md:text-lg">
            A-WIN is a community of women building wealth, knowledge, and legacy
            together.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground shadow-[var(--shadow-gold-glow)] hover:bg-accent/90"
            >
              <Link to="/membership">
                Become a Member <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/about">Learn More</Link>
            </Button>
          </div>
        </div>

        <a
          href="#mission"
          aria-label="Scroll down"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-primary-foreground/70 hover:text-accent transition-colors"
        >
          <ChevronDown className="h-7 w-7 animate-bounce" />
        </a>
      </section>

      {/* MISSION STRIP */}
      <section id="mission" className="border-b border-border bg-card py-14">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Card
              key={s.label}
              className="border-border/60 text-center shadow-[var(--shadow-elegant)]"
            >
              <CardContent className="p-8">
                <div className="font-serif text-4xl text-primary">{s.value}</div>
                <div className="mt-2 text-sm uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
                      to="/events"
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

      {/* NEWS PREVIEW */}
      <section className="bg-secondary/50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              From the Blog
            </span>
            <h2 className="mt-3 font-serif">Latest News & Insights</h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {articles.map((a) => (
              <Card
                key={a.title}
                className="overflow-hidden border-border/60 shadow-[var(--shadow-elegant)] hover-scale"
              >
                <div
                  className="h-44 w-full"
                  style={{ background: "var(--gradient-gold)" }}
                  aria-hidden="true"
                />
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="bg-accent/15 text-accent">
                      {a.category}
                    </Badge>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {a.date}
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-lg text-foreground">
                    {a.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {a.excerpt}
                  </p>
                  <Link
                    to="/news"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary story-link"
                  >
                    Read More <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

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
              Become a Member Today <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
