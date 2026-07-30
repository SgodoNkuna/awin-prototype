import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data: ok } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!ok) throw new Error("Forbidden: admin role required");
}

const promoteSchema = z.object({
  email: z.string().email().optional(),
  user_id: z.string().uuid().optional(),
  role: z.enum(["admin", "member"]).default("admin"),
  action: z.enum(["grant", "revoke"]).default("grant"),
  reason: z.string().trim().min(5).max(500),
}).refine((v) => v.email || v.user_id, { message: "email or user_id required" });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => promoteSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let targetId = data.user_id;
    let targetEmail = data.email ?? null;
    if (!targetId && data.email) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .eq("email", data.email)
        .maybeSingle();
      if (!p) throw new Error(`No profile found for ${data.email}`);
      targetId = p.id;
      targetEmail = p.email;
    }
    if (!targetId) throw new Error("Target user not resolved");

    if (data.action === "grant") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: targetId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", targetId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: context.claims?.email ?? null,
      action: `role_${data.action}`,
      target_type: "user_role",
      target_id: targetId,
      reason: data.reason,
      details: { role: data.role, target_email: targetEmail },
    });

    return { ok: true, user_id: targetId, role: data.role, action: data.action };
  });

const deleteMemberSchema = z.object({
  user_id: z.string().uuid(),
  confirm_email: z.string().trim().min(1),
  reason: z.string().trim().min(5).max(500),
});

/**
 * Deletes the auth account (cascades to `profiles`, `user_roles`, sessions, etc.).
 * Application/payment/event-registration history is preserved with user_id set
 * to null (see FK definitions) — only login access and the profile disappear.
 * The caller must echo the member's exact email back, on top of a typed reason,
 * so an admin can't delete a member with a single misclick.
 */
export const deleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => deleteMemberSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, membership_tier, membership_status")
      .eq("id", data.user_id)
      .maybeSingle();
    if (!profile) throw new Error("Member not found");
    if ((profile.email ?? "").trim().toLowerCase() !== data.confirm_email.trim().toLowerCase()) {
      throw new Error("Typed email does not match this member's email");
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: context.claims?.email ?? null,
      action: "member_delete",
      target_type: "profile",
      target_id: data.user_id,
      reason: data.reason,
      details: { deleted_snapshot: profile },
    });

    return { ok: true, user_id: data.user_id };
  });

const deleteApplicationSchema = z.object({
  application_id: z.string().uuid(),
  confirm_name: z.string().trim().min(1),
  reason: z.string().trim().min(5).max(500),
});

export const deleteApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => deleteApplicationSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: application } = await supabaseAdmin
      .from("applications")
      .select("*")
      .eq("id", data.application_id)
      .maybeSingle();
    if (!application) throw new Error("Application not found");
    if (application.full_name.trim().toLowerCase() !== data.confirm_name.trim().toLowerCase()) {
      throw new Error("Typed name does not match this applicant's name");
    }

    const { error } = await supabaseAdmin.from("applications").delete().eq("id", data.application_id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: context.claims?.email ?? null,
      action: "application_delete",
      target_type: "application",
      target_id: data.application_id,
      reason: data.reason,
      details: { deleted_snapshot: JSON.parse(JSON.stringify(application)) },
    });

    return { ok: true, application_id: data.application_id };
  });
