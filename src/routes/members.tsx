import { createFileRoute } from "@tanstack/react-router";
import { MembersPage } from "./team";

// Canonical members directory route. /team kept as legacy alias.
export const Route = createFileRoute("/members")({
  component: MembersPage,
  head: () => ({
    meta: [
      { title: "Our Members | A-Win" },
      {
        name: "description",
        content:
          "Browse the A-Win member directory: psychologists, coaches, attorneys, financial advisors and more.",
      },
    ],
  }),
});
