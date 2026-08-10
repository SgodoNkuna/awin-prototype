import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageCircle, Globe2, Copy, Check, ShieldAlert, UserPlus, Bell, History, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/use-auth";
import { requestSetUserRole, createAdvisorAccount } from "@/lib/admin-roles.functions";
import { requestSiteSettingsUpdate } from "@/lib/admin-settings.functions";
import { SubmissionsPanel } from "@/components/loa-rpa/SubmissionsPanel";

function getErrorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export const Route = createFileRoute("/admin/loa-rpa")({
  component: LoaRpaAdminPage,
});

function CopyLinkRow({ label, icon, url }: { label: string; icon: React.ReactNode; url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground w-32 shrink-0">
        {icon} {label}
      </span>
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <code className="flex-1 min-w-0 truncate rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs">
          {url}
        </code>
        <Button size="sm" variant="outline" onClick={copy} className="shrink-0">
          {copied ? <Check className="size-3.5 mr-1.5 text-primary" /> : <Copy className="size-3.5 mr-1.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Admin-only: where new-submission alerts actually go, on top of the "New
 * LOA & RPA" toggle in Admin → Settings → Notifications. Stored in the
 * `notify_recipients` site_setting under the "loa_rpa" key — falls back to
 * info@thuthuka-sa.co.za / ThuthukaSA's WhatsApp number if left empty (see
 * getNotifyRecipients in email.server.ts). Saving goes through the same
 * two-person approval as any other site setting, so redirecting where this
 * confidential data gets copied is always a logged, second-admin-approved
 * change — not a silent code edit.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// International format, no + or spaces — matches the placeholder/help text
// below and what the WhatsApp Cloud API expects as `to`.
const WHATSAPP_RE = /^\d{8,15}$/;

function NotifyRecipientsCard() {
  const callUpdateSettings = useServerFn(requestSiteSettingsUpdate);
  const [emails, setEmails] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "notify_recipients").maybeSingle();
      const cfg = (data?.value as Record<string, { emails?: string[]; whatsapp?: string[] }> | null)?.loa_rpa;
      setEmails((cfg?.emails ?? ["info@thuthuka-sa.co.za"]).join(", "));
      setWhatsapp((cfg?.whatsapp ?? ["27692450228"]).join(", "));
      setLoaded(true);
    })();
  }, []);

  const save = async () => {
    const emailList = emails.split(",").map((e) => e.trim()).filter(Boolean);
    const waList = whatsapp.split(",").map((w) => w.trim()).filter(Boolean);
    if (emailList.length === 0) return toast.error("Keep at least one email — this is the confidentiality fallback");
    const badEmails = emailList.filter((e) => !EMAIL_RE.test(e));
    if (badEmails.length > 0) return toast.error(`Not a valid email: ${badEmails.join(", ")}`);
    const badNumbers = waList.filter((w) => !WHATSAPP_RE.test(w));
    if (badNumbers.length > 0) return toast.error(`WhatsApp numbers must be digits only, country code first, no + or spaces: ${badNumbers.join(", ")}`);
    if (!confirm(`Submit new LOA/RPA alert recipients for approval?\n\nEmails: ${emailList.join(", ")}\nWhatsApp: ${waList.join(", ") || "(none)"}\n\nA different admin must approve this before it takes effect.`)) return;
    setSaving(true);
    try {
      const { data: current } = await supabase.from("site_settings").select("value").eq("key", "notify_recipients").maybeSingle();
      const value = { ...(current?.value as Record<string, unknown> | null), loa_rpa: { emails: emailList, whatsapp: waList } };
      await callUpdateSettings({ data: { key: "notify_recipients", value } });
      toast.success("Submitted — needs approval from a different admin (see Admin → Approvals)");
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed"));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="size-4 text-accent" /> Advisory notification recipients
        </h3>
        <p className="text-xs text-muted-foreground -mt-2">
          Every new LOA/RPA submission alerts these addresses/numbers — never A-Win's admin inbox. Add other
          ThuthukaSA staff here as needed; each change is audited and needs a second admin's approval.
        </p>
        <div className="grid gap-2">
          <label className="text-xs font-medium">Emails (comma-separated)</label>
          <Input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="info@thuthuka-sa.co.za" />
        </div>
        <div className="grid gap-2">
          <label className="text-xs font-medium">WhatsApp numbers, international format, no + or spaces (comma-separated)</label>
          <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="27692450228" />
        </div>
        <Button size="sm" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Save recipients"}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Admin-only: create a brand-new website account for a ThuthukaSA staff
 * member who doesn't have one yet (e.g. info@thuthuka-sa.co.za), with
 * 'advisor' already granted. This is the account-creation step "Grant
 * advisor" below can't do on its own — that one only elevates an existing
 * account. Shows the generated temp password exactly once; it is never
 * stored anywhere client-side, so copy it before navigating away.
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
 * Admin-only: grant/revoke the 'advisor' role (ThuthukaSA) that RLS now
 * requires to read this table and its storage bucket — see the
 * 20260809100001 migration. The target must already have a website account
 * (sign up first); this only elevates an existing profile.
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
          Only accounts with the <strong>advisor</strong> role can see LOA/RPA submissions below — regular A-Win
          admins can no longer read this data (confidentiality). Grant it to a ThuthukaSA staff member's existing
          website account by email. Requires approval from a different admin, same as promoting an admin.
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
 * Admin-only: the two-person approval flow already writes every
 * recipient/role change to audit_logs — this just makes that visible in the
 * UI instead of requiring a direct DB query to check "who changed what."
 * Scoped to actions relevant to this page (advisor access, notification
 * recipients, WhatsApp delivery failures) rather than the whole audit log.
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

function ShareLinksCard() {
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  if (!origin) return null;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Share the full LOA &amp; Risk Profile form</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            For new A-Win members — includes the Risk Profile Analysis. Send the WhatsApp link when sharing in a
            chat — it tags the submission's source so you can tell WhatsApp applicants apart from website applicants.
          </p>
          <div className="mt-2 space-y-2">
            <CopyLinkRow label="WhatsApp" icon={<MessageCircle className="size-3.5" />} url={`${origin}/loa-rpa?src=whatsapp`} />
            <CopyLinkRow label="Website" icon={<Globe2 className="size-3.5" />} url={`${origin}/loa-rpa`} />
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Share the LOA-only form</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            For anyone who isn't joining A-Win, or just needs Astute-facing paperwork — skips the Risk Profile
            questions entirely.
          </p>
          <div className="mt-2 space-y-2">
            <CopyLinkRow label="WhatsApp" icon={<MessageCircle className="size-3.5" />} url={`${origin}/loa?src=whatsapp`} />
            <CopyLinkRow label="Website" icon={<Globe2 className="size-3.5" />} url={`${origin}/loa`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoaRpaAdminPage() {
  const { isAdmin, isAdvisor } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">LOA &amp; Risk Profile</h1>
        <p className="text-sm text-muted-foreground">
          Signed Letters of Authority and Risk Profile Analyses collected via WhatsApp or the website, on file with
          ThuthukaSA (FSP 47992).
        </p>
      </div>

      {isAdmin && <NotifyRecipientsCard />}
      {isAdmin && <CreateAdvisorAccountCard />}
      {isAdmin && <AdvisorAccessCard />}
      {isAdmin && <RecentChangesCard />}

      {isAdmin && !isAdvisor && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 flex items-start gap-2 text-sm">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <span>
              You have A-Win admin access but not the ThuthukaSA <strong>advisor</strong> role, so submissions below
              are hidden by design — this data is confidential to ThuthukaSA. Grant yourself advisor access above if
              you're authorised to see it.
            </span>
          </CardContent>
        </Card>
      )}

      <ShareLinksCard />

      <SubmissionsPanel emptyHint="No submissions yet. Copy the link above and share it to get started." />
    </div>
  );
}
