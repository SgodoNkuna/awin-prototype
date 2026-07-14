/**
 * Core ITN processing — SERVER ONLY.
 * Shared between the webhook route and the admin "retry" path.
 */
type Result = { ok: boolean; error?: string; paymentId?: string };

const TIER_PRICES_CENTS: Record<string, number> = {
  general: 50000,
  active: 150000,
  patron: 500000,
};

export async function processItnPayload(
  payload: Record<string, string>,
  opts: { bypassValidate?: boolean } = {},
): Promise<Result> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { pfValidate } = await import("./payfast.server");

  const mPaymentId = payload["m_payment_id"];
  const pfPaymentId = payload["pf_payment_id"] ?? null;
  const status = payload["payment_status"];
  const grossCents = Math.round(parseFloat(payload["amount_gross"] ?? "0") * 100);

  if (!mPaymentId) return { ok: false, error: "missing m_payment_id" };

  // Look up payment row
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("m_payment_id", mPaymentId)
    .maybeSingle();

  if (!payment) return { ok: false, error: "payment row not found" };

  // Amount tampering check
  if (grossCents > 0 && grossCents !== payment.amount_cents) {
    await supabaseAdmin
      .from("payments")
      .update({ status: "failed", raw_payload: payload, pf_payment_id: pfPaymentId })
      .eq("id", payment.id);
    return { ok: false, error: `amount mismatch: expected ${payment.amount_cents} got ${grossCents}`, paymentId: payment.id };
  }

  // Post-back validation against PayFast (skip when admin retries)
  if (!opts.bypassValidate) {
    const body = Object.entries(payload)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v).replace(/%20/g, "+")}`)
      .join("&");
    const valid = await pfValidate(body);
    if (!valid) {
      await supabaseAdmin
        .from("payments")
        .update({ status: "failed", raw_payload: payload })
        .eq("id", payment.id);
      return { ok: false, error: "payfast validate rejected payload", paymentId: payment.id };
    }
  }

  if (status === "COMPLETE") {
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const paidAt = new Date().toISOString();

    await supabaseAdmin
      .from("payments")
      .update({
        status: "paid",
        pf_payment_id: pfPaymentId,
        raw_payload: payload,
        paid_at: paidAt,
      })
      .eq("id", payment.id);

    if (payment.user_id) {
      await supabaseAdmin
        .from("profiles")
        .update({
          membership_status: "active",
          suspended: false,
          membership_tier: payment.tier as "general" | "active" | "patron",
          membership_expires_at: expiresAt,
          last_payment_at: paidAt,
          joined_at: paidAt,
        })
        .eq("id", payment.user_id);

      // Receipt + activation email — fail-soft, never blocks the webhook.
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", payment.user_id)
        .maybeSingle();
      if (profile?.email) {
        const { sendEmail } = await import("./email.server");
        const { paymentReceiptEmail, membershipActivatedEmail } = await import("./email-templates.server");
        const name = profile.full_name ?? profile.email;
        const receipt = paymentReceiptEmail(name, payment.amount_cents, payment.tier, mPaymentId, paidAt);
        await sendEmail({ to: profile.email, toName: name, ...receipt });
        const welcome = membershipActivatedEmail(name, payment.tier, expiresAt);
        await sendEmail({ to: profile.email, toName: name, ...welcome });
      }
    }
    return { ok: true, paymentId: payment.id };
  }

  if (status === "FAILED" || status === "CANCELLED") {
    await supabaseAdmin
      .from("payments")
      .update({
        status: status === "FAILED" ? "failed" : "cancelled",
        pf_payment_id: pfPaymentId,
        raw_payload: payload,
      })
      .eq("id", payment.id);
    return { ok: true, paymentId: payment.id };
  }

  return { ok: false, error: `unhandled payment_status: ${status}`, paymentId: payment.id };
}

/** Reference: not used directly but kept for type help. */
export const _TIER_PRICES_CENTS = TIER_PRICES_CENTS;
