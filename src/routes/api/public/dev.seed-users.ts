import { createFileRoute } from "@tanstack/react-router";

// One-off dev seed. Guarded by a shared secret; delete after use.
export const Route = createFileRoute("/api/public/dev/seed-users")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-seed-token");
        if (token !== "awin-seed-2026") {
          return new Response("forbidden", { status: 403 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const users = [
          { email: "admin@awin.test", password: "Awin!Admin#2026", full_name: "A-WIN Admin", role: "admin" as const },
          { email: "member@awin.test", password: "Awin!Member#2026", full_name: "A-WIN Member", role: "member" as const },
        ];
        const out: Record<string, string> = {};
        for (const u of users) {
          const { data: list } = await supabaseAdmin.auth.admin.listUsers();
          const existing = list?.users?.find((x) => x.email === u.email);
          let userId: string;
          if (existing) {
            await supabaseAdmin.auth.admin.updateUserById(existing.id, {
              password: u.password,
              email_confirm: true,
              user_metadata: { full_name: u.full_name },
            });
            userId = existing.id;
            out[u.email] = "updated";
          } else {
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
              email: u.email,
              password: u.password,
              email_confirm: true,
              user_metadata: { full_name: u.full_name },
            });
            if (error) { out[u.email] = `error: ${error.message}`; continue; }
            userId = data.user!.id;
            out[u.email] = "created";
          }
          await supabaseAdmin.from("user_roles").upsert(
            { user_id: userId, role: u.role },
            { onConflict: "user_id,role" }
          );
        }
        return Response.json(out);
      },
    },
  },
});
