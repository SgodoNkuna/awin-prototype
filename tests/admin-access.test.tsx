import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Router mocks — AdminLayout uses Link, Outlet, useNavigate, useRouterState
const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string } & Record<string, unknown>) => (
    <a href={to} {...rest}>{children}</a>
  ),
  Outlet: () => <div data-testid="outlet">PROTECTED CONTENT</div>,
  useNavigate: () => navigate,
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: "/admin" } }),
}));

// useAuth mock — set per test via this object
const authState = {
  user: null as null | { id: string },
  loading: false,
  isAdmin: false,
  signOut: vi.fn(),
};
vi.mock("@/lib/use-auth", () => ({ useAuth: () => authState }));

import { AdminLayout } from "@/components/admin/AdminLayout";

beforeEach(() => {
  navigate.mockClear();
  authState.user = null;
  authState.loading = false;
  authState.isAdmin = false;
});

describe("Admin route gating (regression: only admins reach /admin/portfolio actions)", () => {
  it("redirects unauthenticated visitors to /auth", () => {
    authState.user = null;
    authState.isAdmin = false;
    render(<AdminLayout />);
    expect(navigate).toHaveBeenCalledWith({ to: "/auth", replace: true });
    expect(screen.queryByTestId("outlet")).toBeNull();
  });

  it("redirects signed-in NON-admin members away to /portal", () => {
    authState.user = { id: "user-1" };
    authState.isAdmin = false;
    render(<AdminLayout />);
    expect(navigate).toHaveBeenCalledWith({ to: "/portal", replace: true });
    expect(screen.queryByTestId("outlet")).toBeNull();
  });

  it("renders admin shell ONLY for users with the admin role", () => {
    authState.user = { id: "user-1" };
    authState.isAdmin = true;
    render(<AdminLayout />);
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
    // Sidebar exposes the News & Gallery (portfolio) link only inside the gate
    expect(screen.getAllByRole("link", { name: /News & Gallery/i }).length).toBeGreaterThan(0);
  });

  it("shows a loading state (not the protected outlet) while auth resolves", () => {
    authState.loading = true;
    authState.user = null;
    render(<AdminLayout />);
    expect(screen.queryByTestId("outlet")).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
});
