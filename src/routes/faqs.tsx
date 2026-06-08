import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faqs")({
  head: () => ({
    meta: [
      { title: "Frequently Asked Questions | A-WIN" },
      {
        name: "description",
        content:
          "Everything you need to know about A-WIN membership — eligibility, fees, contributions and payment details.",
      },
      { property: "og:title", content: "FAQs | A-WIN" },
      {
        property: "og:description",
        content: "Everything you need to know about A-WIN membership.",
      },
    ],
  }),
  component: FaqsPage,
});

const faqs = [
  {
    q: "Can I sign up my daughter? Is there an age restriction?",
    a: "Yes, members must be at least 18 years old. Minors cannot join independently, but young women are encouraged to learn about A-WIN and apply when eligible.",
  },
  {
    q: "Can I sign up my mom?",
    a: "Yes, any woman 18 years or older who supports the vision of A-WIN is welcome to join, regardless of age.",
  },
  {
    q: "What is the joining fee?",
    a: "Amount to be confirmed — please contact us for current membership fees.",
  },
  {
    q: "Why is there an annual fee?",
    a: "The annual fee supports operational costs such as venue hire, training materials, and events that enhance the member experience.",
  },
  {
    q: "What is the monthly contribution?",
    a: "Amount to be confirmed — contact us for current contribution amounts.",
  },
  {
    q: "Where is the money invested?",
    a: "Funds are securely managed in low-risk, high-trust financial instruments. Full transparency reports are shared with members quarterly.",
  },
  {
    q: "When are monthly contributions due?",
    a: "Contributions are due by the 5th of every month.",
  },
  {
    q: "How do I receive payment details?",
    a: "To protect our members and ensure secure transactions, A-WIN bank account details are shared directly with verified prospective members. Contact us via our contact form or reach out to a committee member to receive payment information.",
  },
];

function FaqsPage() {
  return (
    <>
      <section
        className="relative overflow-hidden px-4 py-20 md:py-28 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--accent),transparent_55%)] opacity-25" />
        <div className="relative mx-auto max-w-4xl text-center animate-fade-in">
          <h1 className="font-serif text-4xl md:text-6xl font-semibold leading-tight">
            Frequently Asked Questions
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base md:text-lg text-primary-foreground/90">
            Everything you need to know about A-WIN membership.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4">
          <Accordion
            type="single"
            collapsible
            className="awin-accordion rounded-xl border border-border bg-card px-4 shadow-[var(--shadow-elegant)]"
          >
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left font-serif text-base text-foreground">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-10 rounded-xl border border-accent/40 bg-accent/10 p-6 text-center">
            <p className="text-sm text-foreground/80">
              Have a question not answered here? We'll add it to this page.
            </p>
            <p className="mt-3 text-sm">
              More questions?{" "}
              <Link
                to="/contact"
                className="font-medium text-primary story-link"
              >
                Contact us →
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
