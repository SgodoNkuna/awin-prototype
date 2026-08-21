import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, UserPlus, History, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requestAdvisorRoleChange, createAdvisorAccount } from "@/lib/admin-roles.functions";

function getErrorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

/**
 * Request a brand-new website account for a ThuthukaSA staff member who
 * doesn't have one yet (e.g. info@thuthuka-sa.co.za), with 'advisor' to be
 * granted once approved. This is the account-creation step "Grant advisor"
 * below can't do on its own — that one only elevates an existing account.
 *
 * ThuthukaSA can file this request themselves, but creating a live login is
 * sensitive enough that it still needs an A-Win admin's approval (Admin >
 * Approvals) before the account — and its one-time temp password — actually
 * gets created.
 */
function CreateAdvisorAccountCard() {
  const callCreate = useServerFn(createAdvisorAccount);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !fullName.trim()) return;
    setBusy(true);
    try {
      await callCreate({ data: { email: email.trim(), fullName: fullName.trim() } });
      setRequested(email.trim());
      setEmail("");
      setFullName("");
      toast.success("Requested — needs approval from an A-Win admin");
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#e8960a]/20 bg-[#1a1815] p-5 space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
        <UserPlus className="size-4" style={{ color: "#c084fc" }} /> Create ThuthukaSA advisor account
      </h3>
      <p className="-mt-2 text-xs text-white/50">
        For a ThuthukaSA staff member who doesn't have a website account yet — e.g. info@thuthuka-sa.co.za. Already
        have an account? Use "Grant advisor" below instead.
      </p>
      {requested ? (
        <div className="space-y-1 rounded-lg border border-[#e8960a]/40 bg-[#e8960a]/10 p-3 text-sm">
          <p className="font-medium text-white">Requested account for {requested}</p>
          <p className="text-xs text-white/60">
            An A-Win admin needs to approve this before it's created — once they do, they'll have the temp
            password to send you.
          </p>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setRequested(null)}>
            Request another
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-white/70">Full name</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ThuthukaSA Advisor" className="border-[#e8960a]/20 bg-[#12110f] text-white placeholder:text-white/40" />
            </div>
            <div>
              <label className="text-xs font-medium text-white/70">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@thuthuka-sa.co.za" className="border-[#e8960a]/20 bg-[#12110f] text-white placeholder:text-white/40" />
            </div>
          </div>
          <Button size="sm" disabled={busy || !email.trim() || !fullName.trim()} className="bg-[#e8960a] text-[#1a1815] hover:bg-[#e8960a]/90" onClick={submit}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Request account"}
          </Button>
        </>
      )}
    </div>
  );
}

/**
 * Grant/revoke the 'advisor' role (ThuthukaSA) that RLS requires to read
 * LOA/RPA submissions and their storage bucket. Uses the narrow
 * requestAdvisorRoleChange (role hardcoded server-side to 'advisor'), so
 * ThuthukaSA can file this themselves — an A-Win admin still has to approve
 * it before it takes effect.
 */
function AdvisorAccessCard() {
  const callSetRole = useServerFn(requestAdvisorRoleChange);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"grant" | "revoke" | null>(null);

  const submit = async (action: "grant" | "revoke") => {
    if (!email.trim() || reason.trim().length < 5) return;
    setBusy(action);
    try {
      await callSetRole({ data: { email: email.trim(), action, reason: reason.trim() } });
      toast.success(`${action === "grant" ? "Grant" : "Revoke"} request submitted — needs approval from an A-Win admin`);
      setEmail("");
      setReason("");
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-[#e8960a]/20 bg-[#1a1815] p-5 space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
        <UserPlus className="size-4" style={{ color: "#c084fc" }} /> ThuthukaSA advisor access
      </h3>
      <p className="-mt-2 text-xs text-white/50">
        Only accounts with the <strong className="text-white/70">advisor</strong> role can see LOA/RPA submissions —
        regular A-Win admins can no longer read this data (confidentiality). Grant it to a ThuthukaSA staff member's
        existing website account by email. Requires approval from an A-Win admin.
      </p>
      <div className="grid gap-2">
        <label className="text-xs font-medium text-white/70">ThuthukaSA staff email (must already have an account)</label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="advisor@thuthuka-sa.co.za" className="border-[#e8960a]/20 bg-[#12110f] text-white placeholder:text-white/40" />
      </div>
      <div className="grid gap-2">
        <label className="text-xs font-medium text-white/70">Reason (audit log, min 5 chars)</label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. ThuthukaSA advisor onboarded 2026-08-09" className="border-[#e8960a]/20 bg-[#12110f] text-white placeholder:text-white/40" />
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-[#e8960a]/40 bg-transparent text-white hover:bg-[#e8960a]/15 hover:text-white"
          disabled={busy !== null || !email.trim() || reason.trim().length < 5}
          onClick={() => submit("revoke")}
        >
          {busy === "revoke" ? <Loader2 className="size-4 animate-spin" /> : "Revoke advisor"}
        </Button>
        <Button
          size="sm"
          className="bg-[#e8960a] text-[#1a1815] hover:bg-[#e8960a]/90"
          disabled={busy !== null || !email.trim() || reason.trim().length < 5}
          onClick={() => submit("grant")}
        >
          {busy === "grant" ? <Loader2 className="size-4 animate-spin" /> : "Grant advisor"}
        </Button>
      </div>
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
    <div className="rounded-xl border border-[#e8960a]/20 bg-[#1a1815] p-5 space-y-3">
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
      <CreateAdvisorAccountCard />
      <AdvisorAccessCard />
      <RecentChangesCard />
    </div>
  );
}
