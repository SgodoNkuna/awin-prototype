#!/usr/bin/env node
/**
 * Deployment preflight: verifies migrations, triggers, RLS policies, storage
 * policies, and required buckets are present on the target Supabase project
 * before Vercel goes live.
 *
 *   node scripts/preflight.mjs
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. Exits non-zero on any
 * missing/misconfigured item so it can gate a Vercel deploy in CI.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`);
};

// Small helper to run raw SQL via PostgREST rpc if a project ships a `sql` fn.
// We don't rely on it; instead use pg_catalog reads via supabase-js's rest layer
// which allows selecting from information_schema/pg_catalog when RLS is off.
async function q(sql, params = {}) {
  const { data, error } = await sb.rpc("_preflight_exec", { q: sql, p: params }).catch(() => ({
    data: null,
    error: { message: "no _preflight_exec rpc" },
  }));
  if (!error) return data;
  // Fallback: use direct PostgREST endpoints for known objects we care about.
  return null;
}

// --- 1. Required env vars for the runtime ---
const REQUIRED_RUNTIME_ENV = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
];
for (const name of REQUIRED_RUNTIME_ENV) {
  check(`env: ${name}`, !!process.env[name]);
}

// --- 2. Required buckets ---
const REQUIRED_BUCKETS = ["member-portfolios", "onboarding-uploads"];
{
  const { data: buckets, error } = await sb.storage.listBuckets();
  if (error) check("storage.listBuckets", false, error.message);
  else {
    const names = new Set((buckets ?? []).map((b) => b.name));
    for (const b of REQUIRED_BUCKETS) {
      check(`bucket exists: ${b}`, names.has(b));
      const bucket = buckets?.find((x) => x.name === b);
      if (bucket) check(`  bucket ${b} is private`, bucket.public === false, `public=${bucket.public}`);
    }
  }
}

// --- 3. Required tables (probe via a HEAD select) ---
const REQUIRED_TABLES = [
  "team_members",
  "user_roles",
  "applications",
  "portfolio_items",
  "site_settings",
  "events",
  "news",
];
for (const t of REQUIRED_TABLES) {
  const { error } = await sb.from(t).select("*", { count: "exact", head: true });
  check(`table reachable: public.${t}`, !error, error?.message);
}

// --- 4. has_role() RPC ---
{
  const { data, error } = await sb.rpc("has_role", {
    _user_id: "00000000-0000-0000-0000-000000000000",
    _role: "admin",
  });
  check("rpc has_role() callable", !error, error?.message ?? `returned ${data}`);
}

// --- 5. RLS enabled on user_roles + team_members (via a client without service key would 401 on write) ---
// We assert migrations reference RLS by scanning the SQL files.
const migDir = path.resolve(__dirname, "../supabase/migrations");
const sql = fs
  .readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => fs.readFileSync(path.join(migDir, f), "utf8"))
  .join("\n")
  .toLowerCase();

const rlsChecks = [
  ["RLS on public.user_roles", /alter\s+table[^;]*user_roles[^;]*enable\s+row\s+level\s+security/],
  ["RLS on public.team_members", /alter\s+table[^;]*team_members[^;]*enable\s+row\s+level\s+security/],
  ["RLS on public.portfolio_items", /alter\s+table[^;]*portfolio_items[^;]*enable\s+row\s+level\s+security/],
  ["GRANT select on user_roles to authenticated", /grant\s+select\s+on\s+public\.user_roles\s+to\s+authenticated/],
  ["storage policy: member_portfolios_admin_all", /member_portfolios_admin_all/],
  ["storage policy: onboarding_owner_insert", /onboarding_owner_insert/],
  ["trigger or function has_role", /function\s+public\.has_role/],
];
for (const [name, re] of rlsChecks) check(name, re.test(sql));

// --- 6. Seeded dummy accounts exist ---
{
  const { data, error } = await sb.auth.admin.listUsers();
  if (error) check("auth.admin.listUsers", false, error.message);
  else {
    const emails = new Set((data.users ?? []).map((u) => u.email));
    check("dummy: admin@awin.test", emails.has("admin@awin.test"));
    check("dummy: member@awin.test", emails.has("member@awin.test"));
  }
}

// --- Summary ---
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} preflight checks passed`);
if (failed.length) {
  console.log("\nFailed:");
  for (const f of failed) console.log(` - ${f.name}${f.detail ? " — " + f.detail : ""}`);
  process.exit(1);
}
process.exit(0);
