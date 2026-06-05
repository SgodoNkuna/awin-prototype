import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-to-join")({
  head: () => ({
    meta: [
      { title: "How to Join | A-WIN" },
      { name: "description", content: "Step-by-step guide to becoming an A-WIN member." },
      { property: "og:title", content: "How to Join A-WIN" },
      { property: "og:description", content: "Apply, get approved and start investing with the A-WIN community." },
    ],
  }),
  component: HowToJoinPage,
});

function HowToJoinPage() {
  const steps = [
    { n: 1, t: "Create your account", d: "Sign up with your email and set a secure password." },
    { n: 2, t: "Complete your application", d: "Tell us about you, your investing journey and goals." },
    { n: 3, t: "Get approved", d: "Our committee reviews applications on a rolling basis." },
    { n: 4, t: "Activate your membership", d: "Pay your annual membership fee and access your member portal." },
  ];
  return (
    <section className="container mx-auto px-4 py-16 md:px-8">
      <h1 className="font-serif text-4xl text-primary md:text-5xl">How to Join</h1>
      <p className="mt-4 max-w-2xl text-foreground/80">Joining A-WIN takes just a few steps.</p>
      <ol className="mt-10 grid gap-6 md:grid-cols-2">
        {steps.map((s) => (
          <li key={s.n} className="rounded-lg border border-border bg-card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-serif text-accent-foreground">{s.n}</div>
            <h3 className="mt-4 font-serif text-xl text-primary">{s.t}</h3>
            <p className="mt-2 text-sm text-foreground/80">{s.d}</p>
          </li>
        ))}
      </ol>
      <div className="mt-10 flex gap-3">
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/auth">Start Application</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/benefits">View Benefits</Link>
        </Button>
      </div>
    </section>
  );
}
