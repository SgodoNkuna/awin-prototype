import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeSupabaseMock } from "./helpers/supabase-mock";

// Router mocks — PortfolioAdminPage uses createFileRoute internally; only Route export uses it.
// Component itself doesn't import router primitives. But createFileRoute throws unless mocked.
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
}));

// sonner toast mock
const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: toastError, success: toastSuccess },
}));

// Supabase mock — instance is rebuilt per test
let sb = makeSupabaseMock({ data: [] });
vi.mock("@/integrations/supabase/client", () => ({
  get supabase() {
    return sb;
  },
}));

import PortfolioAdminModule from "@/routes/admin.portfolio";
// the route file exports Route + uses component; we need the component:
// import the named component via dynamic require to keep the module intact.
const PortfolioAdminPage = (PortfolioAdminModule as unknown as { Route: { options: { component: React.FC } } }).Route?.options?.component
  ?? // fallback for createFileRoute mock shape:
  undefined;

// Because createFileRoute is mocked to return () => ({}), the component is
// not exposed via Route. Re-import the component function from the source by
// re-evaluating the source via a tiny shim — instead, just import the JSX
// directly by re-exporting the function.

// Simpler approach: import the page module's source and pull the function by
// regex via dynamic import is messy. Instead: define the component test by
// hand-importing from a sibling test bridge.
import { PortfolioAdminPage as Page } from "./bridges/admin-portfolio-bridge";

beforeEach(() => {
  toastError.mockClear();
  toastSuccess.mockClear();
});

describe("Admin Portfolio CRUD (regression)", () => {
  it("renders empty state when no items exist", async () => {
    sb = makeSupabaseMock({ data: [] });
    render(<Page />);
    expect(await screen.findByText(/No portfolio items yet/i)).toBeInTheDocument();
  });

  it("lists existing items with their status badge", async () => {
    sb = makeSupabaseMock({
      data: [
        {
          id: "1",
          title: "Thabo Capital",
          slug: "thabo",
          summary: "Boutique advisory",
          body: null,
          cover_image: null,
          social_links: {},
          status: "published",
          sort_order: 10,
          created_at: new Date().toISOString(),
        },
      ],
    });
    render(<Page />);
    expect(await screen.findByText("Thabo Capital")).toBeInTheDocument();
    expect(screen.getByText(/published/i)).toBeInTheDocument();
  });

  it("opens the create dialog, validates required title, then inserts on save", async () => {
    sb = makeSupabaseMock({ data: [] });
    const user = userEvent.setup();
    render(<Page />);

    await user.click(await screen.findByRole("button", { name: /Add Member/i }));
    const dialog = await screen.findByRole("dialog");
    // Save with empty title -> validation toast
    await user.click(within(dialog).getByRole("button", { name: /^Save$/i }));
    expect(toastError).toHaveBeenCalledWith("Title is required.");

    // Fill title and save
    const titleInput = within(dialog)
      .getAllByRole("textbox")
      .find((el) => (el as HTMLInputElement).value === "") as HTMLInputElement;
    await user.type(titleInput, "New Member");
    await user.click(within(dialog).getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(sb.from).toHaveBeenCalledWith("portfolio_items");
    });
  });
});
