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
    // Remember where they were headed so /change-password can return them
    // there afterward, instead of always landing on a generic admin/portal home.
    navigate({ to: "/change-password", search: { next: location.pathname }, replace: true });
  }, [loading, user, forcePasswordChange, location.pathname, navigate]);

  return null;
}

export function SiteLayout() {
  const location = useLocation();
  // ThuthukaSA's dashboard is deliberately not "the A-Win site" — no A-Win
  // nav, no A-Win footer, so it never reads as just another page of the
  // member site. It builds its own header/chrome entirely.
  const bareLayout = location.pathname === "/tksa";

  if (bareLayout) {
    return (
      <>
        <ForcePasswordChangeGate />
        <Outlet />
        <ScrollToTop />
      </>
    );
  }

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
