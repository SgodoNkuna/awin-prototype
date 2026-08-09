import { useEffect, useRef } from "react";
import { animate, useMotionValue } from "framer-motion";

/**
 * Animated count-up number. Uses framer-motion (already a dependency) rather
 * than a new animation library — no new deps for this.
 */
export function AnimateNumber({
  value,
  prefix = "",
  suffix = "",
  format,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  format?: Intl.NumberFormatOptions;
  className?: string;
}) {
  const motionValue = useMotionValue(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.8, ease: "easeOut" });
    return controls.stop;
  }, [value]);

  useEffect(() => {
    return motionValue.on("change", (v) => {
      if (spanRef.current) {
        spanRef.current.textContent = prefix + Math.round(v).toLocaleString(undefined, format) + suffix;
      }
    });
  }, [motionValue, prefix, suffix, format]);

  return (
    <span ref={spanRef} className={className}>
      {prefix}0{suffix}
    </span>
  );
}
