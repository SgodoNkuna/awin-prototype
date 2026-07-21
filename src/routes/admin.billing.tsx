import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const BillingAdminPage = lazy(() => import("@/components/pages/admin-billing-page"));

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export const Route = createFileRoute("/admin/billing")({
  component: () => (
    <Suspense fallback={<PageFallback />}>
      <BillingAdminPage />
    </Suspense>
  ),
  head: () => ({ meta: [{ title: "Billing | Admin | A-Win" }] }),
});
