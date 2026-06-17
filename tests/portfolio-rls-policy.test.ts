/**
 * Regression: verifies the database migration that introduced `portfolio_items`
 * enforces admin-only writes via RLS. We assert the policy SQL text exists in
 * the migration file, so a refactor that loosens the policies trips the test.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.resolve(__dirname, "../supabase/migrations");

function readMigrations(): string {
  if (!fs.existsSync(migrationsDir)) return "";
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => fs.readFileSync(path.join(migrationsDir, f), "utf8"))
    .join("\n---\n");
}

describe("portfolio_items RLS policies (regression)", () => {
  const sql = readMigrations().toLowerCase();

  it("creates the portfolio_items table", () => {
    expect(sql).toMatch(/create table[\s\S]+public\.portfolio_items/);
  });

  it("enables row level security on portfolio_items", () => {
    expect(sql).toMatch(/alter table[\s\S]+portfolio_items[\s\S]+enable row level security/);
  });

  it("restricts INSERT to admins via has_role()", () => {
    expect(sql).toMatch(/policy[^;]*portfolio[^;]*for insert[^;]*has_role\(auth\.uid\(\), 'admin'\)/);
  });

  it("restricts UPDATE to admins via has_role()", () => {
    expect(sql).toMatch(/policy[^;]*portfolio[^;]*for update[^;]*has_role\(auth\.uid\(\), 'admin'\)/);
  });

  it("restricts DELETE to admins via has_role()", () => {
    expect(sql).toMatch(/policy[^;]*portfolio[^;]*for delete[^;]*has_role\(auth\.uid\(\), 'admin'\)/);
  });

  it("allows anonymous SELECT only on published rows", () => {
    expect(sql).toMatch(/policy[^;]*portfolio[^;]*for select[^;]*status\s*=\s*'published'/);
  });

  it("grants SELECT to anon for the public Data API", () => {
    expect(sql).toMatch(/grant select on public\.portfolio_items to anon/);
  });
});
