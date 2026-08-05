import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const ChangePasswordPage = lazy(() => import("@/components/pages/change-password-page"));

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export const Route = createFileRoute("/change-password")({
  component: () => (
    <Suspense fallback={<PageFallback />}>
      <ChangePasswordPage />
    </Suspense>
  ),
  head: () => ({ meta: [{ title: "Change Password | A-Win" }] }),
});
