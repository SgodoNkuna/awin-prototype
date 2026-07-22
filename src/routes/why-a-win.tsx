import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Facebook,
  Instagram,
  Linkedin,
  TrendingUp,
  Globe2,
  GraduationCap,
  Users,
  HandCoins,
  Sprout,
  BookOpen,
  Quote,
  Award,
  Building2,
  ShieldCheck,
  Mail,
  ExternalLink,
  Landmark,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MinimalistHero } from "@/components/ui/minimalist-hero";

export const Route = createFileRoute("/why-a-win")({
  head: () => ({
    meta: [
      { title: "Why A-Win | The Story & the Founder" },
      {
        name: "description",
        content:
          "Why A-Win exists — in the words of founder Phumelele Ndumo: financial advisor, author of \"From Debt to Riches\", and founder of ThuthukaSA. A movement of African women choosing wealth over debt.",
      },
      { property: "og:title", content: "Why A-Win — Building Wealth, Together" },
      {
        property: "og:description",
        content:
          "The founder's story behind the African Women Investment Network, and why she built it.",
      },
    ],
  }),
  component: WhyAWinPage,
});

const FOUNDER_PHOTO =
  "https://epnuglslxavbhzcltgvh.supabase.co/storage/v1/object/public/gallery/headshots/phumelele-ndumo.jpg";

// Every credential below is drawn from the founder's own profile — named
// business, regulatory registration, qualifications and authorship — so the
// page leads with credibility (people buy the person before the idea).
const CREDENTIALS = [
  { icon: Award, label: "Author · \"From Debt to Riches\"" },
  { icon: Building2, label: "Founder · ThuthukaSA" },
  { icon: ShieldCheck, label: "FSP No. 47992" },
  { icon: GraduationCap, label: "Masters in Business Leadership" },
  { icon: TrendingUp, label: "In business since 2009" },
];

const PILLARS = [
  {
    icon: TrendingUp,
    title: "Wealth, not debt",
    body: "Most women start their careers accumulating debt — store accounts, personal loans, credit cards. A-Win exists to flip that: a culture of discipline, saving and investing over consumerism.",
  },
  {
    icon: Globe2,
    title: "Offshore, tax-free investing",
    body: "We expose the everyday South African woman to offshore tax-free investment vehicles she would rarely access alone — medium-to-long-term, built for real wealth.",
  },
  {
    icon: GraduationCap,
    title: "Financial literacy for all",
    body: "South African financial literacy levels are low. Together, through shared knowledge and workshops, A-Winners raise each other's financial confidence.",
  },
  {
    icon: Users,
    title: "Women & wealth creation",
    body: "Too many families are single-parent households headed by women who still earn less than men. A-Win puts wealth creation for women at the centre.",
  },
  {
    icon: Sprout,
    title: "Entrepreneurship is a team sport",
    body: "80% of businesses fail within five years — often from isolation. A-Win members open markets to each other, collaborate, and mentor, shortening the road to success.",
  },
  {
    icon: HandCoins,
    title: "We fund each other",
    body: "A-Winners crowdfund one another's businesses and apply jointly for funding — because we are women with money, and our collective investments grow every month.",
  },
];

const STATS = [
  { figure: "2009", label: "Founder in business since" },
  { figure: "15", label: "Founding members — GMT Women Creating Wealth alumni" },
  { figure: "80%", label: "Of businesses fail in 5 years — what we exist to change" },
  { figure: "R500", label: "Monthly per member, growing collective wealth" },
];

