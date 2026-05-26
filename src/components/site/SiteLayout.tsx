import { Outlet } from "@tanstack/react-router";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { ScrollToTop } from "./ScrollToTop";

export function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
