#!/usr/bin/env node
/**
 * Mirror Lovable CDN assets into the public `gallery` Supabase bucket and
 * rewrite team_members image URLs to the mirrored public URLs.
 *
 *   node scripts/mirror-lovable-assets.mjs
 *
 * Requires: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
 * (uploads run as the signed-in admin via the gallery storage policy —
 *  no service role key needed).
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SUPABASE_URL = process.env.SUPABASE_URL;
const PUB = process.env.SUPABASE_PUBLISHABLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@awin.test";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!SUPABASE_URL || !PUB || !ADMIN_PASSWORD) {
  console.error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / ADMIN_PASSWORD");
  process.exit(1);
}

const LOVABLE_ORIGIN = "https://5760c83b-7855-482e-a4eb-106a6d59880f.lovableproject.com";
const BUCKET = "gallery";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsRoot = path.resolve(__dirname, "../src/assets");

const sb = createClient(SUPABASE_URL, PUB, { auth: { persistSession: false } });
const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
});
if (authErr) {
  console.error("admin sign-in failed:", authErr.message);
  process.exit(1);
}
console.log("signed in as", auth.user.email);

// Collect all *.asset.json stubs
const stubs = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".asset.json")) stubs.push(p);
  }
})(assetsRoot);
console.log(`${stubs.length} asset stubs found`);

const publicUrl = (key) => `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`;
const urlMap = {}; // lovable url -> public url

let uploaded = 0, skipped = 0, failed = 0;
for (const stubPath of stubs) {
  const stub = JSON.parse(fs.readFileSync(stubPath, "utf8"));
  const rel = path.relative(assetsRoot, stubPath).replace(/\\/g, "/");
  const key = `assets/${rel.replace(/\.asset\.json$/, "")}`;

  // Skip if already uploaded (HEAD the public URL)
  const head = await fetch(publicUrl(key), { method: "HEAD" });
  if (head.ok) {
    urlMap[stub.url] = publicUrl(key);
    skipped++;
    continue;
  }

  const res = await fetch(LOVABLE_ORIGIN + stub.url);
  if (!res.ok) {
    console.error(`  FETCH ${res.status} ${stub.url}`);
    failed++;
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const { error: upErr } = await sb.storage.from(BUCKET).upload(key, buf, {
    contentType: stub.content_type || "application/octet-stream",
    upsert: true,
  });
  if (upErr) {
    console.error(`  UPLOAD ${key}: ${upErr.message}`);
    failed++;
    continue;
  }
  urlMap[stub.url] = publicUrl(key);
  uploaded++;
  console.log(`  ✓ ${key} (${(buf.length / 1024).toFixed(0)} KB)`);
}
console.log(`uploaded=${uploaded} skipped=${skipped} failed=${failed}`);

// Rewrite team_members rows still pointing at /__l5e/ paths
const { data: members, error: memErr } = await sb
  .from("team_members")
  .select("id, photo_url, profile_card_url");
if (memErr) {
  console.error("read team_members:", memErr.message);
  process.exit(1);
}
let updated = 0;
for (const m of members ?? []) {
  const patch = {};
  for (const col of ["photo_url", "profile_card_url"]) {
    const v = m[col];
    if (v && v.startsWith("/__l5e/") && urlMap[v]) patch[col] = urlMap[v];
  }
  if (Object.keys(patch).length) {
    const { error } = await sb.from("team_members").update(patch).eq("id", m.id);
    if (error) console.error(`  update ${m.id}: ${error.message}`);
    else updated++;
  }
}
console.log(`team_members rows updated: ${updated}`);
process.exit(failed > 0 ? 1 : 0);
