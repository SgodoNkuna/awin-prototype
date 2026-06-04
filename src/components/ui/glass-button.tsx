import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassButtonVariants = cva(
  "relative isolate inline-flex items-center justify-center gap-2 rounded-full cursor-pointer transition-transform duration-300 ease-out tracking-tight disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 active:scale-[0.97] hover:scale-[1.03]",
  {
    variants: {
      size: {
        default: "px-6 py-3.5 text-base font-medium",
        sm: "px-4 py-2 text-sm font-medium",
        lg: "px-8 py-4 text-lg font-medium",
        icon: "h-10 w-10 p-0 gap-0",
      },
    },
    defaultVariants: { size: "default" },
  }
);

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  contentClassName?: string;
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, children, size, contentClassName, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        glassButtonVariants({ size }),
        "border-0 text-foreground/95",
        "[background:transparent]",
        className
      )}
      {...props}
    >
      <span
        className="absolute inset-0 -z-10 rounded-[inherit] pointer-events-none"
        style={{
          backgroundColor: "color-mix(in oklab, var(--foreground) 6%, transparent)",
          backdropFilter: "blur(14px) saturate(180%)",
          WebkitBackdropFilter: "blur(14px) saturate(180%)",
          boxShadow:
            "inset 0 0 0 1px color-mix(in srgb, white 12%, transparent), inset 1.8px 3px 0 -2px color-mix(in srgb, white 60%, transparent), inset -2px -2px 0 -2px color-mix(in srgb, white 40%, transparent), inset 0 3px 4px -2px color-mix(in srgb, black 18%, transparent), 0 1px 5px 0 color-mix(in srgb, black 10%, transparent), 0 6px 16px 0 color-mix(in srgb, black 10%, transparent)",
          transition: "background-color 400ms cubic-bezier(1,0,0.4,1), box-shadow 400ms cubic-bezier(1,0,0.4,1)",
        }}
      />
      <span
        className={cn(
          "relative z-10 flex w-full items-center justify-center gap-[inherit] select-none",
          contentClassName
        )}
        style={{ textShadow: "0 1px 2px color-mix(in oklab, var(--background) 35%, transparent)" }}
      >
        {children}
      </span>
    </button>
  )
);
GlassButton.displayName = "GlassButton";

export { glassButtonVariants };
