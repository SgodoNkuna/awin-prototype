import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, LogOut, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLogoTheme } from "@/lib/logo-theme";
import { useAuth } from "@/lib/use-auth";
import logoWhite from "@/assets/awin-logo-white.png";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/membership", label: "Membership" },
  { to: "/events", label: "Events & Gallery" },
  { to: "/members", label: "Our Members" },
  
  { to: "/info", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { src, filter, cycle, variant } = useLogoTheme();
  const { user, signOut, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-24 items-center justify-between px-4 md:h-32 md:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Link to="/" className="flex items-center" aria-label="A-Win home">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); cycle(); }}
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
                alt="A-Win — African Women Investment Network"
                className="relative h-16 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.15)] transition-all duration-500 ease-out group-hover:drop-shadow-[0_4px_20px_var(--accent)] md:h-24"
                style={filter ? { filter } : undefined}
              />
            </button>
          </Link>
        </div>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="relative text-sm font-medium text-foreground/85 transition-colors hover:text-primary"
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
              <Button asChild variant="ghost" size="sm" className="text-foreground hover:text-primary">
                <Link to="/auth">Member Login</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-accent text-white shadow-[var(--shadow-gold-glow)] hover:bg-accent/90"
              >
                <Link to="/membership">Join Now</Link>
              </Button>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-11 w-11 text-foreground"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[300px] border-l-0 p-0 [&>button]:hidden"
            style={{ background: "#3D8B2F", color: "#FFFFFF" }}
          >
            <SheetTitle className="sr-only">A-Win navigation</SheetTitle>
            <div className="flex items-center justify-between px-5 pt-5">
              <img
                src={logoWhite}
                alt="A-Win — African Women Investment Network"
                className="h-12 w-auto"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-full p-2 text-white/85 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8960A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="px-5 pb-4 pt-1 text-[11px] uppercase tracking-widest text-white/70">
              African Women Investment Network
            </p>
            <nav className="flex flex-col px-2" aria-label="Mobile">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 text-base font-medium text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#E8960A]"
                  activeProps={{
                    className: "bg-white/15 text-white border-l-4 border-[#E8960A] pl-3",
                  }}
                  activeOptions={{ exact: item.to === "/" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-6 flex flex-col gap-2 border-t border-white/15 px-4 pt-5">
              {user ? (
                <>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-white/30 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <Link
                    to="/portal"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-white/30 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
                  >
                    My Portal
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setOpen(false); signOut(); }}
                    className="rounded-lg bg-[#E8960A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#C97D08]"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/auth"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-white/30 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Member Login
                  </Link>
                  <Link
                    to="/membership"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-[#E8960A] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#C97D08]"
                  >
                    Join Now
                  </Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
