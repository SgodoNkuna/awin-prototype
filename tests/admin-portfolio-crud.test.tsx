import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeSupabaseMock } from "./helpers/supabase-mock";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
}));

const { toastError, toastSuccess, sbRef } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  sbRef: { current: null as ReturnType<typeof import("./helpers/supabase-mock").makeSupabaseMock> | null },
}));

vi.mock("sonner", () => ({
  toast: { error: toastError, success: toastSuccess },
}));

vi.mock("@/integrations/supabase/client", () => ({
  get supabase() {
    return sbRef.current!;
  },
}));

// Stub confirm() for delete tests
vi.stubGlobal("confirm", () => true);

import { PortfolioAdminPage } from "@/routes/admin.portfolio";

beforeEach(() => {
  toastError.mockClear();
  toastSuccess.mockClear();
  sbRef.current = makeSupabaseMock({ data: [] });
});

describe("Admin Portfolio CRUD (regression)", () => {
  it("renders empty state when no items exist", async () => {
    sbRef.current = makeSupabaseMock({ data: [] });
    render(<PortfolioAdminPage />);
    expect(await screen.findByText(/No portfolio items yet/i)).toBeInTheDocument();
  });

  it("lists existing items with status badge and counts", async () => {
    sbRef.current = makeSupabaseMock({
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
    render(<PortfolioAdminPage />);
    expect(await screen.findByText("Thabo Capital")).toBeInTheDocument();
    expect(screen.getByText(/published/i)).toBeInTheDocument();
    expect(screen.getByText(/1 items/i)).toBeInTheDocument();
  });

  it("validates required title before inserting", async () => {
    sbRef.current = makeSupabaseMock({ data: [] });
    const user = userEvent.setup();
    render(<PortfolioAdminPage />);

    await user.click(await screen.findByRole("button", { name: /Add Member/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^Save$/i }));
    expect(toastError).toHaveBeenCalledWith("Title is required.");
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("inserts a new portfolio_items row when the form is valid", async () => {
    sbRef.current = makeSupabaseMock({ data: [] });
    const user = userEvent.setup();
    render(<PortfolioAdminPage />);

    await user.click(await screen.findByRole("button", { name: /Add Member/i }));
    const dialog = await screen.findByRole("dialog");
    const titleInput = within(dialog).getAllByRole("textbox")[0] as HTMLInputElement;
    await user.type(titleInput, "New Member");
    await user.click(within(dialog).getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(sbRef.current!.from).toHaveBeenCalledWith("portfolio_items");
    });
    expect(toastError).not.toHaveBeenCalledWith("Title is required.");
  });
});
