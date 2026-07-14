/**
 * Performance regression guards.
 *
 * These are static-analysis style perf tests: rather than measuring wall-clock
 * (which is noisy in CI), they pin the *shape* of the hot paths so a careless
 * edit can't silently degrade them.
 *
 *   1. Home carousel query stays narrow + bounded.
 *   2. Documents download path uses a 60s signed URL and one storage call
 *      per click (no N+1 / no re-listing the bucket).
 *   3. Carousel module imports the autoplay plugin once (no per-render init).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

describe("perf regression: home portfolio carousel query", () => {
  const src = read("src/components/site/PortfolioCarousel.tsx");

  it("only selects the columns needed for the card (no `body`, no `*`)", () => {
    expect(src).toMatch(/\.select\(["']id, name, title, category, profile_card_url, photo_url["']/);
    expect(src).not.toMatch(/\.select\(["']\*["']\)/);
    expect(src).not.toMatch(/,\s*body[,"']/);
  });

  it("filters to published items only", () => {
    expect(src).toMatch(/\.eq\(["']published["'],\s*true\)/);
  });

  it("caps results to at most 100 rows", () => {
    const m = src.match(/\.limit\((\d+)\)/);
    expect(m, "carousel must call .limit(N)").not.toBeNull();
    expect(Number(m![1])).toBeLessThanOrEqual(100);
  });

  it("uses Embla Autoplay via a ref so the plugin instance is created once per mount", () => {
    // useRef + Autoplay() — not Autoplay() inline in JSX which would re-init each render.
    expect(src).toMatch(/useRef\(\s*Autoplay\(/);
    // Plugins prop reads from the ref, not a fresh call.
    expect(src).toMatch(/plugins=\{\[autoplayRef\.current\]\}/);
  });
});

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
