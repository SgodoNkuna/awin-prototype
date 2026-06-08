import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PiggyBank,
  GraduationCap,
  Users,
  Award,
  HandHeart,
  Trophy,
  BookOpen,
  CalendarDays,
  ArrowRight,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/benefits")({
  head: () => ({
    meta: [
      { title: "Membership Benefits | A-WIN" },
      {
        name: "description",
        content:
          "Tangible and intangible — A-WIN membership opens doors to financial growth, mentorship, and a powerful network.",
      },
      { property: "og:title", content: "Your Membership Benefits | A-WIN" },
      {
        property: "og:description",
        content: "A-WIN membership opens doors.",
      },
    ],
  }),
  component: BenefitsPage,
});

const benefits = [
  {
    icon: PiggyBank,
    title: "Monthly Contribution System",
    body: "A structured monthly financial contribution system with returns.",
  },
  {
    icon: GraduationCap,
    title: "Financial Literacy Workshops",
    body: "Access to expert-led masterclasses and ongoing education.",
  },
  {
    icon: Users,
    title: "Investor Network",
    body: "Network with like-minded women investors across Africa.",
  },
  {
    icon: Award,
    title: "Leadership Development",
    body: "Programmes that build confidence, vision and influence.",
  },
  {
    icon: HandHeart,
    title: "Community Outreach",
    body: "Participate in initiatives that uplift other women and girls.",
  },
  {
    icon: Trophy,
    title: "Milestone Recognition",
    body: "Celebration of personal and financial milestones as a community.",
  },
  {
    icon: BookOpen,
    title: "Resources Library",
    body: "Access A-WIN's curated library of guides, tools and templates.",
  },
  {
    icon: CalendarDays,
    title: "Summits & Exclusive Events",
    body: "Invitations to annual summits and members-only gatherings.",
  },
];

function BenefitsPage() {
  return (
    <>
      <section
        className="relative overflow-hidden px-4 py-20 md:py-28 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--accent),transparent_55%)] opacity-25" />
        <div className="relative mx-auto max-w-4xl text-center animate-fade-in">
          <h1 className="font-serif text-4xl md:text-6xl font-semibold leading-tight">
            Your Membership Benefits
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base md:text-lg text-primary-foreground/90">
            Tangible and intangible — A-WIN membership opens doors.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <Card
                  key={b.title}
                  className="border-border/60 shadow-[var(--shadow-elegant)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[var(--shadow-gold-glow)]"
                >
                  <CardContent className="flex items-start gap-4 p-6">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "rgba(76, 175, 37, 0.12)" }}
                    >
                      <Icon className="h-5 w-5" style={{ color: "#4CAF25" }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Check
                          className="h-4 w-4"
                          style={{ color: "#4CAF25" }}
                        />
                        <h3 className="font-serif text-base text-foreground">
                          {b.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {b.body}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="relative overflow-hidden py-16 text-accent-foreground"
        style={{ background: "var(--gradient-gold)" }}
      >
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-serif text-accent-foreground">
            Find the tier that fits you
          </h2>
          <Button
            asChild
            size="lg"
            className="mt-6 bg-foreground text-background hover:bg-foreground/90"
          >
            <Link to="/membership">
              See Membership Tiers <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
