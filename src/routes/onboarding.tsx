import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, FileCheck2, ShieldCheck, Upload, PenLine, Loader2, Stamp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SignaturePad } from "@/components/site/SignaturePad";
import { EftPanel, buildEftReference } from "@/components/site/EftPanel";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding | A-WIN" },
      { name: "description", content: "Complete your A-WIN membership onboarding: personal details, consent, agreement and proof of payment." },
    ],
  }),
  component: OnboardingPage,
});

const AGREEMENT_VERSION = "v1.0-2026";

const AGREEMENT_TEXT = `A-WIN MEMBERSHIP AGREEMENT (${AGREEMENT_VERSION})

1. Membership. I apply to join the African Women Investment Network (A-WIN) as a member and agree to the annual membership fee of R200 and the minimum monthly collective investment contribution of R500.

2. Purpose. I understand that A-WIN is a peer community that pools resources for education, mentorship and collective investment opportunities. A-WIN is not a licensed financial services provider. Investment recommendations are provided by qualified independent advisors.

3. Fair Use. I agree to act with integrity, respect fellow members, and not use A-WIN spaces or member data for solicitation, marketing or personal gain without consent.

4. Contributions and Refunds. Monthly contributions are directed into collective investment vehicles. Withdrawals follow the published exit process and may take up to 60 days. Annual membership fees are non refundable once the year has commenced.

5. POPIA and Privacy. My personal information will be processed lawfully in terms of the Protection of Personal Information Act (POPIA). Data is used only for membership administration, investment record keeping, and A-WIN communications.

6. Risk. All investments carry risk. Past performance does not guarantee future results. I confirm that I am making this commitment voluntarily and after my own consideration.

7. E-Signature. By typing my full legal name and submitting this form, I confirm that this constitutes my electronic signature and has the same legal effect as a handwritten signature under the Electronic Communications and Transactions Act 25 of 2002.

8. Amendments. The Main Committee may update these terms with reasonable notice to members.`;

type Step = 0 | 1 | 2 | 3 | 4 | 5;

const STEPS: { key: Step; label: string; icon: typeof FileCheck2 }[] = [
  { key: 0, label: "Details", icon: PenLine },
  { key: 1, label: "Consent", icon: ShieldCheck },
  { key: 2, label: "Sign", icon: FileCheck2 },
  { key: 3, label: "Pay", icon: Wallet },
  { key: 4, label: "Stamp", icon: Stamp },
  { key: 5, label: "Done", icon: Check },
];

/** Mask an SA ID for display: show first 6 + last 2 digits. */
function maskId(id: string) {
  const clean = id.replace(/\s+/g, "");
  if (clean.length < 8) return "•••••••••••••";
  return `${clean.slice(0, 6)} ••••• ${clean.slice(-2)}`;
}

