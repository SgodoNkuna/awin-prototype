import { useEffect, useState } from "react";
import { MessageCircle, Globe2, Copy, Check, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Copies `message` (not a bare URL) — whatever gets pasted into a WhatsApp
 * chat or anywhere else should explain itself with no extra context needed.
 * The code box shows exactly what's copied, so there's no surprise between
 * what you see and what lands on the clipboard.
 */
function CopyLinkRow({ label, icon, message }: { label: string; icon: React.ReactNode; message: string }) {
  const [copied, setCopied] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success("Copied — ready to paste");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
      <span className="flex items-center gap-1.5 text-xs font-medium text-white/50 w-32 shrink-0 sm:pt-1.5">
        {icon} {label}
      </span>
      <div className="flex flex-1 flex-col gap-2 min-w-0">
        <div className="flex items-start gap-2 min-w-0">
          <code className="flex-1 min-w-0 whitespace-pre-wrap break-words rounded-md border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/80">
            {message}
          </code>
          <Button size="sm" variant="ghost" onClick={() => setPreviewing((v) => !v)} className="shrink-0 text-white/60 hover:bg-white/10 hover:text-white" title="Preview how this looks in a chat">
            <Eye className="size-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={copy} className="shrink-0 border-[#e8960a]/40 bg-transparent text-white hover:bg-[#e8960a]/15 hover:text-white">
            {copied ? <Check className="size-3.5 mr-1.5 text-[#34d399]" /> : <Copy className="size-3.5 mr-1.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        {previewing && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg rounded-tl-none bg-[#dcf8c6] px-3 py-2 text-sm text-[#111b21] shadow-sm dark:bg-[#005c4b] dark:text-[#e9edef]">
              {message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Ready-to-send WhatsApp/website links for the LOA/RPA forms — ThuthukaSA's own outreach tool. */
export function ShareLinksCard() {
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  if (!origin) return null;

  return (
    <div className="rounded-xl border border-[#e8960a]/20 bg-[#1a1815] p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Share the full LOA &amp; Risk Profile form</h3>
        <p className="mt-1 text-xs text-white/50">
          For new A-Win members — includes the Risk Profile Analysis. Copy the WhatsApp version straight into a
          chat — it's a ready-to-send message, not just a bare link, and it tags the submission's source so you
          can tell WhatsApp applicants apart from website applicants.
        </p>
        <div className="mt-2 space-y-2">
          <CopyLinkRow
            label="WhatsApp"
            icon={<MessageCircle className="size-3.5" />}
            message={`Hi! Please complete your ThuthukaSA Letter of Authority & Risk Profile form here (via A-Win) — takes about 5 minutes: ${origin}/loa-rpa?src=whatsapp`}
          />
          <CopyLinkRow
            label="Website"
            icon={<Globe2 className="size-3.5" />}
            message={`ThuthukaSA (FSP No. 47992) — Letter of Authority & Risk Profile form, via A-Win: ${origin}/loa-rpa`}
          />
        </div>
      </div>
      <div className="border-t border-white/10 pt-4">
        <h3 className="text-sm font-semibold text-white">Share the LOA-only form</h3>
        <p className="mt-1 text-xs text-white/50">
          For anyone who isn't joining A-Win, or just needs Astute-facing paperwork — skips the Risk Profile
          questions entirely.
        </p>
        <div className="mt-2 space-y-2">
          <CopyLinkRow
            label="WhatsApp"
            icon={<MessageCircle className="size-3.5" />}
            message={`Hi! Please complete this short ThuthukaSA Letter of Authority form — takes about a minute: ${origin}/loa?src=whatsapp`}
          />
          <CopyLinkRow
            label="Website"
            icon={<Globe2 className="size-3.5" />}
            message={`ThuthukaSA (FSP No. 47992) — Letter of Authority form only, no Risk Profile: ${origin}/loa`}
          />
        </div>
      </div>
    </div>
  );
}
