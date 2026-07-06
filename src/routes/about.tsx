import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Users, BookOpen, Sparkles, ChevronRight, Sprout, Globe2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About A-WIN — African Women Investment Network" },
      {
        name: "description",
        content:
          "A-WIN is a community of African women empowering each other through investment, financial education and collaboration. Founded 2025, growing every month.",
      },
      { property: "og:title", content: "About A-WIN" },
      {
        property: "og:description",
        content:
          "Empowering African women, from all walks of life, through investment and collaboration.",
      },
    ],
  }),
  component: AboutPage,
});

const values = [
  {
    icon: Heart,
    title: "Empowerment",
    body: "Every woman, regardless of background, deserves access to financial knowledge and investment opportunity.",
  },
  {
    icon: Users,
    title: "Community",
    body: "We grow stronger together — sisterhood, mentorship and honest money conversations sit at the heart of A-WIN.",
  },
  {
    icon: BookOpen,
    title: "Education",
    body: "Lifelong learning fuels lifelong wealth. We invest in financial literacy at every stage of the journey.",
  },
  {
    icon: Sparkles,
    title: "Legacy",
    body: "We build wealth that outlives us — for our families, our communities and the generations to come.",
  },
];

type TeamMember = { id: string; name: string; title: string; photo_url: string | null };

