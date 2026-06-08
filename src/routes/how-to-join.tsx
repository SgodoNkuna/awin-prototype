import { createFileRoute, Link } from "@tanstack/react-router";
import {
  UserPlus,
  FileText,
  ShieldCheck,
  Mail,
  CreditCard,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/how-to-join")({
  head: () => ({
    meta: [
      { title: "How to Join | A-WIN" },
      {
        name: "description",
        content:
          "Step-by-step guide to becoming an A-WIN member — application, approval, and activation.",
      },
      { property: "og:title", content: "How to Join A-WIN" },
      {
        property: "og:description",
        content:
          "Apply, get approved and start investing with the A-WIN community.",
      },
    ],
  }),
  component: HowToJoinPage,
});

const steps = [
  {
    icon: UserPlus,
    title: "Create Your Account",
    body: "Sign up with your email and set a secure password.",
  },
  {
    icon: FileText,
    title: "Complete Your Application",
    body: "Tell us about you, your investing journey and goals.",
  },
  {
    icon: ShieldCheck,
    title: "Committee Review",
    body: "Our committee reviews applications on a rolling basis.",
  },
  {
    icon: Mail,
    title: "Receive Payment Details",
    body: "Verified applicants are sent A-WIN's bank details securely by our team.",
  },
  {
    icon: CreditCard,
    title: "Pay Your Fees",
    body: "Settle the annual fee and your first monthly contribution.",
  },
  {
    icon: Sparkles,
    title: "Activate Membership",
    body: "Access your member portal, resources and the A-WIN community.",
  },
];

const faqs = [
  {
    q: "Who is eligible to join A-WIN?",
    a: "Any woman 18 years or older who supports A-WIN's vision of financial empowerment is welcome to apply.",
  },
  {
    q: "How long does the application process take?",
    a: "Applications are reviewed on a rolling basis, typically within 1–2 weeks of submission.",
  },
  {
    q: "What are the membership fees?",
    a: "Fees are confirmed upon approval. Contact us via the form for current joining, annual, and monthly contribution amounts.",
  },
  {
    q: "How do I pay my contributions?",
    a: "A-WIN's bank account details are shared securely with verified applicants only. Monthly contributions are due by the 5th of every month.",
  },
  {
    q: "Can I cancel my membership later?",
    a: "Yes. Members can pause or end their membership at any time by contacting the committee.",
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
            How to Join A-WIN
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base md:text-lg text-primary-foreground/90">
            A simple, transparent path from application to active member.
          </p>
        </div>
      </section>

      {/* STEPS */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <ol className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.title}>
                  <Card className="h-full border-border/60 shadow-[var(--shadow-elegant)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[var(--shadow-gold-glow)]">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full font-serif text-sm font-semibold text-primary-foreground"
                          style={{ background: "#4CAF25" }}
                        >
                          {i + 1}
                        </div>
                        <Icon
                          className="h-5 w-5"
                          style={{ color: "#4CAF25" }}
                          aria-hidden
                        />
                      </div>
                      <h3 className="mt-4 font-serif text-lg text-foreground">
                        {s.title}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {s.body}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>

          {/* Application CTAs */}
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/auth">
                Start Application <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/membership">View Membership Tiers</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-secondary/50 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              Common Questions
            </span>
            <h2 className="mt-3 font-serif">Before You Apply</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Quick answers about eligibility, contributions and timelines.
            </p>
          </div>

          <Accordion
            type="single"
            collapsible
            className="mt-10 rounded-xl border border-border bg-card px-4 shadow-[var(--shadow-elegant)] awin-accordion"
          >
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left font-serif text-base text-foreground">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            More questions?{" "}
            <Link to="/faqs" className="font-medium text-primary story-link">
              See all FAQs
            </Link>{" "}
            or{" "}
            <Link to="/contact" className="font-medium text-primary story-link">
              contact us
            </Link>
            .
          </div>
        </div>
      </section>
    </>
  );
}
