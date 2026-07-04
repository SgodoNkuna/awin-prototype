import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Youtube, Mail, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoWhite from "@/assets/awin-logo-white.png";

type Contact = { email: string; phone: string; location: string };
type Social = { linkedin: string; instagram: string; facebook: string; tiktok: string; youtube: string };

const DEFAULT_CONTACT: Contact = {
  email: "info@thuthuka-sa.co.za",
  phone: "+27 11 568 2635",
  location: "Midrand, Gauteng, South Africa",
};

export function SiteFooter() {
  const year = new Date().getFullYear();
  const [contact, setContact] = useState<Contact>(DEFAULT_CONTACT);
  const [social, setSocial] = useState<Social>({ linkedin: "", instagram: "", facebook: "", tiktok: "", youtube: "" });

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["contact", "social"])
      .then(({ data }) => {
        if (cancelled) return;
        for (const row of data ?? []) {
          if (row.key === "contact") setContact({ ...DEFAULT_CONTACT, ...(row.value as Partial<Contact>) });
          if (row.key === "social") setSocial((prev) => ({ ...prev, ...(row.value as Partial<Social>) }));
        }
      });
    return () => { cancelled = true; };
  }, []);

  const socials: Array<{ href: string; label: string; Icon: typeof Facebook }> = [
    { href: social.linkedin, label: "LinkedIn", Icon: Linkedin },
    { href: social.instagram, label: "Instagram", Icon: Instagram },
    { href: social.facebook, label: "Facebook", Icon: Facebook },
    { href: social.youtube, label: "YouTube", Icon: Youtube },
  ].filter((s) => s.href.trim().length > 0);

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
            African Women Investment Network — a stokvel and investment community for women.
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
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#E8960A]" />
              <a href={`mailto:${contact.email}`} className="hover:text-[#E8960A] break-all">{contact.email}</a>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#E8960A]" />
              <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className="hover:text-[#E8960A]">{contact.phone}</a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#E8960A]" />
              <span>{contact.location}</span>
            </li>
          </ul>
          {socials.length > 0 && (
            <div className="mt-5 flex justify-center gap-3 md:justify-start">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="rounded-full border border-white/40 p-2 text-white transition-colors hover:bg-[#E8960A] hover:border-[#E8960A]"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="container mx-auto flex flex-col items-center gap-2 px-4 py-5 text-center text-[11px] text-white/70 md:flex-row md:justify-between md:text-xs">
          <p className="whitespace-normal break-words">
            © {year} A-WIN — African Women Investment Network. Built by Lusandla Marketing.
          </p>
        </div>
      </div>
    </footer>
  );
}
