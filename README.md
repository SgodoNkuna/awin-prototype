# A-WIN — African Women Investment Network

The official website and member platform for A-WIN. Public marketing site, member
portal, and admin console in one app.

**Stack:** TanStack Start (React 19 + Vite) · Supabase (Postgres, Auth, Storage) ·
Nitro server · deployed on Vercel · transactional email via Zoho ZeptoMail.

## Local development

Requires [Bun](https://bun.sh).

```bash
bun install
bun dev          # http://localhost:8080
bun run build    # production build
bun test         # vitest suite
```

Copy `.env` and fill in the Supabase + Zoho values before running (see **Environment** below).

## Project layout

- `src/routes/` — file-based routes (TanStack Router)
- `src/routes/api/public/` — webhook + public API endpoints
- `src/components/` — `site/` (public), `portal/`, `admin/`, `ui/` (shadcn)
- `src/lib/*.functions.ts` — `createServerFn` RPCs (ship to client — no secrets)
- `src/lib/*.server.ts` — server-only helpers (service-role Supabase, PayFast, email)
- `src/integrations/supabase/` — client, server client, auth middleware
- `supabase/migrations/` — database schema (apply in order)
- `scripts/` — seeding, mirroring and preflight utilities
- `tests/` — vitest + Testing Library
- `docs/DEPLOYMENT_CHECKLIST.md` — full go-live checklist

## Environment

Public (safe to expose, `VITE_` prefixed):

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`

Server-only:

- `SUPABASE_URL`, `SUPABASE_PROJECT_ID`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ZOHO_ZEPTOMAIL_TOKEN`, `ZOHO_MAIL_FROM`, `ZOHO_MAIL_FROM_NAME` — transactional email
- `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_SANDBOX` — card payments (optional)

Never commit `.env`. On Vercel these live in **Project Settings → Environment Variables**.

## Deploying to Vercel

The repo ships pre-configured. Vercel builds with `NITRO_PRESET=vercel npm run build`
(see `vercel.json`), producing the Vercel Build Output. Add the environment variables
above, then deploy. Google OAuth and the PayFast ITN webhook are configured in their
respective dashboards — see `docs/DEPLOYMENT_CHECKLIST.md`.

## Admin

Sign in at `/auth`, then `/admin`. Admins can edit site content, membership tiers,
banking details, FAQ and contact info, manage members/applications/events, review the
EFT queue, and export a screenshot runbook — all without a redeploy.
