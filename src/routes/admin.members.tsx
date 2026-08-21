import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Search, Download, Loader2, Shield, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { requestSetUserRole, requestDeleteMember, resetAccountPassword } from "@/lib/admin-roles.functions";
import { getErrorMessage } from "@/lib/errors";

export const Route = createFileRoute("/admin/members")({
  component: MembersPage,
});

type TierName = "general" | "active";
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

const TIERS = ["general", "active"] as const;
const TIER_LABELS: Record<TierName, string> = {
  general: "Joining Fee",
  active: "Monthly Contribution",
};

/** Admin (blue) and ThuthukaSA Advisor (their brand orange) — so it's obvious at a glance who's who. */
function RoleBadges({ roles }: { roles: Set<string> | undefined }) {
  if (!roles || roles.size === 0) return null;
  return (
    <span className="inline-flex gap-1 ml-2">
      {roles.has("admin") && (
        <Badge variant="outline" className="border-blue-400/50 bg-blue-500/10 text-blue-700">Admin</Badge>
      )}
      {roles.has("advisor") && (
        <Badge variant="outline" style={{ borderColor: "rgba(232,150,10,0.5)", background: "rgba(232,150,10,0.1)", color: "#a16207" }}>
          ThuthukaSA Advisor
        </Badge>
      )}
    </span>
  );
}

