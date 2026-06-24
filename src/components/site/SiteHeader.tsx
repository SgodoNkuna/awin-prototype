import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLogoTheme } from "@/lib/logo-theme";
import { useAuth } from "@/lib/use-auth";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/membership", label: "Membership" },
  { to: "/events", label: "Events" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/news", label: "News" },
  { to: "/team", label: "Team" },
  { to: "/info", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { src, filter, cycle, variant } = useLogoTheme();
  const { user, signOut, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-28 items-center justify-between px-4 md:h-32 md:px-8">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center" aria-label="A-WIN home">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                cycle();
              }}
              className="group relative rounded-full p-1 transition-all duration-500 ease-out hover:scale-110 active:scale-95"
              aria-label={`Change theme (current: ${variant}). Click to cycle.`}
              title="Click logo to change theme"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,var(--accent)_0%,transparent_70%)] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-60"
              />
              <img
                src={src}
                alt="A-WIN — African Women Investment Network"
                className="relative h-20 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.15)] transition-all duration-500 ease-out group-hover:drop-shadow-[0_4px_20px_var(--accent)] md:h-24"
                style={filter ? { filter } : undefined}
              />
            </button>
          </Link>
        </div>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="relative text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
              activeProps={{
                className:
                  "text-primary after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-full after:bg-accent",
              }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              {isAdmin && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin">Admin</Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link to="/portal">My Portal</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Member Login</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-accent text-accent-foreground shadow-[var(--shadow-gold-glow)] hover:bg-accent/90"
              >
                <Link to="/membership">Join Now</Link>
              </Button>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] bg-background">
            <SheetTitle className="sr-only">A-WIN navigation</SheetTitle>
            <img src={src} alt="A-WIN" className="h-10 w-auto" style={filter ? { filter } : undefined} />
            <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-3 text-base font-medium text-foreground/90 transition-colors hover:bg-secondary hover:text-primary"
                  activeProps={{ className: "bg-secondary text-primary" }}
                  activeOptions={{ exact: item.to === "/" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6">
              {user ? (
                <>
                  <Button asChild variant="outline" onClick={() => setOpen(false)}>
                    <Link to="/portal">My Portal</Link>
                  </Button>
                  <Button
                    onClick={() => { setOpen(false); signOut(); }}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" onClick={() => setOpen(false)}>
                    <Link to="/auth">Member Login</Link>
                  </Button>
                  <Button
                    asChild
                    onClick={() => setOpen(false)}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    <Link to="/membership">Join Now</Link>
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
