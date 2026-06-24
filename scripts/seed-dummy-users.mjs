#!/usr/bin/env node
/**
 * Create / reset dummy staging accounts.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 *
 *   node scripts/seed-dummy-users.mjs
 *
 * Creates (or rotates passwords for):
 *   admin@awin.test  / Awin!Admin#2026   → admin role
 *   member@awin.test / Awin!Member#2026  → member role
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const USERS = [
  { email: "admin@awin.test",  password: "Awin!Admin#2026",  full_name: "A-WIN Admin",  role: "admin" },
  { email: "member@awin.test", password: "Awin!Member#2026", full_name: "A-WIN Member", role: "member" },
];

for (const u of USERS) {
  const { data: list } = await sb.auth.admin.listUsers();
  const existing = list?.users?.find((x) => x.email === u.email);
  let userId;
  if (existing) {
    const { error } = await sb.auth.admin.updateUserById(existing.id, {
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });
    if (error) { console.error(u.email, error.message); continue; }
    userId = existing.id;
    console.log(`updated ${u.email}`);
  } else {
    const { data, error } = await sb.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });
    if (error) { console.error(u.email, error.message); continue; }
    userId = data.user.id;
    console.log(`created ${u.email}`);
  }
  await sb.from("user_roles").upsert({ user_id: userId, role: u.role }, { onConflict: "user_id,role" });
  console.log(`  role=${u.role}`);
}

console.log("\nLogins:");
for (const u of USERS) console.log(`  ${u.email}  /  ${u.password}`);
