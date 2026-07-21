/**
 * Zoho ZeptoMail transactional email — SERVER ONLY.
 * Never import from client / route component code.
 *
 * Env:
 *   ZOHO_ZEPTOMAIL_TOKEN  — "Send Mail Token" from ZeptoMail → Mail Agent → Setup Info
 *   ZOHO_MAIL_FROM        — verified sender, e.g. noreply@awin.co.za
 *   ZOHO_MAIL_FROM_NAME   — display name (default "A-Win")
 *   ZOHO_ZEPTOMAIL_URL    — API base (default global; use https://api.zeptomail.eu/v1.1/email for EU DC)
 *
 * Emails fail soft: a delivery failure logs and returns { ok: false } but never
 * throws, so webhooks and admin actions are never broken by the mail provider.
 */

const ZEPTOMAIL_URL = process.env.ZOHO_ZEPTOMAIL_URL ?? "https://api.zeptomail.com/v1.1/email";

export interface SendEmailInput {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export function emailConfigured(): boolean {
  return !!process.env.ZOHO_ZEPTOMAIL_TOKEN && !!process.env.ZOHO_MAIL_FROM;
}

/**
 * Sliding-window rate limit backed by the rate_limits table. Returns true if the
 * call is allowed. Fails OPEN (returns true) on any error so a DB hiccup never
 * blocks a legitimate email.
 */
export async function rateLimitOk(key: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("rate_limit_hit", {
      _key: key,
      _max: max,
      _window_seconds: windowSeconds,
    });
    if (error) return true;
    return data === true;
  } catch {
    return true;
  }
}

/**
 * Whether an admin-facing notification type is enabled in Admin → Settings →
 * Notifications (the `notifications` site_setting). Fails OPEN (returns true) if
 * the setting can't be read, so admin alerts are never silently lost.
 */
export async function adminNotifyEnabled(
  key: "new_application" | "new_message" | "event_registration",
): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "notifications")
      .maybeSingle();
    const v = (data?.value as Record<string, boolean> | null)?.[key];
    return v !== false; // default on
  } catch {
    return true;
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const token = process.env.ZOHO_ZEPTOMAIL_TOKEN;
  const from = process.env.ZOHO_MAIL_FROM;
  if (!token || !from) {
    console.warn("[email] ZOHO_ZEPTOMAIL_TOKEN / ZOHO_MAIL_FROM not set — skipping send:", input.subject);
    return { ok: false, error: "email not configured" };
  }

  try {
    const res = await fetch(ZEPTOMAIL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Zoho-enczapikey ${token}`,
      },
      body: JSON.stringify({
        from: { address: from, name: process.env.ZOHO_MAIL_FROM_NAME ?? "A-Win" },
        to: [{ email_address: { address: input.to, name: input.toName ?? input.to } }],
        subject: input.subject,
        htmlbody: input.html,
        ...(input.text ? { textbody: input.text } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] ZeptoMail ${res.status} sending "${input.subject}" to ${input.to}: ${body}`);
      return { ok: false, error: `zeptomail ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[email] network error sending "${input.subject}" to ${input.to}: ${msg}`);
    return { ok: false, error: msg };
  }
}