function MembersPage() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [roleMap, setRoleMap] = useState<Record<string, Set<string>>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [suspendedFilter, setSuspendedFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Member | null>(null);
  const [detail, setDetail] = useState<Member | null>(null);
  const [promoting, setPromoting] = useState<Member | null>(null);
  const [promoteReason, setPromoteReason] = useState("");
  const [promoteBusy, setPromoteBusy] = useState(false);
  const callSetRole = useServerFn(requestSetUserRole);
  const [revokingAdvisor, setRevokingAdvisor] = useState<Member | null>(null);
  const [revokeAdvisorReason, setRevokeAdvisorReason] = useState("");
  const [revokeAdvisorBusy, setRevokeAdvisorBusy] = useState(false);
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const callDeleteMember = useServerFn(requestDeleteMember);
  const callResetPassword = useServerFn(resetAccountPassword);
  const [resetPwBusy, setResetPwBusy] = useState(false);
  const [resetPwResult, setResetPwResult] = useState<{ email: string | null; tempPassword: string } | null>(null);

  const load = async () => {
    const [{ data, error }, { data: roleRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, membership_tier, membership_status, joined_at, suspended, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role").in("role", ["admin", "advisor"]),
    ]);
    if (error) toast.error(error.message);
    setMembers((data as Member[]) ?? []);
    const map: Record<string, Set<string>> = {};
    for (const r of roleRows ?? []) {
      (map[r.user_id] ??= new Set()).add(r.role);
    }
    setRoleMap(map);
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
    const headers = ["Name", "Email", "Payment Type", "Status", "Joined", "Suspended"];
    const rows = filtered.map((m) => [
      m.full_name ?? "",
      m.email ?? "",
      m.membership_tier ? TIER_LABELS[m.membership_tier] : "",
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
              <SelectTrigger><SelectValue placeholder="Payment type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payment types</SelectItem>
                <SelectItem value="none">Not set</SelectItem>
                {TIERS.map((t) => <SelectItem key={t} value={t}>{TIER_LABELS[t]}</SelectItem>)}
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
                    <th className="py-2 pr-3 font-medium">Payment Type</th>
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
                      <td className="py-3 pr-3 font-medium">
                        {m.full_name || "—"}
                        <RoleBadges roles={roleMap[m.id]} />
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">{m.email}</td>
                      <td className="py-3 pr-3">{m.membership_tier ? TIER_LABELS[m.membership_tier] : "—"}</td>
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
            <SheetTitle>
              {detail?.full_name || "(no name)"}
              {detail && <RoleBadges roles={roleMap[detail.id]} />}
            </SheetTitle>
            <SheetDescription>{detail?.email}</SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="mt-6 space-y-4 px-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Payment Type" value={detail.membership_tier ? TIER_LABELS[detail.membership_tier] : "—"} />
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
                {roleMap[detail.id]?.has("advisor") && (
                  <Button
                    variant="outline"
                    className="text-amber-700 hover:text-amber-700"
                    onClick={() => { setRevokingAdvisor(detail); setRevokeAdvisorReason(""); setDetail(null); }}
                  >
                    <ShieldOff className="size-4 mr-2" /> Revoke advisor
                  </Button>
                )}
                <Button
                  variant="outline"
                  disabled={resetPwBusy}
                  onClick={async () => {
                    if (!confirm(`Reset ${detail.full_name || detail.email}'s password? A new temporary password is generated immediately and they'll be forced to set their own on next login.`)) return;
                    setResetPwBusy(true);
                    try {
                      const res = await callResetPassword({ data: { user_id: detail.id } });
                      setResetPwResult({ email: res.email, tempPassword: res.tempPassword });
                      setDetail(null);
                    } catch (e) {
                      toast.error(getErrorMessage(e, "Failed"));
                    } finally {
                      setResetPwBusy(false);
                    }
                  }}
                >
                  {resetPwBusy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Shield className="size-4 mr-2" />}
                  Reset password
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => { setDeleting(detail); setDeleteConfirmEmail(""); setDeleteReason(""); setDetail(null); }}
                >
                  <Trash2 className="size-4 mr-2" /> Delete member
                </Button>
              </div>
            </div>
          )}
          <SheetFooter className="mt-6">
            <Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Shown once right after a reset — the temp password is never stored
          client-side anywhere else, so this is the only chance to copy it. */}
      <Dialog open={!!resetPwResult} onOpenChange={(o) => !o && setResetPwResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password reset</DialogTitle>
            <DialogDescription>
              Send this to {resetPwResult?.email ?? "the account owner"} now — it's shown once and isn't stored
              anywhere. They'll be forced to set their own password on next login.
            </DialogDescription>
          </DialogHeader>
          {resetPwResult && (
            <div className="rounded-lg border border-accent/50 bg-accent/10 p-3 text-sm">
              Temp password: <code className="rounded bg-background px-1.5 py-0.5 font-mono">{resetPwResult.tempPassword}</code>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResetPwResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete member — requires typing the exact email + a reason, so a single
          misclick can never delete an account. */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Member</DialogTitle>
            <DialogDescription>
              This permanently deletes {deleting?.full_name || deleting?.email}'s account and login
              access. Applications, payments and event registrations they made are kept for records,
              just no longer linked to a live account. This cannot be undone. This request needs
              approval from a different admin before it takes effect (see Admin → Approvals).
            </DialogDescription>
          </DialogHeader>
          {deleting && (
            <div className="space-y-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">
                  Type the member's email to confirm: <span className="font-mono">{deleting.email}</span>
                </Label>
                <Input value={deleteConfirmEmail} onChange={(e) => setDeleteConfirmEmail(e.target.value)} autoComplete="off" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Reason (audit log, min 5 chars)</Label>
                <Textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} rows={2} placeholder="e.g. Requested account closure, confirmed via email 2026-07-30" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={
                deleteBusy ||
                !deleting ||
                deleteConfirmEmail.trim().toLowerCase() !== (deleting?.email ?? "").trim().toLowerCase() ||
                deleteReason.trim().length < 5
              }
              onClick={async () => {
                if (!deleting) return;
                setDeleteBusy(true);
                try {
                  await callDeleteMember({
                    data: { user_id: deleting.id, confirm_email: deleteConfirmEmail.trim(), reason: deleteReason.trim() },
                  });
                  toast.success("Deletion request submitted — needs approval from a different admin");
                  setDeleting(null);
                } catch (e: any) {
                  toast.error(getErrorMessage(e, "Failed to delete member"));
                } finally {
                  setDeleteBusy(false);
                }
              }}
            >
              {deleteBusy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Trash2 className="size-4 mr-2" />}
              Request deletion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


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
                <label className="text-xs font-medium">Payment Type</label>
                <Select
                  value={editing.membership_tier ?? "none"}
                  onValueChange={(v) => setEditing({ ...editing, membership_tier: v === "none" ? null : (v as TierName) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {TIERS.map((t) => <SelectItem key={t} value={t}>{TIER_LABELS[t]}</SelectItem>)}
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
              <p className="text-xs text-muted-foreground">
                This requires approval from a different admin before it takes effect (see Admin → Approvals).
              </p>
              <div className="grid gap-2">
                <label className="text-xs font-medium">Reason (audit log, min 5 chars)</label>
                <Textarea value={promoteReason} onChange={(e) => setPromoteReason(e.target.value)} rows={3} placeholder="e.g. New committee chair, onboarded 2026-06-24" />
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
                  await callSetRole({ data: { user_id: promoting.id, email: promoting.email ?? undefined, role: "admin", action: "revoke", reason: promoteReason.trim() } });
                  toast.success("Revoke request submitted — needs approval from a different admin");
                  setPromoting(null);
                } catch (e: any) { toast.error(getErrorMessage(e, "Failed")); }
                finally { setPromoteBusy(false); }
              }}
            >Revoke admin</Button>
            <Button
              disabled={promoteBusy || promoteReason.trim().length < 5 || !promoting}
              onClick={async () => {
                if (!promoting) return;
                setPromoteBusy(true);
                try {
                  await callSetRole({ data: { user_id: promoting.id, email: promoting.email ?? undefined, role: "admin", action: "grant", reason: promoteReason.trim() } });
                  toast.success("Promotion request submitted — needs approval from a different admin");
                  setPromoting(null);
                } catch (e: any) { toast.error(getErrorMessage(e, "Failed")); }
                finally { setPromoteBusy(false); }
              }}
            >{promoteBusy ? <Loader2 className="size-4 animate-spin" /> : "Promote to admin"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-click shortcut from the badge you already see on this row —
          same requestSetUserRole revoke used in Admin > LOA & Risk Profile,
          just reachable without leaving this page. */}
      <Dialog open={!!revokingAdvisor} onOpenChange={(o) => !o && setRevokingAdvisor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Revoke ThuthukaSA Advisor Access</DialogTitle></DialogHeader>
          {revokingAdvisor && (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="font-medium">{revokingAdvisor.full_name || revokingAdvisor.email}</span>
                <br />
                <span className="text-xs text-muted-foreground">{revokingAdvisor.email}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                They will no longer be able to see LOA/RPA submissions. Requires approval from a different admin
                before it takes effect (see Admin → Approvals).
              </p>
              <div className="grid gap-2">
                <label className="text-xs font-medium">Reason (audit log, min 5 chars)</label>
                <Textarea value={revokeAdvisorReason} onChange={(e) => setRevokeAdvisorReason(e.target.value)} rows={3} placeholder="e.g. No longer with ThuthukaSA" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setRevokingAdvisor(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={revokeAdvisorBusy || revokeAdvisorReason.trim().length < 5 || !revokingAdvisor}
              onClick={async () => {
                if (!revokingAdvisor) return;
                setRevokeAdvisorBusy(true);
                try {
                  await callSetRole({ data: { user_id: revokingAdvisor.id, email: revokingAdvisor.email ?? undefined, role: "advisor", action: "revoke", reason: revokeAdvisorReason.trim() } });
                  toast.success("Revoke request submitted — needs approval from a different admin");
                  setRevokingAdvisor(null);
                } catch (e: any) { toast.error(getErrorMessage(e, "Failed")); }
                finally { setRevokeAdvisorBusy(false); }
              }}
            >{revokeAdvisorBusy ? <Loader2 className="size-4 animate-spin" /> : "Revoke advisor"}</Button>
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
