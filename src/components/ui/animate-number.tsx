import { useEffect, useState } from "react";
import { animate, useMotionValue } from "framer-motion";

/**
 * Animated count-up number. Uses framer-motion (already a dependency) rather
 * than a new animation library — no new deps for this.
 *
 * Renders the number through React state (not a ref + manual textContent
 * mutation) — the manual-DOM version fought React's own re-renders of the
 * same JSX children and got stomped back to the literal "0" the moment
 * anything else in the tree re-rendered (e.g. the data finishing its load).
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
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.8, ease: "easeOut" });
    return controls.stop;
  }, [value, motionValue]);

  useEffect(() => motionValue.on("change", (v) => setDisplay(v)), [motionValue]);

  return (
    <span className={className}>
      {prefix}
      {Math.round(display).toLocaleString(undefined, format)}
      {suffix}
    </span>
  );
}
