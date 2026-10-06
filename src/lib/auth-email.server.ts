/**
 * Login-related emails (set/reset password, confirm signup) — SERVER ONLY.
 *
 * Supabase still owns the tokens; this only takes over *delivery*. We ask
 * Supabase's admin API for a one-time token (generateLink), then send it
 * through ZeptoMail ourselves. Supabase's built-in mailer was rate-limiting
 * (429 "email rate limit exceeded") and landing in spam, which is why reset
 * and confirmation emails kept "never arriving".
 *
 * The link points straight at awin.co.za/auth?token_hash=…&type=… and the
 * page exchanges it with verifyOtp() — it never goes via Supabase's /verify
 * redirect, so it doesn't depend on Supabase's Site URL / redirect allowlist
 * (which pointed at the SSO-protected vercel.app domain).
 */
import type { SendEmailResult } from "./email.server";
import type { SetPasswordKind } from "./email-templates.server";

export const normalizeEmail = (e: string) => e.trim().toLowerCase();

async function authLink(tokenHash: string, type: "recovery" | "signup") {
  const { SITE_URL } = await import("./email-templates.server");
  return `${SITE_URL}/auth?token_hash=${encodeURIComponent(tokenHash)}&type=${type}`;
}

/**
 * Emails a "choose your password" link + 6-digit code. Also used to get
 * an unconfirmed account working: verifying a recovery token confirms the
 * email address too, so nobody is ever stuck on "Email not confirmed".
 */
export async function sendSetPasswordEmail(
  supabaseAdmin: any,
  rawEmail: string,
  kind: SetPasswordKind,
  fullName: string | null = null,
): Promise<SendEmailResult> {
  const email = normalizeEmail(rawEmail);
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({ type: "recovery", email });
  if (error || !data?.properties?.hashed_token) {
    return { ok: false, error: error?.message ?? "could not generate link" };
  }
  const { sendEmail } = await import("./email.server");
  const { setPasswordEmail } = await import("./email-templates.server");
  const name = fullName ?? (data.user?.user_metadata?.full_name as string | undefined) ?? null;
  const mail = setPasswordEmail(kind, name, email, await authLink(data.properties.hashed_token, "recovery"), data.properties.email_otp);
  return sendEmail({ to: email, toName: name ?? email, ...mail });
}

/**
 * Creates the account (unconfirmed) and emails the confirmation link. If the
 * email is already registered but was never confirmed — e.g. the original
 * confirmation got lost — sends a set-password email instead, which both
 * confirms the address and lets them pick a password, so a lost email is
 * never a dead end.
 */
export async function signUpAndSendConfirmation(
  supabaseAdmin: any,
  input: { email: string; password: string; fullName: string },
): Promise<{ ok: true; status: "confirmation_sent" | "existing_unconfirmed" | "already_registered" } | { ok: false; error: string }> {
  const email = normalizeEmail(input.email);
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "signup",
    email,
    password: input.password,
    options: { data: { full_name: input.fullName } },
  });

  if (error) {
    // Already registered — confirmed or not? Look at the profile's auth row.
    const { data: profile } = await supabaseAdmin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (!profile) return { ok: false, error: error.message };
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (authUser?.user && !authUser.user.email_confirmed_at) {
      await sendSetPasswordEmail(supabaseAdmin, email, "reset", input.fullName);
      return { ok: true, status: "existing_unconfirmed" };
    }
    return { ok: true, status: "already_registered" };
  }

  const { sendEmail } = await import("./email.server");
  const { confirmSignupEmail } = await import("./email-templates.server");
  const mail = confirmSignupEmail(input.fullName, await authLink(data.properties.hashed_token, "signup"));
  const sent = await sendEmail({ to: email, toName: input.fullName, ...mail });
  if (!sent.ok) return { ok: false, error: "Account created, but the confirmation email could not be sent. Use “Forgot password?” to get in." };
  return { ok: true, status: "confirmation_sent" };
}
