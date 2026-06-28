import { createFileRoute, redirect } from "@tanstack/react-router";

// Portfolio page consolidated into Our Members. Redirect for back-compat.
export const Route = createFileRoute("/portfolio")({
  beforeLoad: () => {
    throw redirect({ to: "/members" });
  },
  component: () => null,
});
