import { useEffect, useState } from "react";
import { Loader2, CreditCard, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMyPayments, createPayfastCheckout } from "@/lib/payfast.functions";

type Payment = {
  id: string;
  tier: string;
  amount_cents: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  pf_payment_id: string | null;
};

type Profile = {
  membership_status: string | null;
  membership_tier: string | null;
  membership_expires_at: string | null;
  last_payment_at: string | null;
};

const fmtZar = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

function daysUntil(d: string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function statusBadge(s: string) {
  if (s === "paid") return <Badge className="bg-green-600 text-white">Paid</Badge>;
  if (s === "pending") return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
  if (s === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="outline">{s}</Badge>;
}

export function BillingTab({ preferredTier }: { preferredTier?: string | null }) {
  const [data, setData] = useState<{ payments: Payment[]; profile: Profile | null } | null>(null);
  const [paying, setPaying] = useState(false);
  const fnGet = useServerFn(getMyPayments);
  const fnCheckout = useServerFn(createPayfastCheckout);

  useEffect(() => {
    fnGet()
      .then((r) => setData(r as { payments: Payment[]; profile: Profile | null }))
      .catch((err) => toast.error(err.message ?? "Could not load billing"));
  }, [fnGet]);

  const pay = async (tier: "general" | "active" | "patron") => {
    setPaying(true);
    try {
      const r = (await fnCheckout({ data: { tier } })) as {
        action: string;
        fields: Record<string, string>;
      };
      // Build hidden form and submit to PayFast
      const form = document.createElement("form");
      form.method = "POST";
      form.action = r.action;
      for (const [k, v] of Object.entries(r.fields)) {
        const i = document.createElement("input");
        i.type = "hidden";
        i.name = k;
        i.value = v;
        form.appendChild(i);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      toast.error((err as Error).message);
      setPaying(false);
    }
  };

  if (!data) {
    return <Loader2 className="size-5 animate-spin text-muted-foreground" />;
  }

  const status = data.profile?.membership_status ?? "pending";
  const expiresAt = data.profile?.membership_expires_at ?? null;
  const lastPayment = data.profile?.last_payment_at ?? null;
  const daysLeft = daysUntil(expiresAt);
  const renewSoon = daysLeft !== null && daysLeft <= 30;
  const tierForPay =
    (preferredTier as "general" | "active" | "patron") ||
    (data.profile?.membership_tier as "general" | "active" | "patron") ||
    "active";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-5 text-accent" /> Billing & Membership
        </CardTitle>
        <CardDescription>Pay annual dues, view receipts, check renewal date.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status panel */}
        <div className="rounded-lg border p-4 grid sm:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Status</div>
            <div className="mt-1 flex items-center gap-2">
              {status === "active" ? (
                <CheckCircle2 className="size-5 text-green-600" />
              ) : (
                <AlertCircle className="size-5 text-yellow-500" />
              )}
              <span className="font-semibold capitalize">{status}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Last payment</div>
            <div className="mt-1 font-semibold">{fmtDate(lastPayment)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Renews</div>
            <div className="mt-1 font-semibold flex items-center gap-1.5">
              <Calendar className="size-4 text-muted-foreground" />
              {expiresAt ? `${fmtDate(expiresAt)}${daysLeft !== null ? ` (${daysLeft}d)` : ""}` : "—"}
            </div>
          </div>
        </div>

        {(status !== "active" || renewSoon) && (
          <div className="rounded-lg border border-accent/40 bg-accent/5 p-4">
            <div className="font-semibold mb-2">
              {status === "active" ? "Renew your membership" : "Pay your dues"}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Pay securely via PayFast. You'll be redirected to complete the transaction.
            </p>
            <div className="flex flex-wrap gap-2">
              {(["general", "active", "patron"] as const).map((t) => (
                <Button
                  key={t}
                  variant={t === tierForPay ? "default" : "outline"}
                  size="sm"
                  disabled={paying}
                  onClick={() => pay(t)}
                >
                  {paying && t === tierForPay && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                  Pay {t} — {fmtZar(t === "general" ? 50000 : t === "active" ? 150000 : 500000)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <div className="font-semibold mb-2">Payment history</div>
          {data.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments on record yet.</p>
          ) : (
            <div className="space-y-2">
              {data.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between border rounded-md p-3 text-sm">
                  <div>
                    <div className="font-medium capitalize">{p.tier} — {fmtZar(p.amount_cents)}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(p.paid_at ?? p.created_at)}
                      {p.pf_payment_id ? ` · ref ${p.pf_payment_id}` : ""}
                    </div>
                  </div>
                  {statusBadge(p.status)}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
