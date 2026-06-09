import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Users, FileText, CreditCard, Sparkles, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-to-join")({
  head: () => ({
    meta: [
      { title: "How to Join A-WIN" },
      { name: "description", content: "Five simple steps to becoming an A-Winner — read, orient, apply, pay, and welcome." },
      { property: "og:title", content: "How to Join A-WIN" },
      { property: "og:description", content: "Five simple steps to start your journey with A-WIN." },
    ],
  }),
  component: HowToJoinPage,
});

const AWIN_GREEN = "#4CAF25";

const steps = [
  {
    icon: BookOpen,
    title: "Read and Learn",
    body: "Download and read the Welcome Letter. Learn about A-WIN's mission, values, and what membership means for you.",
    cta: { label: "Get the Welcome Letter", to: "/resources" as const, kind: "link" as const },
  },
  {
    icon: Users,
    title: "Attend an Orientation",
    body: "Join a virtual or in-person orientation session to meet the team and ask any questions you may have.",
    note: "Orientation schedule — details to be confirmed by A-WIN leadership.",
  },
  {
    icon: FileText,
    title: "Submit Your Application",
    body: "Complete the membership application form with your details and motivation.",
    cta: { label: "Apply Now", to: "/membership" as const, kind: "button" as const },
  },
  {
    icon: CreditCard,
    title: "Pay the Joining Fee",
    body: "Once your application is reviewed and approved, you will receive secure payment details from our team. A once-off joining fee applies.",
    note: "Fee amount — to be confirmed by A-WIN leadership.",
  },
  {
    icon: Sparkles,
    title: "Welcome to A-WIN",
    body: "Begin your monthly contributions, attend your first meeting, and start your investment journey with your new A-WIN family.",
  },
];

function HowToJoinPage() {
  return (
    <>
      {/* HERO */}
      <section
        className="relative overflow-hidden px-4 py-20 md:py-28 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--accent),transparent_55%)] opacity-25" />
        <div className="relative mx-auto max-w-4xl text-center animate-fade-in">
          <h1 className="font-serif text-4xl md:text-6xl font-semibold leading-tight">
            How to Become an A-Winner
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base md:text-lg text-primary-foreground/90">
            Five simple steps to start your journey with us.
          </p>
        </div>
      </section>

      {/* STEPS */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <ol className="relative grid grid-cols-1 gap-10 md:grid-cols-5 md:gap-6">
            {/* horizontal connector (desktop) */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 right-0 top-8 hidden h-1 md:block"
              style={{
                background: `linear-gradient(to right, ${AWIN_GREEN}33, ${AWIN_GREEN}, ${AWIN_GREEN}33)`,
              }}
            />
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.title} className="relative flex flex-col items-center text-center md:items-center">
                  {/* vertical connector (mobile) */}
                  {i < steps.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-1/2 top-20 -z-0 h-[calc(100%+1rem)] w-1 -translate-x-1/2 md:hidden"
                      style={{ background: `${AWIN_GREEN}55` }}
                    />
                  )}

                  <div
                    className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full font-serif text-2xl font-bold text-white shadow-[var(--shadow-elegant)]"
                    style={{ background: AWIN_GREEN }}
                  >
                    {i + 1}
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <Icon className="h-5 w-5" style={{ color: AWIN_GREEN }} aria-hidden />
                    <h3 className="font-serif text-lg text-foreground">{s.title}</h3>
                  </div>

                  <p className="mt-3 max-w-xs text-sm text-muted-foreground">{s.body}</p>

                  {s.cta?.kind === "link" && (
                    <Link
                      to={s.cta.to}
                      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      {s.cta.label} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  {s.cta?.kind === "button" && (
                    <Button
                      asChild
                      size="sm"
                      className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      <Link to={s.cta.to}>
                        {s.cta.label} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                  {s.note && (
                    <p className="mt-4 max-w-xs rounded-md border border-dashed border-border bg-secondary/60 px-3 py-2 text-xs italic text-muted-foreground">
                      {s.note}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>

          {/* IMPORTANT NOTE BOX */}
          <div
            role="note"
            className="mx-auto mt-16 max-w-3xl rounded-xl border-l-4 bg-accent-soft/40 p-5 text-sm text-foreground shadow-[var(--shadow-elegant)]"
            style={{ borderLeftColor: AWIN_GREEN }}
          >
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0" style={{ color: AWIN_GREEN }} aria-hidden />
              <p>
                <span className="font-semibold">Working draft —</span> the 5 steps
                are being finalised by A-WIN's Leadership Team and will be
                confirmed before this page goes live.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="bg-secondary/50 py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-serif">Ready to apply?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Fill in the application form and a member of our team will be in touch.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Link to="/membership">
              Apply Now <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
