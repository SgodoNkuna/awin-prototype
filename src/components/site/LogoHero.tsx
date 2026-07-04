import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useLogoTheme } from "@/lib/logo-theme";
import { GlassButton } from "@/components/ui/glass-button";

/** Words pull up from the bottom with stagger */
function WordsPullUp({
  text,
  className = "",
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(" ");

  return (
    <h1 ref={ref} className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-1">
          <motion.span
            className="inline-block"
            initial={{ y: "100%", opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{
              duration: 0.7,
              delay: delay + i * 0.08,
              ease: [0.215, 0.61, 0.355, 1],
            }}
          >
            {word}&nbsp;
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

export function LogoHero() {
  const { src, filter } = useLogoTheme();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const contentY = useTransform(scrollY, [0, 500], [0, 120]);
  const contentOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex min-h-[calc(100vh-7rem)] items-center justify-center overflow-hidden px-4 py-20 text-hero-foreground md:min-h-[calc(100vh-8rem)] md:py-24"
    >
      {/* Brand gradient backdrop */}
      <div
        className="absolute inset-0 -z-30"
        style={{ background: "var(--gradient-hero)" }}
      />
      {/* Warm radial wash */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_30%_20%,var(--accent),transparent_55%)] opacity-20" />

      {/* Single hero feature logo — slow pulse, watermark opacity */}
      <motion.img
        src={src}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 w-[min(70vw,560px)] -translate-x-1/2 -translate-y-1/2 select-none"
        style={{ filter, opacity: 0.22 }}
        animate={{ scale: [1, 1.06, 1], rotate: [0, 3, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        draggable={false}
      />

      {/* Vignette for legibility */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-black/45 to-black/60" />


      {/* Content */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative mx-auto max-w-4xl text-center"
      >
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-[120%] -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,var(--background)_0%,transparent_70%)] opacity-45 blur-3xl" />

        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-hero-border bg-hero-surface px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-hero-foreground backdrop-blur-md shadow-[var(--shadow-gold-glow)]"
        >
          <Sparkles className="h-3.5 w-3.5" />
          African Women Investment Network
        </motion.span>

        <WordsPullUp
          text="African Women Building Wealth Together"
          delay={0.2}
          className="mt-6 font-serif text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] text-hero-foreground drop-shadow-[0_3px_28px_rgba(0,0,0,0.72)]"
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mx-auto mt-6 max-w-2xl text-base md:text-lg text-hero-muted drop-shadow-[0_2px_16px_rgba(0,0,0,0.72)]"
        >
          A-WIN is a stokvel and investment community born from the Women
          Creating Wealth programme. We are ordinary South African women
          choosing to save, invest, and grow, together. Every woman belongs here.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link to="/membership">
            <GlassButton size="lg" className="border border-hero-border bg-hero-surface text-hero-foreground shadow-[var(--shadow-gold-glow)]">
              Join A-WIN
              <ArrowRight className="ml-1 h-4 w-4" />
            </GlassButton>
          </Link>
          <Link to="/members">
            <GlassButton size="lg" className="border border-hero-border bg-hero-surface text-hero-foreground shadow-[var(--shadow-gold-glow)]">
              Meet Our Members
            </GlassButton>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
