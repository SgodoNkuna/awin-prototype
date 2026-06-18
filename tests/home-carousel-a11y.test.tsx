/**
 * A11y regression for the Home page member carousel.
 *
 * Asserts:
 *  - region role + descriptive aria-label
 *  - each slide is labeled "<title>, slide X of Y" for screen readers
 *  - prev/next buttons expose accessible names (icon-only-button trap)
 *  - a polite aria-live region announces the current slide
 *  - card link has its own aria-label (icon-only-link trap)
 *  - focus ring class is applied (visible focus state across all themes —
 *    `ring-ring` is a design token, so contrast follows whichever theme is active)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeSupabaseMock } from "./helpers/supabase-mock";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string } & Record<string, unknown>) => (
    <a href={to} {...rest}>{children}</a>
  ),
}));

const ITEMS = [
  { id: "1", title: "Thabo Capital", slug: "thabo", summary: "Advisory", cover_image: null },
  { id: "2", title: "Lerato Ventures", slug: "lerato", summary: "Fund", cover_image: null },
  { id: "3", title: "Naledi Studio", slug: "naledi", summary: "Design", cover_image: null },
];

let sb = makeSupabaseMock({ data: ITEMS });
vi.mock("@/integrations/supabase/client", () => ({
  get supabase() {
    return sb;
  },
}));

import { PortfolioCarousel } from "@/components/site/PortfolioCarousel";

beforeEach(() => {
  sb = makeSupabaseMock({ data: ITEMS });
});

describe("Home carousel — accessibility regression", () => {
  it("exposes a labelled region with descriptive aria-label", async () => {
    render(<PortfolioCarousel />);
    const region = await screen.findByRole("region", { name: /member portfolio/i });
    expect(region).toBeInTheDocument();
    // The carousel root has its own descriptive label including autoplay/pause behavior
    expect(
      screen.getByLabelText(/auto-rotating.*pauses on hover or keyboard focus/i),
    ).toBeInTheDocument();
  });

  it("labels every slide with its title and position", async () => {
    render(<PortfolioCarousel />);
    expect(await screen.findByLabelText("Thabo Capital, slide 1 of 3")).toBeInTheDocument();
    expect(screen.getByLabelText("Lerato Ventures, slide 2 of 3")).toBeInTheDocument();
    expect(screen.getByLabelText("Naledi Studio, slide 3 of 3")).toBeInTheDocument();
  });

  it("gives prev/next controls accessible names", async () => {
    render(<PortfolioCarousel />);
    await screen.findByText("Thabo Capital");
    expect(screen.getByRole("button", { name: /previous member/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next member/i })).toBeInTheDocument();
  });

  it("gives each card-link an accessible name (no icon-only-link)", async () => {
    render(<PortfolioCarousel />);
    expect(
      await screen.findByRole("link", { name: /view thabo capital in member portfolio/i }),
    ).toBeInTheDocument();
  });

  it("applies focus-visible ring on cards (themed via ring-ring token)", async () => {
    render(<PortfolioCarousel />);
    const link = await screen.findByRole("link", {
      name: /view thabo capital in member portfolio/i,
    });
    expect(link.className).toMatch(/focus-visible:ring/);
    expect(link.className).toMatch(/ring-ring/);
    expect(link.className).toMatch(/focus-visible:ring-offset/);
  });

  it("exposes a polite, atomic aria-live region for the current slide", async () => {
    render(<PortfolioCarousel />);
    await screen.findByText("Thabo Capital");
    const live = document.querySelector('[aria-live="polite"]') as HTMLElement | null;
    expect(live).not.toBeNull();
    expect(live!.getAttribute("aria-atomic")).toBe("true");
    expect(live!.className).toMatch(/sr-only/);
    expect(live!.textContent).toMatch(/Showing Thabo Capital, 1 of 3/);
  });

  it("keeps card links in the natural tab order (no tabindex traps)", async () => {
    render(<PortfolioCarousel />);
    const link = await screen.findByRole("link", {
      name: /view thabo capital in member portfolio/i,
    });
    // No tabindex override means the anchor stays in document order at tabindex=0
    expect(link.getAttribute("tabindex")).toBeNull();
    // Confirm the carousel root is keyboard-reachable as a labelled region
    const region = screen.getByRole("region", { name: /member portfolio/i });
    expect(region).toBeInTheDocument();
  });

  it("supports keyboard activation on cards (Enter triggers the link)", async () => {
    const user = userEvent.setup();
    render(<PortfolioCarousel />);
    const link = (await screen.findByRole("link", {
      name: /view thabo capital in member portfolio/i,
    })) as HTMLAnchorElement;
    const clicked = vi.fn((e: Event) => e.preventDefault());
    link.addEventListener("click", clicked);
    link.focus();
    expect(document.activeElement).toBe(link);
    await user.keyboard("{Enter}");
    expect(clicked).toHaveBeenCalled();
  });

  it("prev/next buttons are keyboard reachable and have visible focus styles", async () => {
    render(<PortfolioCarousel />);
    await screen.findByText("Thabo Capital");
    const prev = screen.getByRole("button", { name: /previous member/i });
    const next = screen.getByRole("button", { name: /next member/i });
    for (const btn of [prev, next]) {
      expect(btn.getAttribute("tabindex")).not.toBe("-1");
      // shadcn Button applies focus-visible:ring via base class — assert it survives our overrides
      expect(btn.className).toMatch(/focus-visible:/);
    }
    prev.focus();
    expect(document.activeElement).toBe(prev);
  });

  // Theme matrix — re-render under each [data-theme] and assert tokens still apply.
  // `ring-ring`, `text-foreground`, `bg-secondary/50` are design tokens that re-bind
  // per theme via CSS variables, so the markup assertion is theme-agnostic; this
  // guards against a future refactor hard-coding a theme-specific color.
  describe.each(["green", "orange", "black", "white"] as const)(
    "under data-theme=%s",
    (theme) => {
      beforeEach(() => {
        document.documentElement.setAttribute("data-theme", theme);
      });
      afterEach(() => {
        document.documentElement.removeAttribute("data-theme");
      });

      it("renders region, slides, and token-based focus ring", async () => {
        render(<PortfolioCarousel />);
        expect(
          await screen.findByRole("region", { name: /member portfolio/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByLabelText("Thabo Capital, slide 1 of 3"),
        ).toBeInTheDocument();
        const link = screen.getByRole("link", {
          name: /view thabo capital in member portfolio/i,
        });
        // Tokens — must not be hard-coded color utilities like text-white / bg-black
        expect(link.className).toMatch(/ring-ring/);
        expect(link.className).not.toMatch(/\b(text|bg|ring)-(white|black|gray|slate|zinc)-\d/);
      });
    },
  );
});
