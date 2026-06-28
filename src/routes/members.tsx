import { createFileRoute } from "@tanstack/react-router";
import { MembersPage } from "./team";

// Canonical members directory route. /team kept as legacy alias.
export const Route = createFileRoute("/members")({
  component: MembersPage,
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
