import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Search, Download, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { setUserRole } from "@/lib/admin-roles.functions";

export const Route = createFileRoute("/admin/members")({
  component: MembersPage,
});

type TierName = "general" | "active" | "patron";
type Member = {
  id: string;
  email: string | null;
  full_name: string | null;
  membership_tier: TierName | null;
  membership_status: string;
  joined_at: string | null;
  suspended: boolean;
  created_at: string;
};

const TIERS = ["general", "active", "patron"] as const;

function MembersPage() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [suspendedFilter, setSuspendedFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Member | null>(null);
  const [detail, setDetail] = useState<Member | null>(null);
  const [promoting, setPromoting] = useState<Member | null>(null);
  const [promoteReason, setPromoteReason] = useState("");
  const [promoteBusy, setPromoteBusy] = useState(false);
  const callSetRole = useServerFn(setUserRole);

  const load = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, membership_tier, membership_status, joined_at, suspended, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setMembers((data as Member[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = (members ?? []).filter((m) => {
    const s = search.toLowerCase();
    const matchesSearch =
      !s || m.email?.toLowerCase().includes(s) || m.full_name?.toLowerCase().includes(s);
    const matchesStatus = statusFilter === "all" || m.membership_status === statusFilter;
    const matchesTier = tierFilter === "all" || (m.membership_tier ?? "none") === tierFilter;
    const matchesSuspended =
      suspendedFilter === "all" ||
      (suspendedFilter === "yes" ? m.suspended : !m.suspended);
    return matchesSearch && matchesStatus && matchesTier && matchesSuspended;
  });

  const updateMember = async (id: string, patch: Partial<Member>) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Member updated");
    load();
  };

  const exportCsv = () => {
    const headers = ["Name", "Email", "Tier", "Status", "Joined", "Suspended"];
    const rows = filtered.map((m) => [
      m.full_name ?? "",
      m.email ?? "",
      m.membership_tier ?? "",
      m.membership_status,
      m.joined_at ?? "",
      m.suspended ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl">Members</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {members?.length ?? 0}</p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="size-4 mr-2" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger><SelectValue placeholder="Tier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                <SelectItem value="none">No tier</SelectItem>
                {TIERS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={suspendedFilter} onValueChange={setSuspendedFilter}>
              <SelectTrigger className="sm:col-start-3"><SelectValue placeholder="Suspended" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (active & suspended)</SelectItem>
                <SelectItem value="no">Not suspended</SelectItem>
                <SelectItem value="yes">Suspended only</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              onClick={() => { setSearch(""); setStatusFilter("all"); setTierFilter("all"); setSuspendedFilter("all"); }}
              className="sm:col-start-4"
            >Clear filters</Button>
          </div>

          {members === null ? (
            <div className="py-8 flex justify-center"><Loader2 className="size-5 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No members found.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Email</th>
                    <th className="py-2 pr-3 font-medium">Tier</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Joined</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b last:border-0 cursor-pointer hover:bg-muted/40"
                      onClick={() => setDetail(m)}
                    >
                      <td className="py-3 pr-3 font-medium">{m.full_name || "—"}</td>
                      <td className="py-3 pr-3 text-muted-foreground">{m.email}</td>
                      <td className="py-3 pr-3 capitalize">{m.membership_tier ?? "—"}</td>
                      <td className="py-3 pr-3"><StatusPill status={m.membership_status} suspended={m.suspended} /></td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(m)}>Edit</Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateMember(m.id, { suspended: !m.suspended })}
                          >
                            {m.suspended ? "Unsuspend" : "Suspend"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setPromoting(m); setPromoteReason(""); }}>
                            <Shield className="size-3.5 mr-1" /> Role
                          </Button>
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

      {/* Slide-in member detail */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detail?.full_name || "(no name)"}</SheetTitle>
            <SheetDescription>{detail?.email}</SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="mt-6 space-y-4 px-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Tier" value={detail.membership_tier ?? "—"} />
                <Info label="Status" value={detail.membership_status} />
                <Info label="Suspended" value={detail.suspended ? "Yes" : "No"} />
                <Info label="Joined" value={detail.joined_at ? new Date(detail.joined_at).toLocaleDateString() : "—"} />
                <Info label="Created" value={new Date(detail.created_at).toLocaleDateString()} />
              </div>
              <div className="flex flex-col gap-2 pt-4 border-t">
                <Button onClick={() => { setEditing(detail); setDetail(null); }}>Edit membership</Button>
                <Button variant="outline" onClick={() => updateMember(detail.id, { suspended: !detail.suspended })}>
                  {detail.suspended ? "Unsuspend member" : "Suspend member"}
                </Button>
                <Button variant="outline" onClick={() => { setPromoting(detail); setPromoteReason(""); setDetail(null); }}>
                  <Shield className="size-4 mr-2" /> Manage admin role
                </Button>
              </div>
            </div>
          )}
          <SheetFooter className="mt-6">
            <Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>


      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{editing.full_name || "(no name)"}</p>
                <p className="text-xs text-muted-foreground">{editing.email}</p>
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-medium">Membership Tier</label>
                <Select
                  value={editing.membership_tier ?? "none"}
                  onValueChange={(v) => setEditing({ ...editing, membership_tier: v === "none" ? null : (v as TierName) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {TIERS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-medium">Status</label>
                <Select
                  value={editing.membership_status}
                  onValueChange={(v) => setEditing({ ...editing, membership_status: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!editing) return;
                await updateMember(editing.id, {
                  membership_tier: editing.membership_tier,
                  membership_status: editing.membership_status,
                  joined_at: editing.membership_status === "active" && !editing.joined_at
                    ? new Date().toISOString()
                    : editing.joined_at,
                });
                setEditing(null);
              }}
            >Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!promoting} onOpenChange={(o) => !o && setPromoting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manage Admin Role</DialogTitle></DialogHeader>
          {promoting && (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="font-medium">{promoting.full_name || promoting.email}</span>
                <br />
                <span className="text-xs text-muted-foreground">{promoting.email}</span>
              </p>
              <div className="grid gap-2">
                <label className="text-xs font-medium">Reason (audit log, min 5 chars)</label>
                <Textarea value={promoteReason} onChange={(e) => setPromoteReason(e.target.value)} rows={3} placeholder="e.g. New committee chair — onboarded 2026-06-24" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPromoting(null)}>Cancel</Button>
            <Button
              variant="outline"
              disabled={promoteBusy || promoteReason.trim().length < 5 || !promoting}
              onClick={async () => {
                if (!promoting) return;
                setPromoteBusy(true);
                try {
                  await callSetRole({ data: { user_id: promoting.id, role: "admin", action: "revoke", reason: promoteReason.trim() } });
                  toast.success("Admin role revoked");
                  setPromoting(null);
                } catch (e: any) { toast.error(e.message ?? "Failed"); }
                finally { setPromoteBusy(false); }
              }}
            >Revoke admin</Button>
            <Button
              disabled={promoteBusy || promoteReason.trim().length < 5 || !promoting}
              onClick={async () => {
                if (!promoting) return;
                setPromoteBusy(true);
                try {
                  await callSetRole({ data: { user_id: promoting.id, role: "admin", action: "grant", reason: promoteReason.trim() } });
                  toast.success("Promoted to admin");
                  setPromoting(null);
                } catch (e: any) { toast.error(e.message ?? "Failed"); }
                finally { setPromoteBusy(false); }
              }}
            >{promoteBusy ? <Loader2 className="size-4 animate-spin" /> : "Promote to admin"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusPill({ status, suspended }: { status: string; suspended: boolean }) {
  if (suspended) return <Badge variant="outline" className="bg-destructive/15 text-destructive">Suspended</Badge>;
  const map: Record<string, string> = {
    active: "bg-green-500/15 text-green-700 dark:text-green-400",
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    expired: "bg-destructive/15 text-destructive",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium capitalize">{value}</div>
    </div>
  );
}
