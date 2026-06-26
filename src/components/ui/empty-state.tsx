import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; href?: string };
  className?: string;
}

/**
 * Reusable empty-state block.
 * Uses brand green/orange only — no third color.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={`mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-12 text-center ${className ?? ""}`}
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: "var(--primary-light)", color: "var(--primary)" }}
      >
        {icon ?? <Inbox className="h-8 w-8" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? (
        <div className="mt-5">
          {action.href ? (
            <Button asChild className="bg-accent text-accent-foreground hover:bg-[var(--accent-deep)]">
              <a href={action.href}>{action.label}</a>
            </Button>
          ) : (
            <Button
              onClick={action.onClick}
              className="bg-accent text-accent-foreground hover:bg-[var(--accent-deep)]"
            >
              {action.label}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
