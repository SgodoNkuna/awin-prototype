import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";
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
  validateSearch: z.object({
    // Where to return the user once their password is changed. Validated as
    // an internal, single-segment-leading path only (never "//host", which
    // browsers treat as protocol-relative) to avoid an open redirect.
    next: z.string().regex(/^\/(?!\/)/).max(200).optional(),
  }),
  component: () => (
    <Suspense fallback={<PageFallback />}>
      <ChangePasswordPage />
    </Suspense>
  ),
  head: () => ({ meta: [{ title: "Change Password | A-Win" }] }),
});
