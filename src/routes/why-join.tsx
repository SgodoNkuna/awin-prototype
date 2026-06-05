import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/why-join")({
  head: () => ({
    meta: [
      { title: "Why Join? | A-WIN" },
      { name: "description", content: "Discover why African women investors are joining A-WIN to build wealth, community and influence." },
      { property: "og:title", content: "Why Join A-WIN?" },
      { property: "og:description", content: "Community, capital and capability for African women investors." },
    ],
  }),
  component: WhyJoinPage,
});

function WhyJoinPage() {
  const reasons = [
    { title: "Community", body: "Connect with a powerful network of African women investors across the continent." },
    { title: "Capital", body: "Access investment opportunities, syndicates and pooled capital initiatives." },
    { title: "Capability", body: "Sharpen your investing skills through masterclasses, mentorship and resources." },
    { title: "Influence", body: "Amplify your voice in shaping policy, markets and the next generation of founders." },
  ];
  return (
    <section className="container mx-auto px-4 py-16 md:px-8">
      <h1 className="font-serif text-4xl text-primary md:text-5xl">Why Join?</h1>
      <p className="mt-4 max-w-2xl text-foreground/80">A-WIN is more than a network — it's a movement of women investing in women.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {reasons.map((r) => (
          <div key={r.title} className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-serif text-xl text-primary">{r.title}</h3>
            <p className="mt-2 text-sm text-foreground/80">{r.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-10">
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/how-to-join">How to Join</Link>
        </Button>
      </div>
    </section>
  );
}
