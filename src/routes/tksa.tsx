import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { SubmissionsPanel } from "@/components/loa-rpa/SubmissionsPanel";
import { THUTHUKA_LOGO_PNG_BASE64 } from "@/lib/thuthuka-logo-base64";

/**
 * Dedicated ThuthukaSA advisor dashboard — deliberately NOT the A-Win admin
 * console (AdminLayout) or the member portal. ThuthukaSA staff log in to
 * find only what their FSP role needs: signed LOA/RPA submissions and the
 * confidentiality context around them, in ThuthukaSA's own branding, with
 * zero A-Win membership/finance data reachable from here.
 */
export const Route = createFileRoute("/tksa")({
  component: TksaDashboard,
  head: () => ({
    meta: [
      { title: "ThuthukaSA Dashboard" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function TksaDashboard() {
  const { user, loading, isAdvisor, forcePasswordChange, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth", replace: true }); return; }
    if (!isAdvisor) { navigate({ to: "/portal", replace: true }); return; }
    // Belt-and-braces: this page carries confidential FAIS-regulated data, so
    // it enforces the forced-password-change gate itself rather than relying
    // solely on the shared SiteLayout gate — observed live that gate not
    // firing reliably for this route, whatever the cause, and a page this
    // sensitive shouldn't depend on a single mechanism to keep it locked.
    if (forcePasswordChange) { navigate({ to: "/change-password", search: { next: "/tksa" }, replace: true }); return; }
  }, [user, loading, isAdvisor, forcePasswordChange, navigate]);

  if (loading || !user || !isAdvisor || forcePasswordChange) return null;

  return (
    <div className="min-h-screen bg-[#12110f]">
      {/* ThuthukaSA's brand orange — same rgb(232,150,10) as their PDF letterhead. */}
      <div className="h-1" style={{ background: "#e8960a" }} />
      <header className="border-b border-[#e8960a]/20 bg-[#1a1815]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={THUTHUKA_LOGO_PNG_BASE64} alt="ThuthukaSA" className="h-10 w-auto rounded-md bg-white p-1" />
            <div>
              <div className="text-sm font-semibold text-white">ThuthukaSA Dashboard</div>
              <div className="text-xs text-white/60">{user.email}</div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-[#e8960a]/40 bg-transparent text-white hover:bg-[#e8960a]/15 hover:text-white"
            onClick={async () => {
              await supabase.auth.signOut();
              signOut();
            }}
          >
            <LogOut className="mr-2 size-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="flex items-start gap-2 rounded-lg border p-3 text-sm" style={{ borderColor: "rgba(232,150,10,0.4)", background: "rgba(232,150,10,0.08)", color: "#f5e6c8" }}>
          <ShieldCheck className="mt-0.5 size-4 shrink-0" style={{ color: "#e8960a" }} />
          <span>
            This data is confidential to ThuthukaSA under FAIS and POPIA — Letters of Authority and Risk Profile
            Analyses submitted by A-Win members. It is not visible to A-Win committee or admin accounts.
          </span>
        </div>

        <div>
          <h1 className="font-serif text-2xl text-white">Letters of Authority &amp; Risk Profiles</h1>
          <p className="mt-1 text-sm text-white/60">
            View, download, and mark reviewed. Each entry has both the internal combined record and a standalone
            LOA safe to forward to Astute or any other institution on its own.
          </p>
        </div>

        <SubmissionsPanel emptyHint="No submissions yet." showChart />
      </main>
    </div>
  );
}
