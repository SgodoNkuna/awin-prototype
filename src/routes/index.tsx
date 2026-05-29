import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <section
      className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-20 text-primary-foreground"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--accent),transparent_55%)] opacity-20" />

      <div className="relative mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs font-medium tracking-wide text-accent uppercase">
          <Sparkles className="h-3.5 w-3.5" />
          Foundation ready
        </span>

        <h1 className="mt-6 font-serif text-accent">
          African Women in Investment Network
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base text-primary-foreground/80 md:text-lg">
          The design system is in place. The full homepage, member portal, and admin
          dashboard arrive in the next prompts.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
            className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <Link to="/about">About A-WIN</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
