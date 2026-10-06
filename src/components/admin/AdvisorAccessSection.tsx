import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, UserPlus, History, AlertTriangle, Mail, UserMinus, Clock, Users2, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  requestAddAdvisorTeamMember,
  listAdvisorTeam,
  resendAdvisorLoginEmail,
  requestAdvisorRoleChange,
  decideTksaRequest,
} from "@/lib/admin-roles.functions";
import { getErrorMessage } from "@/lib/errors";

type Team = Awaited<ReturnType<typeof listAdvisorTeam>>;

const INPUT = "border-tksa-orange/20 bg-[#12110f] text-white placeholder:text-white/40";

/**
 * One card for everything about who can sign in to /tksa: the current team
 * (and whether each person has ever signed in), requests still waiting on an
 * A-Win admin, and a single "Add team member" form. The server works out
 * whether that's a brand-new account or advisor access on an existing one —
 * ThuthukaSA used to have to guess which of two forms to use.
 *
 * Requests are approved only by ThuthukaSA's named approver (Tebogo, role
 * 'tksa_manager') — never a general A-Win admin. The approver sees
 * Approve/Reject on each request here, and her own adds/removals take effect
 * straight away. Once approved, the new person is emailed a set-password link
 * directly. No temp password is ever relayed by hand.
 */
