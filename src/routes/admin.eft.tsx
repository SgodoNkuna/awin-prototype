import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Check, X, Eye, FileText, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase as sb } from "@/integrations/supabase/client";
const supabase = sb as any;
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/eft")({
  head: () => ({ meta: [{ title: "EFT Queue | A-WIN Admin" }] }),
  component: EftQueuePage,
});

type PopStatus = "awaiting" | "pending_review" | "verified" | "rejected";
type Row = {
  id: string;
  full_name: string;
  email: string;
  payment_reference: string | null;
  proof_of_payment_path: string | null;
  proof_of_payment_uploaded_at: string | null;
  pop_status: PopStatus;
  pop_reviewed_at: string | null;
  pop_review_notes: string | null;
  created_at: string;
};

function EftQueuePage() {
  const { isAdmin, user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState<PopStatus | "all">("pending_review");
  const [viewing, setViewing] = useState<Row | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("applications")
      .select("id, full_name, email, payment_reference, proof_of_payment_path, proof_of_payment_uploaded_at, pop_status, pop_reviewed_at, pop_review_notes, created_at")
      .not("proof_of_payment_path", "is", null)
      .order("proof_of_payment_uploaded_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!viewing?.proof_of_payment_path) { setSignedUrl(null); return; }
    let cancelled = false;
    supabase.storage
      .from("onboarding-uploads")
      .createSignedUrl(viewing.proof_of_payment_path, 60 * 10)
      .then(({ data, error }: any) => {
        if (cancelled) return;
        if (error) toast.error(`Preview: ${error.message}`);
        else setSignedUrl(data?.signedUrl ?? null);
      });
    setNotes(viewing.pop_review_notes ?? "");
    return () => { cancelled = true; };
  }, [viewing]);

  const filtered = (rows ?? []).filter((r) => tab === "all" || r.pop_status === tab);

  const setStatus = async (r: Row, status: PopStatus) => {
    setBusy(r.id + status);
    const tid = toast.loading("Saving…");
    const { error } = await supabase
      .from("applications")
      .update({
        pop_status: status,
        pop_reviewed_at: new Date().toISOString(),
        pop_reviewed_by: user?.id ?? null,
        pop_review_notes: notes || r.pop_review_notes,
      })
      .eq("id", r.id);
    setBusy(null);
    if (error) return toast.error(error.message, { id: tid });
    toast.success(`Marked ${status.replace("_", " ")}`, { id: tid });
    await load();
    setViewing(null);
  };

  const count = (s: PopStatus) => rows?.filter((r) => r.pop_status === s).length ?? 0;

  if (!isAdmin) return <p className="text-sm text-muted-foreground">Admins only.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">EFT payment queue</h1>
        <p className="text-sm text-muted-foreground">Review proof-of-payment uploads and verify or reject each submission.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="pending_review">Pending ({count("pending_review")})</TabsTrigger>
          <TabsTrigger value="verified">Verified ({count("verified")})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({count("rejected")})</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="pt-6">
          {rows === null ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No proofs in this bucket.</p>
          ) : (
            <div className="-mx-6 overflow-x-auto px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Applicant</th>
                    <th className="py-2 pr-3 font-medium">Reference</th>
                    <th className="py-2 pr-3 font-medium">Uploaded</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-3 pr-3">
                        <div>{r.full_name}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs">{r.payment_reference ?? "—"}</td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {r.proof_of_payment_uploaded_at ? new Date(r.proof_of_payment_uploaded_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 pr-3"><StatusPill status={r.pop_status} /></td>
                      <td className="py-3">
                        <Button size="sm" variant="ghost" onClick={() => setViewing(r)}>
                          <Eye className="mr-1 size-3.5" /> Review POP
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewing?.full_name}
              {viewing && <StatusPill status={viewing.pop_status} />}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-3">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Reference</div>
                  <div className="flex items-center gap-2 font-mono">
                    {viewing.payment_reference ?? "—"}
                    {viewing.payment_reference && (
                      <button onClick={() => { navigator.clipboard.writeText(viewing.payment_reference!); toast.success("Copied"); }}>
                        <Copy className="size-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Email</div>
                  <div>{viewing.email}</div>
                </div>
              </div>

              <div className="rounded-lg border bg-background p-2">
                {!signedUrl ? (
                  <div className="flex h-64 items-center justify-center text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin" /> Loading signed preview…
                  </div>
                ) : /\.pdf(\?|$)/i.test(viewing.proof_of_payment_path ?? "") ? (
                  <div className="flex flex-col items-center gap-2 p-6">
                    <FileText className="size-8 text-muted-foreground" />
                    <a href={signedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">
                      Open PDF <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                ) : (
                  <img src={signedUrl} alt="Proof of payment" className="mx-auto max-h-[60vh] rounded" />
                )}
              </div>

              <div>
                <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Review notes</div>
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note visible to the applicant…" />
              </div>

              <div className="flex flex-wrap gap-2 border-t pt-3">
                <Button disabled={!!busy} onClick={() => setStatus(viewing, "verified")}>
                  <Check className="mr-1 size-4" /> Verify payment
                </Button>
                <Button variant="outline" disabled={!!busy} onClick={() => setStatus(viewing, "rejected")}>
                  <X className="mr-1 size-4" /> Reject
                </Button>
                {viewing.pop_status !== "pending_review" && (
                  <Button variant="ghost" disabled={!!busy} onClick={() => setStatus(viewing, "pending_review")}>
                    Reset to pending
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusPill({ status }: { status: PopStatus }) {
  const map: Record<PopStatus, string> = {
    awaiting: "bg-muted text-muted-foreground",
    pending_review: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    verified: "bg-green-500/15 text-green-700 dark:text-green-400",
    rejected: "bg-destructive/15 text-destructive",
  };
  const label = status === "pending_review" ? "Pending review" : status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge variant="outline" className={map[status]}>{label}</Badge>;
}
