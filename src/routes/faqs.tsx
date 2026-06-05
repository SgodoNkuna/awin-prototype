import { createFileRoute } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/faqs")({
  head: () => ({
    meta: [
      { title: "FAQs | A-WIN" },
      { name: "description", content: "Frequently asked questions about A-WIN membership, events and community." },
      { property: "og:title", content: "A-WIN FAQs" },
      { property: "og:description", content: "Answers to common questions about A-WIN." },
    ],
  }),
  component: FAQsPage,
});

const faqs = [
  { q: "Who can join A-WIN?", a: "A-WIN is open to African women investors, founders and allies committed to advancing women in investment." },
  { q: "How much does membership cost?", a: "Membership fees vary by tier. See the How to Join page for current pricing." },
  { q: "How are applications reviewed?", a: "Our committee reviews applications on a rolling basis, typically within two weeks." },
  { q: "Do you host in-person events?", a: "Yes — A-WIN hosts a mix of in-person and virtual events across the continent." },
  { q: "Can I cancel my membership?", a: "Yes. Membership is annual and you can choose not to renew at the end of your term." },
];

function FAQsPage() {
  return (
    <section className="container mx-auto px-4 py-16 md:px-8">
      <h1 className="font-serif text-4xl text-primary md:text-5xl">Frequently Asked Questions</h1>
      <p className="mt-4 max-w-2xl text-foreground/80">Everything you need to know about joining and being part of A-WIN.</p>
      <Accordion type="single" collapsible className="mt-10 w-full max-w-3xl">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-left font-serif text-lg text-primary">{f.q}</AccordionTrigger>
            <AccordionContent className="text-foreground/80">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
