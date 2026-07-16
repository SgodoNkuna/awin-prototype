import { createFileRoute, Link } from "@tanstack/react-router";
import { asset } from "@/lib/cdn";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  MapPin,
  Check,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogoHero } from "@/components/site/LogoHero";
import { PortfolioCarousel } from "@/components/site/PortfolioCarousel";
import { WCWGallery } from "@/components/site/WCWGallery";
import { HikeGallery } from "@/components/site/HikeGallery";
import { supabase } from "@/integrations/supabase/client";
import { signPortfolioUrls } from "@/lib/portfolio-storage.functions";
const wcwHero = asset("wcw/wcw-5.jpeg");
const hikeImg1 = asset("hike-2026/hike-00.44.593.jpeg");
const hikeImg2 = asset("hike-2026/hike-00.44.5922.jpeg");
const hikeImg3 = asset("hike-2026/hike-00.44.5966.jpeg");
const hikeImg4 = asset("hike-2026/hike-00.45.001.jpeg");


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

// A-WIN follows a single membership model (not multi tier):
//   R200 / year nominal membership fee + R500 / month collective investment contribution.
const membership = {
  fee: "R200",
  feeCadence: "/ year",
  contribution: "R500",
  contributionCadence: "/ month",
  benefits: [
    "Offshore tax free and curated investment opportunities",
    "Consultation with a qualified financial advisor",
    "Workshops, mentorship and a supportive sisterhood",
    "Business collaboration, crowdfunding and referrals",
  ],
};

type HomeEvent = {
  id: string;
  title: string;
  event_date: string;
  location: string;
  image_url: string | null;
};

type HomeMember = {
  id: string;
  name: string;
  title: string | null;
  category: string | null;
  photo_url: string | null;
  profile_card_url: string | null;
};

const EVENT_FALLBACK_IMAGES = [hikeImg1, hikeImg2, hikeImg3, hikeImg4];

function useUpcomingEvents(limit = 4) {
  const [events, setEvents] = useState<HomeEvent[]>([]);
  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("events")
      .select("id, title, event_date, location, image_url")
      .eq("published", true)
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .limit(limit)
      .then(({ data }) => {
        if (cancelled) return;
        setEvents(((data ?? []) as HomeEvent[]));
      });
    return () => { cancelled = true; };
  }, [limit]);
  return events;
}

function useFeaturedMembers(limit = 6) {
  const [members, setMembers] = useState<HomeMember[]>([]);
  const sign = useServerFn(signPortfolioUrls);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("team_members")
        .select("id, name, title, category, photo_url, profile_card_url" as any)
        .eq("published", true)
        .order("order_index", { ascending: true })
        .limit(limit * 3);
      const rows = ((data ?? []) as unknown) as HomeMember[];
      const withImg = rows.filter((m) => m.profile_card_url || m.photo_url).slice(0, limit);
      const pool = withImg.length ? withImg : rows.slice(0, limit);

      // Resolve storage keys → signed URLs; external URLs pass through.
      const keys = new Set<string>();
      for (const m of pool) {
        if (m.photo_url) keys.add(m.photo_url);
        if (m.profile_card_url) keys.add(m.profile_card_url);
      }
      let urlMap: Record<string, string> = {};
      if (keys.size > 0) {
        try {
          const res = await sign({ data: { keys: [...keys] } });
          urlMap = res.urls;
        } catch (e) {
          console.error("signPortfolioUrls (home) failed", e);
        }
      }
      const swap = (v: string | null) => (v && urlMap[v]) || v;
      const resolved = pool.map((m) => ({
        ...m,
        photo_url: swap(m.photo_url),
        profile_card_url: swap(m.profile_card_url),
      }));
      if (!cancelled) setMembers(resolved);
    })();
    return () => { cancelled = true; };
  }, [limit, sign]);
  return members;
}

// Articles removed — Portfolio carousel replaces News section


