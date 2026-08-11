import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronRight, Loader2, ShieldCheck, FileDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/site/SignaturePad";
import { sendLoaRpaReceivedEmail } from "@/lib/email.functions";
import { buildLoaPdf, downloadBlankLoaTemplate } from "@/lib/loa-rpa-pdf";
import { emptyLoaData, emptyRpaData, type LoaData } from "@/lib/loa-rpa-types";
import { THUTHUKA_LOGO_PNG_BASE64 } from "@/lib/thuthuka-logo-base64";
import { cn } from "@/lib/utils";

/**
 * Short LOA-only path — no Risk Profile Analysis. For people who aren't
 * joining A-Win, or just need Astute-facing paperwork, so they aren't put
 * through the full 12-question risk questionnaire for no reason. Shares the
 * confidentiality model with /loa-rpa (advisor-only visibility, standalone
 * PDF) — it's the RPA step that's skipped here, not the security.
 */
export const Route = createFileRoute("/loa")({
  head: () => ({
    meta: [
      { title: "Letter of Authority | A-Win" },
      {
        name: "description",
        content: "Complete your Letter of Authority with ThuthukaSA (FSP No. 47992).",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoaOnlyPage,
});

async function sha256(text: string) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const DOC_VERSION = "loa-only-v1.0-2026";

function LoaOnlyPage() {
  const sendReceivedEmail = useServerFn(sendLoaRpaReceivedEmail);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const source = useMemo<"whatsapp" | "website">(
    () => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("src") === "whatsapp" ? "whatsapp" : "website"),
    [],
  );

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loa, setLoa] = useState<LoaData>(emptyLoaData());
  const [loaAgree, setLoaAgree] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [signatureType, setSignatureType] = useState<"typed" | "drawn">("typed");
  const [typedSignature, setTypedSignature] = useState("");
  const [drawnSignature, setDrawnSignature] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const detailsSectionRef = useRef<HTMLDivElement>(null);
  const loaSectionRef = useRef<HTMLDivElement>(null);
  const signSectionRef = useRef<HTMLDivElement>(null);

  const nameValid = fullName.trim().length > 2;
  const idValid = /^\d{13}$/.test(loa.idNumber.replace(/\s+/g, ""));
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = /^[+\d\s()-]{8,}$/.test(phone);
  const signatureValid = signatureType === "typed" ? typedSignature.trim().length > 2 : drawnSignature.length > 0;

  const detailsInvalid = !nameValid || !idValid || !phoneValid || !emailValid;
  const loaInvalid = !loaAgree;
  const signInvalid = !privacyConsent || !signatureValid;

  const canSubmit = !detailsInvalid && !loaInvalid && !signInvalid && !submitting;

  const handleSubmitClick = () => {
    if (submitting) return;
    if (!canSubmit) {
      setSubmitAttempted(true);
      const missing: string[] = [];
      if (!nameValid) missing.push("Full name");
      if (!idValid) missing.push("ID number");
      if (!phoneValid) missing.push("Cell phone number");
      if (!emailValid) missing.push("Email address");
      if (!loaAgree) missing.push("Letter of Authority agreement");
      if (!privacyConsent) missing.push("Privacy consent");
      if (!signatureValid) missing.push("Signature");
      toast.error("Please complete: " + missing.join(", "));
      const firstInvalidRef = detailsInvalid ? detailsSectionRef : loaInvalid ? loaSectionRef : signSectionRef;
      firstInvalidRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    submit();
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const dateStr = new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" });
      const loaFull: LoaData = { ...loa, telephone: phone };
      const docHash = await sha256(JSON.stringify({ fullName, loa: loaFull, DOC_VERSION }));

      // Only the standalone LOA PDF — there's no RPA data here to combine it with.
      const pdfBlob = await buildLoaPdf({
        fullName: fullName.trim(),
        loa: loaFull,
        rpa: emptyRpaData(),
        signatureType,
        signatureTypedName: typedSignature.trim(),
        signatureDrawnData: drawnSignature,
        dateStr,
      });

      const idStub = loa.idNumber.replace(/\s+/g, "") || "submission";
      const path = `${Date.now()}-${idStub}-loa-only.pdf`;
      const { error: upErr } = await supabase.storage
        .from("loa-rpa-documents")
        .upload(path, pdfBlob, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("loa_rpa_submissions").insert({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        source,
        loa_data: loaFull as any,
        rpa_data: emptyRpaData() as any,
        privacy_consent: true,
        signature_type: signatureType,
        signature_typed_name: signatureType === "typed" ? typedSignature.trim() : null,
        signature_drawn_data: signatureType === "drawn" ? drawnSignature : null,
        signature_user_agent: navigator.userAgent,
        signature_doc_hash: docHash,
        pdf_path: path,
        loa_pdf_path: path,
        loa_only: true,
      });
      if (insErr) throw insErr;

      setDone(true);
      toast.success("Submitted. A confirmation email is on its way.");
      void sendReceivedEmail({ data: { email: email.trim(), fullName: fullName.trim(), source, loaOnly: true } }).catch(() => {});
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
            Your signed Letter of Authority has been submitted to ThuthukaSA. We've emailed you a confirmation. No
            further action is needed right now.
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
      <section className="page-header px-4 py-16 md:py-20">
        <div className="relative mx-auto max-w-2xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-foreground/65">
            <Link to="/" className="hover:text-accent transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-accent">Letter of Authority</span>
          </nav>
          <h1 className="mt-5 font-serif text-foreground">Letter of Authority</h1>
          <div className="mt-4 flex items-center gap-3">
            <img
              src={THUTHUKA_LOGO_PNG_BASE64}
              alt="ThuthukaSA"
              className="h-14 w-auto shrink-0 rounded-md bg-white p-1.5 shadow-sm"
            />
            <p className="max-w-xl text-foreground/80 md:text-lg">
              One short form required by ThuthukaSA (FSP No. 47992). Takes about a minute on your phone.
            </p>
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-foreground/85">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>
              The information you provide on this form is submitted directly to ThuthukaSA, your appointed
              Financial Services Provider, and is treated as confidential as required by the Financial Advisory
              and Intermediary Services Act (FAIS) and POPIA.
            </span>
          </p>
          <button
            type="button"
            onClick={() => downloadBlankLoaTemplate()}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:text-accent hover:underline"
          >
            <FileDown className="size-3.5" /> Download the blank template (unsigned PDF)
          </button>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-2xl space-y-8 px-4">
          <Card
            ref={detailsSectionRef}
            className={cn("border-border/60", submitAttempted && detailsInvalid && "border-destructive ring-2 ring-destructive/50")}
          >
            <CardContent className="space-y-4 p-6">
              <h2 className="font-serif text-xl text-foreground">Your details</h2>
              <div className="grid gap-4">
                <div>
                  <Label>Full name (per ID book) *</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Nokuthula Dlamini" />
                  {(submitAttempted || fullName) && !nameValid && <p className="mt-1 text-xs text-destructive">Enter your full name.</p>}
                </div>
                <div>
                  <Label>ID number *</Label>
                  <Input value={loa.idNumber} onChange={(e) => setLoa({ ...loa, idNumber: e.target.value })} placeholder="13 digits" maxLength={13} />
                  {(submitAttempted || loa.idNumber) && !idValid && <p className="mt-1 text-xs text-destructive">SA ID must be 13 digits.</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Cell phone number *</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27 82 123 4567" />
                    {(submitAttempted || phone) && !phoneValid && <p className="mt-1 text-xs text-destructive">Enter a valid phone number.</p>}
                  </div>
                  <div>
                    <Label>Email address *</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    {(submitAttempted || email) && !emailValid && <p className="mt-1 text-xs text-destructive">Enter a valid email.</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            ref={loaSectionRef}
            className={cn("border-border/60", submitAttempted && loaInvalid && "border-destructive ring-2 ring-destructive/50")}
          >
            <CardContent className="space-y-4 p-6">
              <h2 className="font-serif text-xl text-foreground">Letter of Authority</h2>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-secondary/20 p-4 text-sm leading-relaxed text-foreground/90">
                <p>
                  I, the undersigned, hereby authorise <strong>Phumelele Ndumo</strong> to obtain any information on
                  my behalf regarding my assurance and/or investment portfolio, and any of my employee benefits, from
                  any life office, retirement fund or other financial institution directly, or by using the
                  services of The Financial Services Exchange (Pty.) Ltd., trading as Astute.
                </p>
                <p className="mt-3">
                  I hereby give consent to any financial institution or employer in possession of information
                  regarding my insurance, investment and employee benefits portfolio to release that information
                  upon request directly to the person who is in terms of this document authorised to request it, or
                  to the authorised person via Astute. For this purpose I confirm that the authorised person is
                  acting on my behalf and/or in my interest. It was explained to me, and I understand, that this
                  consent may possibly have a restricting influence on my constitutional right to privacy. This
                  authorisation shall remain valid for 6 months (180 days) from date of my signature.
                </p>
                <p className="mt-3">
                  I further request the financial institutions with whom Phumelele Ndumo has a sales agreement to
                  indicate him/her on their records as my official care intermediary. I have been properly
                  counselled on the consequences of this letter of appointment. This appointment may be revoked by
                  me in writing at any time.
                </p>
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-secondary/30">
                <Checkbox checked={loaAgree} onCheckedChange={(v) => setLoaAgree(!!v)} className="mt-0.5" />
                <span className="text-sm">I have read the authorisation above and I agree to be bound by its terms.</span>
              </label>
              {submitAttempted && !loaAgree && (
                <p className="text-xs text-destructive">Please read and agree to the Letter of Authority to continue.</p>
              )}
            </CardContent>
          </Card>

          <Card
            ref={signSectionRef}
            className={cn("border-border/60", submitAttempted && signInvalid && "border-destructive ring-2 ring-destructive/50")}
          >
            <CardContent className="space-y-5 p-6">
              <h2 className="font-serif text-xl text-foreground">Sign &amp; submit</h2>

              <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm leading-relaxed text-foreground/90">
                <p className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span>
                    <strong>ThuthukaSA (FSP No. 47992)</strong> is the appointed financial advisor to A-Win. This
                    form is submitted directly to ThuthukaSA as the licensed Financial Services Provider — not to
                    A-Win.
                  </span>
                </p>
                <p className="mt-2 flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span>
                    <strong>Confidentiality clause:</strong> the personal information you provide here is treated
                    as confidential in terms of the Financial Advisory and Intermediary Services Act (FAIS) and
                    POPIA. It is used solely by ThuthukaSA and is not shared with A-Win or any other party without
                    your consent.
                  </span>
                </p>
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-secondary/30">
                <Checkbox checked={privacyConsent} onCheckedChange={(v) => setPrivacyConsent(!!v)} className="mt-0.5" />
                <span className="text-sm">I consent to ThuthukaSA, as the Financial Services Provider, processing my personal information as described above.</span>
              </label>
              {submitAttempted && !privacyConsent && (
                <p className="text-xs text-destructive">Please consent to the processing of your personal information to continue.</p>
              )}

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
                  {submitAttempted && !signatureValid && <p className="mt-1 text-xs text-destructive">Type your signature to sign.</p>}
                </div>
              ) : (
                <div>
                  <Label>Draw your signature *</Label>
                  <SignaturePad value={drawnSignature} onChange={setDrawnSignature} />
                  {submitAttempted && !signatureValid && <p className="mt-1 text-xs text-destructive">Draw your signature to sign.</p>}
                </div>
              )}

              <Button
                onClick={handleSubmitClick}
                disabled={submitting}
                className={cn("w-full bg-accent text-accent-foreground hover:bg-accent/90", !canSubmit && !submitting && "opacity-60")}
                size="lg"
              >
                {submitting ? <><Loader2 className="mr-2 size-4 animate-spin" /> Submitting…</> : <>Submit Letter of Authority</>}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
