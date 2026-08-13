# A-Win Website — Admin & Staff Guide

This guide covers the admin panel at [awin.co.za/admin](https://awin.co.za/admin) and the ThuthukaSA advisor dashboard at [awin.co.za/tksa](https://awin.co.za/tksa). It's for A-Win committee admins and ThuthukaSA staff.

## Roles

- **Admin** — full access to the admin panel (`/admin/*`). Can manage members, applications, events, content, and site settings.
- **Advisor** (ThuthukaSA) — access to `/tksa` only: LOA & Risk Profile submissions and their own account. Cannot see the general admin panel.
- **Member** — logged-in A-Win members. Access to `/portal` only (their own membership status, documents, EFT details).

A user can hold more than one role. Roles are managed in **Admin → Members** (see below).

## Logging in

Go to [awin.co.za/auth](https://awin.co.za/auth) and sign in. New accounts created by an admin are issued a temporary password and are forced to set their own on first login (`force_password_change`).

## Admin panel sections

All under `/admin`:

| Section | URL | What it's for |
|---|---|---|
| Dashboard | `/admin` | At-a-glance stats (members, pending applications, upcoming events, unread messages, documents) and quick actions. |
| Members | `/admin/members` | View/edit member profiles, membership status and tier, role badges (Admin / ThuthukaSA Advisor), revoke advisor access. |
| Applications | `/admin/applications` | Review and action new membership applications. |
| Events | `/admin/events` | Create/edit events, manage registrations. |
| Gallery | `/admin/gallery` | Upload and manage event photos shown on the public Events & Gallery page. |
| News | `/admin/news` | Publish news/announcement posts. |
| Committees | `/admin/committees` | Manage committee member profiles and positions shown on the public Team page. |
| Documents | `/admin/documents` | Upload/manage documents available to members via the portal. |
| Messages | `/admin/messages` | Contact-form submissions from the public site. |
| EFT | `/admin/eft` | EFT/banking details shown to members for manual payments. |
| Billing | `/admin/billing` | Membership billing/subscription status (PayFast). |
| LOA & Risk Profile | `/admin/loa-rpa` | Share links for the LOA/RPA forms, ThuthukaSA advisor access management, and all submitted LOA/RPA records. Same submissions view as `/tksa`. |
| Approvals | `/admin/approvals` | Two-person approval queue — see below. |
| Exports | `/admin/exports` | Export data (e.g. members, applications) to CSV. |
| Settings | `/admin/settings` | Site content, team, notification toggles, and danger-zone actions. |

## Two-person approval (maker-checker)

The highest-risk actions — deleting a member, deleting an application, deleting an LOA/RPA submission, granting/revoking the admin role, and site settings changes — don't happen immediately. One admin **requests** the action; a **different** admin must **approve** it in **Admin → Approvals** before it actually runs. You cannot approve your own request. Every decision is logged.

If you're the only admin available and something urgent needs approving, you need a second admin account to review it — this is by design, not a bug.

## ThuthukaSA / LOA & Risk Profile

- The public forms are at `/loa` (Letter of Authority only, short form) and `/loa-rpa` (LOA + full Risk Profile Analysis).
- Submissions are confidential FAIS-regulated data. They are **never** emailed to A-Win's admin inbox (admin@awin.co.za) — only to ThuthukaSA's configured recipients, to keep A-Win committee members (who aren't bound by FAIS confidentiality) out of the data.
- Who gets notified is set in **Admin → LOA & Risk Profile → Advisory notification recipients** (emails + WhatsApp numbers). Changing this list requires two-person approval, same as any other setting.
- Advisor-only access: grant the "advisor" role to a ThuthukaSA staff account from **Admin → LOA & Risk Profile** (either create a brand-new account or promote an existing one). Advisors log in and land on `/tksa`, a dedicated dashboard scoped to just LOA/RPA submissions.
- Deleting a submission is admin-only, requires typing a confirmation phrase, and still goes through two-person approval.
- Blank, unsigned PDF templates of both forms can be downloaded from the public form pages (useful for printing/reference) via the "Download the blank template" link.

## Notification settings (Admin → Settings → Notifications)

Toggles for the committee-alert emails A-Win's admin inbox receives:

- **New membership application** → admin@awin.co.za
- **New contact message** → info@awin.co.za
- **New event registration** → admin@awin.co.za
- **New approval request** → admin@awin.co.za

LOA/RPA submission alerts aren't controlled here — they're always on and routed to ThuthukaSA's recipients (see above), never to admin@awin.co.za.

Applicant/member-facing confirmation emails (e.g. "we received your application") always send regardless of these toggles — they're transactional, not committee alerts.

## Settings → Danger zone

Destructive bulk actions (clear contact messages, reset settings, delete draft/unpublished members) live under **Admin → Settings → Danger zone** and go through the same two-person approval flow. Use with care — these are not easily reversible.

## Making code changes: adding a new page

This section is for whoever's driving changes to the website itself — even if that's someone non-technical working with an AI coding assistant (GitHub Copilot, Claude Code, or similar) rather than writing code by hand. The short version: **you describe what you want in plain English, the AI writes the code.**

### Where pages live

Every page on the site is one file in `src/routes/`. The filename decides the web address — `src/routes/why-a-win.tsx` is what renders at `awin.co.za/why-a-win`. Add a new file there with the right shape and the site automatically creates the page and its URL — nothing else to register or configure. This is the one fact worth knowing even if you never touch the code yourself: **"add a new page" always means "add a new file in `src/routes/`."**

### Worked example: adding the A-Win Market page

This is the exact kind of prompt to type into an AI coding assistant open in this repository:

> Add a new page at `/market` called "A-Win Market". Use `/why-a-win` as the style reference — same header, breadcrumb, and section layout as the rest of the site. For now it should list one listing: "Family Law Mediation Services" — a short description, the flyer image, and contact details (phone/email). Show it as a card, similar to how team member profiles are shown on the `/team` page. Add a link to the new page in the main navigation menu and the footer, labeled "A-Win Market". Then test it locally and show me it works before pushing anything live.

Notice what that prompt does: names the URL and title, points at an existing page to copy the *look* from, describes the *content* plainly (what a listing needs — name, description, image, contact), and says where it should be linked from. It never mentions React, routing, or any code — that's the assistant's job to figure out.

### How to write a good prompt

1. **Say what you want, not how to build it.** "Add a page that lists our products" beats "create a new route file that exports a component." The AI already knows the how.
2. **Point at an existing page as the pattern.** "Make it look like `/why-a-win`" or "cards like the ones on `/team`" saves a lot of back-and-forth and keeps the new page consistent with the rest of the site.
3. **Be concrete about content.** List the actual fields/sections you want (name, description, image, price, contact) rather than "make it nice."
4. **One step at a time, then iterate.** Get the basic page working first, then ask for the next thing — "now add a second listing," "now make the card bigger on mobile."
5. **Describe what's wrong, not the fix.** "The image looks stretched on my phone" is a better bug report than a guess at the CSS fix — let the assistant diagnose it.
6. **Always ask for it to be tested before it goes live.** A well-behaved assistant will build it, check it in a browser, and only then push the change — but it's fine to say so explicitly: *"test this and show me it works before pushing live."*
7. **Say how far it's allowed to go.** If you're fine with it touching the navigation menu and footer too (not just the one new page), say so up front.

### Prompt templates to copy

- *"Add a new page at `/[url]` called '[title]'. Use `/[existing-page]` as the style reference. It should [describe the sections/content]. Add it to the main navigation menu."*
- *"On the [page name] page, add a new section that [describe what it should show]."*
- *"The [page] page looks wrong on my phone — [describe what you see]. Please fix it and confirm it works before pushing."*
- *"I want a form that collects [fields] and emails me when someone submits it, similar to the Contact page."*

### Building the A-Win Market incrementally

The end goal (an online store with checkout and payments) is a big feature — don't ask for all of it in one prompt. Build it in stages, each one a separate, testable prompt:

1. **Now**: a simple listings page (the Family Law Mediation example above).
2. **Next**: more listings, a way for admins to add/edit them without a developer (like the Team Profiles editor in Admin → Settings already works).
3. **Later**: ordering and payment (PayFast is already integrated for membership billing — the same approach would extend to product checkout).

## Getting help

If something looks wrong (a role that shouldn't have access, a submission that shouldn't be visible, an email that didn't send), check **Admin → Approvals** first for a pending or rejected request, then the relevant section's own audit trail before assuming it's a bug.
