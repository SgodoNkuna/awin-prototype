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
    const { sendEmail, adminNotifyEnabled, rateLimitOk } = await import("./email.server");
    // Abuse guard: at most 3 application emails per address per hour.
    if (!(await rateLimitOk(`app:${data.email.toLowerCase()}`, 3, 3600))) {
      return { ok: false as const, error: "rate limited" };
    }
    const { applicationReceivedEmail, adminNewApplicationEmail } = await import("./email-templates.server");
    const mail = applicationReceivedEmail(data.fullName);
    // Committee alert — gated by the "new application" notification toggle.
    // The applicant confirmation (below) always sends; it's a transactional reply.
    if (await adminNotifyEnabled("new_application")) {
      const adminMail = adminNewApplicationEmail(data.fullName, data.email);
      void sendEmail({ to: "admin@awin.co.za", toName: "A-Win Admin", ...adminMail });
    }
    return sendEmail({ to: data.email, toName: data.fullName, ...mail });
  });

/**
 * Public: applicant confirmation email after a successful LOA/RPA submission.
 * The submission row and PDF are already written client-side (RLS-permitted
 * insert/upload) before this is called — this only sends the two emails.
 */
export const sendLoaRpaReceivedEmail = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        email: z.string().email(),
        fullName: z.string().trim().min(1).max(200),
        source: z.enum(["whatsapp", "website"]),
        loaOnly: z.boolean().default(false),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { sendEmail, adminNotifyEnabled, rateLimitOk } = await import("./email.server");
    // Abuse guard: at most 3 LOA/RPA emails per address per hour.
    if (!(await rateLimitOk(`loarpa:${data.email.toLowerCase()}`, 3, 3600))) {
      return { ok: false as const, error: "rate limited" };
    }
    const { loaRpaReceivedEmail, adminNewLoaRpaEmail } = await import("./email-templates.server");
    const mail = loaRpaReceivedEmail(data.fullName, data.loaOnly);
    // Confidentiality: LOA/RPA submissions contain FAIS-regulated financial
    // advice data, so the notification goes to ThuthukaSA (the FSP) only —
    // never to admin@awin.co.za. A-Win committee members are not bound by
    // FAIS confidentiality and must not receive this. The actual recipient
    // list is admin-configurable (Admin → LOA & Risk Profile → Advisory
    // notification recipients, two-person-approved like any other site
    // setting) — info@thuthuka-sa.co.za and the ThuthukaSA WhatsApp number
    // are only the fallback defaults if nothing's been configured.
    if (await adminNotifyEnabled("new_loa_rpa")) {
      const { getNotifyRecipients } = await import("./email.server");
      const { THUTHUKA_WHATSAPP_NUMBER } = await import("./whatsapp.server");
      const recipients = await getNotifyRecipients("loa_rpa", {
        emails: ["info@thuthuka-sa.co.za"],
        whatsapp: [THUTHUKA_WHATSAPP_NUMBER],
      });
      const adminMail = adminNewLoaRpaEmail(data.fullName, data.email, data.source, data.loaOnly);
      for (const to of recipients.emails) {
        void sendEmail({ to, toName: "ThuthukaSA", ...adminMail });
      }
      // Second, independent channel — same confidentiality reasoning as the
      // email above. Best-effort: no-ops until WHATSAPP_ACCESS_TOKEN /
      // WHATSAPP_PHONE_NUMBER_ID are configured (see whatsapp.server.ts).
      void (async () => {
        const { sendWhatsAppMessage } = await import("./whatsapp.server");
        const what = data.loaOnly ? "Letter of Authority" : "LOA & Risk Profile";
        const text = `New ${what} submission: ${data.fullName} (${data.email}) via ${data.source}. Review: https://awin.co.za/tksa`;
        await Promise.all(recipients.whatsapp.map((to) => sendWhatsAppMessage(to, text)));
      })().catch(() => {});
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
    const { sendEmail, adminNotifyEnabled, rateLimitOk } = await import("./email.server");
    // Abuse guard: at most 5 contact forwards per address per hour.
    if (!(await rateLimitOk(`contact:${data.email.toLowerCase()}`, 5, 3600))) {
      return { ok: false as const, error: "rate limited" };
    }
    if (!(await adminNotifyEnabled("new_message"))) return { ok: true as const };
    const { contactMessageEmail } = await import("./email-templates.server");
    const mail = contactMessageEmail(data.name, data.email, data.subject, data.message);
    return sendEmail({ to: "info@awin.co.za", toName: "A-Win Info", ...mail });
  });

/**
 * Authenticated: confirm a password change to the account owner, and alert
 * the committee inbox. Fires only after Supabase has already accepted the
 * new password — this is a notification, not a gate.
 */
export const sendPasswordChangedEmail = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ email: z.string().email(), fullName: z.string().trim().min(1).max(200) }).parse(i),
  )
  .handler(async ({ data }) => {
    const { sendEmail } = await import("./email.server");
    const { passwordChangedEmail, adminPasswordChangedEmail } = await import("./email-templates.server");
    const mail = passwordChangedEmail(data.fullName);
    const adminMail = adminPasswordChangedEmail(data.fullName, data.email);
    void sendEmail({ to: "admin@awin.co.za", toName: "A-Win Admin", ...adminMail });
    return sendEmail({ to: data.email, toName: data.fullName, ...mail });
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
    return sendEmail({ to: "admin@awin.co.za", toName: "A-Win Admin", ...mail });
  });