function Index() {
  const liveStats = useHomepageStats();
  const upcomingEvents = useUpcomingEvents(4);
  const featuredMembers = useFeaturedMembers(6);
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

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-primary/20 shadow-[var(--shadow-elegant)]">
            <img
              src={wcwHero}
              alt="A-WIN women together at a community gathering"
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent p-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-white/85">
                Women Creating Wealth
              </div>
              <div className="font-serif text-lg text-white">Sisterhood in action</div>
            </div>
          </div>
        </div>
      </section>

      {/* MEMBERSHIP PREVIEW */}
      <section className="bg-secondary/50 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              Membership
            </span>
            <h2 className="mt-3 font-serif">One Membership · Built for Long Term Wealth</h2>
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
                  <Link to="/onboarding">Start Onboarding</Link>
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
              className="inline-flex items-center gap-1 text-sm font-medium text-primary story-link"
            >
              View all events <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-border bg-secondary/40 p-10 text-center text-muted-foreground">
              <Calendar className="mx-auto h-8 w-8 opacity-60" aria-hidden="true" />
              <p className="mt-3 text-sm">No upcoming events yet. Check back soon or view the full calendar.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/events">Open events page</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-10 -mx-4 overflow-x-auto px-4 pb-4">
              <div className="flex gap-5 snap-x snap-mandatory">
                {upcomingEvents.map((e, i) => {
                  const d = new Date(e.event_date);
                  const day = String(d.getDate()).padStart(2, "0");
                  const month = d.toLocaleString("en-ZA", { month: "short" }).toUpperCase();
                  const weekday = d.toLocaleString("en-ZA", { weekday: "long" });
                  const fullDate = d.toLocaleString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
                  const cover = e.image_url || EVENT_FALLBACK_IMAGES[i % EVENT_FALLBACK_IMAGES.length];
                  return (
                    <Card
                      key={e.id}
                      className="w-72 shrink-0 snap-start overflow-hidden border-border/60 shadow-[var(--shadow-elegant)] hover-scale"
                    >
                      <div className="relative h-40 w-full overflow-hidden bg-secondary">
                        <img
                          src={cover}
                          alt={e.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(ev) => {
                            const fallback = EVENT_FALLBACK_IMAGES[i % EVENT_FALLBACK_IMAGES.length];
                            if (ev.currentTarget.src !== fallback) ev.currentTarget.src = fallback;
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <div className="absolute left-4 top-4 rounded-lg bg-accent px-3 py-1.5 text-center text-accent-foreground shadow-md">
                          <div className="font-serif text-xl leading-none">{day}</div>
                          <div className="text-[10px] font-semibold tracking-widest">{month}</div>
                        </div>
                      </div>
                      <CardContent className="p-5">
                        <div className="text-[11px] font-semibold uppercase tracking-widest text-accent">
                          {weekday} · {fullDate}
                        </div>
                        <h3 className="mt-1 font-serif text-lg text-foreground">{e.title}</h3>
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
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* MEMBERS PREVIEW — real profile cards from the directory */}
      {featuredMembers.length > 0 && (
        <section className="bg-secondary/40 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-accent">
                  Meet the Sisterhood
                </span>
                <h2 className="mt-3 font-serif">Our Members</h2>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                  Real women, real stories. Explore the professionals, entrepreneurs and everyday builders shaping A-WIN.
                </p>
              </div>
              <Link
                to="/members"
                className="hidden text-sm font-medium text-primary story-link sm:inline-flex items-center gap-1"
              >
                View all members <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-10 -mx-4 overflow-x-auto px-4 pb-4">
              <div className="flex gap-5 snap-x snap-mandatory">
                {featuredMembers.map((m) => {
                  const img = m.profile_card_url || m.photo_url;
                  return (
                    <Link
                      key={m.id}
                      to="/members"
                      className="group w-64 shrink-0 snap-start"
                    >
                      <Card className="h-full overflow-hidden border-border/60 shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-1 hover:shadow-[var(--shadow-gold-glow)]">
                        <div className="aspect-[3/4] w-full bg-secondary">
                          {img ? (
                            <img
                              src={img}
                              alt={m.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className="flex h-full w-full items-center justify-center font-serif text-5xl text-primary-deep/40"
                              style={{ background: "var(--gradient-placeholder)" }}
                            >
                              {m.name
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((p) => p[0])
                                .join("")}
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-serif text-base font-bold leading-tight text-card-foreground">
                            {m.name}
                          </h3>
                          {m.category && (
                            <Badge className="mt-2 bg-accent text-accent-foreground text-[11px]">
                              {m.category}
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-center sm:hidden">
              <Button asChild variant="outline">
                <Link to="/members">View all members</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* WCW SUMMIT GALLERY */}
      <WCWGallery />

      {/* A-WIN HIKE APRIL 2026 */}
      <HikeGallery />

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
