import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resources | A-WIN" },
      { name: "description", content: "Curated resources, guides and tools for African women investors." },
      { property: "og:title", content: "A-WIN Resources" },
      { property: "og:description", content: "Guides, reports and tools for women investors." },
    ],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  const items = [
    { title: "Getting Started in Investing", desc: "A primer for women beginning their investment journey." },
    { title: "Building an Investment Thesis", desc: "Frameworks for evaluating opportunities with conviction." },
    { title: "Angel & Syndicate Playbook", desc: "How to participate in and lead syndicate investments." },
    { title: "Reading List", desc: "Books, reports and newsletters curated by A-WIN members." },
  ];
  return (
    <section className="container mx-auto px-4 py-16 md:px-8">
      <h1 className="font-serif text-4xl text-primary md:text-5xl">Resources</h1>
      <p className="mt-4 max-w-2xl text-foreground/80">Tools, guides and reading to sharpen your investing edge.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {items.map((i) => (
          <div key={i.title} className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-serif text-xl text-primary">{i.title}</h3>
            <p className="mt-2 text-sm text-foreground/80">{i.desc}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">Members get access to the full resource library in the member portal.</p>
    </section>
  );
}
