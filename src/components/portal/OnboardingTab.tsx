import { useEffect, useState } from "react";
import { Loader2, Check, Clock, XCircle, FileText, ExternalLink, Stamp, PenLine, ShieldCheck, Wallet, CircleDashed } from "lucide-react";
import { supabase as sb } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const supabase = sb as any;

type OnboardingRow = {
  id: string;
  status: string;
  full_name: string | null;
  agreement_accepted_at: string | null;
  signature_typed_name: string | null;
  popia_consent: boolean | null;
  proof_of_payment_path: string | null;
  proof_of_payment_uploaded_at: string | null;
  payment_reference: string | null;
  pop_status: "awaiting" | "pending_review" | "verified" | "rejected" | null;
  pop_reviewed_at: string | null;
  pop_review_notes: string | null;
  stamped_document_path: string | null;
  created_at: string;
};

const PHASES = [
  { key: "details", label: "Details", icon: PenLine },
  { key: "consent", label: "Consent", icon: ShieldCheck },
  { key: "sign", label: "Signed", icon: PenLine },
  { key: "pay", label: "Payment", icon: Wallet },
  { key: "stamp", label: "Stamped", icon: Stamp },
] as const;

export function OnboardingTab({ userId }: { userId: string }) {
  const [row, setRow] = useState<OnboardingRow | null | undefined>(undefined);
  const [popUrl, setPopUrl] = useState<string | null>(null);
  const [stampUrl, setStampUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("applications")
      .select("id, status, full_name, agreement_accepted_at, signature_typed_name, popia_consent, proof_of_payment_path, proof_of_payment_uploaded_at, payment_reference, pop_status, pop_reviewed_at, pop_review_notes, stamped_document_path, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => setRow((data as OnboardingRow) ?? null));
  }, [userId]);

  useEffect(() => {
    if (!row?.proof_of_payment_path) return;
    supabase.storage.from("onboarding-uploads")
      .createSignedUrl(row.proof_of_payment_path, 60 * 30)
      .then(({ data }: any) => setPopUrl(data?.signedUrl ?? null));
  }, [row?.proof_of_payment_path]);

  useEffect(() => {
    if (!row?.stamped_document_path) return;
    supabase.storage.from("onboarding-uploads")
      .createSignedUrl(row.stamped_document_path, 60 * 30)
      .then(({ data }: any) => setStampUrl(data?.signedUrl ?? null));
  }, [row?.stamped_document_path]);

  if (row === undefined) {
    return <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  }

  if (row === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>You haven't started onboarding</CardTitle>
          <CardDescription>Complete the six-step flow to activate your membership.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild><Link to="/onboarding">Start onboarding</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const done: Record<string, boolean> = {
    details: !!row.full_name,
    consent: !!row.popia_consent,
    sign: !!row.signature_typed_name && !!row.agreement_accepted_at,
    pay: !!row.proof_of_payment_path,
    stamp: row.pop_status === "verified",
  };
  const currentIdx = PHASES.findIndex((p) => !done[p.key]);
  const complete = currentIdx === -1;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Onboarding progress
            {complete ? (
              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400" variant="outline">Complete</Badge>
            ) : (
              <Badge variant="outline">In progress</Badge>
            )}
          </CardTitle>
          <CardDescription>Started {new Date(row.created_at).toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid grid-cols-5 gap-2">
            {PHASES.map((p, i) => {
              const isDone = done[p.key];
              const isCurrent = !complete && i === currentIdx;
              const Icon = p.icon;
              return (
                <li key={p.key} className="flex flex-col items-center gap-1.5 text-center">
                  <div className={cn(
                    "flex size-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                    isDone ? "border-primary bg-primary text-primary-foreground" :
                    isCurrent ? "border-accent bg-accent text-accent-foreground" :
                    "border-border bg-background text-muted-foreground",
                  )}>
                    {isDone ? <Check className="size-4" /> : <Icon className="size-4" />}
                  </div>
                  <span className={cn("text-[10px] uppercase tracking-widest",
                    isCurrent ? "text-accent-deep font-semibold" : "text-muted-foreground")}>
                    {p.label}
                  </span>
                </li>
              );
            })}
          </ol>
          {!complete && (
            <div className="mt-4">
              <Button asChild size="sm"><Link to="/onboarding">Continue where you left off</Link></Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* POP status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-4" /> Proof of payment
            <PopBadge status={row.pop_status ?? "awaiting"} />
          </CardTitle>
          <CardDescription>
            {row.payment_reference && <>Reference <span className="font-mono">{row.payment_reference}</span> · </>}
            {row.proof_of_payment_uploaded_at
              ? <>Uploaded {new Date(row.proof_of_payment_uploaded_at).toLocaleString()}</>
              : "Not yet uploaded"}
          </CardDescription>
        </CardHeader>
        {row.proof_of_payment_path && (
          <CardContent className="space-y-3">
            {popUrl ? (
              /\.pdf(\?|$)/i.test(row.proof_of_payment_path) ? (
                <a href={popUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">
                  <FileText className="size-4" /> Open PDF <ExternalLink className="size-3.5" />
                </a>
              ) : (
                <img src={popUrl} alt="Proof of payment" className="max-h-64 rounded border" />
              )
            ) : <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            {row.pop_review_notes && (
              <div className="rounded border bg-muted/30 p-3 text-sm">
                <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Treasurer note</div>
                {row.pop_review_notes}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Stamped doc */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Stamp className="size-4" /> Stamped membership document</CardTitle>
          <CardDescription>
            {row.stamped_document_path
              ? "Your certified membership record is ready."
              : "Available once your payment is verified and your application is approved."}
          </CardDescription>
        </CardHeader>
        {row.stamped_document_path && (
          <CardContent>
            {stampUrl ? (
              <a href={stampUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">
                <FileText className="size-4" /> Download stamped document <ExternalLink className="size-3.5" />
              </a>
            ) : <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function PopBadge({ status }: { status: "awaiting" | "pending_review" | "verified" | "rejected" }) {
  const map = {
    awaiting: { cls: "bg-muted text-muted-foreground", icon: CircleDashed, label: "Awaiting upload" },
    pending_review: { cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400", icon: Clock, label: "Pending review" },
    verified: { cls: "bg-green-500/15 text-green-700 dark:text-green-400", icon: Check, label: "Verified" },
    rejected: { cls: "bg-destructive/15 text-destructive", icon: XCircle, label: "Rejected" },
  }[status];
  const Icon = map.icon;
  return <Badge variant="outline" className={map.cls}><Icon className="mr-1 size-3" />{map.label}</Badge>;
}