function WhyAWinPage() {
  return (
    <>
      {/* HERO — A-Win adaptation of the MinimalistHero pattern */}
      <MinimalistHero
        mainText="A-Win is a community of African women choosing investment over debt, collaboration over isolation, and long-term wealth over short-term spending. It began with one financial advisor's conviction that women could do this — together."
        readMoreLink="#meet-the-founder"
        readMoreLabel="Meet the founder"
        imageSrc={FOUNDER_PHOTO}
        imageAlt="Phumelele Ndumo, Founder of A-Win"
        overlayText={{ part1: "Wealth,", part2: "together." }}
        socialLinks={[
          { icon: Linkedin, href: "https://www.linkedin.com/", label: "LinkedIn" },
          { icon: Instagram, href: "https://www.instagram.com/", label: "Instagram" },
          { icon: Facebook, href: "https://www.facebook.com/", label: "Facebook" },
        ]}
        locationText="Centurion, South Africa"
      />

      {/* FOUNDER CREDIBILITY */}
      <section id="meet-the-founder" className="border-b border-border bg-secondary/30 py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            Meet the founder
          </span>
          <h2 className="mt-3 font-serif text-foreground">
            Why her? Because she has walked it.
          </h2>
          <div className="mt-6 grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              <img
                src={FOUNDER_PHOTO}
                alt="Phumelele Ndumo"
                className="size-40 rounded-full object-cover ring-4 ring-accent/30 shadow-[var(--shadow-elegant)]"
              />
              <div className="mt-4 font-serif text-xl font-semibold text-foreground">Phumelele Ndumo</div>
              <div className="text-sm font-medium text-accent">Founder of A-Win · Financial Advisor</div>
            </div>

            <div>
              <p className="text-lg leading-relaxed text-foreground/90">
                Phumelele Ndumo is a financial advisor, best-selling author, and entrepreneur
                who has spent her career making wealth-building accessible to ordinary people.
                She is the author of the South African best-seller{" "}
                <em>"From Debt to Riches: Steps to Financial Success"</em>, and the founder of{" "}
                <strong className="text-foreground">ThuthukaSA</strong>, an authorised Financial
                Services Provider (FSP No. 47992). She holds a BCom, a Higher Diploma in Computer
                Auditing, and a Masters in Business Leadership.
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                She has been in business since 2009 — a long, often lonely journey that shaped
                her belief that women succeed faster when they build together. A-Win is that
                belief, put into practice.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {CREDENTIALS.map((c) => (
                  <Badge
                    key={c.label}
                    variant="outline"
                    className="gap-1.5 border-accent/30 bg-accent/5 px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    <c.icon className="h-3.5 w-3.5 text-accent" />
                    {c.label}
                  </Badge>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="sm" variant="outline">
                  <a href="https://www.thuthuka-sa.co.za" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-4 w-4" /> ThuthukaSA
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href="mailto:info@thuthuka-sa.co.za">
                    <Mail className="mr-1.5 h-4 w-4" /> Contact
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE WHY — PILLARS */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              Why A-Win exists
            </span>
            <h2 className="mt-3 font-serif text-foreground">Six convictions, one movement</h2>
            <p className="mt-4 text-muted-foreground">
              In her own words: "I am often asked why I started A-Win." These are the reasons —
              the change she is building, one member at a time.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p) => (
              <Card
                key={p.title}
                className="border-border/60 shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-1 hover:shadow-[var(--shadow-gold-glow)]"
              >
                <CardContent className="p-7">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <p.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-serif text-xl text-foreground">{p.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* STAT BAND */}
      <section className="relative overflow-hidden py-16 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,var(--accent),transparent_55%)] opacity-20" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-serif text-4xl font-semibold text-accent md:text-5xl">{s.figure}</div>
              <div className="mt-2 text-sm text-primary-foreground/85">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FIRST INVESTMENT */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-accent">
                Our first collective investment
              </span>
              <h2 className="mt-3 font-serif text-foreground">A Cape Town Airbnb — owned together</h2>
              <p className="mt-5 leading-relaxed text-muted-foreground">
                A-Win's diverse members are its greatest asset. Among the founding group are women
                from Cape Town who already run profitable Airbnbs in their own right. They are
                guiding the community toward its first shared asset: an Airbnb the members will
                own collectively.
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                It is the model in miniature — harnessing collective knowledge, pooling capital
                that grows monthly, and applying jointly for funding as women with money behind them.
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-secondary/40 p-8 shadow-[var(--shadow-elegant)]">
              <Landmark className="h-10 w-10 text-accent" />
              <div className="mt-4 font-serif text-2xl text-foreground">Collective ownership</div>
              <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2"><span className="text-accent">→</span> Members' monthly contributions pooled and invested</li>
                <li className="flex gap-2"><span className="text-accent">→</span> Guided by members who run Airbnbs profitably</li>
                <li className="flex gap-2"><span className="text-accent">→</span> Joint funding applications — stronger together</li>
                <li className="flex gap-2"><span className="text-accent">→</span> Returns that build generational wealth</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* THE BOOK */}
      <section className="border-y border-border bg-secondary/30 py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
            <div className="flex h-48 w-36 shrink-0 flex-col justify-between rounded-lg bg-gradient-to-br from-primary via-primary to-primary-deep p-4 text-primary-foreground shadow-[var(--shadow-gold-glow)]">
              <BookOpen className="h-6 w-6 text-accent" />
              <div>
                <div className="font-serif text-lg leading-tight">From Debt to Riches</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-primary-foreground/70">
                  Steps to Financial Success
                </div>
              </div>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-accent">The authority behind the idea</span>
              <h2 className="mt-3 font-serif text-foreground">She wrote the book on it — literally.</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Phumelele's best-seller <em>"From Debt to Riches: Steps to Financial Success"</em> has
                helped countless South Africans turn their finances around. A-Win is that same
                philosophy, made collective — the leap from personal financial success to shared,
                community-built wealth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PULL QUOTE */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <Quote className="mx-auto h-10 w-10 text-accent/60" />
          <blockquote className="mt-6 font-serif text-2xl leading-snug text-foreground md:text-3xl">
            "Entrepreneurship is a team sport, and we are most likely to succeed individually in
            our businesses if we work together in a cooperative and supportive manner."
          </blockquote>
          <div className="mt-6 text-sm font-medium uppercase tracking-widest text-accent">
            Phumelele Ndumo · Founder, A-Win
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden px-4 py-20 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--accent),transparent_60%)] opacity-20" />
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="font-serif">Her invitation is simple.</h2>
          <p className="mx-auto mt-5 max-w-xl text-primary-foreground/85 md:text-lg">
            "Hopefully after reading this, you too will join us — and if you are not a woman,
            you will refer your loved ones." Every woman belongs here.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/membership">
                Become a Member <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/members">Meet the Sisterhood</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
