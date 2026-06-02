import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Clock, XCircle, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/portal")({
  component: PortalPage,
  head: () => ({ meta: [{ title: "Member Portal | A-WIN" }] }),
});

type Application = {
  id: string;
  full_name: string;
  email: string;
  tier: string;
  status: string;
  created_at: string;
};

function PortalPage() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState<Application[] | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("applications")
      .select("id, full_name, email, tier, status, created_at")
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .order("created_at", { ascending: false })
      .then(({ data }) => setApps((data as Application[]) ?? []));
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const latest = apps?.[0];

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl">Member Portal</h1>
          <p className="text-muted-foreground mt-1">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button asChild variant="outline">
              <Link to="/admin">Admin Dashboard</Link>
            </Button>
          )}
          <Button variant="ghost" onClick={signOut}>Sign Out</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membership Status</CardTitle>
        </CardHeader>
        <CardContent>
          {apps === null ? (
            <Loader2 className="size-5 animate-spin" />
          ) : latest ? (
            <StatusCard app={latest} />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No application on file yet.</p>
              <Button asChild>
                <Link to="/membership">Apply for Membership</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {apps && apps.length > 1 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Application History</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {apps.slice(1).map((a) => (
                <li key={a.id} className="flex justify-between text-sm">
                  <span>{a.tier} — {new Date(a.created_at).toLocaleDateString()}</span>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
    pending: { label: "Pending Review", cls: "bg-muted text-muted-foreground", Icon: Clock },
    approved: { label: "Approved", cls: "bg-green-500/15 text-green-700 dark:text-green-400", Icon: CheckCircle2 },
    rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive", Icon: XCircle },
  };
  const { label, cls, Icon } = map[status] ?? map.pending;
  return (
    <Badge variant="outline" className={cls}>
      <Icon className="size-3 mr-1" /> {label}
    </Badge>
  );
}

function StatusCard({ app }: { app: Application }) {
  const tierLabel = app.tier.charAt(0).toUpperCase() + app.tier.slice(1) + " Member";
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-accent/20 text-accent flex items-center justify-center">
            <Crown className="size-6" />
          </div>
          <div>
            <p className="font-semibold text-lg">{tierLabel}</p>
            <p className="text-sm text-muted-foreground">
              Applied {new Date(app.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <StatusBadge status={app.status} />
      </div>

      {app.status === "pending" && (
        <div className="rounded-md bg-muted/50 p-4 text-sm">
          Your application is under review. We'll be in touch within 5 business days.
        </div>
      )}
      {app.status === "approved" && (
        <div className="rounded-md bg-green-500/10 p-4 text-sm">
          🎉 Welcome to A-WIN! Your membership is active. Enjoy all your member benefits.
        </div>
      )}
      {app.status === "rejected" && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm">
          Unfortunately we couldn't approve this application. Please contact us for more info.
        </div>
      )}
    </div>
  );
}
