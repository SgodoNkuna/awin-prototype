import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getErrorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// International format, no + or spaces — matches the placeholder/help text
// below and what the WhatsApp Cloud API expects as `to`.
const WHATSAPP_RE = /^\d{8,15}$/;

/**
 * Where new-submission alerts go, on top of the "New LOA & RPA" toggle in
 * Admin → Settings → Notifications. Stored in the `notify_recipients` site
 * setting under the "loa_rpa" key — falls back to info@thuthuka-sa.co.za /
 * ThuthukaSA's WhatsApp number if left empty (see getNotifyRecipients in
 * email.server.ts). This is ThuthukaSA's own setting, not A-Win's — advisors
 * save it directly (a narrow RLS policy scoped to just this one key), no
 * A-Win admin involvement needed.
 */
export function NotifyRecipientsCard() {
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
    setSaving(true);
    try {
      const { data: current } = await supabase.from("site_settings").select("value").eq("key", "notify_recipients").maybeSingle();
      const value = { ...(current?.value as Record<string, unknown> | null), loa_rpa: { emails: emailList, whatsapp: waList } };
      const { error } = await supabase.from("site_settings").upsert({ key: "notify_recipients", value });
      if (error) throw error;
      toast.success("Saved");
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed"));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="rounded-xl border border-[#e8960a]/20 bg-[#1a1815] p-5 space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
        <Bell className="size-4" style={{ color: "#60a5fa" }} /> Notification recipients
      </h3>
      <p className="-mt-2 text-xs text-white/50">
        Every new LOA/RPA submission alerts these addresses/numbers — never A-Win's admin inbox. Add other
        ThuthukaSA staff here as needed.
      </p>
      <div className="grid gap-2">
        <label className="text-xs font-medium text-white/70">Emails (comma-separated)</label>
        <Input
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="info@thuthuka-sa.co.za"
          className="border-[#e8960a]/20 bg-[#12110f] text-white placeholder:text-white/40"
        />
      </div>
      <div className="grid gap-2">
        <label className="text-xs font-medium text-white/70">WhatsApp numbers, international format, no + or spaces (comma-separated)</label>
        <Input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="27692450228"
          className="border-[#e8960a]/20 bg-[#12110f] text-white placeholder:text-white/40"
        />
      </div>
      <Button size="sm" disabled={saving} className="bg-[#e8960a] text-[#1a1815] hover:bg-[#e8960a]/90" onClick={save}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : "Save recipients"}
      </Button>
    </div>
  );
}
