/**
 * Performance regression guards.
 *
 * These are static-analysis style perf tests: rather than measuring wall-clock
 * (which is noisy in CI), they pin the *shape* of the hot paths so a careless
 * edit can't silently degrade them.
 *
 *   1. Documents download path uses a 60s signed URL and one storage call
 *      per click (no N+1 / no re-listing the bucket).
 *
 * (The home "Member Portfolio" carousel this file used to guard was removed
 * 2026-08-06 — it duplicated the "Our Members" strip on the same page and
 * eagerly signed up to 30 members' images with no lazy-loading, measured at
 * 7-13s per image on a live audit. "Our Members" now covers that job alone.)
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

describe("perf regression: portal document download", () => {
  const src = read("src/components/pages/portal-page.tsx");

  it("requests a 60-second signed URL (short-lived, fast to mint)", () => {
    expect(src).toMatch(
      /storage\.from\(["']documents["']\)\.createSignedUrl\([^,]+,\s*60\)/,
    );
  });

  it("makes exactly one createSignedUrl call per download (no listing pre-fetch)", () => {
    const matches = src.match(/createSignedUrl\(/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("does not re-list the documents bucket on every download click", () => {
    // .list() inside the download handler would be an O(N) regression.
    const handlerStart = src.indexOf("const downloadDoc");
    const handlerEnd = src.indexOf("};", handlerStart);
    const handlerBody = src.slice(handlerStart, handlerEnd);
    expect(handlerBody).not.toMatch(/\.list\(/);
  });
});
