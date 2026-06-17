import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/portfolio")({
  component: PortfolioPage,
  head: () => ({
    meta: [
      { title: "Portfolio | A-WIN" },
      { name: "description", content: "Showcase of A-WIN member businesses and ventures." },
      { property: "og:title", content: "Portfolio — A-WIN Members" },
      { property: "og:description", content: "Discover the women-led businesses in the A-WIN network." },
    ],
  }),
});

function PortfolioPage() {
  return (
    <div className="container mx-auto px-4 py-20 md:px-8 md:py-28">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">A-WIN Network</p>
        <h1 className="mt-3 font-serif text-4xl text-foreground md:text-6xl">Member Portfolio</h1>
        <p className="mt-5 text-lg text-muted-foreground">
          A curated showcase of the women-led businesses, investments, and ventures driving the
          A-WIN network forward. Full directory and quick-view profiles launching shortly.
        </p>
      </header>

      <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/5] rounded-2xl border border-border bg-gradient-to-br from-secondary to-muted shadow-[var(--shadow-elegant)]"
            aria-hidden="true"
          />
        ))}
      </div>

      <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-muted-foreground">
        Member profiles will appear here. Members can opt-in to be featured from their portal.
      </p>
    </div>
  );
}