function TeamCard() {
  const callList = useServerFn(listAdvisorTeam);
  const callAdd = useServerFn(requestAddAdvisorTeamMember);
  const callResend = useServerFn(resendAdvisorLoginEmail);
  const callRole = useServerFn(requestAdvisorRoleChange);
  const callDecide = useServerFn(decideTksaRequest);
  const [team, setTeam] = useState<Team | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const approver = team?.approverNames.length ? team.approverNames.map((n) => n.split(" ")[0]).join(" or ") : "ThuthukaSA's approver";

  const load = useCallback(async () => {
    try {
      setTeam(await callList());
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't load the team"));
    }
  }, [callList]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) return;
    setBusy("add");
    try {
      const res = await callAdd({ data: { email: email.trim(), fullName: fullName.trim() } });
      toast.success(
        res.immediate
          ? "Added. They've been emailed a link to set their password."
          : `Requested. Once ${approver} approves, they'll get an email to set their password.`,
      );
      setEmail("");
      setFullName("");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed"));
    } finally {
      setBusy(null);
    }
  };

  const resend = async (to: string) => {
    setBusy(`resend:${to}`);
    try {
      await callResend({ data: { email: to } });
      toast.success(`Login email sent to ${to}. Ask them to check spam/junk too.`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed"));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (to: string) => {
    const msg = team?.viewerIsApprover
      ? `Remove ${to}'s access to the ThuthukaSA dashboard?\n\nThis takes effect straight away.`
      : `Remove ${to}'s access to the ThuthukaSA dashboard?\n\n${approver} has to approve it before it takes effect.`;
    if (!confirm(msg)) return;
    setBusy(`remove:${to}`);
    try {
      const res = await callRole({ data: { email: to, action: "revoke", reason: `Remove ${to} from the ThuthukaSA team` } });
      toast.success(res.immediate ? `${to} no longer has access.` : `Removal requested. ${approver} needs to approve it.`);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed"));
    } finally {
      setBusy(null);
    }
  };

  const decide = async (id: string, decision: "approve" | "reject", who: string) => {
    let reason: string | undefined;
    if (decision === "reject") {
      const r = prompt(`Reject the request for ${who}? Optional: say why (the team will see this).`);
      if (r === null) return;
      reason = r.trim() || undefined;
    } else if (!confirm(`Approve the request for ${who}?`)) return;
    setBusy(`decide:${id}`);
    try {
      await callDecide({ data: { approval_id: id, decision, reason } });
      toast.success(decision === "approve" ? `Approved. ${who} has been emailed.` : "Rejected.");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-tksa-orange/20 bg-tksa-dark p-5 space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
        <Users2 className="size-4" style={{ color: "#c084fc" }} /> ThuthukaSA team
      </h3>
      {team && (
        <p className="-mt-2 flex items-center gap-1.5 text-xs text-white/50">
          <ShieldCheck className="size-3.5 text-tksa-orange" />
          {team.viewerIsApprover
            ? "You are ThuthukaSA's approver: you approve requests below, and people you add or remove change straight away."
            : `New team members are approved by ${approver} (ThuthukaSA's approver), not by A-Win admins.`}
        </p>
      )}

      {!team ? (
        <Loader2 className="size-4 animate-spin text-white/50" />
      ) : (
        <div className="space-y-2">
          {team.members.length === 0 && <p className="text-xs text-white/50">No one has access yet.</p>}
          {team.members.map((m) => (
            <div key={m.email} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 p-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{m.fullName || m.email}</p>
                <p className="truncate text-xs text-white/50">
                  {m.email} ·{" "}
                  {m.lastSignInAt ? `last signed in ${new Date(m.lastSignInAt).toLocaleDateString()}` : <span className="text-tksa-orange">hasn't signed in yet</span>}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-white/70 hover:bg-white/10 hover:text-white" disabled={busy !== null} onClick={() => resend(m.email)}>
                  {busy === `resend:${m.email}` ? <Loader2 className="size-3.5 animate-spin" /> : <><Mail className="mr-1 size-3.5" /> Resend login email</>}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-white/50 hover:bg-white/10 hover:text-white" disabled={busy !== null} onClick={() => remove(m.email)}>
                  {busy === `remove:${m.email}` ? <Loader2 className="size-3.5 animate-spin" /> : <><UserMinus className="mr-1 size-3.5" /> Remove</>}
                </Button>
              </div>
            </div>
          ))}
          {team.pending.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-tksa-orange/30 p-2.5 text-xs text-white/60">
              <span className="flex items-center gap-2">
                <Clock className="size-3.5 shrink-0 text-tksa-orange" />
                <span>
                  {p.kind === "remove" ? "Remove " : "Add "}
                  <span className="text-white/80">{p.fullName || p.email}</span> ({p.email}) — waiting for {approver} to approve
                  {p.requestedBy ? ` · asked by ${p.requestedBy}` : ""} ({new Date(p.requestedAt).toLocaleDateString()})
                </span>
              </span>
              {p.canDecide && (
                <span className="flex gap-1.5">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-white/60 hover:bg-white/10 hover:text-white" disabled={busy !== null} onClick={() => decide(p.id, "reject", p.email)}>
                    <XCircle className="mr-1 size-3.5" /> Reject
                  </Button>
                  <Button size="sm" className="h-7 bg-tksa-orange px-2 text-xs text-tksa-dark hover:bg-tksa-orange/90" disabled={busy !== null} onClick={() => decide(p.id, "approve", p.email)}>
                    {busy === `decide:${p.id}` ? <Loader2 className="size-3.5 animate-spin" /> : <><CheckCircle2 className="mr-1 size-3.5" /> Approve</>}
                  </Button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={add} className="space-y-2 border-t border-white/10 pt-4">
        <p className="flex items-center gap-2 text-sm font-medium text-white">
          <UserPlus className="size-4" style={{ color: "#c084fc" }} /> Add team member
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className={INPUT} />
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@thuthuka-sa.co.za" className={INPUT} />
        </div>
        <p className="text-xs text-white/50">
          {team?.viewerIsApprover
            ? "Works whether or not they already have a website account. They're added straight away and emailed a link to set their own password."
            : `Works whether or not they already have a website account. ${approver} approves it, then they're emailed a link to set their own password.`}
        </p>
        <Button type="submit" size="sm" disabled={busy !== null || !email.trim() || !fullName.trim()} className="bg-tksa-orange text-tksa-dark hover:bg-tksa-orange/90">
          {busy === "add" ? <Loader2 className="size-4 animate-spin" /> : team?.viewerIsApprover ? "Add now" : "Request access"}
        </Button>
      </form>
    </div>
  );
}

type AuditLogRow = {
  id: string;
  actor_email: string | null;
  action: string;
  reason: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

const AUDIT_ACTIONS = [
  "role_grant",
  "role_revoke",
  "advisor_account_bootstrap",
  "site_settings_update",
  "whatsapp_send_failed",
] as const;

function describeAuditRow(row: AuditLogRow): string {
  const d = row.details ?? {};
  switch (row.action) {
    case "role_grant":
      return `${row.actor_email ?? "someone"} granted "${d.role}" to ${d.target_email ?? "a user"}`;
    case "role_revoke":
      return `${row.actor_email ?? "someone"} revoked "${d.role}" from ${d.target_email ?? "a user"}`;
    case "advisor_account_bootstrap":
      return `${row.actor_email ?? "someone"} created a new advisor account for ${d.target_email ?? "a user"}`;
    case "account_password_reset":
      return `${row.actor_email ?? "someone"} reset the password for ${d.target_email ?? "a user"}`;
    case "site_settings_update":
      return `${row.actor_email ?? "someone"} updated site settings`;
    case "whatsapp_send_failed":
      return `WhatsApp send to ${d.to ?? "a number"} failed: ${d.error ?? "unknown error"}`;
    default:
      return row.action;
  }
}

/**
 * The two-person approval flow already writes every recipient/role change
 * to audit_logs — this just makes that visible in the UI instead of
 * requiring a direct DB query to check "who changed what."
 */
function RecentChangesCard() {
  const [rows, setRows] = useState<AuditLogRow[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, actor_email, action, reason, details, created_at")
        .in("action", AUDIT_ACTIONS as unknown as string[])
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) return; // non-critical — this card is a convenience view
      setRows((data as unknown as AuditLogRow[]) ?? []);
    })();
  }, []);

  if (!rows || rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-tksa-orange/20 bg-tksa-dark p-5 space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
        <History className="size-4" style={{ color: "#c084fc" }} /> Recent access &amp; delivery changes
      </h3>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-start gap-2 border-b border-white/10 pb-2 text-xs last:border-0 last:pb-0">
            {row.action === "whatsapp_send_failed" ? (
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            ) : (
              <History className="mt-0.5 size-3.5 shrink-0 text-white/40" />
            )}
            <div>
              <p className="text-white/80">{describeAuditRow(row)}</p>
              <p className="text-white/50">
                {new Date(row.created_at).toLocaleString()}
                {row.reason ? ` — ${row.reason}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Everything to do with who can log in as a ThuthukaSA advisor, and an audit trail of changes to that. */
export function AdvisorAccessSection() {
  return (
    <div className="space-y-4">
      <TeamCard />
      <RecentChangesCard />
    </div>
  );
}
