import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SignaturePad } from "@/components/site/SignaturePad";
import { sendLoaRpaReceivedEmail } from "@/lib/email.functions";
import { buildLoaRpaPdf } from "@/lib/loa-rpa-pdf";
import { emptyLoaData, emptyRpaData, type LoaData, type RpaData } from "@/lib/loa-rpa-types";
import { THUTHUKA_LOGO_PNG_BASE64 } from "@/lib/thuthuka-logo-base64";

export const Route = createFileRoute("/loa-rpa")({
  head: () => ({
    meta: [
      { title: "LOA & Risk Profile | A-Win" },
      {
        name: "description",
        content: "Complete your Letter of Authority and Risk Profile Analysis with ThuthukaSA (FSP No. 47992).",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoaRpaPage,
});

async function sha256(text: string) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const DOC_VERSION = "loa-rpa-v1.0-2026";

const INCOME_MAX = 100000;
const INCOME_STEP = 1000;
const formatIncome = (v: number) =>
  v >= INCOME_MAX ? `R${INCOME_MAX.toLocaleString()}+` : `R${v.toLocaleString()}`;

function LoaRpaPage() {
  const sendReceivedEmail = useServerFn(sendLoaRpaReceivedEmail);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const source = useMemo<"whatsapp" | "website">(
    () => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("src") === "whatsapp" ? "whatsapp" : "website"),
    [],
  );

  // Your details
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [loa, setLoa] = useState<LoaData>(emptyLoaData());
  const [rpa, setRpa] = useState<RpaData>(emptyRpaData());
  const [incomeValue, setIncomeValue] = useState(10000);
  const [loaAgree, setLoaAgree] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [signatureType, setSignatureType] = useState<"typed" | "drawn">("typed");
  const [typedSignature, setTypedSignature] = useState("");
  const [drawnSignature, setDrawnSignature] = useState("");

  // Keep the submitted value in sync with the slider's default even if the
  // applicant never touches it — onValueChange only fires on interaction.
  useEffect(() => {
    setRpaField("grossMonthlyIncome")(formatIncome(incomeValue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fill from the applicant's own membership application, if any.
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      const { data } = await supabase
        .from("applications")
        .select("id, full_name, email, phone, id_number")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return;
      setApplicationId(data.id);
      setFullName(data.full_name ?? "");
      setEmail(data.email ?? user.email ?? "");
      setPhone(data.phone ?? "");
      setLoa((l) => ({ ...l, idNumber: data.id_number ?? "" }));
      setRpa((r) => ({ ...r, cellPhone: data.phone ?? "", email: data.email ?? user.email ?? "" }));
    })();
  }, []);

  const nameValid = fullName.trim().length > 2;
  const idValid = /^\d{13}$/.test(loa.idNumber.replace(/\s+/g, ""));
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = /^[+\d\s()-]{8,}$/.test(phone);
  const signatureValid = signatureType === "typed" ? typedSignature.trim().length > 2 : drawnSignature.length > 0;

  const canSubmit =
    nameValid && idValid && emailValid && phoneValid && loaAgree && privacyConsent && signatureValid && !submitting;

  const setRpaField = (key: keyof RpaData) => (value: string) => setRpa((r) => ({ ...r, [key]: value }));

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const dateStr = new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" });
      const loaFull: LoaData = { ...loa, telephone: phone };
      const rpaFull: RpaData = { ...rpa, cellPhone: phone, email };
      const docHash = await sha256(JSON.stringify({ fullName, loa: loaFull, rpa: rpaFull, DOC_VERSION }));

      // 1. Generate the signed PDF client-side.
      const pdfBlob = await buildLoaRpaPdf({
        fullName: fullName.trim(),
        loa: loaFull,
        rpa: rpaFull,
        signatureType,
        signatureTypedName: typedSignature.trim(),
        signatureDrawnData: drawnSignature,
        dateStr,
      });

      // 2. Upload it to the private loa-rpa-documents bucket.
      const path = `${Date.now()}-${loa.idNumber.replace(/\s+/g, "") || "submission"}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("loa-rpa-documents")
        .upload(path, pdfBlob, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;

      // 3. Insert the submission row (RLS: public insert allowed).
      const { error: insErr } = await supabase.from("loa_rpa_submissions").insert({
        application_id: applicationId,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        source,
        loa_data: loaFull as any,
        rpa_data: rpaFull as any,
        privacy_consent: true,
        signature_type: signatureType,
        signature_typed_name: signatureType === "typed" ? typedSignature.trim() : null,
        signature_drawn_data: signatureType === "drawn" ? drawnSignature : null,
        signature_user_agent: navigator.userAgent,
        signature_doc_hash: docHash,
        pdf_path: path,
      });
      if (insErr) throw insErr;

      setDone(true);
      toast.success("Submitted. A confirmation email is on its way.");
      void sendReceivedEmail({ data: { email: email.trim(), fullName: fullName.trim(), source } }).catch(() => {});
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <section className="py-24">
        <div className="mx-auto max-w-lg px-4 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Check className="size-8" />
          </div>
          <h1 className="mt-6 font-serif text-3xl text-foreground">All done</h1>
          <p className="mt-3 text-muted-foreground">
            Your signed Letter of Authority and Risk Profile Analysis have been submitted to ThuthukaSA. We've
            emailed you a confirmation. No further action is needed right now.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        className="relative overflow-hidden px-4 py-16 text-primary-foreground md:py-20"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-primary-deep/10" />
        <div className="relative mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary-foreground/70">
            <Link to="/" className="hover:text-accent transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-hero-foreground">LOA &amp; Risk Profile</span>
          </nav>
          <h1 className="mt-5 font-serif">Letter of Authority &amp; Risk Profile</h1>
          <div className="mt-4 flex items-center gap-3">
            <img
              src={THUTHUKA_LOGO_PNG_BASE64}
              alt="ThuthukaSA"
              className="size-10 rounded-full bg-white p-1 shadow-sm"
            />
            <p className="max-w-xl text-primary-foreground/95 md:text-lg">
              Two short forms required by ThuthukaSA (FSP No. 47992) so we can guide your investment appropriately.
              Takes about 5 minutes on your phone.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-2xl space-y-8 px-4">
          {/* Your details */}
          <Card className="border-border/60">
            <CardContent className="space-y-4 p-6">
              <h2 className="font-serif text-xl text-foreground">Your details</h2>
              <div className="grid gap-4">
                <div>
                  <Label>Full name (per ID book) *</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Nokuthula Dlamini" />
                </div>
                <div>
                  <Label>ID number *</Label>
                  <Input value={loa.idNumber} onChange={(e) => setLoa({ ...loa, idNumber: e.target.value })} placeholder="13 digits" maxLength={13} />
                  {loa.idNumber && !idValid && <p className="mt-1 text-xs text-destructive">SA ID must be 13 digits.</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Cell phone number *</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27 82 123 4567" />
                    {phone && !phoneValid && <p className="mt-1 text-xs text-destructive">Enter a valid phone number.</p>}
                  </div>
                  <div>
                    <Label>Email address *</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    {email && !emailValid && <p className="mt-1 text-xs text-destructive">Enter a valid email.</p>}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Gender</Label>
                    <Select value={rpa.gender} onValueChange={setRpaField("gender")}>
                      <SelectTrigger><SelectValue placeholder="Choose one" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Work number</Label>
                    <Input value={rpa.workNumber} onChange={(e) => setRpaField("workNumber")(e.target.value)} />
                  </div>
                  <div>
                    <Label>Qualification</Label>
                    <Input value={rpa.qualification} onChange={(e) => setRpaField("qualification")(e.target.value)} />
                  </div>
                  <div>
                    <Label>Occupation</Label>
                    <Input value={rpa.occupation} onChange={(e) => setRpaField("occupation")(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-baseline justify-between">
                      <Label>Gross monthly income</Label>
                      <span className="text-sm font-semibold text-primary">{formatIncome(incomeValue)}</span>
                    </div>
                    <Slider
                      className="mt-2"
                      min={0}
                      max={INCOME_MAX}
                      step={INCOME_STEP}
                      value={[incomeValue]}
                      onValueChange={([v]) => {
                        setIncomeValue(v);
                        setRpaField("grossMonthlyIncome")(formatIncome(v));
                      }}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Before deductions, per month</p>
                  </div>
                  <div>
                    <Label>Marital status</Label>
                    <Input value={rpa.maritalStatus} onChange={(e) => setRpaField("maritalStatus")(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Stokvel name</Label>
                    <Input value={rpa.stokvelName} onChange={(e) => setRpaField("stokvelName")(e.target.value)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LOA */}
          <Card className="border-border/60">
            <CardContent className="space-y-4 p-6">
              <h2 className="font-serif text-xl text-foreground">Letter of Authority</h2>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-secondary/20 p-4 text-sm leading-relaxed text-foreground/90">
                <p>
                  I, the undersigned, hereby authorise <strong>Phumelele Ndumo</strong>, or any/the following
                  member of his/her staff, <strong>Khanyiswa Buthelezi</strong>, to obtain any information on my
                  behalf regarding my assurance and/or investment portfolio, and any of my employee benefits, from
                  any life office, retirement fund or other financial institution directly, or by using the
                  services of The Financial Services Exchange (Pty.) Ltd., trading as Astute.
                </p>
                <p className="mt-3">
                  I hereby give consent to any financial institution or employer in possession of information
                  regarding my insurance, investment and employee benefits portfolio to release that information
                  upon request directly to the person who is in terms of this document authorised to request it, or
                  to the authorised person via Astute. This consent may possibly have a restricting influence on my
                  constitutional right to privacy. This authorisation shall remain valid for 6 months (180 days)
                  from date of my signature.
                </p>
                <p className="mt-3">
                  I further request the financial institutions with whom Phumelele Ndumo has a sales agreement to
                  indicate him/her on their records as my official care intermediary. This appointment may be
                  revoked by me in writing at any time.
                </p>
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-secondary/30">
                <Checkbox checked={loaAgree} onCheckedChange={(v) => setLoaAgree(!!v)} className="mt-0.5" />
                <span className="text-sm">I have read the authorisation above and I agree to be bound by its terms.</span>
              </label>
            </CardContent>
          </Card>

          {/* RPA */}
          <Card className="border-border/60">
            <CardContent className="space-y-5 p-6">
              <h2 className="font-serif text-xl text-foreground">Risk Profile Analysis</h2>
              <p className="text-sm text-muted-foreground">Please answer as accurately as possible — this guides which investments suit you.</p>

              <div>
                <Label>1. What is the objective for the investment? <span className="font-normal text-muted-foreground">e.g. saving for school/varsity fees</span></Label>
                <Textarea rows={2} value={rpa.objective} onChange={(e) => setRpaField("objective")(e.target.value)} />
              </div>
              <div>
                <Label>2. What is the term of your investment?</Label>
                <Input value={rpa.term} onChange={(e) => setRpaField("term")(e.target.value)} />
              </div>
              <div>
                <Label>3. How much would you like to invest per month? <span className="font-normal text-muted-foreground">Minimum R500</span></Label>
                <Input value={rpa.monthlyAmount} onChange={(e) => setRpaField("monthlyAmount")(e.target.value)} placeholder="R500" />
              </div>
              <div>
                <Label>4. What is your risk appetite?</Label>
                <Select value={rpa.riskAppetite} onValueChange={setRpaField("riskAppetite")}>
                  <SelectTrigger><SelectValue placeholder="Choose one" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aggressive">Aggressive</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="Conservative">Conservative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>5. Are you scared of losing money?</Label>
                <p className="mb-1.5 text-xs text-muted-foreground">
                  With equities, you can lose money in the short term but you are likely to have good capital growth in the long term (5 years+).
                </p>
                <YesNo value={rpa.scaredOfLosingMoney} onChange={setRpaField("scaredOfLosingMoney")} />
              </div>
              <div>
                <Label>6. Are you likely to withdraw your money in the next 12 or 24 months?</Label>
                <YesNo value={rpa.withdrawSoon} onChange={setRpaField("withdrawSoon")} />
              </div>
              <div>
                <Label>7. Do you have investments? If yes, where and how much?</Label>
                <Textarea rows={2} value={rpa.existingInvestments} onChange={(e) => setRpaField("existingInvestments")(e.target.value)} />
              </div>
              <div>
                <Label>8. How much do you know about investing?</Label>
                <Textarea rows={2} value={rpa.investingKnowledge} onChange={(e) => setRpaField("investingKnowledge")(e.target.value)} />
              </div>
              <div>
                <Label>9. Do you have an emergency fund?</Label>
                <YesNo value={rpa.emergencyFund} onChange={setRpaField("emergencyFund")} />
              </div>
              <div>
                <Label>10. Do you have children? If yes, how many and their ages?</Label>
                <Textarea rows={2} value={rpa.children} onChange={(e) => setRpaField("children")(e.target.value)} />
              </div>
              <div>
                <Label>11. Have you saved for their university education?</Label>
                <Input value={rpa.savedForEducation} onChange={(e) => setRpaField("savedForEducation")(e.target.value)} />
              </div>
              <div>
                <Label>12. Have you saved for your own retirement?</Label>
                <Input value={rpa.savedForRetirement} onChange={(e) => setRpaField("savedForRetirement")(e.target.value)} />
              </div>
              <div>
                <Label>Would you like to subscribe to our newsletter? <span className="font-normal text-muted-foreground">It's free</span></Label>
                <YesNo value={rpa.newsletterSubscribe} onChange={setRpaField("newsletterSubscribe")} />
              </div>
            </CardContent>
          </Card>

          {/* Privacy + signature */}
          <Card className="border-border/60">
            <CardContent className="space-y-5 p-6">
              <h2 className="font-serif text-xl text-foreground">Sign &amp; submit</h2>

              <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm leading-relaxed text-foreground/90">
                <p className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span>
                    Your details on this form are shared with ThuthukaSA (FSP No. 47992) solely to prepare your
                    Letter of Authority and Risk Profile, in terms of POPIA. They are not used for any other
                    purpose without your consent.
                  </span>
                </p>
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-secondary/30">
                <Checkbox checked={privacyConsent} onCheckedChange={(v) => setPrivacyConsent(!!v)} className="mt-0.5" />
                <span className="text-sm">I consent to A-Win and ThuthukaSA processing my personal information as described above.</span>
              </label>

              <div className="flex gap-2 rounded-lg border border-border p-1">
                <button
                  type="button"
                  onClick={() => setSignatureType("typed")}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${signatureType === "typed" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
                >
                  Type my signature
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureType("drawn")}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${signatureType === "drawn" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
                >
                  Draw my signature
                </button>
              </div>

              {signatureType === "typed" ? (
                <div>
                  <Label>Type your full name to sign *</Label>
                  <Input
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    placeholder={fullName || "Type your full name"}
                    className="font-serif text-lg italic"
                  />
                </div>
              ) : (
                <div>
                  <Label>Draw your signature *</Label>
                  <SignaturePad value={drawnSignature} onChange={setDrawnSignature} />
                </div>
              )}

              <Button onClick={submit} disabled={!canSubmit} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
                {submitting ? <><Loader2 className="mr-2 size-4 animate-spin" /> Submitting…</> : <>Submit LOA &amp; Risk Profile</>}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}

function YesNo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      {["Yes", "No"].map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-md border px-5 py-2 text-sm font-medium transition-colors ${value === opt ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:bg-secondary"}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
