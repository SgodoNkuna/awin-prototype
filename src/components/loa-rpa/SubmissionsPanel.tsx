import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Eye, Loader2, MessageCircle, Globe2, FileDown, Search, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { AnimateNumber } from "@/components/ui/animate-number";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/lib/use-auth";
import { requestDeleteLoaRpaSubmission } from "@/lib/admin-roles.functions";
import { getErrorMessage } from "@/lib/errors";
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
  loa_only: boolean;
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

// ThuthukaSA's brand orange — the same rgb(232,150,10) used on their PDF
// letterhead (see loa-rpa-pdf.ts) — plus a muted charcoal for the "other" slice.
const CHART_ORANGE = "#e8960a";
const CHART_MUTED = "#57534e";

/**
 * Single data source for the whole ThuthukaSA dashboard — fetched once,
 * split across an Overview tab (stats/charts) and a Submissions tab
 * (search/list/export) instead of one long scrolling panel.
 */
export function useLoaRpaSubmissions() {
  const [rows, setRows] = useState<Submission[] | null>(null);

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

  return { rows, stats, reload: load };
}

type Stats = NonNullable<ReturnType<typeof useLoaRpaSubmissions>["stats"]>;

/** Stat tiles + review-status/channel donut charts — the dashboard's "Overview" tab. */
export function SubmissionsOverview({ stats }: { stats: Stats | null }) {
  // Filtering out zero-value slices means a category's position in the array
  // — and with it, which <Cell> color it lands on — depends on which other
  // categories happen to be empty. Carrying `fill` on each datum keeps the
  // color tied to the category itself instead of its index.
  const reviewChartData = useMemo(
    () =>
      stats
        ? [
            { name: "Reviewed", value: stats.reviewed, fill: CHART_ORANGE },
            { name: "Pending review", value: stats.pending, fill: CHART_MUTED },
          ].filter((d) => d.value > 0)
        : [],
    [stats],
  );
  const channelChartData = useMemo(
    () =>
      stats
        ? [
            { name: "WhatsApp", value: stats.whatsapp, fill: CHART_ORANGE },
            { name: "Website", value: stats.website, fill: CHART_MUTED },
          ].filter((d) => d.value > 0)
        : [],
    [stats],
  );

  if (!stats) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="size-5 animate-spin text-white/60" />
      </div>
    );
  }

  if (stats.total === 0) {
    return (
      <div className="rounded-xl border border-[#e8960a]/20 bg-[#1a1815] py-12 text-center text-sm text-white/50">
        No submissions yet — stats and charts will appear here once the first one comes in.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(
          [
            ["Total", stats.total],
            ["Pending review", stats.pending],
            ["Reviewed", stats.reviewed],
            ["Via WhatsApp", stats.whatsapp],
            ["Via website", stats.website],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#e8960a]/20 bg-[#1a1815] px-4 pt-4 pb-3">
            <div className="text-2xl font-semibold text-white"><AnimateNumber value={value} /></div>
            <div className="text-xs text-white/50">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#e8960a]/20 bg-[#1a1815] px-4 pt-4 pb-4">
          <div className="mb-2 text-xs font-medium text-white/60">Review status</div>
          <div className="relative">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={reviewChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {reviewChartData.map((d) => (
                    <Cell key={d.name} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8, color: "rgba(255,255,255,0.7)" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[150px] flex-col items-center justify-center">
              <div className="text-2xl font-semibold text-white"><AnimateNumber value={stats.pending} /></div>
              <div className="text-[10px] uppercase tracking-wide text-white/50">pending</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[#e8960a]/20 bg-[#1a1815] px-4 pt-4 pb-4">
          <div className="mb-2 text-xs font-medium text-white/60">Submission channel</div>
          <div className="relative">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={channelChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {channelChartData.map((d) => (
                    <Cell key={d.name} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8, color: "rgba(255,255,255,0.7)" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[150px] flex-col items-center justify-center">
              <div className="text-2xl font-semibold text-white"><AnimateNumber value={stats.total} /></div>
              <div className="text-[10px] uppercase tracking-wide text-white/50">total</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Search, export, the row list, and the view/delete dialogs — the dashboard's "Submissions" tab. */
export function SubmissionsList({
  rows,
  reload,
  emptyHint,
}: {
  rows: Submission[] | null;
  reload: () => void | Promise<void>;
  emptyHint?: string;
}) {
  const { isAdmin } = useAuth();
  const callDeleteSubmission = useServerFn(requestDeleteLoaRpaSubmission);
  const [viewing, setViewing] = useState<Submission | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<Submission | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

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
    reload();
  };

  const downloadPdf = async (path: string | null, label: string) => {
    if (!path) return toast.error(`No ${label} on file for this submission`);
    const { data, error } = await supabase.storage.from("loa-rpa-documents").createSignedUrl(path, 300);
    if (error || !data) return toast.error(error?.message ?? "Could not sign PDF URL");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const filtered = useMemo(() => {
    if (!rows) return rows;
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <>
      {rows && rows.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/40" />
            <Input
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-[#e8960a]/20 bg-[#1a1815] pl-8 text-white placeholder:text-white/40"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-[#e8960a]/40 bg-transparent text-white hover:bg-[#e8960a]/15 hover:text-white"
            onClick={() => exportCsv(filtered ?? rows)}
          >
            <FileDown className="mr-1.5 size-4" /> Export CSV
          </Button>
        </div>
      )}

      {rows === null ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="size-5 animate-spin text-white/60" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-[#e8960a]/20 bg-[#1a1815] py-12 text-center text-sm text-white/50">
          {emptyHint ?? "No submissions yet."}
        </div>
      ) : filtered && filtered.length === 0 ? (
        <div className="rounded-xl border border-[#e8960a]/20 bg-[#1a1815] py-12 text-center text-sm text-white/50">
          No submissions match "{search}".
        </div>
      ) : (
        <div className="grid gap-3">
          {(filtered ?? rows).map((row) => (
            <div key={row.id} className="rounded-xl border border-[#e8960a]/20 bg-[#1a1815] p-4 flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">{row.full_name}</h3>
                  <Badge
                    className={row.status === "reviewed" ? "border-transparent bg-[#e8960a] text-[#1a1815]" : "border-white/25 bg-transparent text-white/70"}
                    variant={row.status === "reviewed" ? "default" : "outline"}
                  >
                    {row.status}
                  </Badge>
                  <Badge className="gap-1 border-transparent bg-white/10 text-white/80">
                    {row.source === "whatsapp" ? <MessageCircle className="size-3" /> : <Globe2 className="size-3" />}
                    {row.source}
                  </Badge>
                  {row.loa_only && <Badge className="border-white/25 bg-transparent text-white/70" variant="outline">LOA only</Badge>}
                </div>
                <p className="text-xs text-white/50">
                  {row.email} {row.phone && `· ${row.phone}`} · {new Date(row.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setViewing(row)}>
                  <Eye className="size-4" />
                </Button>
                {!row.loa_only && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white/70 hover:bg-white/10 hover:text-white"
                    title="Download combined LOA + RPA (internal file)"
                    onClick={() => downloadPdf(row.pdf_path, "combined PDF")}
                  >
                    <Download className="size-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/70 hover:bg-white/10 hover:text-white"
                  title="Download standalone LOA (for outside institutions)"
                  onClick={() => downloadPdf(row.loa_pdf_path, "standalone LOA")}
                >
                  LOA
                </Button>
                {row.status !== "reviewed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#e8960a]/40 bg-transparent text-white hover:bg-[#e8960a]/15 hover:text-white"
                    disabled={busy === row.id}
                    onClick={() => markReviewed(row)}
                  >
                    {busy === row.id ? <Loader2 className="size-4 animate-spin" /> : "Mark reviewed"}
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Delete this submission"
                    className="text-destructive hover:text-destructive"
                    onClick={() => { setDeleting(row); setDeleteConfirmName(""); setDeleteReason(""); }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
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
              {!viewing.loa_only && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Risk Profile Analysis</div>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {RPA_LABELS.map(([key, label]) => (
                      <Field key={key} label={label} value={viewing.rpa_data?.[key]} />
                    ))}
                  </div>
                </div>
              )}
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

      {/* Admin-only, type-to-confirm — same pattern as deleting a member or
          an application. Not available to advisor-only accounts; deletion of
          FAIS-regulated records stays with A-Win's own accountable admins. */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Submission</DialogTitle>
            <DialogDescription>
              This permanently removes {deleting?.full_name}'s submission and its PDFs. This cannot be undone.
              This request needs approval from a different admin before it takes effect (see Admin → Approvals).
            </DialogDescription>
          </DialogHeader>
          {deleting && (
            <div className="space-y-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Type the exact name to confirm: {deleting.full_name}</Label>
                <Input value={deleteConfirmName} onChange={(e) => setDeleteConfirmName(e.target.value)} autoComplete="off" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Reason (audit log, min 5 chars)</Label>
                <Textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} rows={2} placeholder="e.g. Test/demo data, not a real submission" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={
                deleteBusy ||
                deleteConfirmName.trim().toLowerCase() !== (deleting?.full_name ?? "").trim().toLowerCase() ||
                deleteReason.trim().length < 5
              }
              onClick={async () => {
                if (!deleting) return;
                setDeleteBusy(true);
                try {
                  await callDeleteSubmission({
                    data: { submission_id: deleting.id, confirm_name: deleteConfirmName.trim(), reason: deleteReason.trim() },
                  });
                  toast.success("Deletion request submitted — needs approval from a different admin");
                  setDeleting(null);
                } catch (e) {
                  toast.error(getErrorMessage(e));
                } finally {
                  setDeleteBusy(false);
                }
              }}
            >
              {deleteBusy ? <Loader2 className="size-4 animate-spin" /> : "Delete submission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
