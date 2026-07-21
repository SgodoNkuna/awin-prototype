/**
 * Transactional email templates — SERVER ONLY.
 * Plain-table HTML that renders correctly in Gmail/Outlook/Zoho; brand colours
 * follow the A-Win token palette in src/styles.css.
 */

const BRAND = {
  name: "A-Win",
  color: "#0f4c5c",
  accent: "#e36414",
  site: process.env.PAYFAST_RETURN_URL?.replace(/\/portal.*$/, "") ?? "https://awin.co.za",
};

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f4;font-family:Segoe UI,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:${BRAND.color};padding:20px 32px;">
    <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:1px;">${BRAND.name}</span>
  </td></tr>
  <tr><td style="padding:32px;">
    <h1 style="margin:0 0 16px;font-size:20px;color:#1c1917;">${title}</h1>
    ${bodyHtml}
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #e7e5e4;">
    <p style="margin:0;font-size:12px;color:#78716c;">
      African Women In Networking &middot; <a href="${BRAND.site}" style="color:${BRAND.color};">${BRAND.site.replace(/^https?:\/\//, "")}</a><br/>
      This is a transactional message about your A-Win account.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// Escape user-supplied leaf values before they hit the HTML email body.
// Prevents HTML/link injection from public endpoints (contact form, applications).
const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const p = (t: string) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#44403c;">${t}</p>`;
// strong() only ever wraps leaf user values (names, tiers, amounts) — escape here.
const strong = (t: string) => `<strong style="color:#1c1917;">${esc(t)}</strong>`;
const btn = (href: string, label: string) =>
  `<p style="margin:20px 0;"><a href="${href}" style="background:${BRAND.accent};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">${label}</a></p>`;

export function applicationReceivedEmail(fullName: string) {
  return {
    subject: "We received your A-Win membership application",
    html: layout(
      "Application received",
      p(`Hi ${strong(fullName)},`) +
        p(
          "Thank you for applying to join A-Win. Your application is now with our membership committee for review — we aim to respond within 5 working days.",
        ) +
        p("We'll email you as soon as a decision is made. No action is needed from you right now."),
    ),
  };
}

export function membershipActivatedEmail(fullName: string, tier: string, expiresAt: string | null) {
  const expires = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" })
    : "12 months from today";
  return {
    subject: "Welcome to A-Win — your membership is active",
    html: layout(
      "Your membership is active 🎉",
      p(`Hi ${strong(fullName)},`) +
        p(
          `Your ${strong(tier)} membership is now active and valid until ${strong(expires)}. You have full access to the member portal, events, and the A-Win community.`,
        ) +
        btn(`${BRAND.site}/portal`, "Open the member portal") +
        p("If anything looks wrong, just reply to this email."),
    ),
  };
}

export function membershipSuspendedEmail(fullName: string) {
  return {
    subject: "Your A-Win membership has been suspended",
    html: layout(
      "Membership suspended",
      p(`Hi ${strong(fullName)},`) +
        p(
          "Your A-Win membership has been suspended. If you believe this is a mistake, or you'd like to discuss reinstatement, please contact the committee by replying to this email.",
        ),
    ),
  };
}

export function adminNewApplicationEmail(fullName: string, email: string) {
  return {
    subject: `New membership application — ${fullName}`,
    html: layout(
      "New application received",
      p(`${strong(fullName)} (${esc(email)}) just submitted a membership application.`) +
        btn(`${BRAND.site}/admin/applications`, "Review in admin") +
        p("Their proof of payment (if attached) is waiting in the EFT queue."),
    ),
  };
}

export function eventRegistrationEmail(fullName: string, email: string, eventTitle: string) {
  return {
    subject: `New event registration — ${eventTitle}`,
    html: layout(
      "New event registration",
      p(`${strong(fullName)} (${esc(email)}) registered for ${strong(eventTitle)}.`) +
        btn(`${BRAND.site}/admin/events`, "View registrations"),
    ),
  };
}

export function contactMessageEmail(name: string, email: string, subject: string, message: string) {
  return {
    subject: `Website contact — ${subject} — ${name}`,
    html: layout(
      "New contact message",
      p(`${strong(name)} (${esc(email)}) sent a message via the website contact form:`) +
        `<blockquote style="margin:12px 0;padding:12px 16px;border-left:3px solid ${"#e36414"};background:#fafaf9;font-size:14px;color:#44403c;white-space:pre-wrap;">${esc(message)}</blockquote>` +
        p(`Reply directly to ${strong(email)}.`),
    ),
  };
}

export function paymentReceiptEmail(
  fullName: string,
  amountCents: number,
  tier: string,
  reference: string,
  paidAtIso: string,
) {
  const amount = `R ${(amountCents / 100).toFixed(2)}`;
  const paidAt = new Date(paidAtIso).toLocaleString("en-ZA", { dateStyle: "long", timeStyle: "short" });
  return {
    subject: `Payment received — ${amount} (A-Win membership)`,
    html: layout(
      "Payment receipt",
      p(`Hi ${strong(fullName)},`) +
        p("We've received your membership payment. Details below:") +
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;font-size:14px;color:#44403c;">
          <tr><td style="padding:4px 16px 4px 0;">Amount</td><td>${strong(amount)}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;">Tier</td><td>${strong(tier)}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;">Reference</td><td>${strong(reference)}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;">Date</td><td>${strong(paidAt)}</td></tr>
        </table>` +
        p("Keep this email as proof of payment. Your membership benefits are active immediately."),
    ),
  };
}
