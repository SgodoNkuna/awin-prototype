import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeSupabaseMock } from "./helpers/supabase-mock";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string } & Record<string, unknown>) => (
    <a href={to} {...rest}>{children}</a>
  ),
}));

const ITEMS = [
  {
    id: "1",
    title: "Thabo Capital",
    slug: "thabo-capital",
    summary: "Boutique advisory helping women build property portfolios across SA.",
    body: "Thabo Capital partners with A-WIN members.",
    cover_image: null,
    social_links: { website: "https://thabo.example", instagram: "https://instagram.com/thabo" },
    status: "published",
    sort_order: 10,
  },
];

let sb = makeSupabaseMock({ data: ITEMS });
vi.mock("@/integrations/supabase/client", () => ({
  get supabase() {
    return sb;
  },
}));

import { PortfolioPage } from "@/routes/portfolio";

beforeEach(() => {
  sb = makeSupabaseMock({ data: ITEMS });
});

describe("Public Portfolio page (regression: quick-view modal)", () => {
  it("renders fetched items in the grid", async () => {
    render(<PortfolioPage />);
    expect(await screen.findByText("Thabo Capital")).toBeInTheDocument();
  });

  it("opens the quick-view dialog with summary, body and social links when a card is clicked", async () => {
    const user = userEvent.setup();
    render(<PortfolioPage />);

    const card = await screen.findByRole("button", { name: /Quick view: Thabo Capital/i });
    await user.click(card);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(await screen.findByText(/Thabo Capital partners with A-WIN members/i)).toBeInTheDocument();
    // Social link buttons render only when URLs exist
    expect(screen.getByRole("link", { name: /Website/i })).toHaveAttribute(
      "href",
      "https://thabo.example",
    );
    expect(screen.getByRole("link", { name: /Instagram/i })).toBeInTheDocument();
  });

  it("filters the grid as the user types in the search box", async () => {
    sb = makeSupabaseMock({
      data: [
        { ...ITEMS[0] },
        { ...ITEMS[0], id: "2", title: "Lerato Ventures", slug: "lerato", summary: "Early-stage fund" },
      ],
    });
    const user = userEvent.setup();
    render(<PortfolioPage />);
    await screen.findByText("Lerato Ventures");

    await user.type(screen.getByLabelText(/Search portfolio/i), "lerato");
    await waitFor(() => {
      expect(screen.queryByText("Thabo Capital")).toBeNull();
      expect(screen.getByText("Lerato Ventures")).toBeInTheDocument();
    });
  });
});
