import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

function clientIp() {
  return getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/**
 * Public: "Forgot password?" — emails a reset link + one-time code via
 * ZeptoMail (see auth-email.server.ts for why not Supabase's mailer).
 * Always answers the same way whether or not the account exists, so this
 * can't be used to probe which emails are registered.
 */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ email: z.string().trim().email().max(255) }).parse(i))
  .handler(async ({ data }) => {
    const { rateLimitOk } = await import("./email.server");
    const { normalizeEmail, sendSetPasswordEmail } = await import("./auth-email.server");
    const email = normalizeEmail(data.email);
    if (!(await rateLimitOk(`pwreset:${email}`, 5, 3600)) || !(await rateLimitOk(`pwreset-ip:${clientIp()}`, 20, 3600))) {
      throw new Error("Too many reset requests — please wait a while and try again");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (profile) await sendSetPasswordEmail(supabaseAdmin, email, "reset");
    return { ok: true as const };
  });

/** Public: member signup, with the confirmation email sent via ZeptoMail. */
export const signUpMember = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(6).max(72),
        full_name: z.string().trim().min(1).max(120),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { rateLimitOk } = await import("./email.server");
    const { normalizeEmail, signUpAndSendConfirmation } = await import("./auth-email.server");
    const email = normalizeEmail(data.email);
    if (!(await rateLimitOk(`signup:${email}`, 5, 3600)) || !(await rateLimitOk(`signup-ip:${clientIp()}`, 20, 3600))) {
      throw new Error("Too many attempts — please wait a while and try again");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const res = await signUpAndSendConfirmation(supabaseAdmin, { email, password: data.password, fullName: data.full_name });
    if (!res.ok) throw new Error(res.error);
    return res;
  });
