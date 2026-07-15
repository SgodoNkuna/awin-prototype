import { Link } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import {
  Check,
  PenLine,
  UserRoundSearch,
  MailCheck,
  PartyPopper,
  Loader2,
  ShieldCheck,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";

// SINGLE MEMBERSHIP MODEL — must stay in sync with index.tsx and about.tsx.
// Verified by tests/content-consistency.test.ts.
export const MEMBERSHIP_MODEL = {
  fee: "R200",
  feeCadence: "/ year",
  contribution: "R500",
  contributionCadence: "/ month",
  foundedYear: "2025",
  benefits: [
    "Offshore tax free and curated investment opportunities",
    "Consultation with a qualified financial advisor",
    "Workshops, mentorship and a supportive sisterhood",
    "Business collaboration, crowdfunding and referrals",
  ],
} as const;

const STEPS = [
  { n: 1, title: "Submit Application", icon: PenLine, desc: "Fill out the form below with your details." },
  { n: 2, title: "Committee Review", icon: UserRoundSearch, desc: "Our team reviews within 5 business days." },
  { n: 3, title: "Payment Details", icon: MailCheck, desc: "Receive payment details securely after approval." },
  { n: 4, title: "Welcome to A-WIN", icon: PartyPopper, desc: "Access your member benefits and community." },
];

const applicationSchema = z.object({
  full_name: z.string().trim().min(1, "Required").max(120),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(6, "Required").max(30),
  id_number: z.string().trim().min(4, "Required").max(50),
  occupation: z.string().trim().min(1, "Required").max(120),
  employer: z.string().trim().max(120).optional(),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  // Repurposed: stores "Where did you hear about A-WIN?" (kept in `motivation` column for backward compatibility).
  motivation: z.string().trim().min(2, "Please tell us where you heard about A-WIN").max(2000),
  referral: z.string().trim().max(120).optional(),
});

const ONBOARDING = [
  "Proof of payment of the R200 joining fee",
  "Completed Letter of Authority (LoA) and Risk Profile Assessment (RPA)",
  "FICA documents submitted",
  "Consultation with a qualified Financial Advisor",
  "Completion of application forms for the investment",
];

const SUPPORT_EMAIL = "phumelele@thuthuka-sa.co.za";

function MembershipPage() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setDuplicateWarning(null);
      const fd = new FormData(e.currentTarget);
      const { sanitizeText, sanitizeOptionalText, sanitizeEmail, sanitizeIdNumber, sanitizePhone, isDuplicateError } =
        await import("@/lib/sanitize");

      let cleanEmail = "";
      try {
        cleanEmail = sanitizeEmail(String(fd.get("email") ?? ""));
      } catch {
        toast.error("Please enter a valid email address.");
        return;
      }

      const cleanIdNumber = sanitizeIdNumber(String(fd.get("id_number") ?? ""));

      const raw = {
        full_name: sanitizeText(String(fd.get("full_name") ?? "")),
        email: cleanEmail,
        phone: sanitizePhone(String(fd.get("phone") ?? "")),
        id_number: cleanIdNumber,
        occupation: sanitizeText(String(fd.get("occupation") ?? "")),
        employer: sanitizeOptionalText(String(fd.get("employer") ?? "")) ?? undefined,
        experience: String(fd.get("experience") ?? "") as "beginner" | "intermediate" | "advanced",
        motivation: sanitizeText(String(fd.get("motivation") ?? "")),
        referral: sanitizeOptionalText(String(fd.get("referral") ?? "")) ?? undefined,
      };

      const parsed = applicationSchema.safeParse(raw);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
        return;
      }

      setSubmitting(true);

      // Pre-flight duplicate check: existing application OR existing approved member.
      // Use parameterised .or() with .eq sub-clauses — never string interpolation into a filter.
      const [{ data: existingApp }, { data: existingMember }] = await Promise.all([
        supabase
          .from("applications")
          .select("id, status")
          .or(`email.eq.${cleanEmail},id_number.eq.${cleanIdNumber}`)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("id, membership_status")
          .eq("email", cleanEmail)
          .in("membership_status", ["active", "pending"])
          .maybeSingle(),
      ]);

      if (existingMember) {
        setSubmitting(false);
        setDuplicateWarning(
          "You are already a registered A-WIN member. Please sign in to access your member portal.",
        );
        return;
      }

      if (existingApp) {
        setSubmitting(false);
        const msg =
          existingApp.status === "approved"
            ? `An approved application already exists for this email or ID number. If you believe this is an error, please contact ${SUPPORT_EMAIL}.`
            : `An application for this email or ID number is already in progress (status: ${existingApp.status}). Please contact ${SUPPORT_EMAIL} if you need assistance.`;
        setDuplicateWarning(msg);
        return;
      }

      // tier column kept for backward compatibility; single model always stores "active".
      const { error } = await supabase.from("applications").insert({
        ...parsed.data,
        tier: "active",
        user_id: user?.id ?? null,
      });
      setSubmitting(false);

      if (error) {
        if (isDuplicateError(error)) {
          setDuplicateWarning(
            `An application with this email address or ID number already exists. Please contact ${SUPPORT_EMAIL} if you need assistance.`,
          );
          return;
        }
        toast.error("Could not submit. Please try again.");
        return;
      }
      setSubmitted(true);
      toast.success("Application received!");
      // Confirmation email — fire and forget, submission already succeeded.
      void import("@/lib/email.functions").then(({ sendApplicationReceivedEmail }) =>
        sendApplicationReceivedEmail({ data: { email: cleanEmail, fullName: parsed.data.full_name } }).catch(() => {}),
      );
      (e.target as HTMLFormElement).reset();
    },
    [user?.id],
  );


  const scrollToForm = () => {
    document.getElementById("application")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-primary/80 py-20 md:py-28 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-bold mb-4">Become a Member</h1>
          <p className="text-base md:text-xl max-w-2xl mx-auto opacity-95 leading-relaxed">
            You do not need a degree or a professional title to join A-WIN. You
            need a commitment to saving, investing, and growing with a community
            of women who have your back. If that sounds like you, you belong here.
          </p>
        </div>
      </section>

      {/* Single membership model */}
      <section id="fees" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">Fees &amp; Commitment</span>
            <h2 className="font-bold mt-2">One Membership · Built for Long Term Wealth</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              A-WIN follows a single, transparent membership model. Reviewed annually by the community.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 items-stretch">
            <Card className="border-border/60 shadow-[var(--shadow-elegant)]">
              <CardContent className="p-8">
                <div className="text-xs font-semibold uppercase tracking-widest text-accent">
                  Annual Membership Fee
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-serif text-4xl text-primary">{MEMBERSHIP_MODEL.fee}</span>
                  <span className="text-sm text-muted-foreground">{MEMBERSHIP_MODEL.feeCadence}</span>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Covers administration, member services and access to the A-WIN community.
                </p>
              </CardContent>
            </Card>

            <Card className="relative border-2 border-accent shadow-[var(--shadow-gold-glow)]">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
                Investment Commitment
              </Badge>
              <CardContent className="p-8">
                <div className="text-xs font-semibold uppercase tracking-widest text-accent">
                  Monthly Contribution
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-serif text-4xl text-primary">{MEMBERSHIP_MODEL.contribution}</span>
                  <span className="text-sm text-muted-foreground">{MEMBERSHIP_MODEL.contributionCadence} minimum</span>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Directed into collective investment opportunities curated for women investors.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 border-border/60 shadow-[var(--shadow-elegant)]">
            <CardContent className="p-8">
              <h3 className="font-serif text-foreground">What every member gets</h3>
              <ul className="mt-5 grid gap-3 md:grid-cols-2">
                {MEMBERSHIP_MODEL.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-foreground/85">{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={scrollToForm} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Apply Now
                </Button>
                <Button asChild variant="outline">
                  <Link to="/about">Read Our Story</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-8 flex items-center justify-center gap-1.5">
            <Info className="size-4" />
            Final benefits and payment details are confirmed upon approval.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="font-bold text-center mb-10 md:mb-14">Your Path to Membership</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {STEPS.map((step) => (
              <div key={step.n} className="text-center group">
                <div className="size-14 md:size-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl md:text-2xl font-bold transition-transform duration-200 group-hover:scale-110">
                  {step.n}
                </div>
                <step.icon className="size-6 mx-auto mb-2 text-accent" />
                <h3 className="font-semibold mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Onboarding requirements */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="border-2 border-accent/40 shadow-[var(--shadow-elegant)]">
            <CardContent className="p-8">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent">
                <ShieldCheck className="size-4" /> Onboarding requirements
              </div>
              <h3 className="font-serif text-foreground mt-2">What you'll need to complete onboarding</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Once your application is approved, you'll be guided through these steps to activate your A-WIN membership.
              </p>
              <ol className="mt-5 space-y-3">
                {ONBOARDING.map((item, i) => (
                  <li key={item} className="flex gap-3 text-sm">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                      {i + 1}
                    </span>
                    <span className="text-foreground/90 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Application form */}
      <section id="application" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="font-bold text-center mb-3">Apply Now</h2>
          <p className="text-center text-muted-foreground mb-10">
            Tell us about yourself — we'll be in touch within 5 business days.
          </p>

          {submitted ? (
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <div className="size-16 rounded-full bg-accent/20 text-accent flex items-center justify-center mx-auto">
                  <Check className="size-8" />
                </div>
                <h3 className="text-2xl font-semibold">Application received!</h3>
                <p className="text-muted-foreground">
                  We will review your application and contact you within 5 business days.
                </p>
                <Button asChild variant="outline">
                  <Link to="/">Back to Home</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input id="full_name" name="full_name" required maxLength={120} />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" name="email" type="email" required maxLength={255} />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input id="phone" name="phone" required maxLength={30} />
                  </div>
                  <div>
                    <Label htmlFor="id_number">ID Number *</Label>
                    <Input id="id_number" name="id_number" required maxLength={50} />
                  </div>
                  <div>
                    <Label htmlFor="occupation">Occupation *</Label>
                    <Input id="occupation" name="occupation" required maxLength={120} />
                  </div>
                  <div>
                    <Label htmlFor="employer">Employer</Label>
                    <Input id="employer" name="employer" maxLength={120} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="experience">Investment Experience *</Label>
                  <Select name="experience" defaultValue="beginner">
                    <SelectTrigger id="experience">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner — new to investing</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="motivation">Where did you hear about A-WIN? *</Label>
                  <Select name="motivation" defaultValue="Social media">
                    <SelectTrigger id="motivation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Social media">Social media</SelectItem>
                      <SelectItem value="Friend or member referral">Friend or member referral</SelectItem>
                      <SelectItem value="A-WIN event or workshop">A-WIN event or workshop</SelectItem>
                      <SelectItem value="Phumelele Ndumo (Founder)">Phumelele Ndumo (Founder)</SelectItem>
                      <SelectItem value="News / podcast / article">News / podcast / article</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="referral">Who referred you? (optional)</Label>
                  <Input id="referral" name="referral" maxLength={120} placeholder="Name of the person who told you" />
                </div>

                {duplicateWarning && (
                  <div
                    role="alert"
                    className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-100"
                  >
                    {duplicateWarning}
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
                  Submit Application
                </Button>
              </form>

              <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                <ShieldCheck className="size-5 text-accent shrink-0 mt-0.5" />
                <p>
                  Payment information is shared securely with verified applicants only. Our team will contact you with payment details after your application is reviewed.
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default MembershipPage;
