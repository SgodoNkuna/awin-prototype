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
- **New LOA & RPA submission** → *not* admin@awin.co.za — goes to ThuthukaSA's recipients (see above)
- **New approval request** → admin@awin.co.za

Applicant/member-facing confirmation emails (e.g. "we received your application") always send regardless of these toggles — they're transactional, not committee alerts.

## Settings → Danger zone

Destructive bulk actions (clear contact messages, reset settings, delete draft/unpublished members) live under **Admin → Settings → Danger zone** and go through the same two-person approval flow. Use with care — these are not easily reversible.

## Getting help

If something looks wrong (a role that shouldn't have access, a submission that shouldn't be visible, an email that didn't send), check **Admin → Approvals** first for a pending or rejected request, then the relevant section's own audit trail before assuming it's a bug.
