import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Linkedin, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/committee")({
  head: () => ({
    meta: [
      { title: "Our Committee | A-WIN" },
      {
        name: "description",
        content:
          "Meet the women leading A-WIN's mission of financial empowerment for African women in investment.",
      },
      { property: "og:title", content: "Our Committee | A-WIN" },
      {
        property: "og:description",
        content: "The women leading A-WIN's mission of financial empowerment.",
      },
    ],
  }),
  component: CommitteePage,
});

const members = Array.from({ length: 6 }).map((_, i) => ({
  id: i,
  name: "[Member Name]",
  role: "[Committee Role]",
  business: "[TBC]",
  bio: "Profile coming soon. Full bio, qualifications and headshot will be added before launch.",
}));

function CommitteePage() {
  return (
    <>
      {/* HERO */}
      <section
        className="relative overflow-hidden px-4 py-20 md:py-28 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--accent),transparent_55%)] opacity-25" />
        <div className="relative mx-auto max-w-4xl text-center animate-fade-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-accent backdrop-blur-md">
            Leadership
          </span>
          <h1 className="mt-6 font-serif text-4xl md:text-6xl font-semibold leading-tight">
            Meet Our Committee
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base md:text-lg text-primary-foreground/90">
            The women leading A-WIN's mission of financial empowerment.
          </p>
        </div>
      </section>

      {/* GRID */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 md:gap-7">
            {members.map((m) => (
              <Card
                key={m.id}
                className="group border-border/60 shadow-[var(--shadow-elegant)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[var(--shadow-gold-glow)]"
              >
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-muted-foreground md:h-28 md:w-28">
                    <Camera className="h-8 w-8 opacity-60" aria-hidden />
                    <span className="sr-only">A-WIN</span>
                  </div>
                  <h3 className="mt-4 font-serif text-lg text-foreground">
                    {m.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-accent">
                    {m.role}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    {m.business}
                  </p>
                  <p className="mt-3 max-h-0 overflow-hidden text-sm text-muted-foreground opacity-0 transition-all duration-300 group-hover:max-h-32 group-hover:opacity-100">
                    {m.bio}
                  </p>
                  <Linkedin
                    className="mt-4 h-4 w-4 text-muted-foreground/50"
                    aria-label="LinkedIn (coming soon)"
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* PENDING CALLOUT */}
          <div className="mt-12 rounded-xl border border-accent/40 bg-accent/10 p-6 text-center">
            <p className="text-sm text-foreground/80">
              A-WIN committee profiles are being finalised. Full headshots and
              bios will be added before the site launches.
            </p>
          </div>

          {/* BOTTOM CTA */}
          <div className="mt-12 text-center">
            <p className="text-foreground/80">
              Interested in joining the committee?
            </p>
            <Button asChild className="mt-4">
              <Link to="/contact">
                Contact Us <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
