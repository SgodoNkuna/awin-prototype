import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureNotForcedPasswordChange(ctx: { supabase: any; userId: string }) {
  // A password reset by the committee flags the account until the owner
  // sets their own password — block every privileged server action for
  // that window too, not just the client-side redirect. Otherwise anyone
  // holding a still-shared/unrotated temp password has full privileged
  // power via direct API calls, defeating the point of forcing a change.
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("force_password_change")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (profile?.force_password_change) {
    throw new Error("Forbidden: change your password before performing this action");
  }
}

export async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data: ok } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!ok) throw new Error("Forbidden: admin role required");
  await ensureNotForcedPasswordChange(ctx);
}

/**
 * For ThuthukaSA self-service actions that are narrow enough to trust an
 * advisor with directly (requesting a new colleague's account, requesting
 * advisor access for someone) — as opposed to anything that can touch the
 * admin role or site-wide settings, which stays admin-only via ensureAdmin.
 */
export async function ensureAdminOrAdvisor(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isAdvisor } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "advisor" });
  if (!isAdmin && !isAdvisor) throw new Error("Forbidden: admin or advisor role required");
  await ensureNotForcedPasswordChange(ctx);
}

/**
 * Fire-and-forget alert to the admin inbox when a new pending_approvals row
 * is filed, so a deletion or role change doesn't sit unnoticed until someone
 * happens to open Admin > Approvals. Gated by the same
 * Admin > Settings > Notifications toggle pattern as other admin alerts.
 */
export async function notifyNewApprovalRequest(actionLabel: string, reason: string, requestedByName: string) {
  // Awaited by every caller: on serverless an un-awaited send can be frozen
  // mid-flight once the handler returns, and the alert silently never goes.
  try {
    const { adminNotifyEnabled, sendEmail } = await import("./email.server");
    if (!(await adminNotifyEnabled("new_approval_request"))) return;
    const { adminNewApprovalRequestEmail } = await import("./email-templates.server");
    const mail = adminNewApprovalRequestEmail(actionLabel, reason, requestedByName);
    await sendEmail({ to: "admin@awin.co.za", toName: "A-Win Admin", ...mail });
  } catch {
    // best-effort — never block the request itself
  }
}

// --- Execution logic -------------------------------------------------------
// These run only after a second admin has approved the request (see
// admin-approvals.functions.ts). They are not exported as server fns
// themselves — reachable only through the approval dispatcher, which is the
// only place that may call `executeUserRoleChange` outside of this module.

// Supabase stores login emails lowercased — every lookup by email must be
// lowercased too, or "Advisor3@…" silently matches nothing.
const emailField = () => z.string().trim().toLowerCase().pipe(z.string().email());

/** ThuthukaSA staff are external FSP staff: they get 'advisor', never A-Win 'admin'. */
export const isThuthukaEmail = (email: string | null | undefined) =>
  !!email && /@thuthuka-?sa\.co\.za$/i.test(email.trim());

const THUTHUKA_ADMIN_BLOCKED =
  "ThuthukaSA staff need the advisor role, not admin — admin opens the A-Win console, which cannot show LOA/RPA submissions. Use “Add team member” / “Grant advisor” instead.";

export const promoteSchema = z.object({
  email: emailField().optional(),
  user_id: z.string().uuid().optional(),
  role: z.enum(["admin", "member", "advisor"]).default("admin"),
  action: z.enum(["grant", "revoke"]).default("grant"),
  reason: z.string().trim().min(5).max(500),
}).refine((v) => v.email || v.user_id, { message: "email or user_id required" });

