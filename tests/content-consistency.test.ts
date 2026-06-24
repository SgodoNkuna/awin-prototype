import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Guard against regressions where Home / About / Membership drift apart on
// founding year and the single-tier membership pricing model.
const FOUNDED = "2025";
const ANNUAL_FEE = "R200";
const MONTHLY = "R500";

function read(rel: string) {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

describe("Home / About / Membership content consistency", () => {
  const home = read("src/routes/index.tsx");
  const about = read("src/routes/about.tsx");
  const membership = read("src/components/pages/membership-page.tsx");

  it("all three reference the 2025 founding year", () => {
    expect(home).toMatch(new RegExp(FOUNDED));
    expect(about).toMatch(new RegExp(FOUNDED));
    expect(membership).toMatch(new RegExp(FOUNDED));
  });

  it("all three reference the single annual fee (R200)", () => {
    expect(home).toContain(ANNUAL_FEE);
    expect(about).toContain(ANNUAL_FEE);
    expect(membership).toContain(ANNUAL_FEE);
  });

  it("all three reference the monthly investment commitment (R500)", () => {
    expect(home).toContain(MONTHLY);
    expect(about).toContain(MONTHLY);
    expect(membership).toContain(MONTHLY);
  });

  it("membership page does not reintroduce multi-tier pricing", () => {
    // Old multi-tier labels that must NOT come back.
    expect(membership).not.toMatch(/General Member|Patron Member/);
    expect(membership).not.toMatch(/Membership Tiers/i);
  });

  it("home and membership share the same headline membership model copy", () => {
    expect(home).toContain("One Membership");
    expect(membership).toContain("One Membership");
  });
});
