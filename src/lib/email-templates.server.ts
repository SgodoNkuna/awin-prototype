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

// A base64 data: URI (what this used to be) is silently stripped by Gmail and
// unsupported entirely by Outlook's Word rendering engine — the logo never
// actually showed up. Email images need a real, stable, publicly reachable
// URL instead, so this is served from /public (unhashed, same path every
// deploy) rather than the Vite-bundled, content-hashed src/assets copy.
/** Public site origin, for links built outside this file (auth emails). */
export const SITE_URL = BRAND.site;

const LOGO_URL = `${BRAND.site}/email-assets/awin-logo-white.png`;
// Same reasoning as LOGO_URL above — a real static file, not an inline
// data: URI, so it actually renders in Gmail/Outlook.
const THUTHUKA_LOGO_URL = `${BRAND.site}/email-assets/thuthuka-logo.png`;

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f4;font-family:Segoe UI,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:${BRAND.color};padding:16px 32px;">
    <img src="${LOGO_URL}" width="120" height="32" alt="${BRAND.name}" style="height:32px;width:auto;display:block;border:0;" />
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

/**
 * LOA/RPA mail is ThuthukaSA's regulated correspondence, not A-Win's — its
 * own branded layout (their logo, their brand orange) rather than the
 * generic A-Win one, so it's visually clear who this email is actually from.
 */
function thuthukaLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f4;font-family:Segoe UI,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#e8960a;padding:16px 32px;">
    <img src="${THUTHUKA_LOGO_URL}" width="140" height="42" alt="ThuthukaSA — FSP No. 47992" style="height:42px;width:auto;display:block;border:0;background:#ffffff;border-radius:6px;padding:4px 8px;" />
  </td></tr>
  <tr><td style="padding:32px;">
    <h1 style="margin:0 0 16px;font-size:20px;color:#1c1917;">${title}</h1>
    ${bodyHtml}
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #e7e5e4;">
    <p style="margin:0;font-size:12px;color:#78716c;">
      ThuthukaSA &middot; Financial Services Provider No. 47992 &middot; on behalf of A-Win<br/>
      This is a confidential, transactional message about a signed document.
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
          "Thank you for applying to join A-Win. Your application is now with our membership committee for review. We aim to respond within 5 working days.",
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
    subject: "Welcome to A-Win: your membership is active",
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
    subject: `New membership application: ${fullName}`,
    html: layout(
      "New application received",
      p(`${strong(fullName)} (${esc(email)}) just submitted a membership application.`) +
        btn(`${BRAND.site}/admin/applications`, "Review in admin") +
        p("Their proof of payment (if attached) is waiting in the EFT queue."),
    ),
  };
}

/**
 * `loaOnly` must reflect what was actually signed — the applicant only ever
 * completed the Risk Profile if they used the full form, and telling someone
 * they signed something they didn't is worse than a generic thank-you.
 */
export function loaRpaReceivedEmail(fullName: string, loaOnly: boolean) {
  if (loaOnly) {
    return {
      subject: "We received your Letter of Authority",
      html: thuthukaLayout(
        "Letter of Authority received",
        p(`Hi ${strong(fullName)},`) +
          p(
            "Thank you for completing your Letter of Authority. A signed copy has been generated and is on file with ThuthukaSA (FSP No. 47992).",
          ) +
          p("No further action is needed from you right now."),
      ),
    };
  }
  return {
    subject: "We received your LOA & Risk Profile submission",
    html: thuthukaLayout(
      "LOA &amp; Risk Profile received",
      p(`Hi ${strong(fullName)},`) +
        p(
          "Thank you for completing your Letter of Authority and Risk Profile Analysis. A signed copy of both has been generated and is on file with ThuthukaSA (FSP No. 47992).",
        ) +
        p("No further action is needed from you right now. The A-Win committee will be in touch if anything further is required."),
    ),
  };
}

export function adminNewLoaRpaEmail(fullName: string, email: string, source: string, loaOnly: boolean) {
  const what = loaOnly ? "a signed Letter of Authority" : "a signed LOA &amp; Risk Profile Analysis";
  return {
    subject: `New ${loaOnly ? "LOA" : "LOA & RPA"} submission: ${fullName}`,
    html: thuthukaLayout(
      `New ${loaOnly ? "Letter of Authority" : "LOA & RPA"} submission`,
      p(`${strong(fullName)} (${esc(email)}) submitted ${what} via ${strong(source)}.`) +
        btn(`${BRAND.site}/tksa`, "Review on the ThuthukaSA dashboard"),
    ),
  };
}

export function eventRegistrationEmail(fullName: string, email: string, eventTitle: string) {
  return {
    subject: `New event registration: ${eventTitle}`,
    html: layout(
      "New event registration",
      p(`${strong(fullName)} (${esc(email)}) registered for ${strong(eventTitle)}.`) +
        btn(`${BRAND.site}/admin/events`, "View registrations"),
    ),
  };
}

export function contactMessageEmail(name: string, email: string, subject: string, message: string) {
  return {
    subject: `Website contact: ${subject} · ${name}`,
    html: layout(
      "New contact message",
      p(`${strong(name)} (${esc(email)}) sent a message via the website contact form:`) +
        `<blockquote style="margin:12px 0;padding:12px 16px;border-left:3px solid ${"#e36414"};background:#fafaf9;font-size:14px;color:#44403c;white-space:pre-wrap;">${esc(message)}</blockquote>` +
        p(`Reply directly to ${strong(email)}.`),
    ),
  };
}

