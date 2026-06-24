# A-WIN

TanStack Start + React 19 + Supabase (Lovable Cloud). Edited inside Lovable, two-way synced to GitHub, deployable to Vercel.

## Deploying to Vercel from GitHub

The project ships pre-configured for Vercel.

1. Push the repo to GitHub (Lovable's GitHub sync does this automatically).
2. In Vercel: **Add New Project → Import** the GitHub repo.
3. Framework Preset: **Other** (auto-detected from `vercel.json`).
4. Build/install/output are read from `vercel.json` — leave the defaults.
5. Add the environment variables below in **Project Settings → Environment Variables**, then **Deploy**.

`vercel.json` runs `NITRO_PRESET=vercel npm run build`. That switches the Nitro target from `cloudflare-module` (used inside Lovable's preview) to `vercel`, producing the Vercel Build Output (`.vercel/output/`) which Vercel deploys as static assets + serverless functions automatically — no extra config needed.

### Required environment variables

Public (safe to expose, must be prefixed `VITE_`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Server-only (used by server functions / webhooks):

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` *(only set if you've provisioned your own Supabase project; not available on Lovable Cloud)*
- `PAYFAST_MERCHANT_ID`
- `PAYFAST_MERCHANT_KEY`
- `PAYFAST_PASSPHRASE`
- `LOVABLE_API_KEY` *(only if you keep Lovable AI calls)*

Copy the `VITE_*` values from `.env` after Lovable provisions Cloud — never commit `.env`.

### Webhooks

PayFast ITN endpoint will be live at:

```
https://<your-vercel-domain>/api/public/payfast/itn
```

Update this in the PayFast dashboard after the first deploy.

### Local development

```bash
bun install
bun dev          # http://localhost:8080
bun run build    # production build (Cloudflare preset by default)
bun test         # vitest suite
```

To reproduce a Vercel build locally:

```bash
NITRO_PRESET=vercel npm run build
# output in .vercel/output/
```

## Project layout

- `src/routes/` – file-based routes (TanStack Router)
- `src/routes/api/public/` – webhook + public API endpoints
- `src/lib/*.functions.ts` – `createServerFn` RPCs
- `src/lib/*.server.ts` – server-only helpers
- `supabase/migrations/` – database schema
- `tests/` – vitest + Testing Library

See `.lovable/plan.md` for the sprint roadmap.
