import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Eye, Loader2, MessageCircle, Globe2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { LoaData, RpaData } from "@/lib/loa-rpa-types";

export const Route = createFileRoute("/admin/loa-rpa")({
  component: LoaRpaAdminPage,
});

type Submission = {
  id: string;
  application_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  source: string;
  loa_data: LoaData;
  rpa_data: RpaData;
  signature_type: string;
  signature_typed_name: string | null;
  signature_drawn_data: string | null;
  pdf_path: string | null;
  status: string;
  created_at: string;
};

const RPA_LABELS: [keyof RpaData, string][] = [
  ["gender", "Gender"],
  ["cellPhone", "Cell phone"],
  ["email", "Email"],
  ["workNumber", "Work number"],
  ["qualification", "Qualification"],
  ["occupation", "Occupation"],
  ["grossMonthlyIncome", "Gross monthly income"],
  ["maritalStatus", "Marital status"],
  ["stokvelName", "Stokvel name"],
  ["objective", "Investment objective"],
  ["term", "Investment term"],
  ["monthlyAmount", "Monthly amount"],
  ["riskAppetite", "Risk appetite"],
  ["scaredOfLosingMoney", "Scared of losing money"],
  ["withdrawSoon", "Withdraw in 12–24 months"],
  ["existingInvestments", "Existing investments"],
  ["investingKnowledge", "Investing knowledge"],
  ["emergencyFund", "Emergency fund"],
  ["children", "Children"],
  ["savedForEducation", "Saved for education"],
  ["savedForRetirement", "Saved for retirement"],
  ["newsletterSubscribe", "Newsletter"],
];

function CopyLinkRow({ label, icon, url }: { label: string; icon: React.ReactNode; url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground w-32 shrink-0">
        {icon} {label}
      </span>
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <code className="flex-1 min-w-0 truncate rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs">
          {url}
        </code>
        <Button size="sm" variant="outline" onClick={copy} className="shrink-0">
          {copied ? <Check className="size-3.5 mr-1.5 text-primary" /> : <Copy className="size-3.5 mr-1.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

function ShareLinksCard() {
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  if (!origin) return null;

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <h3 className="text-sm font-semibold">Share the LOA &amp; Risk Profile form</h3>
        <p className="text-xs text-muted-foreground -mt-2">
          Send the WhatsApp link when sharing in a chat — it tags the submission's source so you can tell WhatsApp
          applicants apart from website applicants above.
        </p>
        <CopyLinkRow
          label="WhatsApp"
          icon={<MessageCircle className="size-3.5" />}
          url={`${origin}/loa-rpa?src=whatsapp`}
        />
        <CopyLinkRow
          label="Website"
          icon={<Globe2 className="size-3.5" />}
          url={`${origin}/loa-rpa`}
        />
      </CardContent>
    </Card>
  );
}

function LoaRpaAdminPage() {
  const [rows, setRows] = useState<Submission[] | null>(null);
  const [viewing, setViewing] = useState<Submission | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("loa_rpa_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as unknown as Submission[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const markReviewed = async (row: Submission) => {
    setBusy(row.id);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("loa_rpa_submissions")
      .update({ status: "reviewed", reviewed_by: userData.user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq("id", row.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Marked reviewed");
    load();
  };

  const downloadPdf = async (row: Submission) => {
    if (!row.pdf_path) return toast.error("No PDF on file for this submission");
    const { data, error } = await supabase.storage.from("loa-rpa-documents").createSignedUrl(row.pdf_path, 300);
    if (error || !data) return toast.error(error?.message ?? "Could not sign PDF URL");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">LOA &amp; Risk Profile</h1>
        <p className="text-sm text-muted-foreground">
          {rows?.length ?? 0} submission{rows?.length === 1 ? "" : "s"} — signed Letters of Authority and Risk Profile
          Analyses collected via WhatsApp or the website, on file with ThuthukaSA (FSP 47992).
        </p>
      </div>

      <ShareLinksCard />

      {rows === null ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No submissions yet. Copy the link above and share it to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="pt-6 flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold">{row.full_name}</h3>
                    <Badge variant={row.status === "reviewed" ? "default" : "outline"}>{row.status}</Badge>
                    <Badge variant="secondary" className="gap-1">
                      {row.source === "whatsapp" ? <MessageCircle className="size-3" /> : <Globe2 className="size-3" />}
                      {row.source}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {row.email} {row.phone && `· ${row.phone}`} · {new Date(row.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setViewing(row)}>
                    <Eye className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => downloadPdf(row)}>
                    <Download className="size-4" />
                  </Button>
                  {row.status !== "reviewed" && (
                    <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => markReviewed(row)}>
                      {busy === row.id ? <Loader2 className="size-4 animate-spin" /> : "Mark reviewed"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.full_name}</DialogTitle>
            <DialogDescription>
              Submitted {viewing && new Date(viewing.created_at).toLocaleString()} via {viewing?.source}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Letter of Authority</div>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <Field label="ID number" value={viewing.loa_data?.idNumber} />
                  <Field label="Telephone" value={viewing.loa_data?.telephone} />
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Risk Profile Analysis</div>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {RPA_LABELS.map(([key, label]) => (
                    <Field key={key} label={label} value={viewing.rpa_data?.[key]} />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Signature</div>
                <p className="mt-1 text-xs text-muted-foreground">Type: {viewing.signature_type}</p>
                {viewing.signature_type === "typed" ? (
                  <div className="mt-1 font-serif text-lg italic">{viewing.signature_typed_name}</div>
                ) : viewing.signature_drawn_data ? (
                  <img src={viewing.signature_drawn_data} alt="Signature" className="mt-1 max-h-16" />
                ) : null}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{value || "—"}</div>
    </div>
  );
}
