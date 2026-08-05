import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { ScrollToTop } from "./ScrollToTop";
import { useAuth } from "@/lib/use-auth";

// Routes a user must still be able to reach even while a password change is
// pending — the change-password page itself, and sign-out/auth.
const FORCE_CHANGE_ALLOWLIST = ["/change-password", "/auth"];

function ForcePasswordChangeGate() {
  const { user, loading, forcePasswordChange } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user || !forcePasswordChange) return;
    if (FORCE_CHANGE_ALLOWLIST.includes(location.pathname)) return;
    navigate({ to: "/change-password", replace: true });
  }, [loading, user, forcePasswordChange, location.pathname, navigate]);

  return null;
}

export function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ForcePasswordChangeGate />
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
