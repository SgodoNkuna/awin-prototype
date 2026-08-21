import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, ShieldCheck, Clock, MessageCircleMore, Users2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmissionsPanel } from "@/components/loa-rpa/SubmissionsPanel";
import { NotifyRecipientsCard } from "@/components/loa-rpa/NotifyRecipientsCard";
import { ShareLinksCard } from "@/components/loa-rpa/ShareLinksCard";
import { TksaHighlights } from "@/components/loa-rpa/TksaHighlights";
import { AdvisorAccessSection } from "@/components/admin/AdvisorAccessSection";
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

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <div>
          <h1 className="font-serif text-2xl text-white">Letters of Authority &amp; Risk Profiles</h1>
          <p className="mt-1 text-sm text-white/60">
            View, download, and mark reviewed. Each entry has both the internal combined record and a standalone
            LOA safe to forward to Astute or any other institution on its own.
          </p>
        </div>

        <TksaHighlights />

        <div className="flex items-start gap-2 rounded-lg border p-3 text-sm" style={{ borderColor: "rgba(232,150,10,0.4)", background: "rgba(232,150,10,0.08)", color: "#f5e6c8" }}>
          <ShieldCheck className="mt-0.5 size-4 shrink-0" style={{ color: "#e8960a" }} />
          <span>
            This data is confidential to ThuthukaSA under FAIS and POPIA — Letters of Authority and Risk Profile
            Analyses submitted by A-Win members. It is not visible to A-Win committee or admin accounts.
          </span>
        </div>

        <section className="space-y-3">
          <div>
            <h2 className="flex items-center gap-2 font-serif text-lg text-white">
              <MessageCircleMore className="size-4" style={{ color: "#e8960a" }} /> Share the forms
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Ready-to-send WhatsApp/website links for new applicants.
            </p>
          </div>
          <ShareLinksCard />
        </section>

        <SubmissionsPanel emptyHint="No submissions yet." showChart />

        <NotifyRecipientsCard />

        <section className="space-y-3">
          <div>
            <h2 className="flex items-center gap-2 font-serif text-lg text-white">
              <Users2 className="size-4" style={{ color: "#e8960a" }} /> Team access
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Request a new colleague's account, or grant/revoke advisor access on an existing one. An A-Win admin
              still has to approve each request before it takes effect.
            </p>
          </div>
          <AdvisorAccessSection />
        </section>

        <DeletionRequestsPanel />
      </main>
    </div>
  );
}

type ApprovalRow = {
  id: string;
  status: string;
  reason: string;
  requested_at: string;
  decided_at: string | null;
  decision_reason: string | null;
  payload: { confirm_name?: string };
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  executed: "Deleted",
  failed: "Failed",
};

/**
 * Read-only — advisors can see that a submission-deletion was requested and
 * how it was decided, but deciding it stays with a different, accountable
 * A-Win admin (Admin → Approvals). This is visibility into what's happening
 * to their data, not a new way to action it from here.
 */
function DeletionRequestsPanel() {
  const [rows, setRows] = useState<ApprovalRow[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pending_approvals")
        .select("id, status, reason, requested_at, decided_at, decision_reason, payload")
        .eq("action_type", "loa_rpa_submission_delete")
        .order("requested_at", { ascending: false })
        .limit(20);
      setRows((data as unknown as ApprovalRow[]) ?? []);
    })();
  }, []);

  if (!rows || rows.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="size-4 text-accent" /> Submission deletion requests
        </h3>
        <p className="text-xs text-muted-foreground -mt-2">
          View-only — a different, accountable A-Win admin decides these in Admin → Approvals, same
          two-person rule as any other deletion.
        </p>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-md border border-border p-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{r.payload?.confirm_name ?? "Submission"}</span>
                <Badge variant="outline">{STATUS_LABEL[r.status] ?? r.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground italic">"{r.reason}"</p>
              {r.decision_reason && (
                <p className="mt-1 text-xs text-muted-foreground">Decision: "{r.decision_reason}"</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