export async function executeUserRoleChange(
  supabaseAdmin: any,
  data: z.infer<typeof promoteSchema>,
  actor: { userId: string; email: string | null },
) {
  let targetId = data.user_id;
  let targetEmail = data.email ?? null;
  if (!targetId && data.email) {
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", data.email)
      .maybeSingle();
    if (!p) throw new Error(`No profile found for ${data.email}`);
    targetId = p.id;
    targetEmail = p.email;
  }
  if (!targetId) throw new Error("Target user not resolved");
  if (!targetEmail) {
    const { data: p } = await supabaseAdmin.from("profiles").select("email").eq("id", targetId).maybeSingle();
    targetEmail = p?.email ?? null;
  }
  if (data.role === "admin" && data.action === "grant" && isThuthukaEmail(targetEmail)) {
    throw new Error(THUTHUKA_ADMIN_BLOCKED);
  }

  if (data.action === "grant") {
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: targetId, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", targetId)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
  }

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actor.userId,
    actor_email: actor.email,
    action: `role_${data.action}`,
    target_type: "user_role",
    target_id: targetId,
    reason: data.reason,
    details: { role: data.role, target_email: targetEmail },
  });

  let emailSent: boolean | undefined;
  if (data.role === "advisor" && targetEmail) {
    const { notifyThuthukaTeam } = await import("./email.server");
    if (data.action === "grant") {
      // A self-signed-up account may never have confirmed its email (the
      // confirmation got lost) — confirm it now so login can't fail with
      // "Email not confirmed", then email them a set-password link in case
      // they don't know/remember their password.
      await supabaseAdmin.auth.admin.updateUserById(targetId, { email_confirm: true });
      const { sendSetPasswordEmail } = await import("./auth-email.server");
      emailSent = (await sendSetPasswordEmail(supabaseAdmin, targetEmail, "advisor_access")).ok;
      await notifyThuthukaTeam("Team member added", [
        `${targetEmail} now has access to the ThuthukaSA dashboard.`,
        emailSent
          ? "They've been emailed a link to set their password and sign in."
          : "We couldn't email them automatically — ask them to use “Forgot password?” on the sign-in page.",
      ]);
    } else {
      await notifyThuthukaTeam("Team member removed", [`${targetEmail} no longer has access to the ThuthukaSA dashboard.`]);
    }
  }

  return { ok: true, user_id: targetId, role: data.role, action: data.action, email: targetEmail, emailSent };
}

export const deleteMemberSchema = z.object({
  user_id: z.string().uuid(),
  confirm_email: z.string().trim().min(1),
  reason: z.string().trim().min(5).max(500),
});

/**
 * Deletes the auth account (cascades to `profiles`, `user_roles`, sessions, etc.).
 * Application/payment/event-registration history is preserved with user_id set
 * to null (see FK definitions) — only login access and the profile disappear.
 * The caller must echo the member's exact email back, on top of a typed reason,
 * so an admin can't delete a member with a single misclick.
 */
export async function executeDeleteMember(
  supabaseAdmin: any,
  data: z.infer<typeof deleteMemberSchema>,
  actor: { userId: string; email: string | null },
) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, membership_tier, membership_status")
    .eq("id", data.user_id)
    .maybeSingle();
  if (!profile) throw new Error("Member not found");
  if ((profile.email ?? "").trim().toLowerCase() !== data.confirm_email.trim().toLowerCase()) {
    throw new Error("Typed email does not match this member's email");
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
  if (error) throw new Error(error.message);

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actor.userId,
    actor_email: actor.email,
    action: "member_delete",
    target_type: "profile",
    target_id: data.user_id,
    reason: data.reason,
    details: { deleted_snapshot: profile },
  });

  return { ok: true, user_id: data.user_id };
}

export const deleteApplicationSchema = z.object({
  application_id: z.string().uuid(),
  confirm_name: z.string().trim().min(1),
  reason: z.string().trim().min(5).max(500),
});

export async function executeDeleteApplication(
  supabaseAdmin: any,
  data: z.infer<typeof deleteApplicationSchema>,
  actor: { userId: string; email: string | null },
) {
  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("*")
    .eq("id", data.application_id)
    .maybeSingle();
  if (!application) throw new Error("Application not found");
  if (application.full_name.trim().toLowerCase() !== data.confirm_name.trim().toLowerCase()) {
    throw new Error("Typed name does not match this applicant's name");
  }

  const { error } = await supabaseAdmin.from("applications").delete().eq("id", data.application_id);
  if (error) throw new Error(error.message);

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actor.userId,
    actor_email: actor.email,
    action: "application_delete",
    target_type: "application",
    target_id: data.application_id,
    reason: data.reason,
    details: { deleted_snapshot: JSON.parse(JSON.stringify(application)) },
  });

  return { ok: true, application_id: data.application_id };
}

