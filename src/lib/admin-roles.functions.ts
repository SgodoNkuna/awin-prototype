import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
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
