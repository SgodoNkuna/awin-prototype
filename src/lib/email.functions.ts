import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public: applicant confirmation email after a successful application insert.
 * ponytail: no rate limit — dedup on applications table already blocks repeat
 * submissions; add a rate limiter if abuse ever shows in ZeptoMail logs.
 */
export const sendApplicationReceivedEmail = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ email: z.string().email(), fullName: z.string().trim().min(1).max(200) }).parse(i),
  )
  .handler(async ({ data }) => {
    const { sendEmail } = await import("./email.server");
    const { applicationReceivedEmail } = await import("./email-templates.server");
    const mail = applicationReceivedEmail(data.fullName);
    return sendEmail({ to: data.email, toName: data.fullName, ...mail });
  });