export const deleteLoaRpaSubmissionSchema = z.object({
  submission_id: z.string().uuid(),
  confirm_name: z.string().trim().min(1),
  reason: z.string().trim().min(5).max(500),
});

/**
 * Admin-only, not advisor — ThuthukaSA can view/mark-reviewed but shouldn't
 * be able to unilaterally erase FAIS-regulated records themselves; deletion
 * stays with A-Win's own accountable admins, same two-person approval as
 * every other destructive action here.
 */
export async function executeDeleteLoaRpaSubmission(
  supabaseAdmin: any,
  data: z.infer<typeof deleteLoaRpaSubmissionSchema>,
  actor: { userId: string; email: string | null },
) {
  const { data: submission } = await supabaseAdmin
    .from("loa_rpa_submissions")
    .select("*")
    .eq("id", data.submission_id)
    .maybeSingle();
  if (!submission) throw new Error("Submission not found");
  if (submission.full_name.trim().toLowerCase() !== data.confirm_name.trim().toLowerCase()) {
    throw new Error("Typed name does not match this submission's name");
  }

  const paths = [...new Set([submission.pdf_path, submission.loa_pdf_path].filter(Boolean))];
  if (paths.length) {
    await supabaseAdmin.storage.from("loa-rpa-documents").remove(paths);
  }

  const { error } = await supabaseAdmin.from("loa_rpa_submissions").delete().eq("id", data.submission_id);
  if (error) throw new Error(error.message);

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actor.userId,
    actor_email: actor.email,
    action: "loa_rpa_submission_delete",
    target_type: "loa_rpa_submission",
    target_id: data.submission_id,
    reason: data.reason,
    details: { deleted_snapshot: { full_name: submission.full_name, email: submission.email, source: submission.source, loa_only: submission.loa_only, created_at: submission.created_at } },
  });

  return { ok: true, submission_id: data.submission_id };
}

// --- Request entry points ---------------------------------------------------
// The UI calls these. Each just validates + files a pending_approvals row;
// none of them perform the actual change. See admin-approvals.functions.ts
// for the approve/reject/execute half of the workflow.

export const requestSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => promoteSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.role === "admin" && data.action === "grant") {
      let email = data.email ?? null;
      if (!email && data.user_id) {
        const { data: p } = await supabaseAdmin.from("profiles").select("email").eq("id", data.user_id).maybeSingle();
        email = p?.email ?? null;
      }
      if (isThuthukaEmail(email)) throw new Error(THUTHUKA_ADMIN_BLOCKED);
    }
    const { data: row, error } = await supabaseAdmin
      .from("pending_approvals")
      .insert({
        action_type: data.action === "grant" ? "role_grant" : "role_revoke",
        payload: data,
        reason: data.reason,
        requested_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await notifyNewApprovalRequest(
      data.action === "grant" ? "Grant admin role" : "Revoke admin role",
      data.reason,
      context.claims?.email ?? "an admin",
    );
    return { ok: true, approval_id: row.id };
  });

export const requestDeleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => deleteMemberSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("pending_approvals")
      .insert({
        action_type: "member_delete",
        payload: data,
        reason: data.reason,
        requested_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await notifyNewApprovalRequest("Delete member", data.reason, context.claims?.email ?? "an admin");
    return { ok: true, approval_id: row.id };
  });

export const updateMemberEmailSchema = z.object({
  user_id: z.string().uuid(),
  new_email: z.string().trim().email(),
  reason: z.string().trim().min(5).max(500),
});

/**
 * Changes a member's login email (auth.users + profiles, kept in sync).
 * Goes through the same two-admin approval flow as a role change or member
 * deletion rather than executing immediately like a password reset — unlike
 * access recovery, this changes who the account *is* (where future password
 * resets and login go), so a single admin acting alone is the wrong bar here.
 */
