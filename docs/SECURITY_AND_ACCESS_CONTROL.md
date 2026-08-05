# Security & Access Control — A-Win

Covers the account security and admin-authorization model: forced password
resets, the change-password flow, and the two-person (maker-checker)
approval system for high-risk admin actions. Written 2026-08-06.

---

## 1. Roles today

The role model is intentionally flat: `app_role` is `admin` or `member`,
stored per-user in `user_roles` (a user can hold both). `has_role(uid, role)`
is the single SQL function every RLS policy and server function calls to
check admin status — see `ensureAdmin()` in `src/lib/admin-roles.functions.ts`.

There is no chairman/treasurer/secretary role distinction in the database —
those are just display titles on `team_members` / account full names. All
five `*@awin.co.za` accounts (admin, chairman, info, secretary, treasurer)
hold the `admin` role and are otherwise equal in what they can do.

## 2. Forced password change

`profiles.force_password_change` (boolean, default `false`) flags an account
that must set a new password before using the rest of the site.

- **Set**: only ever done administratively (currently via
  `scripts/reset-committee-passwords.mjs`, which also rotates the Supabase
  Auth password itself using the service-role key). There is no UI to force
  another user's password change — it's a script, run out-of-band.
- **Enforced**: `AuthProvider` (`src/lib/use-auth.tsx`) loads the flag
  alongside the admin-role check on every sign-in. `ForcePasswordChangeGate`
  (`src/components/site/SiteLayout.tsx`) redirects to `/change-password` for
  any route outside `["/change-password", "/auth"]` while the flag is true.
- **Cleared**: `/change-password` (`src/components/pages/change-password-page.tsx`)
  calls `supabase.auth.updateUser({ password })`, then clears the flag on the
  caller's own `profiles` row (covered by the existing "Users update own
  profile" RLS policy — no special-case policy needed, see the migration
  comment in `20260806010000_force_password_change.sql`).
- **Notified**: on a successful change, `sendPasswordChangedEmail` (in
  `src/lib/email.functions.ts`) emails both the account owner and
  `admin@awin.co.za`, using the `passwordChangedEmail` /
  `adminPasswordChangedEmail` templates.

This is a UX gate, not a privilege boundary — a user can only ever affect
their own `profiles` row, so there's no security reason to lock the flag
down further with RLS.

**Resetting the 5 real committee accounts:**
```bash
node scripts/reset-committee-passwords.mjs
```
Requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in the environment.
Sets one shared temp password (printed at the end — hand it to the
committee out-of-band, never over email/Slack in plaintext) and flags all
5 accounts to force a change on next login.

## 3. Two-person approval (maker-checker)

The highest-risk admin actions no longer execute immediately. Instead, one
admin *requests* the action, and a **different** admin must *approve* it
before it actually runs. Covered today:

| Action | Request fn | Execute fn |
|---|---|---|
| Delete member account | `requestDeleteMember` | `executeDeleteMember` |
| Delete application | `requestDeleteApplication` | `executeDeleteApplication` |
| Grant/revoke admin role | `requestSetUserRole` | `executeUserRoleChange` |

All in `src/lib/admin-roles.functions.ts`. The approval workflow itself
(`listPendingApprovals`, `decideApproval`) lives in
`src/lib/admin-approvals.functions.ts`, backed by the `pending_approvals`
table (migration `20260806020000_two_person_approval.sql`).

**Flow:**
1. Admin A takes the "Delete member" / "Delete application" / "Promote or
   revoke admin" action in the UI, same typed-confirmation dialogs as
   before. This now inserts a `pending_approvals` row (`status: pending`)
   instead of running the action.
2. Any *other* admin sees it on **Admin → Approvals**
   (`src/routes/admin.approvals.tsx`), which lists every pending/decided
   request with who requested it, why, and (for pending ones) Approve/Reject
   buttons — hidden if you are the requester.
3. Approving calls `decideApproval`, which:
   - Re-checks server-side that `decided_by !== requested_by` (the real
     enforcement point — the UI hiding the buttons is just a courtesy).
   - Atomically claims the row (`status = 'pending' → 'approved'` in one
     conditional `UPDATE`, so two admins racing to approve the same request
     can't both execute it).
   - Runs the actual `execute*` function and records the result
     (`executed` / `failed`) plus a full audit-log entry.
4. Rejecting just records `status: rejected` with a decision reason — no
   audit-log side effect beyond the rejection record itself.

**Why this shape:** `pending_approvals` has no RLS `UPDATE` policy at all,
so RLS denies every client-side update — the row can only change via the
service-role client inside `decideApproval`/`requestDeleteMember` etc,
which is where the requester-≠-approver rule is actually enforced. This
was a deliberate choice over relying on RLS alone, since RLS policies are
combined with OR semantics — a broad existing "admins can update" policy
would have silently allowed self-approval.

**What this does NOT cover:** membership suspension/activation, EFT/payment
marking, event/content edits — anything not in the table above still
executes immediately on a single admin's action. Extending the two-person
gate to more actions means adding another `action_type` enum value, an
`execute*` function, and a `request*` wrapper — the dispatcher in
`decideApproval` is a single `switch` to extend.

## 4. Audit trail

Every executed/rejected approval, plus every direct role-grant/delete that
predates this system, lands in `audit_logs` (`actor_id`, `actor_email`,
`action`, `target_type`, `target_id`, `reason`, `details` jsonb,
`created_at`). There's no admin UI to browse it yet — query it directly via
Supabase MCP/dashboard when investigating an incident.
