# Vercel Deployment Checklist — A-WIN

Complete every item before promoting the Vercel project to production. All commands assume you have the Supabase service role key in your shell (never commit it, never paste it into chat).

---

## 1. Vercel Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables** for both **Production** and **Preview**.

### Client-visible (safe to expose)
| Name | Example | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | Same value as `SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Publishable/anon key |
| `VITE_SUPABASE_PROJECT_ID` | `<ref>` | Project ref |

### Server-only (never `VITE_` prefixed)
| Name | Example | Notes |
|---|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` | |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Used by `requireSupabaseAuth` |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` or JWT | Admin operations, storage mirror, purge |
| `SUPABASE_PROJECT_ID` | `<ref>` | |

### PayFast (server-only; wire when going live)
| Name | Example | Notes |
|---|---|---|
| `PAYFAST_MERCHANT_ID` | `10000100` | From PayFast dashboard → Integration |
| `PAYFAST_MERCHANT_KEY` | `46f0cd694581a` | |
| `PAYFAST_PASSPHRASE` | (opaque) | Must match dashboard passphrase exactly |
| `PAYFAST_SANDBOX` | `true` / `false` | `true` while testing, `false` for live |
| `PAYFAST_RETURN_URL` | `https://<domain>/portal?payment=success` | Optional override |
| `PAYFAST_CANCEL_URL` | `https://<domain>/portal?payment=cancelled` | Optional override |
| `PAYFAST_NOTIFY_URL` | `https://<domain>/api/public/payfast/itn` | Must be reachable by PayFast |

Rotate any secret that has been pasted in chat or exposed in a screenshot.

---

## 2. Supabase Project Setup

Run in order against the target project (`epnuglslxavbhzcltgvh` or whichever is live).

1. **Apply migrations** — `supabase db push` (or run each `.sql` under `supabase/migrations/` via SQL Editor in order).
2. **Seed storage buckets** — the migration `2026*_storage_buckets_seed.sql` inserts `member-portfolios` and `onboarding-uploads` idempotently. Confirm in Storage tab.
3. **Seed dummy accounts** — `node scripts/seed-dummy-users.mjs`
4. **Mirror portfolios** — `node scripts/check-portfolio-mirror.mjs`
5. **Run preflight** — `node scripts/preflight.mjs` must exit 0.

### Auth settings (Supabase → Authentication → URL Configuration)
- **Site URL:** `https://<production-domain>`
- **Redirect allow list:** add every domain you deploy to (production, preview `*.vercel.app`, custom domains).
- **Email confirmations:** on for production.
- **Leaked-password check (HIBP):** on.

### Storage buckets
| Bucket | Public? | Policy |
|---|---|---|
| `member-portfolios` | Private | Signed URLs only, admin-only writes |
| `onboarding-uploads` | Private | Owner insert; admin read |

---

## 3. Connectors / Third-party

| Service | Where | Value |
|---|---|---|
| PayFast ITN | PayFast dashboard → Settings → Notify URL | `https://<domain>/api/public/payfast/itn` |
| PayFast Return URL | dashboard | `https://<domain>/portal?payment=success` |
| PayFast Cancel URL | dashboard | `https://<domain>/portal?payment=cancelled` |
| Custom domain (optional) | Vercel → Domains | Add + verify DNS |
| Supabase CORS | Auto | Same-origin server fns need no CORS |

---

## 4. Go-live smoke test (after Vercel deploy)

1. `/` renders hero + members + events with real images.
2. Sign in as `admin@awin.test` → `/admin` loads dashboard.
3. Sign in as `member@awin.test` → `/portal` loads, `/admin` redirects.
4. Onboarding wizard submits + uploads to `onboarding-uploads`.
5. Member card images on `/members` load as signed Supabase URLs (Network tab).
6. PayFast sandbox R200 checkout returns to `/portal?payment=success`.

If any step fails, roll back the Vercel deployment and re-run `scripts/preflight.mjs`.
