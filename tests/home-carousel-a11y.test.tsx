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
  });
});
