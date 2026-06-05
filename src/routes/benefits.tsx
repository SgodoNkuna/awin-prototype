import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/benefits")({
  head: () => ({
    meta: [
      { title: "Member Benefits | A-WIN" },
      { name: "description", content: "Explore the benefits of A-WIN membership: events, education, deal flow and community." },
      { property: "og:title", content: "Member Benefits | A-WIN" },
      { property: "og:description", content: "Events, education, deal flow and community for African women investors." },
    ],
  }),
  component: BenefitsPage,
});

function BenefitsPage() {
  const benefits = [
    "Exclusive member events and networking dinners",
    "Investment masterclasses and learning series",
    "Access to curated deal flow and syndicates",
    "Mentorship from seasoned women investors",
    "Member directory and peer connections",
    "Discounts on partner programmes and conferences",
  ];
  return (
    <section className="container mx-auto px-4 py-16 md:px-8">
      <h1 className="font-serif text-4xl text-primary md:text-5xl">Member Benefits</h1>
      <p className="mt-4 max-w-2xl text-foreground/80">Your A-WIN membership unlocks community, capital and capability.</p>
      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {benefits.map((b) => (
          <li key={b} className="rounded-lg border border-border bg-card p-5 text-foreground/90">{b}</li>
        ))}
      </ul>
    </section>
  );
}
