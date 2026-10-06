import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Loader2, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendTestThuthukaNotification } from "@/lib/admin-roles.functions";
import { getErrorMessage } from "@/lib/errors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// International format, no + or spaces — what the WhatsApp Cloud API expects as `to`.
const WHATSAPP_RE = /^\d{8,15}$/;
const DEFAULT_EMAIL = "info@thuthuka-sa.co.za";
const DEFAULT_WHATSAPP = "27692450228";
const INPUT = "border-tksa-orange/20 bg-[#12110f] text-white placeholder:text-white/40";

/** Forgiving input cleanup: "Name <a@b.co.za>", stray spaces/commas, a 0-leading SA number, "+27 …". */
const cleanEmail = (raw: string) => (raw.match(/<([^>]+)>/)?.[1] ?? raw).trim().replace(/[,;]+$/, "").replace(/\s+/g, "").toLowerCase();
const cleanNumber = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("0") && digits.length === 10 ? `27${digits.slice(1)}` : digits;
};

/**
 * Who ThuthukaSA alerts go to: new LOA/RPA submissions and team changes
 * (someone requested, added or removed). Stored in the `notify_recipients`
 * site setting under "loa_rpa" — falls back to info@thuthuka-sa.co.za if
 * empty (see getNotifyRecipients in email.server.ts). ThuthukaSA's own
 * setting: advisors save it directly (narrow RLS policy on just this key).
 *
 * One address per row with add/remove buttons, saved immediately — the old
 * single comma-separated box kept tripping people up (typos, a wrong domain
 * like thuthukasa.co.za, forgetting to press Save).
 */
export function NotifyRecipientsCard() {
  const callTest = useServerFn(sendTestThuthukaNotification);
  const [emails, setEmails] = useState<string[]>([]);
  const [whatsapp, setWhatsapp] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "notify_recipients").maybeSingle();
      const cfg = (data?.value as Record<string, { emails?: string[]; whatsapp?: string[] }> | null)?.loa_rpa;
      setEmails(cfg?.emails?.length ? cfg.emails : [DEFAULT_EMAIL]);
      setWhatsapp(cfg?.whatsapp?.length ? cfg.whatsapp : [DEFAULT_WHATSAPP]);
      setLoaded(true);
    })();
  }, []);

  const persist = async (nextEmails: string[], nextWhatsapp: string[]) => {
    setSaving(true);
    try {
      const { data: current } = await supabase.from("site_settings").select("value").eq("key", "notify_recipients").maybeSingle();
      const value = { ...(current?.value as Record<string, unknown> | null), loa_rpa: { emails: nextEmails, whatsapp: nextWhatsapp } };
      const { error } = await supabase.from("site_settings").upsert({ key: "notify_recipients", value });
      if (error) throw error;
      setEmails(nextEmails);
      setWhatsapp(nextWhatsapp);
      return true;
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't save"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    // Allow pasting several at once.
    const items = newEmail.split(/[\s,;]+/).map(cleanEmail).filter(Boolean);
    if (items.length === 0) return;
    const bad = items.filter((x) => !EMAIL_RE.test(x));
    if (bad.length) return toast.error(`That doesn't look like an email address: ${bad.join(", ")}`);
    const next = [...new Set([...emails, ...items])];
    if (await persist(next, whatsapp)) {
      setNewEmail("");
      toast.success("Added. Use “Send test email” to check it arrives.");
    }
  };

  const removeEmail = async (addr: string) => {
    if (emails.length === 1) return toast.error("Keep at least one email address, or alerts would have nowhere to go");
    if (await persist(emails.filter((x) => x !== addr), whatsapp)) toast.success(`Removed ${addr}`);
  };

  const addNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = cleanNumber(newNumber);
    if (!n) return;
    if (!WHATSAPP_RE.test(n)) return toast.error("Enter a phone number with country code, e.g. 27821234567 or 082 123 4567");
    if (await persist(emails, [...new Set([...whatsapp, n])])) {
      setNewNumber("");
      toast.success("Added");
    }
  };

  const removeNumber = async (n: string) => {
    if (await persist(emails, whatsapp.filter((x) => x !== n))) toast.success("Removed");
  };

  const test = async () => {
    setTesting(true);
    try {
      const res = await callTest();
      if (res.failed.length) toast.error(`Couldn't send to: ${res.failed.join(", ")}`);
      if (res.sent.length) toast.success(`Test email sent to ${res.sent.join(", ")}. Not there in a few minutes? Check spam/junk.`);
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed"));
    } finally {
      setTesting(false);
    }
  };

  if (!loaded) return null;

  const chip = (label: string, onRemove: () => void) => (
    <span key={label} className="inline-flex items-center gap-1 rounded-full border border-tksa-orange/30 bg-tksa-orange/10 py-1 pl-3 pr-1 text-xs text-white">
      {label}
      <button type="button" aria-label={`Remove ${label}`} disabled={saving} onClick={onRemove} className="rounded-full p-0.5 text-white/60 hover:bg-white/10 hover:text-white">
        <X className="size-3.5" />
      </button>
    </span>
  );

  return (
    <div className="rounded-xl border border-tksa-orange/20 bg-tksa-dark p-5 space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Bell className="size-4" style={{ color: "#60a5fa" }} /> Who gets notified
        </h3>
        <p className="mt-1 text-xs text-white/50">
          These addresses are emailed when a new LOA / Risk Profile is submitted, and when someone is requested, added
          to or removed from the team. They don't need a dashboard login to receive alerts. Changes save immediately.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-white/70">Email addresses</label>
        <div className="flex flex-wrap gap-2">{emails.map((e) => chip(e, () => removeEmail(e)))}</div>
        <form onSubmit={addEmail} className="flex gap-2">
          <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="name@thuthuka-sa.co.za" className={INPUT} />
          <Button type="submit" size="sm" disabled={saving || !newEmail.trim()} className="bg-tksa-orange text-tksa-dark hover:bg-tksa-orange/90">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <><Plus className="mr-1 size-4" /> Add</>}
          </Button>
        </form>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-white/70">WhatsApp numbers (new submissions only)</label>
        <div className="flex flex-wrap gap-2">
          {whatsapp.length === 0 && <span className="text-xs text-white/40">None</span>}
          {whatsapp.map((n) => chip(`+${n}`, () => removeNumber(n)))}
        </div>
        <form onSubmit={addNumber} className="flex gap-2">
          <Input value={newNumber} onChange={(e) => setNewNumber(e.target.value)} placeholder="082 123 4567" className={INPUT} />
          <Button type="submit" size="sm" variant="outline" disabled={saving || !newNumber.trim()} className="border-tksa-orange/40 bg-transparent text-white hover:bg-tksa-orange/15 hover:text-white">
            <Plus className="mr-1 size-4" /> Add
          </Button>
        </form>
      </div>

      <Button size="sm" variant="outline" disabled={testing} onClick={test} className="border-tksa-orange/40 bg-transparent text-white hover:bg-tksa-orange/15 hover:text-white">
        {testing ? <Loader2 className="size-4 animate-spin" /> : <><Send className="mr-1.5 size-4" /> Send test email</>}
      </Button>
    </div>
  );
}
