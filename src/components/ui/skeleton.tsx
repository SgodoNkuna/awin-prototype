import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("awin-skeleton", className)} {...props} />;
}

export { Skeleton };