export async function executeUpdateMemberEmail(
  supabaseAdmin: any,
  data: z.infer<typeof updateMemberEmailSchema>,
  actor: { userId: string; email: string | null },
) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", data.user_id)
    .maybeSingle();
  if (!profile) throw new Error("Member not found");

  const newEmail = data.new_email.trim().toLowerCase();

  const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
    email: newEmail,
    email_confirm: true,
  });
  if (authErr) throw new Error(authErr.message);

  const { error: profileErr } = await supabaseAdmin
    .from("profiles")
    .update({ email: newEmail })
    .eq("id", data.user_id);
  if (profileErr) throw new Error(profileErr.message);

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actor.userId,
    actor_email: actor.email,
    action: "member_email_update",
    target_type: "profile",
    target_id: data.user_id,
    reason: data.reason,
    details: { old_email: profile.email, new_email: newEmail },
  });

  return { ok: true, old_email: profile.email as string | null, new_email: newEmail };
}

export const requestUpdateMemberEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => updateMemberEmailSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("pending_approvals")
      .insert({
        action_type: "member_email_update",
        payload: data,
        reason: data.reason,
        requested_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await notifyNewApprovalRequest("Update member email", data.reason, context.claims?.email ?? "an admin");
    return { ok: true, approval_id: row.id };
  });

export const requestDeleteApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => deleteApplicationSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("pending_approvals")
      .insert({
        action_type: "application_delete",
        payload: data,
        reason: data.reason,
        requested_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await notifyNewApprovalRequest("Delete application", data.reason, context.claims?.email ?? "an admin");
    return { ok: true, approval_id: row.id };
  });

export const requestDeleteLoaRpaSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => deleteLoaRpaSubmissionSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("pending_approvals")
      .insert({
        action_type: "loa_rpa_submission_delete",
        payload: data,
        reason: data.reason,
        requested_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await notifyNewApprovalRequest("Delete LOA/RPA submission", data.reason, context.claims?.email ?? "an admin");
    return { ok: true, approval_id: row.id };
  });

// --- Advisor account bootstrap ----------------------------------------------
// Creating a brand-new ThuthukaSA login is a one-time bootstrap, not a
// promotion of an existing member — there's no existing advisor around to be
// the "different admin" the two-person approval flow needs, so this runs
// immediately once an admin confirms it (still logged to audit_logs).
// Granting advisor to anyone ELSE afterwards still goes through
// requestSetUserRole above, which does require that second approval.

export const createAdvisorAccountSchema = z.object({
  email: emailField(),
  fullName: z.string().trim().min(1).max(200),
});

function generateTempPassword() {
  // 24 random bytes, base64url — well past any Supabase password policy,
  // no ambiguous characters to misread when relaying it by phone/WhatsApp.
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "A").replace(/\//g, "b").replace(/=+$/, "") + "!9";
}

async function assertNoExistingAccount(supabaseAdmin: any, email: string) {
  const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) {
    throw new Error("An account with this email already exists — use “Grant advisor” instead of creating a new one.");
  }
}

// Shared by both "a temp password was just issued" paths (new account, or
// reset on an existing one): force a real password on next login, and log it.
async function finishPasswordIssuance(
  supabaseAdmin: any,
  userId: string,
  actor: { userId: string; email: string | null },
  action: string,
  reason: string,
  details: Record<string, unknown>,
) {
  await supabaseAdmin.from("profiles").update({ force_password_change: true }).eq("id", userId);
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actor.userId,
    actor_email: actor.email,
    action,
    target_type: action === "account_password_reset" ? "profile" : "user_role",
    target_id: userId,
    reason,
    details,
  });
}

/**
 * Runs at approval time (see admin-approvals.functions.ts) — creates the
 * account, grants 'advisor', and emails the new advisor a link to choose
 * their own password. Nobody ever sees or relays a temp password: that
 * hand-off (approver → requester → new advisor, over WhatsApp) is where
 * logins kept getting lost. The random password set here is never shown.
 */
