import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { useLogoTheme } from "@/lib/logo-theme";
import logoColor from "@/assets/awin-logo-color.png";
import logoWhite from "@/assets/awin-logo-white.png";

export function SiteFooter() {
  const year = new Date().getFullYear();
  const { variant } = useLogoTheme();
  // Footer bg is var(--primary). Pick a logo with strong contrast on each theme:
  //   white  → bg is near-white → use the color logo
  //   others → bg is dark/saturated → use the white logo
  const footerLogo = variant === "white" ? logoColor : logoWhite;
  return (
    <footer className="mt-24 border-t-4 border-accent bg-primary text-primary-foreground">
      <div className="container mx-auto grid gap-10 px-4 py-16 md:grid-cols-4 md:px-8">
        <div>
          <Link to="/" aria-label="A-WIN home" className="inline-block">
            <img src={footerLogo} alt="A-WIN" className="h-14 w-auto" />
          </Link>
          <p className="mt-4 text-sm text-primary-foreground/85">
            African Women Investment Network — invest to support women in business.
          </p>
        </div>

        <div>
          <h4 className="font-serif text-base text-accent">Quick Links</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/about" className="text-primary-foreground/80 hover:text-accent">About</Link></li>
            <li><Link to="/membership" className="text-primary-foreground/80 hover:text-accent">Membership</Link></li>
            <li><Link to="/events" className="text-primary-foreground/80 hover:text-accent">Events</Link></li>
            <li><Link to="/portfolio" className="text-primary-foreground/80 hover:text-accent">Portfolio</Link></li>
            <li><Link to="/contact" className="text-primary-foreground/80 hover:text-accent">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif text-base text-accent">Membership</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/membership" className="text-primary-foreground/80 hover:text-accent">Become a Member</Link></li>
            <li><Link to="/membership" className="text-primary-foreground/80 hover:text-accent">Tiers & Benefits</Link></li>
            <li><Link to="/auth" className="text-primary-foreground/80 hover:text-accent">Member Login</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif text-base text-accent">Contact</h4>
          <ul className="mt-4 space-y-3 text-sm text-primary-foreground/80">
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-accent" />
              <span>hello@awin.co.za</span>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 text-accent" />
              <span>+27 (0)11 000 0000</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-accent" />
              <span>Johannesburg, South Africa</span>
            </li>
          </ul>
          <div className="mt-5 flex gap-3">
            <a href="#" aria-label="LinkedIn" className="rounded-full border border-accent/40 p-2 text-accent transition-colors hover:bg-accent hover:text-accent-foreground">
              <Linkedin className="h-4 w-4" />
            </a>
            <a href="#" aria-label="Instagram" className="rounded-full border border-accent/40 p-2 text-accent transition-colors hover:bg-accent hover:text-accent-foreground">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="#" aria-label="Facebook" className="rounded-full border border-accent/40 p-2 text-accent transition-colors hover:bg-accent hover:text-accent-foreground">
              <Facebook className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-primary-foreground/60 md:flex-row md:px-8">
          <p>© {year} A-WIN — African Women in Investment Network. All rights reserved.</p>
          <p>Built by Lusandla Marketing</p>
        </div>
      </div>
    </footer>
  );
}
