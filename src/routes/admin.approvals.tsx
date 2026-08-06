import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle, Loader2, ShieldAlert, Clock } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { listPendingApprovals, decideApproval } from "@/lib/admin-approvals.functions";

export const Route = createFileRoute("/admin/approvals")({
  component: ApprovalsPage,
});

type Requester = { id: string; full_name: string | null; email: string | null } | null;

type ApprovalRequest = {
  id: string;
  action_type:
    | "member_delete"
    | "application_delete"
    | "role_grant"
    | "role_revoke"
    | "site_settings_update"
    | "team_member_upsert"
    | "team_member_delete"
    | "settings_danger_action";
  payload: Record<string, unknown>;
  reason: string;
  status: "pending" | "approved" | "rejected" | "executed" | "failed";
  requested_by: string;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  requester: Requester;
  is_own_request: boolean;
};

const ACTION_LABELS: Record<ApprovalRequest["action_type"], string> = {
  member_delete: "Delete member",
  application_delete: "Delete application",
  role_grant: "Grant admin role",
  role_revoke: "Revoke admin role",
  site_settings_update: "Publish settings change",
  team_member_upsert: "Add/edit team profile",
  team_member_delete: "Delete team profile",
  settings_danger_action: "Danger zone action",
};

function getErrorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

function payloadSummary(req: ApprovalRequest): string {
  const p = req.payload as any;
  switch (req.action_type) {
    case "member_delete":
      return `Member: ${p.confirm_email}`;
    case "application_delete":
      return `Applicant: ${p.confirm_name}`;
    case "role_grant":
    case "role_revoke":
      return `Target: ${p.email ?? p.user_id}`;
    case "site_settings_update":
      return `Key: ${p.key}`;
    case "team_member_upsert":
      return p.id ? `Editing: ${p.payload?.name ?? p.id}` : `New profile: ${p.payload?.name ?? "unnamed"}`;
    case "team_member_delete":
      return `Profile: ${p.name}`;
    case "settings_danger_action":
      return `Operation: ${p.op}`;
    default:
      return "";
  }
}

function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[] | null>(null);
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [deciding, setDeciding] = useState<{ req: ApprovalRequest; decision: "approve" | "reject" } | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [busy, setBusy] = useState(false);

  const callList = useServerFn(listPendingApprovals);
  const callDecide = useServerFn(decideApproval);

  const load = useCallback(async () => {
    try {
      const res = await callList();
      setRequests(res.requests as ApprovalRequest[]);
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to load approvals"));
    }
  }, [callList]);

  useEffect(() => { load(); }, [load]);

  const pending = (requests ?? []).filter((r) => r.status === "pending");
  const history = (requests ?? []).filter((r) => r.status !== "pending");
  const shown = tab === "pending" ? pending : history;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Two-person approval: sensitive actions (deleting a member or application, granting or revoking
          the admin role) are filed here by one admin and must be approved by a <em>different</em> admin
          before they take effect.
        </p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={tab === "pending" ? "default" : "outline"} onClick={() => setTab("pending")}>
          Pending ({pending.length})
        </Button>
        <Button size="sm" variant={tab === "history" ? "default" : "outline"} onClick={() => setTab("history")}>
          History
        </Button>
      </div>

      {requests === null ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : shown.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          {tab === "pending" ? "No pending requests." : "No decided requests yet."}
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {shown.map((req) => (
            <Card key={req.id} className={req.status === "pending" ? "border-amber-400/50" : ""}>
              <CardContent className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{ACTION_LABELS[req.action_type]}</Badge>
                    <StatusBadge status={req.status} />
                    {req.is_own_request && req.status === "pending" && (
                      <Badge variant="outline" className="text-muted-foreground">Your request</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium">{payloadSummary(req)}</p>
                  <p className="text-xs text-muted-foreground">
                    Requested by {req.requester?.full_name || req.requester?.email || "unknown"} ·{" "}
                    {new Date(req.requested_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground italic">"{req.reason}"</p>
                  {req.decision_reason && (
                    <p className="text-xs text-muted-foreground">Decision note: "{req.decision_reason}"</p>
                  )}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">View full details before deciding</summary>
                    <pre className="mt-1.5 max-w-full overflow-x-auto rounded-md border border-border bg-muted/40 p-2 whitespace-pre-wrap break-all">
                      {JSON.stringify(req.payload, null, 2)}
                    </pre>
                  </details>
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2">
                    {req.is_own_request ? (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ShieldAlert className="size-3.5" /> Needs a different admin
                      </p>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => { setDeciding({ req, decision: "reject" }); setDecisionReason(""); }}
                        >
                          <XCircle className="size-4 mr-1.5" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => { setDeciding({ req, decision: "approve" }); setDecisionReason(""); }}
                        >
                          <CheckCircle2 className="size-4 mr-1.5" /> Approve
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deciding} onOpenChange={(o) => !o && setDeciding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deciding?.decision === "approve" ? "Approve" : "Reject"} request
            </DialogTitle>
            <DialogDescription>
              {deciding && ACTION_LABELS[deciding.req.action_type]} · {deciding && payloadSummary(deciding.req)}
              {deciding?.decision === "approve" && " — this executes immediately once confirmed."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <label className="text-xs font-medium">Decision note (min 5 chars)</label>
            <Textarea
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              rows={2}
              placeholder={deciding?.decision === "approve" ? "e.g. Confirmed with the member directly" : "e.g. Not enough justification, ask requester to follow up"}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeciding(null)}>Cancel</Button>
            <Button
              variant={deciding?.decision === "reject" ? "destructive" : "default"}
              disabled={busy || decisionReason.trim().length < 5}
              onClick={async () => {
                if (!deciding) return;
                setBusy(true);
                try {
                  await callDecide({
                    data: {
                      approval_id: deciding.req.id,
                      decision: deciding.decision,
                      decision_reason: decisionReason.trim(),
                    },
                  });
                  toast.success(deciding.decision === "approve" ? "Approved and executed" : "Rejected");
                  setDeciding(null);
                  load();
                } catch (e: any) {
                  toast.error(getErrorMessage(e, "Failed to record decision"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin mr-2" />}
              Confirm {deciding?.decision === "approve" ? "approval" : "rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: ApprovalRequest["status"] }) {
  const map: Record<ApprovalRequest["status"], string> = {
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    approved: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    executed: "bg-green-500/15 text-green-700 dark:text-green-400",
    rejected: "bg-destructive/15 text-destructive",
    failed: "bg-destructive/15 text-destructive",
  };
  return (
    <Badge variant="outline" className={map[status]}>
      {status === "pending" && <Clock className="size-3 mr-1" />}
      {status}
    </Badge>
  );
}

export default ApprovalsPage;
