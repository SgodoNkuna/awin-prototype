import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ensureAdmin } from "@/lib/admin-roles.functions";

// --- Execution logic --------------------------------------------------------
// Reachable only from admin-approvals.functions.ts's decideApproval dispatcher,
// after a second admin has approved the request.

const siteSettingsSchema = z.object({
  key: z.string().trim().min(1).max(100),
  value: z.record(z.string(), z.unknown()),
});

export async function executeSiteSettingsUpdate(
  supabaseAdmin: any,
  data: z.infer<typeof siteSettingsSchema>,
  actor: { userId: string; email: string | null },
) {
  const { error } = await supabaseAdmin.from("site_settings").upsert({ key: data.key, value: data.value });
  if (error) throw new Error(error.message);

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actor.userId,
    actor_email: actor.email,
    action: "site_settings_update",
    target_type: "site_settings",
    target_id: data.key,
    reason: "approved settings change",
    details: { key: data.key, value: data.value },
  });

  return { ok: true, key: data.key };
}

const teamMemberUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()),
});

export async function executeTeamMemberUpsert(
  supabaseAdmin: any,
  data: z.infer<typeof teamMemberUpsertSchema>,
  actor: { userId: string; email: string | null },
) {
  const { error } = data.id
    ? await supabaseAdmin.from("team_members").update(data.payload).eq("id", data.id)
    : await supabaseAdmin.from("team_members").insert(data.payload);
  if (error) throw new Error(error.message);

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actor.userId,
    actor_email: actor.email,
    action: data.id ? "team_member_update" : "team_member_create",
    target_type: "team_member",
    target_id: data.id ?? null,
    reason: "approved team profile change",
    details: { payload: data.payload },
  });

  return { ok: true, id: data.id ?? null };
}

const teamMemberDeleteSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
});

export async function executeTeamMemberDelete(
  supabaseAdmin: any,
  data: z.infer<typeof teamMemberDeleteSchema>,
  actor: { userId: string; email: string | null },
) {
  const { data: existing } = await supabaseAdmin.from("team_members").select("*").eq("id", data.id).maybeSingle();
  const { error } = await supabaseAdmin.from("team_members").delete().eq("id", data.id);
  if (error) throw new Error(error.message);

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actor.userId,
    actor_email: actor.email,
    action: "team_member_delete",
    target_type: "team_member",
    target_id: data.id,
    reason: "approved team profile deletion",
    details: { deleted_snapshot: existing },
  });

  return { ok: true, id: data.id };
}

const dangerActionSchema = z.object({
  op: z.enum(["clear_messages", "reset_settings", "delete_draft_members"]),
});

export async function executeSettingsDangerAction(
  supabaseAdmin: any,
  data: z.infer<typeof dangerActionSchema>,
  actor: { userId: string; email: string | null },
) {
  if (data.op === "clear_messages") {
    const { error } = await supabaseAdmin.from("contact_messages").delete().gte("created_at", "1970-01-01");
    if (error) throw new Error(error.message);
  } else if (data.op === "reset_settings") {
    const { error } = await supabaseAdmin.from("site_settings").delete().gte("key", "");
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin.from("team_members").delete().eq("published", false);
    if (error) throw new Error(error.message);
  }

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actor.userId,
    actor_email: actor.email,
    action: `danger_${data.op}`,
    target_type: "settings",
    target_id: null,
    reason: "approved danger-zone action",
    details: { op: data.op },
  });

  return { ok: true, op: data.op };
}

// --- Request entry points ----------------------------------------------------

export const requestSiteSettingsUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => siteSettingsSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("pending_approvals")
      .insert({
        action_type: "site_settings_update",
        payload: data,
        reason: `Publish "${data.key}" settings`,
        requested_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, approval_id: row.id };
  });

export const requestTeamMemberUpsert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => teamMemberUpsertSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const name = (data.payload as any)?.name ?? "member profile";
    const { data: row, error } = await supabaseAdmin
      .from("pending_approvals")
      .insert({
        action_type: "team_member_upsert",
        payload: data,
        reason: `${data.id ? "Edit" : "Add"} team profile: ${name}`,
        requested_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, approval_id: row.id };
  });

export const requestTeamMemberDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => teamMemberDeleteSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("pending_approvals")
      .insert({
        action_type: "team_member_delete",
        payload: data,
        reason: `Delete team profile: ${data.name}`,
        requested_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, approval_id: row.id };
  });

export const requestSettingsDangerAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => dangerActionSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("pending_approvals")
      .insert({
        action_type: "settings_danger_action",
        payload: data,
        reason: `Danger zone: ${data.op}`,
        requested_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, approval_id: row.id };
  });
