import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const PortalPage = lazy(() => import("@/components/pages/portal-page"));

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export const Route = createFileRoute("/portal")({
  component: () => (
    <Suspense fallback={<PageFallback />}>
      <PortalPage />
    </Suspense>
  ),
  head: () => ({ meta: [{ title: "Member Portal | A-Win" }] }),
});
