#!/usr/bin/env node
/**
 * Reset the 5 real committee/admin accounts to one shared temporary password
 * and flag them to force a password change on next sign-in.
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env (loaded from .env).
 *
 *   node scripts/reset-committee-passwords.mjs
 */
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const EMAILS = [
  "admin@awin.co.za",
  "chairman@awin.co.za",
  "info@awin.co.za",
  "secretary@awin.co.za",
  "treasurer@awin.co.za",
];

// One shared temp password for all 5 — must be changed on first login
// (enforced by profiles.force_password_change + the /change-password gate).
const TEMP_PASSWORD = process.env.COMMITTEE_TEMP_PASSWORD || `AWin!Temp#${crypto.randomInt(1000, 9999)}`;

const { data: list, error: listError } = await sb.auth.admin.listUsers({ perPage: 200 });
if (listError) {
  console.error("listUsers failed:", listError.message);
  process.exit(1);
}

for (const email of EMAILS) {
  const existing = list.users.find((u) => u.email?.toLowerCase() === email);
  if (!existing) {
    console.error(`SKIP ${email} — no such user`);
    continue;
  }
  const { error: updError } = await sb.auth.admin.updateUserById(existing.id, {
    password: TEMP_PASSWORD,
  });
  if (updError) {
    console.error(`FAILED ${email}:`, updError.message);
    continue;
  }
  const { error: profError } = await sb
    .from("profiles")
    .update({ force_password_change: true })
    .eq("id", existing.id);
  if (profError) {
    console.error(`  (password set, but flag failed for ${email}):`, profError.message);
    continue;
  }
  console.log(`reset ${email} — must change password on next login`);
}

console.log(`\nShared temp password: ${TEMP_PASSWORD}`);
console.log("Give this to the committee out-of-band (not email/Slack in plaintext). Each account will be forced to set its own new password on next sign-in.");
