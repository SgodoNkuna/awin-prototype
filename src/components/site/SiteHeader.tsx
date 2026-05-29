import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import logoColor from "@/assets/awin-logo-color.png";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/membership", label: "Membership" },
  { to: "/events", label: "Events" },
  { to: "/news", label: "News" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center" aria-label="A-WIN home">
          <img
            src={logoColor}
            alt="A-WIN — African Women Investment Network"
            className="h-12 w-auto md:h-14"
          />
        </Link>

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
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Member Login</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-accent text-accent-foreground shadow-[var(--shadow-gold-glow)] hover:bg-accent/90"
          >
            <Link to="/membership">Join Now</Link>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] bg-background">
            <SheetTitle className="sr-only">A-WIN navigation</SheetTitle>
            <img src={logoColor} alt="A-WIN" className="h-10 w-auto" />
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
              <Button asChild variant="outline" onClick={() => setOpen(false)}>
                <Link to="/login">Member Login</Link>
              </Button>
              <Button
                asChild
                onClick={() => setOpen(false)}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Link to="/membership">Join Now</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
