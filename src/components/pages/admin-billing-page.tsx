import { } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RotateCw, ShieldAlert, ShieldCheck, History, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import {
  listPayments,
  listWebhookEvents,
  listAuditLogs,
  listMembersBrief,
  retryWebhookEvent,
  overrideMembership} from "@/lib/billing-admin.functions";



type Payment = {
  id: string;
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  tier: string;
  amount_cents: number;
  currency: string;
  status: string;
  m_payment_id: string;
  pf_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
};

type WebhookEvent = {
  id: string;
  m_payment_id: string | null;
  pf_payment_id: string | null;
  signature_valid: boolean;
  processed: boolean;
  error: string | null;
  retry_count: number;
  source_ip: string | null;
  created_at: string;
};

type AuditLog = {
  id: string;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  details: unknown;
  created_at: string;
};

type Member = {
  id: string;
  email: string;
  full_name: string | null;
  membership_status: string | null;
  membership_tier: string | null;
  membership_expires_at: string | null;
};

const fmtZar = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleString() : "—");

function statusBadge(s: string) {
  const map: Record<string, string> = {
    paid: "bg-green-600 text-white",
    pending: "bg-yellow-500 text-white",
    failed: "bg-destructive text-destructive-foreground",
    refunded: "bg-muted text-foreground",
    cancelled: "bg-muted text-foreground"};
  return <Badge className={map[s] ?? ""}>{s}</Badge>;
}