async function sha256(text: string) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [docHash, setDocHash] = useState<string>("");

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [occupation, setOccupation] = useState("");
  const [employer, setEmployer] = useState("");
  const [motivation, setMotivation] = useState("");
  const [popia, setPopia] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  const [agree, setAgree] = useState(false);
  const [popFile, setPopFile] = useState<File | null>(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [drawnSignature, setDrawnSignature] = useState("");
  const [purpose, setPurpose] = useState<"entry" | "monthly">("entry");
  const [stampAcknowledged, setStampAcknowledged] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setUserEmail(data.user?.email ?? "");
    });
    sha256(AGREEMENT_TEXT).then(setDocHash);
  }, []);

  const nameMatches = useMemo(
    () => typedSignature.trim().toLowerCase() === fullName.trim().toLowerCase() && typedSignature.trim().length > 2,
    [typedSignature, fullName],
  );

  // Fair-use validators
  const idValid = /^\d{13}$/.test(idNumber.replace(/\s+/g, ""));
  const phoneValid = /^[+\d\s()-]{8,}$/.test(phone);
  const step0Valid = fullName.trim().length > 2 && phoneValid && idValid && occupation.trim().length > 1 && motivation.trim().length > 20;
  const step1Valid = popia;
  const step2Valid = agree && nameMatches && drawnSignature.length > 0;
  const step3Valid = !!popFile && paymentRef.trim().length > 2;
  const step4Valid = stampAcknowledged;

  const canGoNext =
    (step === 0 && step0Valid) ||
    (step === 1 && step1Valid) ||
    (step === 2 && step2Valid) ||
    (step === 3 && step3Valid) ||
    (step === 4 && step4Valid);

  const requireLogin = () => {
    toast.error("Please sign in to complete onboarding");
    navigate({ to: "/auth" });
  };

  const submit = async () => {
    if (!userId) return requireLogin();
    if (!step3Valid) return;
    setSubmitting(true);
    try {
      // 1. Upload proof of payment to private bucket under userId prefix
      const ext = popFile!.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${userId}/pop-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("onboarding-uploads")
        .upload(path, popFile!, { upsert: false, contentType: popFile!.type || undefined });
      if (upErr) throw upErr;

      // 2. Insert application row with e-signature audit trail
      const nowIso = new Date().toISOString();
      const { error: insErr } = await supabase.from("applications").insert({
        user_id: userId,
        full_name: fullName.trim(),
        email: userEmail,
        phone: phone.trim(),
        id_number: idNumber.replace(/\s+/g, ""),
        occupation: occupation.trim(),
        employer: employer.trim() || null,
        experience: "beginner" as any,
        motivation: motivation.trim(),
        tier: "general" as any,
        status: "pending" as any,
        agreement_version: AGREEMENT_VERSION,
        agreement_accepted_at: nowIso,
        signature_typed_name: typedSignature.trim(),
        signature_user_agent: navigator.userAgent,
        signature_doc_hash: docHash,
        popia_consent: true,
        popia_consent_at: nowIso,
        proof_of_payment_path: path,
        proof_of_payment_uploaded_at: nowIso,
        payment_reference: paymentRef.trim(),
      } as any);
      if (insErr) throw insErr;

      setStep(4);
      toast.success("Onboarding submitted. We will review and be in touch.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section
        className="relative overflow-hidden px-4 py-16 text-white md:py-20"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-primary-deep/10" />
        <div className="relative mx-auto max-w-5xl">
          <Badge className="bg-white/15 text-white hover:bg-white/15">Membership Onboarding</Badge>
          <h1 className="mt-4 font-serif text-white">Join the sisterhood in one flow</h1>
          <p className="mt-3 max-w-2xl text-white/90">
            Complete your personal details, consent to our privacy terms, sign the membership agreement, and upload your proof of payment. It takes about 5 minutes.
          </p>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-4xl px-4">
          {/* Progress */}
          <ol className="mb-8 grid grid-cols-5 gap-2">
            {STEPS.map((s) => {
              const done = step > s.key;
              const current = step === s.key;
              const Icon = s.icon;
              return (
                <li key={s.key} className="flex flex-col items-center gap-1.5 text-center">
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                      done ? "border-primary bg-primary text-white" : current ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-4" /> : <Icon className="size-4" />}
                  </div>
                  <span className={cn("text-[10px] uppercase tracking-widest", current ? "text-accent-deep font-semibold" : "text-muted-foreground")}>{s.label}</span>
                </li>
              );
            })}
          </ol>

          <Card className="border-border/60 shadow-[var(--shadow-elegant)]">
            <CardContent className="p-6 md:p-8 space-y-6">
              {!userId && step < 4 && (
                <div className="rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm">
                  You will need to <button className="font-semibold underline" onClick={requireLogin}>sign in</button> before submitting. You can fill everything in first.
                </div>
              )}

              {step === 0 && (
                <div className="space-y-4">
                  <h2 className="font-serif text-2xl text-foreground">Your details</h2>
                  <p className="text-sm text-muted-foreground">These details are stored securely and used only for membership administration.</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Full legal name *</Label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Nokuthula Dlamini" />
                    </div>
                    <div>
                      <Label>Phone *</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27 82 123 4567" />
                      {phone && !phoneValid && <p className="mt-1 text-xs text-destructive">Enter a valid phone number.</p>}
                    </div>
                    <div>
                      <Label>SA ID number *</Label>
                      <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="13 digits" maxLength={13} />
                      {idNumber && !idValid && <p className="mt-1 text-xs text-destructive">SA ID must be 13 digits.</p>}
                    </div>
                    <div>
                      <Label>Occupation *</Label>
                      <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g. Attorney" />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Employer (optional)</Label>
                      <Input value={employer} onChange={(e) => setEmployer(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Why do you want to join A-WIN? *</Label>
                      <Textarea value={motivation} onChange={(e) => setMotivation(e.target.value)} rows={4} placeholder="Share your goals and what you hope to contribute (min. 20 characters)." />
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="font-serif text-2xl text-foreground">POPIA consent</h2>
                  <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm leading-relaxed text-foreground/90">
                    <p><strong>How we use your data.</strong> A-WIN processes your personal information under the Protection of Personal Information Act (POPIA) for the purposes of: (a) member administration, (b) investment record keeping, (c) sending you A-WIN updates, and (d) legal or regulatory compliance.</p>
                    <p className="mt-3"><strong>Your rights.</strong> You may request access to, correction of, or deletion of your personal information at any time by emailing the Main Committee. We will not share your data with third parties without your consent, except where required by law.</p>
                    <p className="mt-3"><strong>Retention.</strong> Membership records are retained for the duration of your membership plus 5 years, in line with FICA requirements.</p>
                  </div>
                  <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-secondary/30">
                    <Checkbox checked={popia} onCheckedChange={(v) => setPopia(!!v)} className="mt-0.5" />
                    <span className="text-sm">
                      I have read and I consent to A-WIN processing my personal information for the purposes described above, in terms of POPIA.
                    </span>
                  </label>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="font-serif text-2xl text-foreground">Membership agreement</h2>
                  <div className="max-h-72 overflow-y-auto rounded-lg border border-border bg-secondary/20 p-4 text-sm leading-relaxed whitespace-pre-line">
                    {AGREEMENT_TEXT}
                  </div>
                  <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-secondary/30">
                    <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
                    <span className="text-sm">
                      I have read the agreement in full and I agree to be bound by its terms.
                    </span>
                  </label>
                  <div>
                    <Label>Type your full legal name to sign *</Label>
                    <Input
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      placeholder={fullName || "Type your full name exactly as above"}
                      className="font-serif text-lg italic"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Your typed name must match the full legal name from step 1.
                    </p>
                    {typedSignature && !nameMatches && (
                      <p className="mt-1 text-xs text-destructive">Signature does not match your full legal name.</p>
                    )}
                  </div>
                  <div>
                    <Label>Draw your signature *</Label>
                    <SignaturePad value={drawnSignature} onChange={setDrawnSignature} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      We keep your typed name, drawn signature, timestamp, browser and agreement version as a full audit trail — the equivalent of a wet signature under the ECT Act.
                    </p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="font-serif text-2xl text-foreground">Pay by EFT</h2>
                  <p className="text-sm text-muted-foreground">
                    Copy the details below into your banking app, then upload your proof of payment. Your reference is generated automatically so the treasurer can auto-match your payment.
                  </p>
                  <EftPanel
                    fullName={fullName}
                    userSeed={userId ?? userEmail}
                    purpose={purpose}
                    onPurposeChange={setPurpose}
                    file={popFile}
                    onFileChange={setPopFile}
                    onReferenceChange={setPaymentRef}
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <h2 className="font-serif text-2xl text-foreground">Stamped membership record</h2>
                  <p className="text-sm text-muted-foreground">
                    This is how your certified record will look once the Main Committee has reviewed your proof of payment. Sensitive information is blurred to protect your privacy.
                  </p>

                  <StampedDocPreview
                    fullName={fullName}
                    idNumber={idNumber}
                    phone={phone}
                    occupation={occupation}
                    motivation={motivation}
                    typedSignature={typedSignature}
                    drawnSignature={drawnSignature}
                    reference={paymentRef}
                    purpose={purpose}
                    docHash={docHash}
                  />

                  <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-secondary/30">
                    <Checkbox checked={stampAcknowledged} onCheckedChange={(v) => setStampAcknowledged(!!v)} className="mt-0.5" />
                    <span className="text-sm">
                      I confirm the details above are correct and I authorise the Main Committee to stamp and register my membership on verification.
                    </span>
                  </label>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4 text-center py-8">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="size-8" />
                  </div>
                  <h2 className="font-serif text-2xl text-foreground">You're all set</h2>
                  <p className="mx-auto max-w-md text-sm text-muted-foreground">
                    Your onboarding has been submitted. The Main Committee will verify your proof of payment and confirm your membership by email within 5 working days.
                  </p>
                  <div className="flex justify-center gap-3 pt-2">
                    <Button asChild variant="outline">
                      <Link to="/">Back to home</Link>
                    </Button>
                    <Button asChild>
                      <Link to="/portal">Go to my portal</Link>
                    </Button>
                  </div>
                </div>
              )}

              {/* Nav buttons */}
              {step < 4 && (
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setStep((s) => (s > 0 ? ((s - 1) as Step) : s))}
                    disabled={step === 0 || submitting}
                  >
                    <ChevronLeft className="mr-1 size-4" /> Back
                  </Button>
                  {step < 3 ? (
                    <Button
                      onClick={() => setStep((s) => ((s + 1) as Step))}
                      disabled={!canGoNext}
                      className="bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      Continue <ChevronRight className="ml-1 size-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={submit}
                      disabled={!canGoNext || submitting}
                      className="bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      {submitting ? <><Loader2 className="mr-1 size-4 animate-spin" /> Submitting…</> : <>Submit onboarding <Check className="ml-1 size-4" /></>}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
