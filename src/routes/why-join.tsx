import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  TrendingUp,
  HeartHandshake,
  Sparkles,
  Globe2,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/why-join")({
  head: () => ({
    meta: [
      { title: "Why Join A-WIN? | African Women in Investment Network" },
      {
        name: "description",
        content:
          "Discover why women across Africa are joining A-WIN — empowerment, mentorship, financial growth and legacy building.",
      },
      { property: "og:title", content: "Why Join A-WIN?" },
      {
        property: "og:description",
        content: "Because when women invest, communities transform.",
      },
    ],
  }),
  component: WhyJoinPage,
});

const reasons = [
  {
    icon: Users,
    title: "Empowerment Through Collective Strength",
    body:
      "No woman should navigate the financial world alone. A-WIN surrounds you with experienced investors, honest mentors, and women who celebrate your wins.",
  },
  {
    icon: TrendingUp,
    title: "Financial Discipline and Growth",
    body:
      "Build real, lasting habits around saving, investing and growing your money — through structured programmes designed for every level.",
  },
  {
    icon: HeartHandshake,
    title: "Mentorship and Sisterhood",
    body:
      "Every A-WIN member connects with women who have walked the path before them. Our mentorship culture is built on generosity and genuine care.",
  },
  {
    icon: Sparkles,
    title: "Personal Development Opportunities",
    body:
      "Leadership workshops, masterclasses, and speaker events that stretch you beyond finance — into confidence, purpose and legacy.",
  },
  {
    icon: Globe2,
    title: "Community Contribution and Legacy Building",
    body:
      "What you build doesn't stay with you. A-WIN members fund bursaries, support community initiatives, and leave something lasting behind.",
  },
];

function WhyJoinPage() {
  return (
    <>
      <section
        className="relative overflow-hidden px-4 py-20 md:py-28 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--accent),transparent_55%)] opacity-25" />
        <div className="relative mx-auto max-w-4xl text-center animate-fade-in">
          <h1 className="font-serif text-4xl md:text-6xl font-semibold leading-tight">
            Why Join A-WIN?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base md:text-lg text-primary-foreground/90">
            Because when women invest, communities transform.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reasons.map((r) => {
              const Icon = r.icon;
              return (
                <Card
                  key={r.title}
                  className="border-border/60 shadow-[var(--shadow-elegant)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[var(--shadow-gold-glow)]"
                >
                  <CardContent className="p-6">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ background: "rgba(76, 175, 37, 0.12)" }}
                    >
                      <Icon className="h-6 w-6" style={{ color: "#4CAF25" }} />
                    </div>
                    <h3 className="mt-4 font-serif text-lg text-foreground">
                      {r.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {r.body}
                    </p>
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
            Ready to become an A-Winner?
          </h2>
          <Button
            asChild
            size="lg"
            className="mt-6 bg-foreground text-background hover:bg-foreground/90"
          >
            <Link to="/how-to-join">
              Join Us Today <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
