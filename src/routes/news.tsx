import { createFileRoute, redirect } from "@tanstack/react-router";

// News merged into Events & Gallery. Redirect for back-compat.
export const Route = createFileRoute("/news")({
  beforeLoad: () => {
    throw redirect({ to: "/events" });
  },
  component: () => null,
});