function BillingAdminPage() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [events, setEvents] = useState<WebhookEvent[] | null>(null);
  const [audits, setAudits] = useState<AuditLog[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const fnPayments = useServerFn(listPayments);
  const fnEvents = useServerFn(listWebhookEvents);
  const fnAudits = useServerFn(listAuditLogs);
  const fnMembers = useServerFn(listMembersBrief);
  const fnRetry = useServerFn(retryWebhookEvent);
  const fnOverride = useServerFn(overrideMembership);

  const refresh = async () => {
    const [p, e, a, m] = await Promise.all([fnPayments(), fnEvents(), fnAudits(), fnMembers()]);
    setPayments(p as Payment[]);
    setEvents(e as WebhookEvent[]);
    setAudits(a as AuditLog[]);
    setMembers(m as Member[]);
  };

  useEffect(() => {
    refresh().catch((err) => toast.error(err.message ?? "Could not load billing data"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = async (id: string) => {
    setBusy(id);
    try {
      const r = (await fnRetry({ data: { id } })) as { ok: boolean; error?: string };
      if (r.ok) toast.success("Webhook reprocessed");
      else toast.error(r.error ?? "Retry failed");
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl text-foreground">Billing Console</h1>
        <p className="text-muted-foreground mt-1">Payments, webhook events, manual overrides, audit trail.</p>
      </div>

      <Tabs defaultValue="payments">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="payments"><FileText className="size-4 mr-1.5" />Payments</TabsTrigger>
          <TabsTrigger value="events"><RotateCw className="size-4 mr-1.5" />Webhooks</TabsTrigger>
          <TabsTrigger value="override"><ShieldAlert className="size-4 mr-1.5" />Overrides</TabsTrigger>
          <TabsTrigger value="audit"><History className="size-4 mr-1.5" />Audit</TabsTrigger>
        </TabsList>

        {/* PAYMENTS */}
        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment events</CardTitle>
              <CardDescription>Most recent 200 attempts.</CardDescription>
            </CardHeader>
            <CardContent>
              {payments === null ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : payments.length === 0 ? (
                <p className="text-muted-foreground text-sm">No payments yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>PF ref</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs">{fmtDate(p.created_at)}</TableCell>
                          <TableCell className="text-sm">{p.email ?? "—"}</TableCell>
                          <TableCell className="text-sm capitalize">{p.tier}</TableCell>
                          <TableCell className="text-sm">{fmtZar(p.amount_cents)}</TableCell>
                          <TableCell>{statusBadge(p.status)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.pf_payment_id ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WEBHOOKS */}
        <TabsContent value="events" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook events</CardTitle>
              <CardDescription>Retry processes the stored payload again (bypasses post-back).</CardDescription>
            </CardHeader>
            <CardContent>
              {events === null ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : events.length === 0 ? (
                <p className="text-muted-foreground text-sm">No webhook events received.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>m_payment_id</TableHead>
                        <TableHead>Sig</TableHead>
                        <TableHead>Processed</TableHead>
                        <TableHead>Retries</TableHead>
                        <TableHead>Error</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-xs">{fmtDate(e.created_at)}</TableCell>
                          <TableCell className="text-xs">{e.m_payment_id ?? "—"}</TableCell>
                          <TableCell>
                            {e.signature_valid ? (
                              <Badge className="bg-green-600 text-white">ok</Badge>
                            ) : (
                              <Badge variant="destructive">bad</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {e.processed ? (
                              <Badge className="bg-green-600 text-white">yes</Badge>
                            ) : (
                              <Badge variant="destructive">no</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{e.retry_count}</TableCell>
                          <TableCell className="text-xs max-w-[220px] truncate" title={e.error ?? ""}>
                            {e.error ?? "—"}
                          </TableCell>
                          <TableCell>
                            {!e.processed && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy === e.id}
                                onClick={() => handleRetry(e.id)}
                              >
                                {busy === e.id ? <Loader2 className="size-3 animate-spin" /> : "Retry"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* OVERRIDE */}
        <TabsContent value="override" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-accent" />
                Override membership
              </CardTitle>
              <CardDescription>Activate or suspend a member outside the payment flow. A reason is required and every change is logged.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setOverrideOpen(true)}>New override</Button>
            </CardContent>
          </Card>
          <OverrideDialog
            open={overrideOpen}
            onOpenChange={setOverrideOpen}
            members={members}
            onSubmit={async (payload) => {
              try {
                await fnOverride({ data: payload });
                toast.success("Membership updated and logged");
                setOverrideOpen(false);
                await refresh();
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          />
        </TabsContent>

        {/* AUDIT */}
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit log</CardTitle>
              <CardDescription>Most recent 100 admin actions.</CardDescription>
            </CardHeader>
            <CardContent>
              {audits === null ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : audits.length === 0 ? (
                <p className="text-muted-foreground text-sm">No actions logged yet.</p>
              ) : (
                <div className="space-y-2">
                  {audits.map((a) => (
                    <div key={a.id} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge variant="outline">{a.action}</Badge>
                        <span className="text-xs text-muted-foreground">{fmtDate(a.created_at)}</span>
                        <span className="text-xs text-muted-foreground">by {a.actor_email ?? a.target_id ?? "—"}</span>
                      </div>
                      {a.reason && <div className="mt-1 text-foreground">"{a.reason}"</div>}
                      <div className="mt-1 text-xs text-muted-foreground break-all">
                        target: {a.target_type}/{a.target_id}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverrideDialog({
  open,
  onOpenChange,
  members,
  onSubmit}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  members: Member[];
  onSubmit: (p: {
    user_id: string;
    action: "activate" | "suspend";
    tier?: "general" | "active" | "patron";
    expires_at?: string;
    reason: string;
  }) => Promise<void>;
}) {
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState<"activate" | "suspend">("activate");
  const [tier, setTier] = useState<"general" | "active" | "patron">("active");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!userId) return toast.error("Select a member");
    if (reason.trim().length < 5) return toast.error("Reason required (min 5 chars)");
    setSubmitting(true);
    await onSubmit({
      user_id: userId,
      action,
      tier: action === "activate" ? tier : undefined,
      reason: reason.trim()});
    setSubmitting(false);
    setUserId("");
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override membership</DialogTitle>
          <DialogDescription>This action is recorded in the audit log.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Member</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Choose member" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.email} {m.full_name ? `— ${m.full_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Action</Label>
            <Select value={action} onValueChange={(v) => setAction(v as "activate" | "suspend")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activate">Activate (12-month window)</SelectItem>
                <SelectItem value="suspend">Suspend</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {action === "activate" && (
            <div>
              <Label>Tier</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as "general" | "active" | "patron")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="patron">Patron</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Reason (required, logged)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
            Apply override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BillingAdminPage;
