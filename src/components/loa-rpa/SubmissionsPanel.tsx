import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Loader2, MessageCircle, Globe2, FileDown, Search } from "lucide-react";
import { AnimateNumber } from "@/components/ui/animate-number";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { LoaData, RpaData } from "@/lib/loa-rpa-types";

export type Submission = {
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
  loa_pdf_path: string | null;
  status: string;
  created_at: string;
};

export const RPA_LABELS: [keyof RpaData, string][] = [
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

function Field({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{value || "—"}</div>
    </div>
  );
}

/**
 * The signed LOA/RPA submissions list + view/download dialog — shared
 * between the A-Win admin console (admin.loa-rpa.tsx, alongside the
 * access-management cards) and the standalone ThuthukaSA dashboard
 * (tksa.tsx). RLS already scopes what rows come back per caller's role, so
 * this component doesn't need to know who's looking at it.
 */
function exportCsv(rows: Submission[]) {
  const header = ["Name", "Email", "Phone", "Source", "Status", "ID Number", "Submitted"];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.full_name, r.email, r.phone ?? "", r.source, r.status, r.loa_data?.idNumber ?? "", new Date(r.created_at).toLocaleString()]
      .map((v) => escape(String(v)))
      .join(","),
  );
  const csv = [header.map(escape).join(","), ...lines].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `loa-rpa-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function SubmissionsPanel({ emptyHint }: { emptyHint?: string }) {
  const [rows, setRows] = useState<Submission[] | null>(null);
  const [viewing, setViewing] = useState<Submission | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  const downloadPdf = async (path: string | null, label: string) => {
    if (!path) return toast.error(`No ${label} on file for this submission`);
    const { data, error } = await supabase.storage.from("loa-rpa-documents").createSignedUrl(path, 300);
    if (error || !data) return toast.error(error?.message ?? "Could not sign PDF URL");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  // Derived from the same rows already fetched above — no extra queries.
  const stats = useMemo(() => {
    if (!rows) return null;
    return {
      total: rows.length,
      pending: rows.filter((r) => r.status !== "reviewed").length,
      reviewed: rows.filter((r) => r.status === "reviewed").length,
      whatsapp: rows.filter((r) => r.source === "whatsapp").length,
      website: rows.filter((r) => r.source === "website").length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return rows;
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <>
      {stats && stats.total > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["Total", stats.total],
            ["Pending review", stats.pending],
            ["Reviewed", stats.reviewed],
            ["Via WhatsApp", stats.whatsapp],
            ["Via website", stats.website],
          ].map(([label, value]) => (
            <Card key={label as string}>
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-semibold"><AnimateNumber value={value as number} /></div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
          <Button size="sm" variant="outline" onClick={() => exportCsv(filtered ?? rows)}>
            <FileDown className="mr-1.5 size-4" /> Export CSV
          </Button>
        </div>
      )}

      {rows === null ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {emptyHint ?? "No submissions yet."}
          </CardContent>
        </Card>
      ) : filtered && filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">No submissions match "{search}".</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {(filtered ?? rows).map((row) => (
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
                  <Button size="sm" variant="ghost" title="Download combined LOA + RPA (internal file)" onClick={() => downloadPdf(row.pdf_path, "combined PDF")}>
                    <Download className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" title="Download standalone LOA (for outside institutions)" onClick={() => downloadPdf(row.loa_pdf_path, "standalone LOA")}>
                    LOA
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
    </>
  );
}
