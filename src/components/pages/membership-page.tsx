import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import {
  Check,
  ChevronRight,
  PenLine,
  UserRoundSearch,
  MailCheck,
  PartyPopper,
  Loader2,
  ShieldCheck,
  Info,
  Globe2,
  Home,
  HandCoins,
  BookOpen,
  Wallet,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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
import { EftPanel } from "@/components/site/EftPanel";
import { cn } from "@/lib/utils";

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

// Grounded in Phumelele's "Why I started A-Win" — real focus areas the
// community has named, not invented numbers.
const INVESTMENT_FOCUS = [
  { icon: Globe2, title: "Offshore Tax-Free Investing", body: "Access to offshore tax free investment vehicles, curated with a qualified financial advisor." },
  { icon: Home, title: "Property & Airbnb", body: "Our first collective investment: an Airbnb in Cape Town, guided by members who already run profitable Airbnbs." },
  { icon: HandCoins, title: "Business Crowdfunding", body: "Members crowdfund each other's businesses and open access to markets for one another." },
  { icon: BookOpen, title: "Financial Literacy", body: "Workshops and mentorship to grow financial knowledge, so every member invests with confidence." },
];

const STEPS = [
  { n: 1, title: "Submit Application", icon: PenLine, desc: "Fill out the form below with your details." },
  { n: 2, title: "Committee Review", icon: UserRoundSearch, desc: "Our team reviews within 5 business days." },
  { n: 3, title: "Payment Details", icon: MailCheck, desc: "Receive payment details securely after approval." },
  { n: 4, title: "Welcome to A-Win", icon: PartyPopper, desc: "Access your member benefits and community." },
];

const applicationSchema = z.object({
  full_name: z.string().trim().min(1, "Required").max(120),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(6, "Required").max(30),
  id_number: z.string().trim().min(4, "Required").max(50),
  occupation: z.string().trim().min(1, "Required").max(120),
  employer: z.string().trim().max(120).optional(),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  // Repurposed: stores "Where did you hear about A-Win?" (kept in `motivation` column for backward compatibility).
  motivation: z.string().trim().min(2, "Please tell us where you heard about A-Win").max(2000),
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

const APPLY_STEPS = [
  { n: 0, title: "Your Details", icon: PenLine },
  { n: 1, title: "Proof of Payment", icon: Wallet },
  { n: 2, title: "Done", icon: Check },
] as const;

function MembershipPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [popiaConsent, setPopiaConsent] = useState(false);

  // Multi-step apply flow: 0 = details, 1 = proof of payment, 2 = done.
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [applicantName, setApplicantName] = useState("");
  const [appStatus, setAppStatus] = useState<string | null>(null);
  const [resuming, setResuming] = useState(true);
  const [popFile, setPopFile] = useState<File | null>(null);
  const [paymentPurpose, setPaymentPurpose] = useState<"entry" | "monthly">("entry");
  const [paymentReference, setPaymentReference] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  // Resume an in-progress application for a returning, logged-in applicant.
  useEffect(() => {
    if (!user) { setResuming(false); return; }
    let cancelled = false;
    supabase
      .from("applications")
      .select("id, full_name, status, proof_of_payment_path, payment_reference")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setApplicationId(data.id);
          setApplicantName(data.full_name ?? "");
          setAppStatus(data.status);
          setPaymentReference(data.payment_reference ?? "");
          setStep(data.proof_of_payment_path ? 2 : 1);
        }
        setResuming(false);
      });
    // Keyed on the stable id, not the `user` object — useAuth() returns a
    // fresh `session?.user` object on every AuthProvider render, which would
    // otherwise re-run this fetch and clobber in-progress edits below. The
    // `cancelled` guard stops a stale run (e.g. React StrictMode's double
    // effect invocation in dev) from resolving after this one and clobbering
    // state a later effect (like EftPanel's) already corrected.
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const savePayment = useCallback(
    async (advance: boolean) => {
      if (!applicationId || !user) return;
      setSavingPayment(true);
      try {
        const patch: Record<string, unknown> = { payment_reference: paymentReference };
        if (popFile) {
          const ext = popFile.name.split(".").pop()?.toLowerCase() || "bin";
          if (popFile.size > 8 * 1024 * 1024) throw new Error("File must be under 8 MB");
          const path = `${user.id}/pop-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("onboarding-uploads")
            .upload(path, popFile, { upsert: false, contentType: popFile.type || undefined });
          if (upErr) throw upErr;
          patch.proof_of_payment_path = path;
          patch.proof_of_payment_uploaded_at = new Date().toISOString();
        }
        const { error } = await supabase.from("applications").update(patch as never).eq("id", applicationId);
        if (error) throw error;
        if (advance && patch.proof_of_payment_path) {
          setStep(2);
          toast.success("Proof of payment received!");
        } else {
          toast.success("Progress saved — come back anytime to finish uploading your proof of payment.");
        }
      } catch (err: any) {
        toast.error(err.message ?? "Could not save. Please try again.");
      } finally {
        setSavingPayment(false);
      }
    },
    [applicationId, user, popFile, paymentReference],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!user) {
        toast.error("Please create an account or sign in first — it's how we confirm your email and keep your application connected to you.");
        navigate({ to: "/auth" });
        return;
      }
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

      if (!popiaConsent) {
        toast.error("Please consent to POPIA data processing to continue.");
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
          "You are already a registered A-Win member. Please sign in to access your member portal.",
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
      const { data: inserted, error } = await supabase
        .from("applications")
        .insert({
          ...parsed.data,
          tier: "active",
          user_id: user?.id ?? null,
          popia_consent: true,
          popia_consent_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      setSubmitting(false);

      if (error || !inserted) {
        if (error && isDuplicateError(error)) {
          setDuplicateWarning(
            `An application with this email address or ID number already exists. Please contact ${SUPPORT_EMAIL} if you need assistance.`,
          );
          return;
        }
        toast.error("Could not submit. Please try again.");
        return;
      }
      setApplicationId(inserted.id);
      setApplicantName(parsed.data.full_name);
      setPopiaConsent(false);
      setStep(1);
      toast.success("Details saved — now let's get your proof of payment sorted.");
      // Confirmation email — fire and forget, submission already succeeded.
      void import("@/lib/email.functions").then(({ sendApplicationReceivedEmail }) =>
        sendApplicationReceivedEmail({ data: { email: cleanEmail, fullName: parsed.data.full_name } }).catch(() => {}),
      );
    },
    [user, popiaConsent, navigate],
  );


  const scrollToForm = () => {
    document.getElementById("application")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="page-header px-4 py-24">
        <div className="relative mx-auto max-w-5xl animate-fade-in">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
            <Link to="/" className="hover:text-accent transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-accent">Membership</span>
          </nav>
          <h1 className="mt-5 font-serif text-foreground">Become a Member</h1>
          <p className="mt-5 max-w-2xl text-muted-foreground md:text-lg">
            You do not need a degree or a professional title to join A-Win. You
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
              A-Win follows a single, transparent membership model. Reviewed annually by the community.
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
                  Covers administration, member services and access to the A-Win community.
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

      {/* How we invest together */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">Where Your Money Goes</span>
            <h2 className="font-bold mt-2">How We Invest Together</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Every member's monthly contribution is pooled into collective investment opportunities,
              chosen and reviewed by the community.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {INVESTMENT_FOCUS.map((f) => (
              <Card key={f.title} className="border-border/60 shadow-[var(--shadow-elegant)]">
                <CardContent className="p-6">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-serif text-base text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
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
                Once your application is approved, you'll be guided through these steps to activate your A-Win membership.
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
          <p className="text-center text-muted-foreground mb-8">
            Three quick steps. You can save your progress and come back anytime.
          </p>

          {resuming ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : appStatus === "approved" ? (
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <div className="size-16 rounded-full bg-accent/20 text-accent flex items-center justify-center mx-auto">
                  <PartyPopper className="size-8" />
                </div>
                <h3 className="text-2xl font-semibold">You're already approved!</h3>
                <p className="text-muted-foreground">
                  Head over to onboarding to sign your membership agreement and finish setting up.
                </p>
                <Button asChild><Link to="/onboarding">Continue to Onboarding</Link></Button>
              </CardContent>
            </Card>
          ) : appStatus === "rejected" ? (
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <h3 className="text-2xl font-semibold">Application not approved</h3>
                <p className="text-muted-foreground">
                  Your previous application wasn't approved. If you believe this is a mistake, please
                  contact <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Step indicator */}
              <ol className="mb-8 flex items-center justify-center gap-2">
                {APPLY_STEPS.map((s, i) => (
                  <li key={s.n} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                        step > s.n
                          ? "border-primary bg-primary text-white"
                          : step === s.n
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      {step > s.n ? <Check className="size-4" /> : <s.icon className="size-4" />}
                    </div>
                    <span className={cn("hidden text-xs font-medium sm:inline", step === s.n ? "text-accent-deep" : "text-muted-foreground")}>
                      {s.title}
                    </span>
                    {i < APPLY_STEPS.length - 1 && <ChevronRight className="size-4 text-muted-foreground" />}
                  </li>
                ))}
              </ol>

              {!user && (
                <div className="mb-5 rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm">
                  You'll need to{" "}
                  <Link to="/auth" className="font-semibold underline">sign in or create an account</Link>{" "}
                  before submitting — this confirms your email and keeps your application, and later your
                  onboarding, linked to you. You can fill in the form first.
                </div>
              )}

              {step === 0 && (
                <>
                  <div className="mb-5 flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-foreground/80">
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent-deep" />
                    <p>Tip: have your ID number and cellphone handy — it takes about 2 minutes.</p>
                  </div>
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
                          <SelectItem value="beginner">Beginner (new to investing)</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="motivation">Where did you hear about A-Win? *</Label>
                      <Select name="motivation" defaultValue="Social media">
                        <SelectTrigger id="motivation">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Social media">Social media</SelectItem>
                          <SelectItem value="Friend or member referral">Friend or member referral</SelectItem>
                          <SelectItem value="A-Win event or workshop">A-Win event or workshop</SelectItem>
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

                    <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-secondary/30">
                      <Checkbox
                        checked={popiaConsent}
                        onCheckedChange={(v) => setPopiaConsent(!!v)}
                        className="mt-0.5"
                      />
                      <span className="text-sm text-muted-foreground">
                        I consent to A-Win processing my personal information (name, ID number, contact
                        details) for the purpose of reviewing this application, in terms of the Protection
                        of Personal Information Act (POPIA).
                      </span>
                    </label>

                    <Button type="submit" size="lg" className="w-full" disabled={submitting || !popiaConsent || !user}>
                      {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
                      Continue <ChevronRight className="ml-1 size-4" />
                    </Button>
                  </form>
                </>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-foreground/80">
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent-deep" />
                    <p>
                      Tip: pay by EFT using the reference below, then upload your proof here. Not ready to
                      pay right now? Use <strong>Save &amp; Continue Later</strong> below — we'll pick up right
                      where you left off next time you visit this page.
                    </p>
                  </div>
                  <EftPanel
                    fullName={applicantName}
                    userSeed={user?.id}
                    purpose={paymentPurpose}
                    onPurposeChange={setPaymentPurpose}
                    file={popFile}
                    onFileChange={setPopFile}
                    onReferenceChange={setPaymentReference}
                  />
                  <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => savePayment(false)}
                      disabled={savingPayment}
                    >
                      {savingPayment ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                      Save &amp; Continue Later
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      className="ml-auto"
                      onClick={() => savePayment(true)}
                      disabled={savingPayment || !popFile}
                    >
                      {savingPayment ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                      Continue <ChevronRight className="ml-1 size-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <Card>
                  <CardContent className="pt-6 text-center space-y-4">
                    <div className="size-16 rounded-full bg-accent/20 text-accent flex items-center justify-center mx-auto">
                      <Check className="size-8" />
                    </div>
                    <h3 className="text-2xl font-semibold">You're all set{applicantName ? `, ${applicantName.split(" ")[0]}` : ""}!</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Your application and proof of payment are in. The committee reviews within 5 business
                      days — once approved, you'll complete your Letter of Authority, Risk Profile and FICA
                      documents to finish onboarding.
                    </p>
                    <Button asChild variant="outline">
                      <Link to="/">Back to Home</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {step < 2 && (
                <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  <ShieldCheck className="size-5 text-accent shrink-0 mt-0.5" />
                  <p>
                    Your details and proof of payment are shared securely and reviewed by the committee only.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default MembershipPage;
