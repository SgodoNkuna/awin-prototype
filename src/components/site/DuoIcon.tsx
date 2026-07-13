import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * Duotone soft icon wrapper.
 * Renders a lucide icon inside a soft accent-tinted rounded square,
 * with reduced stroke width for a lighter, more institutional feel.
 */
export function DuoIcon({
  icon: Icon,
  size = "md",
  tone = "accent",
  className,
}: {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
  tone?: "accent" | "primary" | "muted";
  className?: string;
}) {
  const boxSize = size === "sm" ? "size-8" : size === "lg" ? "size-14" : "size-11";
  const iconSize = size === "sm" ? "size-4" : size === "lg" ? "size-7" : "size-5";
  const toneClasses =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "muted"
        ? "bg-muted text-foreground/70"
        : "bg-accent/12 text-accent-deep";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl",
        boxSize,
        toneClasses,
        className,
      )}
      aria-hidden="true"
    >
      <Icon className={iconSize} strokeWidth={1.4} />
    </span>
  );
}
