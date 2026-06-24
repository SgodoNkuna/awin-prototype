import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

// Lists every TanStack route + reports runtime info. Used to verify
// SSR routing on Vercel/Cloudflare after deploy.
const getRuntimeInfo = createServerFn({ method: "GET" }).handler(async () => {
  return {
    ok: true,
    now: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV ?? null,
    nitroPreset: process.env.NITRO_PRESET ?? null,
    vercel: process.env.VERCEL ? { region: process.env.VERCEL_REGION ?? null, env: process.env.VERCEL_ENV ?? null } : null,
    cloudflare: typeof (globalThis as any).caches !== "undefined" ? { runtime: "workers" } : null,
  };
});

export const Route = createFileRoute("/debug/routes")({
  loader: () => getRuntimeInfo(),
  component: DebugRoutes,
  head: () => ({ meta: [{ title: "Debug Routes | A-WIN" }, { name: "robots", content: "noindex" }] }),
});

const PAGE_ROUTES = [
  "/", "/about", "/membership", "/events", "/portfolio", "/contact",
  "/news", "/team", "/info", "/auth", "/portal",
  "/admin", "/admin/members", "/admin/applications", "/admin/events",
  "/admin/portfolio", "/admin/messages", "/admin/documents",
  "/admin/billing", "/admin/exports", "/admin/settings",
];

const SERVER_HANDLERS = [
  { path: "/api/public/payfast/itn", methods: ["POST"], note: "PayFast ITN webhook" },
];

function DebugRoutes() {
  const info = Route.useLoaderData();
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="font-serif text-3xl">Routing Debug</h1>
        <p className="text-sm text-muted-foreground">Verifies SSR + route discovery on the current deployment.</p>
      </div>
      <section className="rounded-md border bg-card p-4">
        <h2 className="text-sm font-semibold mb-2">Runtime</h2>
        <pre className="text-xs overflow-x-auto">{JSON.stringify(info, null, 2)}</pre>
      </section>
      <section className="rounded-md border bg-card p-4">
        <h2 className="text-sm font-semibold mb-2">Page routes ({PAGE_ROUTES.length})</h2>
        <ul className="grid sm:grid-cols-2 gap-1 text-sm">
          {PAGE_ROUTES.map((p) => (
            <li key={p}><a className="underline hover:text-primary" href={p}>{p}</a></li>
          ))}
        </ul>
      </section>
      <section className="rounded-md border bg-card p-4">
        <h2 className="text-sm font-semibold mb-2">Server handlers</h2>
        <ul className="text-sm space-y-1">
          {SERVER_HANDLERS.map((h) => (
            <li key={h.path}><code>{h.methods.join(",")} {h.path}</code> — {h.note}</li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-muted-foreground"><Link to="/" className="underline">← Home</Link></p>
    </div>
  );
}
