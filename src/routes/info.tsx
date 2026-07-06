import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, ShieldCheck, HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/info")({
  head: () => ({
    meta: [
      { title: "FAQ & Privacy | A-WIN" },
      {
        name: "description",
        content: "Frequently asked questions about A-WIN membership, dues and investments — plus our privacy and data policies.",
      },
      { property: "og:title", content: "A-WIN — FAQ & Privacy" },
      { property: "og:description", content: "Answers about membership, dues, investing — and how we handle your data." },
    ],
  }),
  component: InfoPage,
});

const FAQS: { q: string; a: string }[] = [
  {
    q: "Who can join A-WIN?",
    a: "Any woman who shares our vision of financial empowerment and is able to pay the nominal annual fee (currently R200/year) and contribute a minimum of R500/month toward collective investments. Women new to investing are especially welcome.",
  },
  {
    q: "How much does it cost?",
    a: "Annual membership is R200, reviewed each year in line with our needs. Members also commit R500/month toward collective investment opportunities — this is yours, invested in tax free offshore vehicles and other carefully selected instruments.",
  },
  {
    q: "What kind of investments does A-WIN access?",
    a: "Offshore tax free investments and other carefully selected growth opportunities tailored for women investors, with a focus on medium-to-long term wealth building. Each member receives a consultation with a qualified financial advisor who recommends a portfolio aligned with her risk appetite and goals.",
  },
  {
    q: "I've never invested before — is A-WIN right for me?",
    a: "Absolutely. A-WIN is the perfect place to start. We run regular workshops, mentorship sessions and beginner-friendly content. Our community is here to demystify investing, not gate-keep it.",
  },
  {
    q: "Can I support other members' businesses?",
    a: "Yes — collaboration is core to A-WIN. Members support each other through business referrals, crowdfunding initiatives and intentional buying from member-owned businesses.",
  },
  {
    q: "How do I apply?",
    a: "Submit the membership application form. Our committee reviews each application and replies within 5–7 working days. Once approved, you pay your annual dues to activate your membership.",
  },
  {
    q: "Can I cancel my membership?",
    a: "Yes. Membership is annual; you may choose not to renew at the end of your year. Funds already invested follow the redemption rules of the underlying investment vehicle — your financial advisor will guide you.",
  },
];

function InfoPage() {
  return (
    <>
      <section
        className="relative overflow-hidden px-4 py-24 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-primary-deep/10" />
        <div className="relative mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary-foreground/70">
            <Link to="/" className="hover:text-accent">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-accent">FAQ & Privacy</span>
          </nav>
          <h1 className="mt-5 font-serif">FAQ & Privacy</h1>
          <p className="mt-5 max-w-2xl text-primary-foreground/85 md:text-lg">
            Common questions about A-WIN — and how we handle your information.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="h-5 w-5 text-accent" />
            <h2 className="font-serif">Frequently asked questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`q${i}`} className="rounded-lg border bg-card px-4">
                <AccordionTrigger className="text-left font-medium">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* PRIVACY */}
      <section className="bg-secondary/40 border-t border-border py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <h2 className="font-serif">Privacy & data</h2>
          </div>
          <Card>
            <CardContent className="p-8 space-y-5 text-muted-foreground leading-relaxed text-sm">
              <p>
                This page is maintained by A-WIN to explain what data we collect, how we use it, and
                your rights. It is provided for transparency and is not a substitute for legal
                advice or formal regulatory compliance documentation.
              </p>
              <div>
                <div className="font-semibold text-foreground">What we collect</div>
                <p className="mt-1">
                  When you apply for membership or contact us, we collect your name, email, phone
                  number, and the information you provide in the application. When you become a
                  member, we additionally store your tier, membership status, joined date, and
                  payment records.
                </p>
              </div>
              <div>
                <div className="font-semibold text-foreground">How we use it</div>
                <p className="mt-1">
                  To process your application, communicate with you about A-WIN events and benefits,
                  reconcile your dues, and operate the member portal. We do not sell your data.
                </p>
              </div>
              <div>
                <div className="font-semibold text-foreground">Who can see it</div>
                <p className="mt-1">
                  Only A-WIN administrators and you (your own record). Member-only documents and the
                  members directory require an active membership to access.
                </p>
              </div>
              <div>
                <div className="font-semibold text-foreground">Security</div>
                <p className="mt-1">
                  Authentication and database access are protected by row-level security policies.
                  Payment processing is handled by accredited payment providers; A-WIN does not
                  store card numbers.
                </p>
              </div>
              <div>
                <div className="font-semibold text-foreground">Your rights</div>
                <p className="mt-1">
                  You may request a copy of the data we hold on you, ask us to correct inaccuracies,
                  or request deletion of your account. Email <a className="text-accent underline" href="mailto:info@awin.africa">info@awin.africa</a>.
                </p>
              </div>
              <div>
                <div className="font-semibold text-foreground">Terms summary</div>
                <p className="mt-1">
                  Membership is annual and non-transferable. Investment outcomes are not guaranteed;
                  any examples shown are illustrative. Members are responsible for their own
                  investment decisions, with the advisor's guidance.
                </p>
              </div>
              <p className="text-xs">Last updated: this page is editable by A-WIN administrators in the admin console.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
