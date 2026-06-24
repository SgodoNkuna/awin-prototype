import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const MembershipPage = lazy(() => import("@/components/pages/membership-page"));

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export const Route = createFileRoute("/membership")({
  component: () => (
    <Suspense fallback={<PageFallback />}>
      <MembershipPage />
    </Suspense>
  ),
  head: () => ({
    meta: [
      { title: "Join A-WIN | Membership" },
      {
        name: "description",
        content:
          "Become an A-WIN member. Choose from General, Active or Patron tiers and start your investment journey with us.",
      },
    ],
  }),
});
