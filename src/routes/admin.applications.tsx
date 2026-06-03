import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/applications")({
  component: ApplicationsPage,
});

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
  status: string;
  user_id: string | null;
  created_at: string;
};

function ApplicationsPage() {
  const [apps, setApps] = useState<Application[] | null>(null);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [viewing, setViewing] = useState<Application | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });
    setApps((data as Application[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const filtered = (apps ?? []).filter((a) => tab === "all" || a.status === tab);

  const decide = async (a: Application, status: "approved" | "rejected") => {
    const { error } = await supabase.from("applications").update({ status }).eq("id", a.id);
    if (error) return toast.error(error.message);

    if (status === "approved" && a.user_id) {
      await supabase
        .from("profiles")
        .update({
          membership_tier: a.tier,
          membership_status: "active",
          joined_at: new Date().toISOString(),
        })
        .eq("id", a.user_id);
    }
    toast.success(`Application ${status}`);
    load();
    setViewing(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">Applications</h1>
        <p className="text-sm text-muted-foreground">Review and respond to membership applications.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({apps?.filter((a) => a.status === "pending").length ?? 0})</TabsTrigger>
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
                    <th className="py-2 pr-3 font-medium">Date</th>
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
                      <td className="py-3 pr-3 text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className="py-3 pr-3"><StatusPill status={a.status} /></td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setViewing(a)}>
                            <Eye className="size-3.5 mr-1" /> View
                          </Button>
                          {a.status === "pending" && (
                            <>
                              <Button size="sm" onClick={() => decide(a, "approved")}><Check className="size-3.5 mr-1" />Approve</Button>
                              <Button size="sm" variant="outline" onClick={() => decide(a, "rejected")}><X className="size-3.5 mr-1" />Decline</Button>
                            </>
                          )}
                        </div>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{viewing?.full_name}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
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
              {viewing.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => decide(viewing, "approved")}><Check className="size-4 mr-1" />Approve</Button>
                  <Button variant="outline" onClick={() => decide(viewing, "rejected")}><X className="size-4 mr-1" />Decline</Button>
                </div>
              )}
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

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    approved: "bg-green-500/15 text-green-700 dark:text-green-400",
    rejected: "bg-destructive/15 text-destructive",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
}
