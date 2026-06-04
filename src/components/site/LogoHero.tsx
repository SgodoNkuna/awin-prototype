import { motion, useInView } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useMemo, useRef } from "react";
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

/** A single floating logo that drifts in the outer band of the hero (avoids center text) */
function FloatingLogo({
  src,
  filter,
  index,
  total,
}: {
  src: string;
  filter?: string;
  index: number;
  total: number;
}) {
  const { startX, startY, scale, duration, rotateRange } = useMemo(() => {
    const seed = (index + 1) * 9301 + 49297;
    const r = (n: number) => ((Math.sin(seed * (n + 1)) + 1) / 2);
    // Push positions to the edges (0-25% or 75-100%) so they avoid the
    // center copy area and the headline stays readable.
    const edge = r(1) < 0.5 ? r(1) * 0.5 : 0.75 + r(1) * 0.5 * 0.5;
    const edgeY = r(2) < 0.5 ? r(2) * 0.5 : 0.7 + r(2) * 0.5 * 0.6;
    return {
      startX: edge * 100,
      startY: edgeY * 100,
      scale: 0.3 + r(3) * 0.7,
      duration: 18 + r(4) * 14,
      rotateRange: -20 + r(5) * 40,
    };
  }, [index]);

  return (
    <motion.img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className="pointer-events-none absolute will-change-transform select-none"
      draggable={false}
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        width: `${90 * scale}px`,
        height: "auto",
        filter: filter ?? "none",
        opacity: 0.08 + (index / total) * 0.08,
      }}
      animate={{
        x: [0, 30, -20, 15, 0],
        y: [0, -40, 20, -15, 0],
        rotate: [0, rotateRange, -rotateRange / 2, rotateRange / 3, 0],
        scale: [1, 1.06, 0.96, 1.03, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay: index * 0.4,
      }}
    />
  );
}

export function LogoHero() {
  const { src, filter } = useLogoTheme();
  const logoCount = 10;

  return (
    <section className="relative isolate flex min-h-[calc(100dvh-5rem)] items-center justify-center overflow-hidden px-4 py-24">
      {/* Deep brand backdrop — locked dark so hero text always reads */}
      <div
        className="absolute inset-0 -z-30"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.18 0.04 261) 0%, oklch(0.10 0.03 261) 60%, oklch(0.08 0.02 264) 100%)",
        }}
      />
      {/* Warm gold wash on one side for depth */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_25%,oklch(0.7_0.16_60/0.35),transparent_55%)]" />

      {/* Animated floating logos in outer band only */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {Array.from({ length: logoCount }).map((_, i) => (
          <FloatingLogo
            key={i}
            src={src}
            filter={filter}
            index={i}
            total={logoCount}
          />
        ))}
      </div>

      {/* Hero feature logo, faint, slow pulse, behind content */}
      <motion.img
        src={src}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 w-[min(70vw,560px)] -translate-x-1/2 -translate-y-1/2 select-none"
        style={{ filter, opacity: 0.04 }}
        animate={{ scale: [1, 1.06, 1], rotate: [0, 3, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        draggable={false}
      />

      {/* Strong vignette behind copy for legibility */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.35)_45%,transparent_75%)]" />

      {/* Content */}
      <div className="relative mx-auto max-w-4xl text-center text-white">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md"
        >
          <Sparkles className="h-3.5 w-3.5" />
          African Women in Investment Network
        </motion.span>

        <WordsPullUp
          text="Empowering Women Through Investment"
          delay={0.2}
          className="mt-6 font-serif text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.65)]"
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mx-auto mt-6 max-w-2xl text-base md:text-lg text-white/90 [text-shadow:0_1px_12px_rgba(0,0,0,0.55)]"
        >
          A-WIN is a community of women building wealth, knowledge and legacy
          together — through investment, education and a powerful peer network.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link to="/membership">
            <GlassButton
              size="lg"
              className="!text-white"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.78 0.16 65) 0%, oklch(0.62 0.19 45) 100%)",
              }}
            >
              Become a Member
              <ArrowRight className="ml-1 h-4 w-4" />
            </GlassButton>
          </Link>
          <Link to="/about">
            <GlassButton size="lg" className="!text-white border border-white/30">
              Learn More
            </GlassButton>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
