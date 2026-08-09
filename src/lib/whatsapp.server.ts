/**
 * WhatsApp Cloud API (Meta) — SERVER ONLY. Never import from client/route code.
 *
 * Env:
 *   WHATSAPP_ACCESS_TOKEN     — permanent access token from the Meta app / WhatsApp Business account
 *   WHATSAPP_PHONE_NUMBER_ID  — the sending number's Phone Number ID (not the phone number itself)
 *   WHATSAPP_API_URL          — API base (default https://graph.facebook.com/v21.0)
 *
 * Not configured yet — no WhatsApp Business account/credentials exist for this
 * project. Calls fail soft (log + return { ok: false }) exactly like sendEmail,
 * so nothing breaks; messages simply won't send until the env vars are set.
 * See docs/whatsapp-setup.md for how to get these from Meta.
 */

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL ?? "https://graph.facebook.com/v21.0";

// ThuthukaSA's confirmation number (Wisani, 2026-08-09) — LOA/RPA submission
// alerts go here in addition to info@thuthuka-sa.co.za, so nothing is missed
// if email delivery lags.
export const THUTHUKA_WHATSAPP_NUMBER = "27692450228";

export type SendWhatsAppResult = { ok: true } | { ok: false; error: string };

export function whatsappConfigured(): boolean {
  return !!process.env.WHATSAPP_ACCESS_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID;
}

export async function sendWhatsAppMessage(to: string, text: string): Promise<SendWhatsAppResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.warn("[whatsapp] WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set — skipping send to", to);
    return { ok: false, error: "whatsapp not configured" };
  }

  try {
    const res = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text, preview_url: false },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[whatsapp] send failed", res.status, body);
      await logSendFailure(to, `API ${res.status}: ${body.slice(0, 300)}`);
      return { ok: false, error: `whatsapp API ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[whatsapp] send threw", err);
    await logSendFailure(to, message);
    return { ok: false, error: message };
  }
}

/**
 * A failed WhatsApp send used to be visible only in server logs — surfaced
 * here into audit_logs so it shows up in the admin UI's "Recent changes"
 * card too, instead of a silent no-op nobody notices. Only logs failures
 * from an actually-configured send attempt, not the "not configured" skip
 * above (that's a permanent, expected state until env vars are set, not a
 * one-off event worth an alert).
 */
async function logSendFailure(to: string, error: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: null,
      actor_email: "system",
      action: "whatsapp_send_failed",
      target_type: "whatsapp_message",
      target_id: to,
      reason: error,
      details: { to, error },
    });
  } catch {
    // best-effort — never let audit logging break the caller
  }
}

/** wa.me click-to-chat link — works with zero API setup, for the admin UI fallback. */
export function whatsappClickToChatUrl(to: string, text: string): string {
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}
