# A-WIN Rebuild Plan

Full rebuild per signed agreement. Staying on Lovable (Supabase + Cloudflare Workers + custom domain awin.co.za already connected — SSL automatic). Netlify migration skipped per your call.

## Scope clarifications

- **6 pages only**: Home, About, Membership, Events, Portfolio, Contact. Current site has 12+ routes (benefits, committee, faqs, how-to-join, news, news/$slug, resources, why-join, theme-lab). These get **deleted or merged** into the 6.
- **Member portal & admin dashboard** stay (they're "the app", not public pages).
- **Portfolio** is new — replaces News as the showcase. Needs a `portfolio_items` table.
- **Carousel**: Embla (already installed), keyboard-accessible, 100-item capable, inline modal quick-view with social links.
- **Contact map**: Google Maps via Lovable connector.
- **Payments**: Lovable built-in Stripe (membership tiers → checkout).
- **Auth**: Google + email/password. Apple deferred.
- **Tests**: Vitest for unit + a Playwright suite for login / Stripe / admin CRUD.
- **Deliverables**: design tokens doc, component library reference, teaching guide (markdown in `/docs`), handover checklist.

## Sprint breakdown

### Sprint 1 — Auth + cleanup (THIS SESSION)
1. Enable Google sign-in via `configure_social_auth` (keeps email/password).
2. Update `/auth` page to add "Continue with Google" button using the lovable broker.
3. Smoke-test member login end-to-end (preview screenshot + console check).
4. Delete dead routes: `benefits`, `committee`, `faqs`, `how-to-join`, `why-join`, `resources`, `theme-lab`, `news`, `news.$slug`. Fold critical content from how-to-join/why-join/benefits into `/membership`; faqs into `/about`.
5. Update header/footer nav to the 6 pages.
6. Single deliverable URL at session end: current preview.

### Sprint 2 — Portfolio + Home carousel
1. Migration: `portfolio_items` table (title, slug, summary, body, cover_image, social_links jsonb, member_id, status, sort_order) + RLS + admin CRUD route.
2. `/portfolio` index page with filterable grid.
3. Home page Embla carousel: 100-item ready, keyboard nav (arrows/Home/End), aria-roledescription, focus management.
4. Inline modal quick-view (Radix Dialog) with member details + social links.

### Sprint 3 — Payments + Contact map
1. `enable_stripe_payments`, create products for membership tiers via `batch_create_product`.
2. Wire membership page → Stripe checkout → webhook → activate membership in `profiles`.
3. Contact page: Google Maps connector, marker on A-WIN HQ, accessible fallback address.

### Sprint 4 — Design tokens + component library + admin polish
1. Audit & consolidate design tokens in `src/styles.css` (already partially done).
2. Generate `/docs/design-tokens.md` and `/docs/components.md` reference.
3. Admin: confirm CRUD on applications, members, events, portfolio, settings; add audit log of status changes.

### Sprint 5 — Tests + handover
1. Vitest: validation schemas, has_role function shape.
2. Playwright: login (email + Google mock), Stripe checkout sandbox, admin create/update/delete on portfolio.
3. `/docs/teaching-guide.md` — how the client edits content, runs admin, manages members.
4. `/docs/handover-checklist.md` — domain ownership, repo transfer, Stripe live keys, Lovable account transfer steps.
5. Publish to production.

## This session — concrete steps

```text
1. configure_social_auth(providers=["google"])      → enable Google
2. edit src/routes/auth.tsx                          → add Google button via lovable.auth.signInWithOAuth
3. delete unused route files + update nav            → 6 pages only
4. browser screenshot of /auth + /portal             → confirm login works
```

## Technical notes (skip if non-technical)

- Carousel: `embla-carousel-react` is already a dep; add `embla-carousel-autoplay` only if you want auto-rotation.
- Quick-view modal uses shadcn `Dialog` so focus trap + ESC + aria are free.
- Stripe webhook → `src/routes/api/public/webhooks/stripe.ts` server route with HMAC verify.
- Portfolio social_links stored as `{ instagram?: string, linkedin?: string, twitter?: string, website?: string }`.
- Tests will not run on Lovable preview infra; they'll run locally / in CI you set up post-handover.

Approve and I'll execute Sprint 1 immediately.
