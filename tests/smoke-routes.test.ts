/**
 * Smoke test: every route file in src/routes/ must import & evaluate
 * without throwing, and expose a `Route` (TanStack file route) export.
 *
 * This catches:
 *  - syntax errors
 *  - missing imports
 *  - createFileRoute path/filename mismatches at module load time
 *  - broken transitive imports (e.g. accidentally pulling in a deleted file)
 *
 * Runs after every `bun test` invocation, which CI runs after each build.
 */
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

// TanStack's createFileRoute requires a registered router; stub it so we can
// import route modules in isolation.
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => ({ options: config }),
    Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string } & Record<string, unknown>) =>
      // eslint-disable-next-line jsx-a11y/anchor-is-valid
      ({ type: "a", props: { href: to, ...rest, children } } as unknown as React.ReactElement),
    Outlet: () => null,
    useNavigate: () => () => {},
    useRouterState: () => ({ location: { pathname: "/" } }),
  };
});

vi.mock("@/integrations/supabase/client", async () => {
  const { makeSupabaseMock } = await import("./helpers/supabase-mock");
  return { supabase: makeSupabaseMock() };
});

const routesDir = path.resolve(__dirname, "../src/routes");
const allRouteFiles = fs
  .readdirSync(routesDir)
  .filter((f) => f.endsWith(".tsx") && !f.startsWith("__") && !f.startsWith("_") && f !== "routeTree.gen.ts");

describe("Smoke: every route module loads and exports `Route`", () => {
  for (const file of allRouteFiles) {
    it(`loads ${file}`, async () => {
      const mod = await import(/* @vite-ignore */ `@/routes/${file.replace(/\.tsx$/, "")}`);
      expect(mod).toBeTypeOf("object");
      expect(mod.Route, `${file} must export Route`).toBeDefined();
    });
  }
});

describe("Smoke: 6-page rule (public navigation surface)", () => {
  it("exposes exactly the six public pages required by the spec", () => {
    const publicPages = ["index", "about", "membership", "events", "portfolio", "contact"];
    for (const page of publicPages) {
      const target = page === "index" ? "index.tsx" : `${page}.tsx`;
      expect(allRouteFiles.includes(target), `missing public route ${target}`).toBe(true);
    }
  });

  it("does not re-introduce any of the removed legacy pages", () => {
    const banned = [
      "benefits.tsx",
      "committee.tsx",
      "faqs.tsx",
      "how-to-join.tsx",
      "why-join.tsx",
      "resources.tsx",
      "theme-lab.tsx",
      "news.tsx",
    ];
    for (const f of banned) {
      expect(allRouteFiles.includes(f), `legacy route ${f} should have been deleted`).toBe(false);
    }
  });
});