export function adminNewApprovalRequestEmail(actionLabel: string, reason: string, requestedByName: string) {
  return {
    subject: `Approval needed: ${actionLabel}`,
    html: layout(
      "A request is waiting for a second admin",
      p(`${strong(requestedByName)} filed a request that needs approval from a ${strong("different")} admin before it takes effect.`) +
        p(`${strong("Action:")} ${esc(actionLabel)}`) +
        p(`${strong("Reason given:")} ${esc(reason)}`) +
        btn(`${BRAND.site}/admin/approvals`, "Review in Admin → Approvals"),
    ),
  };
}

export function passwordChangedEmail(fullName: string) {
  return {
    subject: "Your A-Win password was changed",
    html: layout(
      "Password changed",
      p(`Hi ${strong(fullName)},`) +
        p("This confirms your A-Win account password was just changed.") +
        p("If you made this change, no action is needed. If you did NOT make this change, please contact the committee immediately by replying to this email."),
    ),
  };
}

export function adminPasswordChangedEmail(fullName: string, email: string) {
  return {
    subject: `Password changed: ${fullName}`,
    html: layout(
      "Account password changed",
      p(`${strong(fullName)} (${esc(email)}) just changed their account password.`),
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
    subject: `Payment received: ${amount} (A-Win membership)`,
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

// --- Account access (sent via ZeptoMail, not Supabase's built-in mailer) ----
// Supabase's default mailer (noreply@mail.app.supabase.io) is rate-limited to
// a handful of emails an hour and often lands in spam — confirmation and
// reset emails were silently never arriving. Every login-related email now
// goes out through the same ZeptoMail sender as the rest of the site.

const codeBlock = (code: string) =>
  `<p style="margin:16px 0;font-size:28px;font-weight:700;letter-spacing:6px;color:#1c1917;font-family:Consolas,monospace;">${esc(code)}</p>`;

export type SetPasswordKind = "reset" | "advisor_welcome" | "advisor_access";

/**
 * One email for every "you need to choose a password" moment: a forgotten
 * password, a brand-new ThuthukaSA account, or advisor access just granted
 * on an existing account. Carries both a one-click link and the 6-digit code
 * (for anyone whose mail scanner pre-clicks links and burns them).
 */
export function setPasswordEmail(kind: SetPasswordKind, fullName: string | null, email: string, link: string, code: string) {
  const hi = p(`Hi ${strong(fullName || email)},`);
  const how =
    btn(link, "Set my password") +
    p(`Or go to ${strong(`${BRAND.site.replace(/^https?:\/\//, "")}/auth`)}, choose ${strong("Forgot password?")}, and enter this code:`) +
    codeBlock(code) +
    p(`The link and code expire in 1 hour and work once. If they expire, use ${strong("Forgot password?")} on the sign-in page to get a new one — no need to contact anyone.`);
  const signIn = p(`From then on, sign in at ${strong(`${BRAND.site.replace(/^https?:\/\//, "")}/auth`)} with ${strong(email)} and the password you chose.`);
  if (kind === "advisor_welcome") {
    return {
      subject: "Your ThuthukaSA dashboard account is ready",
      html: thuthukaLayout(
        "Welcome to the ThuthukaSA dashboard",
        hi + p("An account has been created for you on the ThuthukaSA dashboard, where you can view and download signed Letters of Authority and Risk Profiles.") +
          p("First, choose your own password:") + how + signIn,
      ),
    };
  }
  if (kind === "advisor_access") {
    return {
      subject: "You now have ThuthukaSA dashboard access",
      html: thuthukaLayout(
        "ThuthukaSA dashboard access granted",
        hi + p(`Your account (${strong(email)}) now has access to the ThuthukaSA dashboard. If you already know your password, just sign in. If not, set one now:`) +
          how + signIn,
      ),
    };
  }
  return {
    subject: "Reset your A-Win password",
    html: layout(
      "Reset your password",
      hi + p("We received a request to reset the password for your account.") + how +
        p("If you didn't ask for this, you can ignore this email — your password won't change."),
    ),
  };
}

export function confirmSignupEmail(fullName: string, link: string) {
  return {
    subject: "Confirm your A-Win account",
    html: layout(
      "Confirm your email",
      p(`Hi ${strong(fullName)},`) +
        p("Thanks for creating an A-Win account. Please confirm your email address to finish setting it up:") +
        btn(link, "Confirm my email") +
        p("The link expires in 1 hour. If it expires, just sign up again with the same email and we'll send a fresh one."),
    ),
  };
}

/** Team-change notice to ThuthukaSA's own notification recipients. */
export function tksaTeamNoticeEmail(title: string, lines: string[]) {
  return {
    subject: `ThuthukaSA team: ${title}`,
    html: thuthukaLayout(
      title,
      lines.map((l) => p(esc(l))).join("") + btn(`${BRAND.site}/tksa`, "Open the ThuthukaSA dashboard"),
    ),
  };
}
