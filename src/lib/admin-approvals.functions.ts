import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ensureAdmin,
  executeUserRoleChange,
  executeDeleteMember,
  executeDeleteApplication,
  executeDeleteLoaRpaSubmission,
} from "@/lib/admin-roles.functions";
import {
  executeSiteSettingsUpdate,
  executeTeamMemberUpsert,
  executeTeamMemberDelete,
  executeSettingsDangerAction,
} from "@/lib/admin-settings.functions";

export const listPendingApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("pending_approvals")
      .select("id, action_type, payload, reason, status, requested_by, requested_at, decided_by, decided_at, decision_reason")
      .order("requested_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const requesterIds = [...new Set(data.map((r: any) => r.requested_by))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", requesterIds.length ? requesterIds : ["00000000-0000-0000-0000-000000000000"]);
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return {
      requests: data.map((r: any) => ({
        ...r,
        requester: byId.get(r.requested_by) ?? null,
        is_own_request: r.requested_by === context.userId,
      })),
    };
  });

const decideSchema = z.object({
  approval_id: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  decision_reason: z.string().trim().min(5).max(500),
});

/**
 * The second half of maker-checker: a DIFFERENT admin from the requester
 * approves or rejects. Approval immediately executes the underlying action
 * (delete member/application, or grant/revoke admin role) using the same
 * privileged logic the old single-admin flow used — the only change is that
 * two distinct admins must now touch the request before it takes effect.
 */
export const decideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => decideSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: loadError } = await supabaseAdmin
      .from("pending_approvals")
      .select("*")
      .eq("id", data.approval_id)
      .maybeSingle();
    if (loadError) throw new Error(loadError.message);
    if (!row) throw new Error("Approval request not found");
    if (row.status !== "pending") throw new Error(`Already ${row.status}`);
    if (row.requested_by === context.userId) {
      throw new Error("A second, different admin must approve this request — you cannot approve your own request");
    }

    const actor = { userId: context.userId, email: context.claims?.email ?? null };
    // Each execute* fn's payload shape was already zod-validated by its
    // corresponding request* fn before this row was ever written — the
    // generated Json type for the stored column doesn't know that, so this
    // is a deliberate, single cast rather than one per dispatch case below.
    const payload = row.payload as any;

    if (data.decision === "reject") {
      const { error } = await supabaseAdmin
        .from("pending_approvals")
        .update({
          status: "rejected",
          decided_by: context.userId,
          decided_at: new Date().toISOString(),
          decision_reason: data.decision_reason,
        })
        .eq("id", data.approval_id)
        .eq("status", "pending");
      if (error) throw new Error(error.message);

      await supabaseAdmin.from("audit_logs").insert({
        actor_id: context.userId,
        actor_email: context.claims?.email ?? null,
        action: `${row.action_type}_rejected`,
        target_type: "pending_approval",
        target_id: data.approval_id,
        reason: data.decision_reason,
        details: { original_request: row.payload, requested_by: row.requested_by },
      });

      return { ok: true, status: "rejected" as const };
    }

    // Approve: run the real action now. Guard against a double-execution race
    // by only flipping status away from 'pending' if it's still 'pending'.
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("pending_approvals")
      .update({
        status: "approved",
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
        decision_reason: data.decision_reason,
      })
      .eq("id", data.approval_id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (claimError) throw new Error(claimError.message);
    if (!claimed) throw new Error("Already decided by someone else");

    try {
      let result: unknown;
      switch (row.action_type) {
        case "member_delete":
          result = await executeDeleteMember(supabaseAdmin, payload, actor);
          break;
        case "application_delete":
          result = await executeDeleteApplication(supabaseAdmin, payload, actor);
          break;
        case "loa_rpa_submission_delete":
          result = await executeDeleteLoaRpaSubmission(supabaseAdmin, payload, actor);
          break;
        case "role_grant":
        case "role_revoke":
          result = await executeUserRoleChange(supabaseAdmin, payload, actor);
          break;
        case "site_settings_update":
          result = await executeSiteSettingsUpdate(supabaseAdmin, payload, actor);
          break;
        case "team_member_upsert":
          result = await executeTeamMemberUpsert(supabaseAdmin, payload, actor);
          break;
        case "team_member_delete":
          result = await executeTeamMemberDelete(supabaseAdmin, payload, actor);
          break;
        case "settings_danger_action":
          result = await executeSettingsDangerAction(supabaseAdmin, payload, actor);
          break;
        default:
          throw new Error(`Unknown action_type: ${row.action_type}`);
      }

      await supabaseAdmin
        .from("pending_approvals")
        .update({ status: "executed", result: result as any })
        .eq("id", data.approval_id);

      return { ok: true, status: "executed" as const, result: result as any };
    } catch (execError: any) {
      await supabaseAdmin
        .from("pending_approvals")
        .update({ status: "failed", result: { error: execError.message } })
        .eq("id", data.approval_id);
      throw execError;
    }
  });
