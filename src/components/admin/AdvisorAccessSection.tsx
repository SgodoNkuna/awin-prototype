import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, UserPlus, History, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requestSetUserRole, createAdvisorAccount } from "@/lib/admin-roles.functions";

function getErrorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

/**
 * Admin-only: create a brand-new website account for a ThuthukaSA staff
 * member who doesn't have one yet (e.g. info@thuthuka-sa.co.za), with
 * 'advisor' already granted. This is the account-creation step "Grant
 * advisor" below can't do on its own — that one only elevates an existing
 * account. Shows the generated temp password exactly once; it is never
 * stored anywhere client-side, so copy it before navigating away.
 *
 * Deliberately kept in A-Win Admin, not ThuthukaSA's own dashboard — who
 * can log in as an advisor is an A-Win access decision, not something
 * ThuthukaSA should be able to grant itself.
 */
function CreateAdvisorAccountCard() {
  const callCreate = useServerFn(createAdvisorAccount);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);

  const submit = async () => {
    if (!email.trim() || !fullName.trim()) return;
    if (!confirm(`Create a new ThuthukaSA advisor account for ${email.trim()}? This grants "advisor" access immediately (no second-admin approval — it's a brand-new account, not a promotion).`)) return;
    setBusy(true);
    try {
      const res = await callCreate({ data: { email: email.trim(), fullName: fullName.trim() } });
      setResult({ email: res.email, tempPassword: res.tempPassword });
      setEmail("");
      setFullName("");
      toast.success("Account created — copy the temp password below now, it won't be shown again");
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-accent/40">
      <CardContent className="pt-6 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="size-4 text-accent" /> Create ThuthukaSA advisor account
        </h3>
        <p className="text-xs text-muted-foreground -mt-2">
          For a ThuthukaSA staff member who doesn't have a website account yet — e.g. info@thuthuka-sa.co.za. Already
          have an account? Use "Grant advisor" below instead.
        </p>
        {result ? (
          <div className="rounded-lg border border-accent/50 bg-accent/10 p-3 text-sm space-y-1">
            <p className="font-medium">Account created for {result.email}</p>
            <p>
              Temp password: <code className="rounded bg-background px-1.5 py-0.5 font-mono">{result.tempPassword}</code>
            </p>
            <p className="text-xs text-muted-foreground">
              Send this to them now — it's shown once and isn't stored anywhere. They'll be forced to set their own
              password on first login.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium">Full name</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ThuthukaSA Advisor" />
              </div>
              <div>
                <label className="text-xs font-medium">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@thuthuka-sa.co.za" />
              </div>
            </div>
            <Button size="sm" disabled={busy || !email.trim() || !fullName.trim()} onClick={submit}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Admin-only: grant/revoke the 'advisor' role (ThuthukaSA) that RLS
 * requires to read LOA/RPA submissions and their storage bucket.
 */
function AdvisorAccessCard() {
  const callSetRole = useServerFn(requestSetUserRole);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"grant" | "revoke" | null>(null);

  const submit = async (action: "grant" | "revoke") => {
    if (!email.trim() || reason.trim().length < 5) return;
    setBusy(action);
    try {
      await callSetRole({ data: { email: email.trim(), role: "advisor", action, reason: reason.trim() } });
      toast.success(`${action === "grant" ? "Grant" : "Revoke"} request submitted — needs approval from a different admin`);
      setEmail("");
      setReason("");
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-accent/40">
      <CardContent className="pt-6 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="size-4 text-accent" /> ThuthukaSA advisor access
        </h3>
        <p className="text-xs text-muted-foreground -mt-2">
          Only accounts with the <strong>advisor</strong> role can see LOA/RPA submissions — regular A-Win admins
          can no longer read this data (confidentiality). Grant it to a ThuthukaSA staff member's existing website
          account by email. Requires approval from a different admin, same as promoting an admin.
        </p>
        <div className="grid gap-2">
          <label className="text-xs font-medium">ThuthukaSA staff email (must already have an account)</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="advisor@thuthuka-sa.co.za" />
        </div>
        <div className="grid gap-2">
          <label className="text-xs font-medium">Reason (audit log, min 5 chars)</label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. ThuthukaSA advisor onboarded 2026-08-09" />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy !== null || !email.trim() || reason.trim().length < 5}
            onClick={() => submit("revoke")}
          >
            {busy === "revoke" ? <Loader2 className="size-4 animate-spin" /> : "Revoke advisor"}
          </Button>
          <Button
            size="sm"
            disabled={busy !== null || !email.trim() || reason.trim().length < 5}
            onClick={() => submit("grant")}
          >
            {busy === "grant" ? <Loader2 className="size-4 animate-spin" /> : "Grant advisor"}
          </Button>
        </div>
      </CardContent>
    </Card>
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
    <Card>
      <CardContent className="pt-6 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <History className="size-4 text-accent" /> Recent access &amp; delivery changes
        </h3>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-start gap-2 text-xs border-b border-border/60 pb-2 last:border-0 last:pb-0">
              {row.action === "whatsapp_send_failed" ? (
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
              ) : (
                <History className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p>{describeAuditRow(row)}</p>
                <p className="text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                  {row.reason ? ` — ${row.reason}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