export async function executeAdvisorAccountBootstrap(
  supabaseAdmin: any,
  data: z.infer<typeof createAdvisorAccountSchema>,
  actor: { userId: string; email: string | null },
) {
  const email = data.email.trim().toLowerCase();
  await assertNoExistingAccount(supabaseAdmin, email);

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: generateTempPassword(),
    email_confirm: true,
    user_metadata: { full_name: data.fullName },
  });
  if (createErr || !created.user) throw new Error(createErr?.message ?? "Could not create account");
  const userId = created.user.id;

  // The on_auth_user_created trigger already inserted a profiles row and a
  // 'member' role — fill in the name and layer 'advisor' on top (additive;
  // 'member' staying alongside it is harmless).
  await supabaseAdmin.from("profiles").update({ full_name: data.fullName }).eq("id", userId);
  const { error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role: "advisor" }, { onConflict: "user_id,role" });
  if (roleErr) throw new Error(roleErr.message);

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actor.userId,
    actor_email: actor.email,
    action: "advisor_account_bootstrap",
    target_type: "user_role",
    target_id: userId,
    reason: "ThuthukaSA advisor account creation, approved",
    details: { role: "advisor", target_email: email },
  });

  const { sendSetPasswordEmail } = await import("./auth-email.server");
  const emailSent = (await sendSetPasswordEmail(supabaseAdmin, email, "advisor_welcome", data.fullName)).ok;
  const { notifyThuthukaTeam } = await import("./email.server");
  await notifyThuthukaTeam("New team member account created", [
    `${data.fullName} (${email}) now has a ThuthukaSA dashboard account.`,
    emailSent
      ? "They've been emailed a link to set their password and sign in."
      : "We couldn't email them automatically — ask them to use “Forgot password?” on the sign-in page.",
  ]);

  return { ok: true, user_id: userId, email, emailSent };
}

/**
 * ThuthukaSA can request a new colleague's account for themselves (self-
 * service, no A-Win admin needed to be the one typing it in) — but creating
 * a live login is still sensitive enough that it goes through the same
 * two-person approval as any other privileged change, same as granting
 * advisor access to an existing account below. The temp password only gets
 * minted once an admin approves (see executeAdvisorAccountBootstrap) — the
 * approving admin relays it to whoever requested the account.
 */
export const createAdvisorAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => createAdvisorAccountSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdminOrAdvisor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await assertNoExistingAccount(supabaseAdmin, data.email);

    const { data: row, error } = await supabaseAdmin
      .from("pending_approvals")
      .insert({
        action_type: "advisor_account_bootstrap",
        payload: data,
        reason: `New ThuthukaSA advisor account for ${data.email}`,
        requested_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await notifyNewApprovalRequest("Create ThuthukaSA advisor account", `New account for ${data.email}`, context.claims?.email ?? "ThuthukaSA");
    return { ok: true, approval_id: row.id };
  });

export const advisorRoleChangeSchema = z.object({
  email: emailField(),
  action: z.enum(["grant", "revoke"]),
  reason: z.string().trim().min(5).max(500),
});

/**
 * Narrow version of requestSetUserRole for ThuthukaSA's own self-service —
 * the role is hardcoded to 'advisor' server-side (never trusts a client-
 * supplied role), so this can safely accept an advisor caller as well as an
 * admin, unlike the general role-change request which can also touch the
 * admin role and must stay admin-only.
 */
export const requestAdvisorRoleChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => advisorRoleChangeSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdminOrAdvisor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { email: data.email, role: "advisor" as const, action: data.action, reason: data.reason };
    const { data: row, error } = await supabaseAdmin
      .from("pending_approvals")
      .insert({
        action_type: data.action === "grant" ? "role_grant" : "role_revoke",
        payload,
        reason: data.reason,
        requested_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await notifyNewApprovalRequest(
      data.action === "grant" ? "Grant ThuthukaSA advisor access" : "Revoke ThuthukaSA advisor access",
      data.reason,
      context.claims?.email ?? "ThuthukaSA",
    );
    return { ok: true, approval_id: row.id };
  });

