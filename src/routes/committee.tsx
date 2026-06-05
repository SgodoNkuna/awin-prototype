import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/committee")({
  head: () => ({
    meta: [
      { title: "Committee | A-WIN" },
      { name: "description", content: "Meet the A-WIN committee leading the African Women Investment Network." },
      { property: "og:title", content: "Committee | A-WIN" },
      { property: "og:description", content: "Meet the A-WIN committee." },
    ],
  }),
  component: CommitteePage,
});

function CommitteePage() {
  return (
    <section className="container mx-auto px-4 py-16 md:px-8">
      <h1 className="font-serif text-4xl text-primary md:text-5xl">Committee</h1>
      <p className="mt-4 max-w-2xl text-foreground/80">
        Meet the women leading A-WIN — our committee guides strategy, partnerships and member programmes.
      </p>
      <div className="mt-10 rounded-lg border border-border bg-card p-8 text-card-foreground">
        <p className="text-sm text-muted-foreground">Committee profiles coming soon.</p>
      </div>
    </section>
  );
}