function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  useEffect(() => {
    supabase
      .from("team_members")
      .select("id, name, title, photo_url")
      .eq("published", true)
      .order("order_index")
      .limit(3)
      .then(({ data }) => setTeam((data as TeamMember[]) ?? []));
  }, []);

  return (
    <>
      {/* HERO */}
      <section
        className="relative overflow-hidden px-4 py-24 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,var(--accent),transparent_55%)] opacity-25" />

        <div className="relative mx-auto max-w-5xl animate-fade-in">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary-foreground/70"
          >
            <Link to="/" className="hover:text-accent transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-accent">About</span>
          </nav>
          <h1 className="mt-5 font-serif">About A-WIN</h1>
          <p className="mt-5 max-w-3xl text-primary-foreground/85 md:text-xl italic">
            Empowering African women, from all walks of life, through investment and collaboration.
          </p>
        </div>
      </section>

      {/* WHO WE ARE */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">Who We Are</span>
          <h2 className="mt-3 font-serif">A community of visionary African women</h2>
          <div className="mt-6 space-y-5 text-lg leading-relaxed text-muted-foreground">
            <p>
              The African Women Investment Network (A-WIN) is a community of visionary African women
              united by a shared commitment to building wealth, supporting one another, and creating
              sustainable impact through collaboration and collective investment.
            </p>
            <p>
              A-WIN was founded in <strong className="text-foreground">2025</strong> by a group of
              businesswomen. What began as a small, passionate group has grown to{" "}
              <strong className="text-foreground">over fifty members and counting</strong>. Our
              mission is to empower women to grow their wealth, strengthen their businesses, and
              access investment opportunities that drive long term financial independence.
            </p>
          </div>
        </div>
      </section>

      {/* PURPOSE */}
      <section className="bg-secondary/50 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            Our Purpose Goes Beyond Saving
          </span>
          <h2 className="mt-3 font-serif">Shifting the culture</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                At A-WIN, we believe every African woman — regardless of her background, location, or
                income level — deserves access to financial knowledge and investment opportunities.
                We are intentional about reaching women from townships, rural communities, and all
                walks of life, because financial empowerment must be inclusive to be truly
                transformative.
              </p>
            </div>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                We are on a mission to shift the culture. Too many women prioritise credit and
                non-essential spending while saving and investing remain an afterthought. A-WIN
                exists to change that mindset — to build a generation of women who think about
                investing first and <em>consumer spending</em> second. We are cultivating a movement
                that replaces short term consumption with medium-to-long term wealth creation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">What Drives Us</span>
            <h2 className="mt-3 font-serif">Our Values</h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <Card key={v.title} className="border-border/60 shadow-[var(--shadow-elegant)] hover-scale">
                <CardContent className="p-7">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <v.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-serif text-xl text-foreground">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* WHO CAN JOIN */}
      <section className="bg-card border-y border-border py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-accent">Who Can Join</span>
              <h2 className="mt-3 font-serif">A-WIN is open to any woman who…</h2>
              <ul className="mt-6 space-y-3 text-muted-foreground">
                {[
                  "Shares our vision of financial empowerment, collaboration and long term wealth creation.",
                  "Can pay the nominal annual membership fee (currently R200/year, reviewed annually).",
                  "Can contribute a minimum of R500/month toward collective investment opportunities.",
                  "Is a business owner, aspiring entrepreneur, professional, side-hustler — or simply ready to take control of her financial future.",
                ].map((b) => (
                  <li key={b} className="flex gap-3">
                    <Sprout className="h-5 w-5 mt-0.5 flex-none text-accent" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-muted-foreground">
                Women from all walks of life are welcome. <strong>We especially welcome women who are new to investing.</strong>
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-accent">Member Benefits</span>
              <h2 className="mt-3 font-serif">What you gain</h2>
              <div className="mt-6 space-y-4">
                {[
                  { t: "Investment Opportunities", b: "Exposure to offshore tax free investments and other carefully selected growth opportunities tailored for women investors." },
                  { t: "Financial Advisory Support", b: "Consultation with a qualified financial advisor who assesses your risk appetite and recommends a portfolio aligned with your goals." },
                  { t: "Business Support & Collaboration", b: "Connect with like-minded women; support each other's businesses through crowdfunding and referrals." },
                  { t: "Community & Learning", b: "Workshops, networking and mentorship that strengthen your financial knowledge, money mindset and leadership capacity." },
                ].map((x) => (
                  <div key={x.t}>
                    <div className="font-semibold text-foreground">{x.t}</div>
                    <div className="text-sm text-muted-foreground">{x.b}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* JOIN THE MOVEMENT */}
      <section
        className="relative overflow-hidden px-4 py-20 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-primary-deep/10" />
        <div className="relative mx-auto max-w-3xl text-center">
          <Globe2 className="mx-auto h-10 w-10 text-accent" />
          <h2 className="mt-4 font-serif text-primary-foreground">Join the movement</h2>
          <p className="mt-4 text-primary-foreground/85 leading-relaxed">
            By joining A-WIN, you become part of a growing movement of African women creating wealth
            with purpose — women choosing investment over consumer spending, collaboration over
            competition, and long term freedom over short term gratification. Together, we are
            transforming Africa's economic landscape, one investment and one woman at a time.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/membership">Apply for Membership</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-white bg-white text-[#3D8B2F] hover:bg-white/90 hover:text-[#3D8B2F]">
              <Link to="/members">Meet the Team</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* LEADERSHIP PREVIEW */}
      {team.length > 0 && (
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-end justify-between mb-10">
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-accent">The Team</span>
                <h2 className="mt-3 font-serif">Leadership</h2>
              </div>
              <Button asChild variant="outline"><Link to="/members">View full team</Link></Button>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((m) => (
                <Card key={m.id} className="border-border/60 text-center shadow-[var(--shadow-elegant)]">
                  <CardContent className="p-7">
                    <div
                      className="mx-auto h-24 w-24 rounded-full bg-cover bg-center"
                      style={{
                        background: m.photo_url
                          ? `url(${m.photo_url}) center/cover`
                          : "var(--gradient-placeholder)",
                      }}
                      aria-hidden="true"
                    />
                    <h3 className="mt-5 font-serif text-lg text-foreground">{m.name}</h3>
                    <div className="text-sm font-medium text-accent">{m.title}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        <strong className="text-foreground">A-WIN</strong> — African Women Investment Network · Founded 2025
      </footer>
    </>
  );
}