// --- Password reset (existing account) --------------------------------------
// For an account that's already live but locked out / needs rotating — e.g.
// ThuthukaSA's shared inbox login. Same immediate-execute + audit-log
// treatment as the bootstrap above: it's operational access recovery, not a
// role/data change, so it doesn't need a second admin's approval either.

export const resetAccountPasswordSchema = z.object({
  user_id: z.string().uuid(),
});

export const resetAccountPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => resetAccountPasswordSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("id", data.user_id)
      .maybeSingle();
    if (!profile) throw new Error("Account not found");

    const tempPassword = generateTempPassword();
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: tempPassword,
    });
    if (updateErr) throw new Error(updateErr.message);

    await finishPasswordIssuance(
      supabaseAdmin,
      data.user_id,
      { userId: context.userId, email: context.claims?.email ?? null },
      "account_password_reset",
      "Admin-triggered password reset",
      { target_email: profile.email },
    );

    return { ok: true, email: profile.email as string | null, tempPassword };
  });

// --- ThuthukaSA team self-service (one form, no guessing) --------------------
// ThuthukaSA used to have to pick between "Create account" and "Grant advisor"
// depending on whether the colleague already had a website login — which they
// had no way of knowing. This single entry point decides for them.

export const addAdvisorTeamMemberSchema = z.object({
  email: emailField(),
  fullName: z.string().trim().min(1).max(200),
});

export const requestAddAdvisorTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => addAdvisorTeamMemberSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdminOrAdvisor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const requester = context.claims?.email ?? "ThuthukaSA";

    const { data: dup } = await supabaseAdmin
      .from("pending_approvals")
      .select("id")
      .eq("status", "pending")
      .in("action_type", ["advisor_account_bootstrap", "role_grant"])
      .eq("payload->>email", data.email)
      .limit(1);
    if (dup && dup.length > 0) throw new Error(`There's already a pending request for ${data.email} — waiting on an A-Win admin to approve it.`);

    const { data: profile } = await supabaseAdmin.from("profiles").select("id").eq("email", data.email).maybeSingle();
    let mode: "new_account" | "existing_account";
    if (profile) {
      const { data: hasAdvisor } = await supabaseAdmin.rpc("has_role", { _user_id: profile.id, _role: "advisor" });
      if (hasAdvisor) throw new Error(`${data.email} already has access. If they can't sign in, use “Resend login email” next to their name.`);
      const reason = `Add ${data.fullName} to the ThuthukaSA team (existing website account)`;
      const { error } = await supabaseAdmin.from("pending_approvals").insert({
        action_type: "role_grant",
        payload: { email: data.email, role: "advisor", action: "grant", reason },
        reason,
        requested_by: context.userId,
      });
      if (error) throw new Error(error.message);
      await notifyNewApprovalRequest("Grant ThuthukaSA advisor access", `${data.fullName} (${data.email})`, requester);
      mode = "existing_account";
    } else {
      const { error } = await supabaseAdmin.from("pending_approvals").insert({
        action_type: "advisor_account_bootstrap",
        payload: { email: data.email, fullName: data.fullName },
        reason: `New ThuthukaSA advisor account for ${data.email}`,
        requested_by: context.userId,
      });
      if (error) throw new Error(error.message);
      await notifyNewApprovalRequest("Create ThuthukaSA advisor account", `New account for ${data.fullName} (${data.email})`, requester);
      mode = "new_account";
    }

    const { notifyThuthukaTeam } = await import("./email.server");
    await notifyThuthukaTeam("Team member requested", [
      `${requester} asked for ${data.fullName} (${data.email}) to be given dashboard access.`,
      "An A-Win admin needs to approve it. As soon as they do, the new team member is emailed a link to set their password — nobody needs to pass on a password.",
    ]);
    return { ok: true, mode };
  });

