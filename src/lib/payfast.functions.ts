import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Single membership model: R200 joining fee (once, on approval) + R500 monthly
// contribution. "general" = joining fee, "active" = monthly contribution.
// Must stay in sync with MEMBERSHIP_MODEL in membership-page.tsx and
// TIER_PRICES_CENTS in payfast-process.server.ts.
const TIER_PRICES_ZAR: Record<string, number> = {
  general: 200,
  active: 500,
};

const TIER_NAMES: Record<string, string> = {
  general: "Joining Fee",
  active: "Monthly Contribution",
};

const checkoutSchema = z.object({
  tier: z.enum(["general", "active"]),
});

/**
 * Create a PayFast checkout for the signed-in user.
 * Returns the process URL + signed form fields the browser submits.
 */
export const createPayfastCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => checkoutSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      PAYFAST_PROCESS_URL,
      PAYFAST_FIELD_ORDER,
      pfSignature,
    } = await import("./payfast.server");

    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
    const passphrase = process.env.PAYFAST_PASSPHRASE ?? "";
    const siteUrl =
      process.env.SITE_URL ??
      process.env.VITE_SITE_URL ??
      "https://awin.co.za";

    if (!merchantId || !merchantKey) {
      throw new Error("PayFast is not configured. Add PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY.");
    }

    const amountZar = TIER_PRICES_ZAR[data.tier];
    const itemName = `A-Win ${TIER_NAMES[data.tier]}`;
    const mPaymentId = `awin_${data.tier}_${context.userId}_${Date.now()}`;

    // Profile for name + email
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();

    const fullName = (profile?.full_name ?? "").trim();
    const [nameFirst, ...rest] = fullName.split(/\s+/);
    const nameLast = rest.join(" ");
    const email = profile?.email ?? context.claims?.email ?? "";

    // Insert pending payment row (service role — bypasses RLS).
    const { error: insertErr } = await supabaseAdmin.from("payments").insert({
      user_id: context.userId,
      tier: data.tier,
      amount_cents: amountZar * 100,
      currency: "ZAR",
      status: "pending",
      provider: "payfast",
      m_payment_id: mPaymentId,
      email,
      full_name: fullName,
    });
    if (insertErr) throw new Error(`Could not create payment record: ${insertErr.message}`);

    const fields: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${siteUrl}/portal?payment=return`,
      cancel_url: `${siteUrl}/portal?payment=cancel`,
      notify_url: `${siteUrl}/api/public/payfast/itn`,
      name_first: nameFirst || "Member",
      name_last: nameLast || "—",
      email_address: email,
      m_payment_id: mPaymentId,
      amount: amountZar.toFixed(2),
      item_name: itemName,
      item_description: `${TIER_NAMES[data.tier]} membership for 12 months`,
      custom_str1: data.tier,
      custom_str2: context.userId,
    };

    const ordered: Array<[string, string]> = [];
    for (const k of PAYFAST_FIELD_ORDER) {
      const v = fields[k];
      if (v !== undefined && v !== "") ordered.push([k, v]);
    }
    const signature = pfSignature(ordered, passphrase);

    return {
      action: PAYFAST_PROCESS_URL,
      fields: { ...fields, signature },
    };
  });

/** Member's own payment history + active membership window. */
export const getMyPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: payments }, { data: profile }] = await Promise.all([
      context.supabase
        .from("payments")
        .select("id, tier, amount_cents, currency, status, paid_at, created_at, pf_payment_id")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(20),
      context.supabase
        .from("profiles")
        .select("membership_status, membership_tier, membership_expires_at, last_payment_at")
        .eq("id", context.userId)
        .maybeSingle(),
    ]);
    return { payments: payments ?? [], profile: profile ?? null };
  });
