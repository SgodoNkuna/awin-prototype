#!/usr/bin/env node
/**
 * Automated mirror + signed URL check.
 *
 *   node scripts/check-portfolio-mirror.mjs
 *
 * 1. Uploads a small sample PNG to member-portfolios/_healthcheck/sample.png
 * 2. Creates a signed URL
 * 3. Fetches it and verifies bytes match what was uploaded
 * 4. Deletes the sample
 *
 * Exits non-zero on any failure. Safe to run repeatedly.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const BUCKET = "member-portfolios";
const KEY_PATH = "_healthcheck/sample.png";

// 1x1 red PNG
const PNG = Buffer.from(
  "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C63F80F00000101000000FEEF" +
  "00000000049454E44AE426082",
  "hex",
);
const expectedSha = createHash("sha256").update(PNG).digest("hex");

const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const fail = (msg, err) => {
  console.error(`FAIL: ${msg}${err ? " — " + (err.message ?? err) : ""}`);
  process.exit(1);
};

console.log("→ Uploading sample to", `${BUCKET}/${KEY_PATH}`);
const up = await sb.storage.from(BUCKET).upload(KEY_PATH, PNG, {
  contentType: "image/png",
  upsert: true,
});
if (up.error) fail("upload", up.error);

console.log("→ Signing URL");
const signed = await sb.storage.from(BUCKET).createSignedUrl(KEY_PATH, 60);
if (signed.error || !signed.data?.signedUrl) fail("sign", signed.error);
console.log("  signed:", signed.data.signedUrl.slice(0, 80) + "…");

console.log("→ Fetching signed URL");
const res = await fetch(signed.data.signedUrl);
if (!res.ok) fail(`fetch ${res.status}`);
const buf = Buffer.from(await res.arrayBuffer());
const gotSha = createHash("sha256").update(buf).digest("hex");
if (gotSha !== expectedSha) fail(`sha mismatch expected ${expectedSha} got ${gotSha}`);
console.log("  bytes match ✓ (sha256", gotSha.slice(0, 12) + "…)");

console.log("→ Cleaning up");
const rm = await sb.storage.from(BUCKET).remove([KEY_PATH]);
if (rm.error) fail("remove", rm.error);

console.log("OK: mirror + signed URL end-to-end check passed");