/**
 * Who's on the ThuthukaSA team, whether they've ever signed in, and which
 * requests are still waiting on A-Win — so "is she set up yet?" never needs
 * a WhatsApp thread to answer.
 */
export const listAdvisorTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdminOrAdvisor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "advisor");
    const ids = (roles ?? []).map((r: any) => r.user_id);
    const members = await Promise.all(
      ids.map(async (id: string) => {
        const [{ data: p }, { data: u }] = await Promise.all([
          supabaseAdmin.from("profiles").select("email, full_name").eq("id", id).maybeSingle(),
          supabaseAdmin.auth.admin.getUserById(id),
        ]);
        return {
          email: (p?.email ?? u?.user?.email ?? "") as string,
          fullName: (p?.full_name ?? null) as string | null,
          lastSignInAt: (u?.user?.last_sign_in_at ?? null) as string | null,
        };
      }),
    );
    const { data: pending } = await supabaseAdmin
      .from("pending_approvals")
      .select("payload, requested_at, action_type")
      .eq("status", "pending")
      .in("action_type", ["advisor_account_bootstrap", "role_grant"])
      .order("requested_at", { ascending: false });
    return {
      members: members.filter((m) => m.email).sort((a, b) => a.email.localeCompare(b.email)),
      pending: (pending ?? [])
        .filter((r: any) => r.action_type === "advisor_account_bootstrap" || r.payload?.role === "advisor")
        .map((r: any) => ({ email: r.payload?.email as string, fullName: (r.payload?.fullName ?? null) as string | null, requestedAt: r.requested_at as string })),
    };
  });

/**
 * Re-send the "set your password" email to an existing team member. Safe to
 * let any advisor trigger: the link only ever goes to that person's own
 * inbox, and it's limited to accounts that already have advisor access.
 */
export const resendAdvisorLoginEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ email: emailField() }).parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdminOrAdvisor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rateLimitOk } = await import("./email.server");
    if (!(await rateLimitOk(`advisor-resend:${data.email}`, 5, 3600))) throw new Error("Already sent several times this hour — check spam/junk, or try again later");
    const { data: profile } = await supabaseAdmin.from("profiles").select("id").eq("email", data.email).maybeSingle();
    if (!profile) throw new Error("No account with that email");
    const { data: hasAdvisor } = await supabaseAdmin.rpc("has_role", { _user_id: profile.id, _role: "advisor" });
    if (!hasAdvisor) throw new Error("That account isn't on the ThuthukaSA team");
    await supabaseAdmin.auth.admin.updateUserById(profile.id, { email_confirm: true });
    const { sendSetPasswordEmail } = await import("./auth-email.server");
    const sent = await sendSetPasswordEmail(supabaseAdmin, data.email, "advisor_access");
    if (!sent.ok) throw new Error("Couldn't send the email right now — ask them to use “Forgot password?” on the sign-in page");
    return { ok: true };
  });

/**
 * "Did it work?" button for ThuthukaSA's notification list — emails every
 * current recipient right now, so a typo'd or spam-filtered address shows up
 * immediately instead of when the next LOA quietly doesn't arrive.
 */
export const sendTestThuthukaNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdminOrAdvisor(context);
    const { rateLimitOk, getThuthukaRecipients, sendEmail } = await import("./email.server");
    if (!(await rateLimitOk(`tksa-test:${context.userId}`, 5, 3600))) throw new Error("Test already sent several times this hour — try again later");
    const { tksaTeamNoticeEmail } = await import("./email-templates.server");
    const { emails } = await getThuthukaRecipients();
    const mail = tksaTeamNoticeEmail("Test notification", [
      "This is a test from the ThuthukaSA dashboard. If you're reading this, this address will receive alerts for new LOA / Risk Profile submissions and team changes.",
    ]);
    const results = await Promise.all(emails.map(async (to) => ({ to, ok: (await sendEmail({ to, toName: "ThuthukaSA", ...mail })).ok })));
    return { sent: results.filter((r) => r.ok).map((r) => r.to), failed: results.filter((r) => !r.ok).map((r) => r.to) };
  });
