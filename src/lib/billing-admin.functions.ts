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

export const listPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data } = await context.supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const listWebhookEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data } = await context.supabase
      .from("payment_webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data } = await context.supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const retryWebhookEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { processItnPayload } = await import("./payfast-process.server");

    const { data: ev, error } = await supabaseAdmin
      .from("payment_webhook_events")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !ev) throw new Error("Event not found");

    const result = await processItnPayload(ev.payload as Record<string, string>, {
      bypassValidate: true, // already received once; admin is forcing reprocess
    });

    await supabaseAdmin
      .from("payment_webhook_events")
      .update({
        processed: result.ok,
        error: result.ok ? null : result.error,
        retry_count: (ev.retry_count ?? 0) + 1,
        last_retry_at: new Date().toISOString(),
        payment_id: result.paymentId ?? ev.payment_id,
      })
      .eq("id", data.id);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: context.claims?.email ?? null,
      action: "webhook_retry",
      target_type: "payment_webhook_event",
      target_id: data.id,
      details: { ok: result.ok, error: result.error ?? null, payment_id: result.paymentId ?? null },
    });

    return result;
  });

const overrideSchema = z.object({
  user_id: z.string().uuid(),
  action: z.enum(["activate", "suspend"]),
  tier: z.enum(["general", "active", "patron"]).optional(),
  expires_at: z.string().datetime().optional(),
  reason: z.string().trim().min(5, "Reason required (min 5 chars)").max(500),
});

export const overrideMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => overrideSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: prev } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name, membership_status, membership_tier, membership_expires_at, suspended")
      .eq("id", data.user_id)
      .maybeSingle();

    const patch: {
      membership_status?: string;
      suspended?: boolean;
      membership_tier?: "general" | "active" | "patron";
      membership_expires_at?: string;
      joined_at?: string;
    } = {};
    if (data.action === "activate") {
      patch.membership_status = "active";
      patch.suspended = false;
      if (data.tier) patch.membership_tier = data.tier;
      patch.membership_expires_at =
        data.expires_at ??
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      if (!prev?.membership_status || prev.membership_status !== "active") {
        patch.joined_at = new Date().toISOString();
      }
    } else {
      patch.membership_status = "suspended";
      patch.suspended = true;
    }

    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.user_id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: context.claims?.email ?? null,
      action: `membership_${data.action}`,
      target_type: "profile",
      target_id: data.user_id,
      reason: data.reason,
      details: JSON.parse(JSON.stringify({ before: prev, patch })),
    });

    // Notify the member — fail-soft, admin action already committed.
    if (prev?.email) {
      const { sendEmail } = await import("./email.server");
      const { membershipActivatedEmail, membershipSuspendedEmail } = await import("./email-templates.server");
      const name = prev.full_name ?? prev.email;
      const mail =
        data.action === "activate"
          ? membershipActivatedEmail(name, patch.membership_tier ?? prev.membership_tier ?? "general", patch.membership_expires_at ?? null)
          : membershipSuspendedEmail(name);
      await sendEmail({ to: prev.email, toName: name, ...mail });
    }

    return { ok: true };
  });

export const listMembersBrief = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data } = await context.supabase
      .from("profiles")
      .select("id, email, full_name, membership_status, membership_tier, membership_expires_at")
      .order("email")
      .limit(500);
    return data ?? [];
  });
