## A-WIN Design System & Foundation

### 1. Design tokens — `src/styles.css` (rewrite)
- Map brand hex values to oklch semantic tokens in `:root` and `.dark`:
  - `--background` = #FAF7F1, `--foreground` = #111827
  - `--primary` = #0B1F3A (navy), `--primary-deep`
  - `--accent` = #C9A227 (gold), `--accent-soft`
  - `--muted-foreground` = #4B5563
  - `--destructive` = #DC2626, `--success` = #16A34A
  - `--ring` = gold (focus-visible color)
- Add gradients: `--gradient-hero` (navy → deeper navy), `--gradient-gold`
- Add shadows: `--shadow-elegant`, `--shadow-gold-glow`
- `--radius: 0.75rem`
- Register fonts via `--font-serif: "Playfair Display"` and `--font-sans: "Inter"` in `@theme inline`
- Base layer: smooth scroll, body uses Inter, h1–h5 use Playfair with fluid sizes (H1 56/64, H2 40/48, H3 28/36), gold focus ring, gold selection

### 2. Fonts — `src/routes/__root.tsx`
Add Google Fonts preconnect + stylesheet links in `head().links` for Inter (400/500/600) + Playfair Display (500/700).

### 3. Layout shell — new components
- `src/components/site/SiteHeader.tsx` — sticky top nav, white/blur background with bottom border
  - Left: "A·WIN" wordmark (Playfair) linking to `/`
  - Center (desktop ≥md): Home · About · Membership · Events · News · Contact (TanStack `<Link>` with active gold underline)
  - Right: ghost "Member Login" → `/login`, gold "Join Now" → `/membership`
  - Mobile: `Menu` lucide icon opens shadcn `Sheet` slide-over with the same nav stacked
- `src/components/site/SiteFooter.tsx` — gold top border, 4 columns on md+ (About blurb, Quick Links, Membership tiers list, Contact + social icons via lucide), copyright row
- `src/components/site/ScrollToTop.tsx` — fixed bottom-right button, fades in after `window.scrollY > 300`, gold bg, `ArrowUp` icon
- `src/components/site/SiteLayout.tsx` — wraps `<SiteHeader /> <main><Outlet/></main> <SiteFooter /> <ScrollToTop />`

### 4. Root route — `src/routes/__root.tsx`
- Keep existing QueryClient + shell
- Render `<SiteLayout />` inside `RootComponent`
- Add `<Toaster richColors position="top-right" />` from sonner
- Replace meta defaults with A-WIN org title/description/og
- Add Playfair + Inter font links + Google Fonts preconnect
- Replace `NotFoundComponent` with branded 404 (navy gradient bg, large serif "404", "Page not found", "Back to home" gold button) — keep at root so it inherits the layout

### 5. Homepage placeholder — `src/routes/index.tsx`
Replace the lovable blank-app placeholder with a minimal styled placeholder that proves the design system works (centered card on warm bg, Playfair H1 "A-WIN", Inter subcopy "Foundation ready — homepage arrives in Prompt 02", gold "Become a Member" + ghost "About Us" buttons). Real homepage will be built in Prompt 02.

### 6. Verify
- Confirm `lucide-react` and `sonner` are already installed (they are).
- No new packages needed.
- After write, check console for runtime errors and that nav/footer render across viewports.

### Files touched
- `src/styles.css` (rewrite)
- `src/routes/__root.tsx` (edit)
- `src/routes/index.tsx` (rewrite — placeholder)
- New: `src/components/site/SiteHeader.tsx`, `SiteFooter.tsx`, `SiteLayout.tsx`, `ScrollToTop.tsx`

No DB, no auth, no Supabase yet — those come in Prompt 05.
