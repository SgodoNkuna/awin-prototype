import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X, Eye, Loader2, Send, CheckCircle2, XCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/applications")({
  component: ApplicationsPage,
});

type AppStatus = "pending" | "under_review" | "approved" | "rejected";

type Application = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  occupation: string;
  employer: string | null;
  experience: string;
  motivation: string;
  tier: string;
  status: AppStatus;
  user_id: string | null;
  created_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  decided_at: string | null;
  status_updated_at: string | null;
  admin_notes: string | null;
};

function ApplicationsPage() {
  const [apps, setApps] = useState<Application[] | null>(null);
  const [tab, setTab] = useState<"pending" | "under_review" | "approved" | "rejected" | "all">("pending");
  const [viewing, setViewing] = useState<Application | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });
    setApps((data as Application[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    setNotes(viewing?.admin_notes ?? "");
  }, [viewing]);

  const filtered = (apps ?? []).filter((a) => tab === "all" || a.status === tab);

  const setStatus = async (a: Application, status: AppStatus) => {
    setBusy(a.id + status);
    const tId = toast.loading("Updating application…");
    const { error } = await supabase
      .from("applications")
      .update({ status, admin_notes: notes || a.admin_notes })
      .eq("id", a.id);

    if (error) {
      setBusy(null);
      toast.error(error.message, { id: tId });
      return;
    }

    if (status === "approved" && a.user_id) {
      await supabase
        .from("profiles")
        .update({
          membership_tier: a.tier as "general" | "active" | "patron",
          membership_status: "active",
          joined_at: new Date().toISOString(),
        })
        .eq("id", a.user_id);
    }
    setBusy(null);
    toast.success(`Application ${labelFor(status).toLowerCase()}`, { id: tId });
    await load();
    setViewing(null);
  };

  const saveNotes = async (a: Application) => {
    setBusy(a.id + "notes");
    const tId = toast.loading("Saving note…");
    const { error } = await supabase.from("applications").update({ admin_notes: notes }).eq("id", a.id);
    setBusy(null);
    if (error) return toast.error(error.message, { id: tId });
    toast.success("Note saved", { id: tId });
    await load();
  };

  const count = (s: AppStatus) => apps?.filter((a) => a.status === s).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">Applications</h1>
        <p className="text-sm text-muted-foreground">Review applications and update each applicant's status.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="pending">Submitted ({count("pending")})</TabsTrigger>
          <TabsTrigger value="under_review">Under Review ({count("under_review")})</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="pt-6">
          {apps === null ? (
            <div className="py-8 flex justify-center"><Loader2 className="size-5 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No applications.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Applicant</th>
                    <th className="py-2 pr-3 font-medium">Tier</th>
                    <th className="py-2 pr-3 font-medium">Submitted</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-3 pr-3">
                        <div>{a.full_name}</div>
                        <div className="text-xs text-muted-foreground">{a.email}</div>
                      </td>
                      <td className="py-3 pr-3 capitalize">{a.tier}</td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {new Date(a.submitted_at ?? a.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-3"><StatusPill status={a.status} /></td>
                      <td className="py-3">
                        <Button size="sm" variant="ghost" onClick={() => setViewing(a)}>
                          <Eye className="size-3.5 mr-1" /> Review
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewing?.full_name}
              {viewing && <StatusPill status={viewing.status} />}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              <Row label="Email" value={viewing.email} />
              <Row label="Phone" value={viewing.phone} />
              <Row label="Occupation" value={viewing.occupation} />
              <Row label="Employer" value={viewing.employer || "—"} />
              <Row label="Experience" value={viewing.experience} />
              <Row label="Tier applied" value={viewing.tier} />

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Motivation</div>
                <p className="bg-muted/40 rounded p-3 whitespace-pre-wrap">{viewing.motivation}</p>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Timeline</div>
                <Timeline app={viewing} />
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  Admin notes (visible to the applicant)
                </div>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note for the applicant…"
                  rows={3}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  disabled={busy === viewing.id + "notes"}
                  onClick={() => saveNotes(viewing)}
                >
                  {busy === viewing.id + "notes" ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Save className="size-3.5 mr-1" />}
                  Save note
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {viewing.status !== "under_review" && (
                  <Button variant="outline" disabled={!!busy} onClick={() => setStatus(viewing, "under_review")}>
                    <Eye className="size-4 mr-1" /> Mark Under Review
                  </Button>
                )}
                {viewing.status !== "approved" && (
                  <Button disabled={!!busy} onClick={() => setStatus(viewing, "approved")}>
                    <Check className="size-4 mr-1" /> Accept
                  </Button>
                )}
                {viewing.status !== "rejected" && (
                  <Button variant="outline" disabled={!!busy} onClick={() => setStatus(viewing, "rejected")}>
                    <X className="size-4 mr-1" /> Reject
                  </Button>
                )}
                {viewing.status !== "pending" && (
                  <Button variant="ghost" disabled={!!busy} onClick={() => setStatus(viewing, "pending")}>
                    Reset to Submitted
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="col-span-2 capitalize">{value}</div>
    </div>
  );
}

function labelFor(s: AppStatus) {
  return s === "pending" ? "Submitted" : s === "under_review" ? "Under Review" : s === "approved" ? "Approved" : "Rejected";
}

function StatusPill({ status }: { status: AppStatus }) {
  const map: Record<AppStatus, string> = {
    pending: "bg-muted text-muted-foreground",
    under_review: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    approved: "bg-green-500/15 text-green-700 dark:text-green-400",
    rejected: "bg-destructive/15 text-destructive",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{labelFor(status)}</Badge>;
}

function Timeline({ app }: { app: Application }) {
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : null);
  const steps = [
    { label: "Submitted", at: fmt(app.submitted_at ?? app.created_at), Icon: Send, done: true },
    {
      label: "Under Review",
      at: fmt(app.reviewed_at),
      Icon: Eye,
      done: !!app.reviewed_at || ["under_review", "approved", "rejected"].includes(app.status),
    },
    {
      label: app.status === "rejected" ? "Rejected" : "Accepted",
      at: fmt(app.decided_at),
      Icon: app.status === "rejected" ? XCircle : CheckCircle2,
      done: ["approved", "rejected"].includes(app.status),
    },
  ];
  return (
    <ol className="relative space-y-3 border-l pl-5">
      {steps.map((s, i) => (
        <li key={i} className="relative">
          <span
            className={`absolute -left-[26px] flex size-5 items-center justify-center rounded-full ring-2 ring-background ${
              s.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <s.Icon className="size-3" />
          </span>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <p className={`text-sm font-medium ${s.done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.at ?? "Pending"}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
