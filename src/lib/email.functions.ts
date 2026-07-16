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
    const { sendEmail, adminNotifyEnabled } = await import("./email.server");
    const { applicationReceivedEmail, adminNewApplicationEmail } = await import("./email-templates.server");
    const mail = applicationReceivedEmail(data.fullName);
    // Committee alert — gated by the "new application" notification toggle.
    // The applicant confirmation (below) always sends; it's a transactional reply.
    if (await adminNotifyEnabled("new_application")) {
      const adminMail = adminNewApplicationEmail(data.fullName, data.email);
      void sendEmail({ to: "admin@awin.co.za", toName: "A-WIN Admin", ...adminMail });
    }
    return sendEmail({ to: data.email, toName: data.fullName, ...mail });
  });

/** Public: forward a contact-form message to the info inbox. */
export const sendContactNotification = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(120),
        email: z.string().email().max(255),
        subject: z.string().trim().min(1).max(60),
        message: z.string().trim().min(10).max(2000),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { sendEmail, adminNotifyEnabled } = await import("./email.server");
    if (!(await adminNotifyEnabled("new_message"))) return { ok: true as const };
    const { contactMessageEmail } = await import("./email-templates.server");
    const mail = contactMessageEmail(data.name, data.email, data.subject, data.message);
    return sendEmail({ to: "info@awin.co.za", toName: "A-WIN Info", ...mail });
  });

/** Public: notify the committee that someone registered for an event. */
export const sendEventRegistrationNotification = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(1).max(200),
        email: z.string().email().max(255),
        eventTitle: z.string().trim().min(1).max(200),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { sendEmail, adminNotifyEnabled } = await import("./email.server");
    if (!(await adminNotifyEnabled("event_registration"))) return { ok: true as const };
    const { eventRegistrationEmail } = await import("./email-templates.server");
    const mail = eventRegistrationEmail(data.fullName, data.email, data.eventTitle);
    return sendEmail({ to: "admin@awin.co.za", toName: "A-WIN Admin", ...mail });
  });
