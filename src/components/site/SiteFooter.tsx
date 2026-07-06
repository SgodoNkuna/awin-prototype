import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import logoWhite from "@/assets/awin-logo-white.png";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="mt-24 border-t-4 border-[#E8960A]"
      style={{ background: "#2A6020", color: "#FFFFFF" }}
    >
      <div className="container mx-auto grid gap-10 px-4 py-14 text-center md:grid-cols-4 md:gap-8 md:text-left md:py-16 md:px-8">
        <div className="flex flex-col items-center md:items-start">
          <Link to="/" aria-label="A-WIN home" className="inline-block">
            <img
              src={logoWhite}
              alt="A-WIN — African Women Investment Network"
              className="h-14 w-auto"
            />
          </Link>
          <p className="mt-4 max-w-xs text-sm text-white/85">
            African Women Investment Network — invest to support women in business.
          </p>
        </div>

        <div>
          <h4 className="font-serif text-base text-[#E8960A]">Quick Links</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/about" className="text-white/85 hover:text-[#E8960A]">About</Link></li>
            <li><Link to="/membership" className="text-white/85 hover:text-[#E8960A]">Membership</Link></li>
            <li><Link to="/events" className="text-white/85 hover:text-[#E8960A]">Events</Link></li>
            
            <li><Link to="/news" className="text-white/85 hover:text-[#E8960A]">News &amp; Gallery</Link></li>
            <li><Link to="/members" className="text-white/85 hover:text-[#E8960A]">Our Members</Link></li>
            <li><Link to="/info" className="text-white/85 hover:text-[#E8960A]">FAQ &amp; Privacy</Link></li>
            <li><Link to="/contact" className="text-white/85 hover:text-[#E8960A]">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif text-base text-[#E8960A]">Membership</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/membership" className="text-white/85 hover:text-[#E8960A]">Become a Member</Link></li>
            <li><Link to="/membership" hash="fees" className="text-white/85 hover:text-[#E8960A]">Fees &amp; Benefits</Link></li>
            <li><Link to="/auth" className="text-white/85 hover:text-[#E8960A]">Member Login</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif text-base text-[#E8960A]">Contact</h4>
          <ul className="mt-4 inline-flex flex-col gap-3 text-sm text-white/85 md:flex md:items-start">
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-[#E8960A]" />
              <span>info@awinetwork.co.za</span>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 text-[#E8960A]" />
              <span>+27 12 460 0805</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-[#E8960A]" />
              <span>Pretoria, South Africa</span>
            </li>
          </ul>
          <div className="mt-5 flex justify-center gap-3 md:justify-start">
            <a
              href="https://www.linkedin.com/"
              aria-label="LinkedIn"
              className="rounded-full border border-white/40 p-2 text-white transition-colors hover:bg-[#E8960A] hover:border-[#E8960A] hover:text-white"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <a
              href="https://www.instagram.com/"
              aria-label="Instagram"
              className="rounded-full border border-white/40 p-2 text-white transition-colors hover:bg-[#E8960A] hover:border-[#E8960A] hover:text-white"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://www.facebook.com/"
              aria-label="Facebook"
              className="rounded-full border border-white/40 p-2 text-white transition-colors hover:bg-[#E8960A] hover:border-[#E8960A] hover:text-white"
            >
              <Facebook className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-white/60 md:flex-row md:px-8">
          <p>© {year} A-WIN — African Women Investment Network. All rights reserved.</p>
          <p>Built by Lusandla Marketing</p>
        </div>
      </div>
    </footer>
  );
}
