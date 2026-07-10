#!/usr/bin/env node
/**
 * End-to-end auth + RLS check.
 *
 *   node scripts/e2e-auth-rls.mjs
 *
 * Requires:
 *   SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY
 * Uses the seeded dummy accounts from scripts/seed-dummy-users.mjs.
 *
 * Verifies:
 *   1. admin@awin.test signs in with password
 *   2. has_role(admin) returns true for admin, false for member
 *   3. RLS: admin can read team_members via authenticated client
 *   4. RLS: member cannot write to team_members
 *   5. Anonymous client can read published portfolio_items only
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const PUB = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!URL || !PUB) {
  console.error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const ADMIN = { email: "admin@awin.test", password: "Awin!Admin#2026" };
const MEMBER = { email: "member@awin.test", password: "Awin!Member#2026" };

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`);
};

const clientFor = (session) =>
  createClient(URL, PUB, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: session ? { headers: { Authorization: `Bearer ${session.access_token}` } } : {},
  });

async function signIn(creds) {
  const c = createClient(URL, PUB, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword(creds);
  if (error) throw new Error(`sign in ${creds.email}: ${error.message}`);
  return { session: data.session, user: data.user };
}

// 1 + 2. Admin sign-in + has_role
const admin = await signIn(ADMIN).catch((e) => (check("admin sign-in", false, e.message), null));
if (admin) {
  check("admin sign-in", true, admin.user.id);
  const c = clientFor(admin.session);
  const { data: isAdmin, error } = await c.rpc("has_role", { _user_id: admin.user.id, _role: "admin" });
  check("has_role(admin, admin) === true", !error && isAdmin === true, error?.message ?? String(isAdmin));

  // 3. Admin can list team_members
  const { data: rows, error: readErr } = await c.from("team_members").select("id").limit(1);
  check("admin reads team_members via RLS", !readErr, readErr?.message ?? `rows=${rows?.length ?? 0}`);
}

// 2b. Member has_role should be false
const member = await signIn(MEMBER).catch((e) => (check("member sign-in", false, e.message), null));
if (member) {
  check("member sign-in", true, member.user.id);
  const c = clientFor(member.session);
  const { data: isAdmin } = await c.rpc("has_role", { _user_id: member.user.id, _role: "admin" });
  check("has_role(member, admin) === false", isAdmin === false, String(isAdmin));

  // 4. Member cannot insert into team_members (RLS)
  const { error: writeErr } = await c
    .from("team_members")
    .insert({ full_name: "RLS Test Injection", category: "Other" });
  check("member INSERT team_members blocked by RLS", !!writeErr, writeErr?.message ?? "no error!");
}

// 5. Anonymous client - only published portfolio_items visible
const anon = createClient(URL, PUB, { auth: { persistSession: false } });
const { data: pubItems, error: anonErr } = await anon
  .from("portfolio_items")
  .select("id, status")
  .limit(50);
if (anonErr) {
  check("anon reads portfolio_items", false, anonErr.message);
} else {
  const allPublished = (pubItems ?? []).every((r) => r.status === "published");
  check("anon sees only published portfolio_items", allPublished, `count=${pubItems?.length ?? 0}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
