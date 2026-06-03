import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Users, BookOpen, Sparkles, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About A-WIN | African Women in Investment Network" },
      {
        name: "description",
        content:
          "Learn about A-WIN's story, mission, values, leadership team and partners building a movement of women investors across Africa.",
      },
      { property: "og:title", content: "About A-WIN" },
      {
        property: "og:description",
        content:
          "Our story, mission, leadership and partners — a community of women building wealth together.",
      },
    ],
  }),
  component: AboutPage,
});

const values = [
  {
    icon: Heart,
    title: "Empowerment",
    body: "We equip women with the tools, knowledge and confidence to take ownership of their financial futures.",
  },
  {
    icon: Users,
    title: "Community",
    body: "We grow stronger together. Sisterhood, mentorship and honest conversations sit at the heart of A-WIN.",
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

type TeamMember = { id: string; name: string; title: string; bio: string | null; photo_url: string | null };

const FALLBACK_TEAM: TeamMember[] = [
  { id: "f1", name: "Thandiwe Mokoena", title: "Founder & Chairperson", bio: "Two decades in asset management. Passionate about closing the gender wealth gap across Africa.", photo_url: null },
  { id: "f2", name: "Lerato Khumalo", title: "Chief Executive Officer", bio: "Former fintech operator turned community builder, leading A-WIN's day-to-day vision.", photo_url: null },
  { id: "f3", name: "Naledi Dlamini", title: "Head of Education", bio: "Curriculum designer behind A-WIN's masterclasses, bootcamps and member learning paths.", photo_url: null },
];

const partners = [
  "Sasfin",
  "Old Mutual",
  "Allan Gray",
  "Investec",
  "Nedbank",
  "Discovery",
];

function AboutPage() {
  return (
    <>
      {/* HERO */}
      <section
        className="relative overflow-hidden px-4 py-24 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,var(--accent),transparent_55%)] opacity-25" />
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
            <span className="text-accent">About</span>
          </nav>
          <h1 className="mt-5 font-serif">About A-WIN</h1>
          <p className="mt-5 max-w-2xl text-primary-foreground/85 md:text-lg">
            A movement of African women rewriting the rules of wealth, one
            confident investor at a time.
          </p>
        </div>
      </section>

      {/* OUR STORY */}
      <section className="py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 md:grid-cols-2">
          <div
            className="aspect-[4/3] w-full rounded-2xl shadow-[var(--shadow-elegant)]"
            style={{ background: "var(--gradient-hero)" }}
            aria-hidden="true"
          />
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              Our Story
            </span>
            <h2 className="mt-3 font-serif">From a Conversation to a Movement</h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              A-WIN began around a kitchen table — a handful of women trading
              notes on retirement annuities, side hustles and the markets. What
              started as a small WhatsApp group has grown into a continent-wide
              network of investors, mentors and community leaders.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Today, A-WIN runs masterclasses, member chapters and an annual
              summit — all built on the same belief that wealth is something
              women build together, not in silence.
            </p>
          </div>
        </div>
      </section>

      {/* MISSION & VALUES */}
      <section className="bg-secondary/50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              What Drives Us
            </span>
            <h2 className="mt-3 font-serif">Our Mission & Values</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              The principles that shape every event, course and conversation
              inside A-WIN.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <Card
                key={v.title}
                className="border-border/60 shadow-[var(--shadow-elegant)] hover-scale"
              >
                <CardContent className="p-7">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <v.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-serif text-xl text-foreground">
                    {v.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {v.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* LEADERSHIP */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              The Team
            </span>
            <h2 className="mt-3 font-serif">Leadership</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              The women behind A-WIN's strategy, education and community.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m) => (
              <Card
                key={m.name}
                className="border-border/60 text-center shadow-[var(--shadow-elegant)] hover-scale"
              >
                <CardContent className="p-7">
                  <div
                    className="mx-auto h-28 w-28 rounded-full"
                    style={{ background: "var(--gradient-hero)" }}
                    aria-hidden="true"
                  />
                  <h3 className="mt-5 font-serif text-lg text-foreground">
                    {m.name}
                  </h3>
                  <div className="text-sm font-medium text-accent">
                    {m.title}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {m.bio}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PARTNERS */}
      <section className="border-t border-border bg-card py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              Our Partners
            </span>
            <h2 className="mt-3 font-serif">In Good Company</h2>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {partners.map((p) => (
              <div
                key={p}
                className="flex h-20 items-center justify-center rounded-xl border border-border/60 bg-background text-sm font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent"
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
