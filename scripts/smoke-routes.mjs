#!/usr/bin/env node
/**
 * Post-deploy smoke test.
 * Usage:
 *   BASE_URL=https://yourdomain.com node scripts/smoke-routes.mjs
 *   node scripts/smoke-routes.mjs http://localhost:3000
 */
const BASE = process.argv[2] || process.env.BASE_URL || "http://localhost:3000";
const ROUTES = [
  { path: "/", critical: true },
  { path: "/about" },
  { path: "/membership" },
  { path: "/events" },
  { path: "/portfolio", critical: true },
  { path: "/contact" },
  { path: "/news" },
  { path: "/team" },
  { path: "/info" },
  { path: "/auth", critical: true },
  { path: "/portal", expect: [200, 302, 401] }, // gated client-side; SSR fine
  { path: "/admin", expect: [200, 302, 401] },
  { path: "/debug/routes" },
];

const results = [];
for (const r of ROUTES) {
  const url = `${BASE}${r.path}`;
  const allowed = r.expect ?? [200];
  try {
    const res = await fetch(url, { redirect: "manual" });
    const ok = allowed.includes(res.status);
    results.push({ path: r.path, status: res.status, ok, critical: !!r.critical });
    console.log(`${ok ? "✓" : "✗"} ${res.status}  ${r.path}`);
  } catch (e) {
    results.push({ path: r.path, status: 0, ok: false, critical: !!r.critical, error: e.message });
    console.log(`✗ ERR  ${r.path}  ${e.message}`);
  }
}

const failed = results.filter((r) => !r.ok);
const fatal = failed.filter((r) => r.critical);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log("\nFailures:");
  for (const f of failed) {
    console.log(`  ${f.path} → ${f.status}${f.error ? ` (${f.error})` : ""}${f.critical ? "  [CRITICAL]" : ""}`);
    if (f.status === 404) console.log(`    Hint: Vercel may be serving static dist/ instead of .vercel/output. Check nitro preset + Vercel "Output Directory" override is BLANK.`);
  }
}
process.exit(fatal.length ? 1 : 0);
