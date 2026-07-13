import { useMemo, useState } from "react";
import { Copy, Check, Upload, FileText, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Deterministic AWIN-{SURNAME}-{6 digit} reference.
 * Same input → same output, so members can regenerate their reference at any time.
 */
export function buildEftReference(fullName: string, seed?: string): string {
  const surname = (fullName.trim().split(/\s+/).pop() || "MEMBER")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 12) || "MEMBER";
  const input = `${surname}|${seed ?? ""}|awin-2026`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  const digits = String(Math.abs(hash)).padStart(6, "0").slice(-6);
  return `AWIN-${surname}-${digits}`;
}

const BANK = {
  account_name: "A-WIN Collective NPC",
  bank: "Standard Bank",
  branch: "Universal · 051001",
  account_type: "Business Current",
  account_number: "•••• •••• 4821",
};

type Purpose = "entry" | "monthly";

export function EftPanel({
  fullName,
  userSeed,
  purpose,
  onPurposeChange,
  onFileChange,
  onReferenceChange,
  file,
}: {
  fullName: string;
  userSeed?: string;
  purpose: Purpose;
  onPurposeChange: (p: Purpose) => void;
  onFileChange: (f: File | null) => void;
  onReferenceChange?: (ref: string) => void;
  file: File | null;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const reference = useMemo(() => {
    const ref = buildEftReference(fullName, userSeed);
    onReferenceChange?.(ref);
    return ref;
  }, [fullName, userSeed, onReferenceChange]);

  const amount = purpose === "entry" ? "R200.00" : "R500.00";

  const rows: { label: string; value: string; k: string }[] = [
    { label: "Beneficiary", value: BANK.account_name, k: "beneficiary" },
    { label: "Bank", value: BANK.bank, k: "bank" },
    { label: "Branch code", value: BANK.branch, k: "branch" },
    { label: "Account type", value: BANK.account_type, k: "account_type" },
    { label: "Account number", value: BANK.account_number, k: "account_number" },
    { label: "Amount", value: amount, k: "amount" },
    { label: "Your reference", value: reference, k: "reference" },
  ];

  const copy = async (val: string, key: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1400);
    } catch {
      /* ignore */
    }
  };

  const copyAll = () => {
    const text = rows.map((r) => `${r.label}: ${r.value}`).join("\n");
    copy(text, "all");
  };

  return (
    <div className="space-y-5">
      {/* Purpose toggle */}
      <div className="inline-flex rounded-full border border-border bg-background p-1 text-sm">
        <button
          type="button"
          onClick={() => onPurposeChange("entry")}
          className={cn(
            "rounded-full px-4 py-1.5 font-medium transition-colors",
            purpose === "entry" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Entry fee · R200
        </button>
        <button
          type="button"
          onClick={() => onPurposeChange("monthly")}
          className={cn(
            "rounded-full px-4 py-1.5 font-medium transition-colors",
            purpose === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Monthly · R500
        </button>
      </div>

      {/* Bank details card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elegant)]">
        <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-5 py-3">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <div className="text-sm font-semibold text-foreground">EFT payment details</div>
          </div>
          <Button size="sm" variant="outline" onClick={copyAll}>
            {copied === "all" ? <Check className="mr-1.5 size-3.5" /> : <Copy className="mr-1.5 size-3.5" />}
            Copy all
          </Button>
        </div>
        <dl className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.k} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{r.label}</dt>
                <dd
                  className={cn(
                    "truncate text-sm text-foreground",
                    r.k === "reference" && "font-mono font-semibold text-primary",
                    r.k === "amount" && "font-semibold",
                  )}
                >
                  {r.value}
                </dd>
              </div>
              <button
                type="button"
                onClick={() => copy(r.value, r.k)}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-secondary"
                aria-label={`Copy ${r.label}`}
              >
                {copied === r.k ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
                {copied === r.k ? "Copied" : "Copy"}
              </button>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex gap-2 rounded-lg border border-accent/30 bg-accent/8 p-3 text-xs text-foreground/80">
        <Info className="mt-0.5 size-4 shrink-0 text-accent-deep" />
        <p>
          Use the exact reference above so the treasurer can auto-match your payment. Payments
          without a reference can take up to 5 working days to reconcile.
        </p>
      </div>

      {/* Upload */}
      <div className="rounded-2xl border-2 border-dashed border-border bg-secondary/20 p-5">
        <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Upload className="size-4" /> Upload proof of payment
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, JPG or PNG. We accept bank confirmations, screenshots and stamped deposit slips.
        </p>
        <Input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          className="mt-3"
        />
        {file && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-background p-3 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <span className="truncate">{file.name}</span>
              <Badge variant="outline" className="ml-1 text-[10px]">
                {Math.round(file.size / 1024)} KB
              </Badge>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => onFileChange(null)}>
              Remove
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
