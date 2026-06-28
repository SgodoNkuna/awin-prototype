import { createFileRoute } from "@tanstack/react-router";
import TeamPage from "./team";

// Canonical members directory route. /team kept as legacy alias.
export const Route = createFileRoute("/members")({
  component: () => {
    const Comp = (TeamPage as unknown as { options?: { component?: React.ComponentType } })
      ?.options?.component;
    if (Comp) return <Comp />;
    // Fallback: dynamic import will not be needed because /team route exists
    return null;
  },
  head: () => ({
    meta: [
      { title: "Our Members | A-WIN" },
      {
        name: "description",
        content:
          "Browse the A-WIN member directory: psychologists, coaches, attorneys, financial advisors and more.",
      },
    ],
  }),
});
