import React from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A-Win adaptation of the "MinimalistHero" pattern: portrait in a brand-accent
 * circle, oversized serif statement text, intro copy + read-more, and a
 * social/location strip. Header/nav from the original component is optional
 * (the site already renders SiteHeader above every route).
 */
interface MinimalistHeroProps {
  logoText?: string;
  navLinks?: { label: string; href: string }[];
  mainText: string;
  readMoreLink: string;
  readMoreLabel?: string;
  imageSrc: string;
  imageAlt: string;
  overlayText: {
    part1: string;
    part2: string;
  };
  socialLinks: { icon: LucideIcon; href: string; label: string }[];
  locationText: string;
  className?: string;
}

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    className="text-sm font-medium tracking-widest text-foreground/60 transition-colors hover:text-foreground"
  >
    {children}
  </a>
);

const SocialIcon = ({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className="rounded-full border border-border p-2 text-foreground/60 transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
  >
    <Icon className="h-4 w-4" />
  </a>
);

export const MinimalistHero = ({
  logoText,
  navLinks,
  mainText,
  readMoreLink,
  readMoreLabel = "Read More",
  imageSrc,
  imageAlt,
  overlayText,
  socialLinks,
  locationText,
  className,
}: MinimalistHeroProps) => {
  return (
    <div
      className={cn(
        "relative flex min-h-[calc(100vh-7rem)] w-full flex-col items-center justify-between overflow-hidden bg-background p-6 md:min-h-[calc(100vh-8rem)] md:p-12",
        className,
      )}
    >
      {/* Optional in-hero header — omit navLinks when the site header is present */}
      {navLinks && navLinks.length > 0 && (
        <header className="z-30 flex w-full max-w-7xl items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="font-serif text-xl font-bold tracking-wider text-foreground"
          >
            {logoText}
          </motion.div>
          <div className="hidden items-center space-x-8 md:flex">
            {navLinks.map((link) => (
              <NavLink key={link.label} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </div>
        </header>
      )}

      {/* Main content */}
      <div className="relative grid w-full max-w-7xl flex-grow grid-cols-1 items-center gap-8 py-8 md:grid-cols-3 md:gap-4">
        {/* Left copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="z-20 order-2 text-center md:order-1 md:text-left"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            The story behind the movement
          </span>
          <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-foreground/80 md:mx-0">
            {mainText}
          </p>
          <a
            href={readMoreLink}
            className="mt-4 inline-block text-sm font-semibold text-accent-deep underline decoration-from-font underline-offset-4 transition-colors hover:text-accent"
          >
            {readMoreLabel}
          </a>
        </motion.div>

        {/* Centre portrait in the brand circle */}
        <div className="relative order-1 flex h-full min-h-[320px] items-center justify-center md:order-2 md:min-h-[420px]">
          {/* Green companion circle — the logo's second colour */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
            className="absolute left-1/2 top-1/2 z-0 h-24 w-24 -translate-x-[190%] -translate-y-[160%] rounded-full bg-primary/25 md:h-32 md:w-32"
            aria-hidden="true"
          />
          {/* Accent circle behind the portrait */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="absolute z-0 h-[280px] w-[280px] rounded-full bg-accent/90 shadow-[var(--shadow-gold-glow)] md:h-[380px] md:w-[380px] lg:h-[440px] lg:w-[440px]"
            aria-hidden="true"
          />
          <motion.img
            src={imageSrc}
            alt={imageAlt}
            className="relative z-10 size-56 rounded-full border-4 border-background object-cover object-top shadow-[var(--shadow-elegant)] md:size-72 lg:size-80"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
          />
        </div>

        {/* Right statement text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="z-20 order-3 flex items-center justify-center text-center md:justify-start md:text-left"
        >
          <h1 className="font-serif text-6xl font-semibold leading-[1.05] text-foreground md:text-7xl lg:text-8xl">
            {overlayText.part1}
            <br />
            <span className="text-accent">{overlayText.part2}</span>
          </h1>
        </motion.div>
      </div>

      {/* Social + location strip */}
      <footer className="z-30 flex w-full max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="flex items-center space-x-3"
        >
          {socialLinks.map((link) => (
            <SocialIcon key={link.label} href={link.href} icon={link.icon} label={link.label} />
          ))}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.3 }}
          className="text-sm font-medium text-foreground/70"
        >
          {locationText}
        </motion.div>
      </footer>
    </div>
  );
};
