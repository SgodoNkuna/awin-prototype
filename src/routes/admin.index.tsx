import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users,
  ClipboardList,
  Calendar,
  Mail,
  Plus,
  FileText,
  ArrowRight,
  Briefcase,
  FolderOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/admin/")({
  component: OverviewPage,
});

type Stats = {
  members: number;
  pending: number;
  upcoming: number;
  unread: number;
  portfolio: number;
  documents: number;
};

type Activity = { type: string; title: string; when: string };

function OverviewPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    (async () => {
      const [
        members,
        pending,
        upcoming,
        unread,
        portfolio,
        documents,
        recentApps,
        recentMsgs,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .gte("event_date", new Date().toISOString().slice(0, 10)),
        supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("is_read", false),
        supabase.from("portfolio_items").select("*", { count: "exact", head: true }),
        supabase.from("documents").select("*", { count: "exact", head: true }),
        supabase.from("applications").select("full_name, created_at").order("created_at", { ascending: false }).limit(3),
        supabase.from("contact_messages").select("name, subject, created_at").order("created_at", { ascending: false }).limit(3),
      ]);

      setStats({
        members: members.count ?? 0,
        pending: pending.count ?? 0,
        upcoming: upcoming.count ?? 0,
        unread: unread.count ?? 0,
        portfolio: portfolio.count ?? 0,
        documents: documents.count ?? 0,
      });

      const a: Activity[] = [
        ...(recentApps.data ?? []).map((x) => ({
          type: "Application",
          title: `${x.full_name} applied`,
          when: x.created_at,
        })),
        ...(recentMsgs.data ?? []).map((x) => ({
          type: "Message",
          title: `${x.name}: ${x.subject}`,
          when: x.created_at,
        })),
      ]
        .sort((a, b) => +new Date(b.when) - +new Date(a.when))
        .slice(0, 8);
      setActivity(a);
    })();
  }, []);


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}. Here's what's happening today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/" target="_blank">View Site</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat icon={Users} label="Members" value={stats?.members} to="/admin/members" accent="text-blue-600" />
        <Stat icon={ClipboardList} label="Pending Apps" value={stats?.pending} to="/admin/applications" accent="text-amber-600" />
        <Stat icon={Calendar} label="Upcoming Events" value={stats?.upcoming} to="/admin/events" accent="text-green-600" />
        <Stat icon={Mail} label="Unread Msgs" value={stats?.unread} to="/admin/messages" accent="text-rose-600" />
        <Stat icon={Briefcase} label="Portfolio Items" value={stats?.portfolio} to="/admin/portfolio" accent="text-purple-600" />
        <Stat icon={FolderOpen} label="Documents" value={stats?.documents} to="/admin/documents" accent="text-cyan-600" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            {stats && (stats.pending > 0 || stats.unread > 0) ? (
              <Badge variant="secondary">{stats.pending + stats.unread} needs attention</Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing recent.</p>
            ) : (
              <ul className="space-y-2.5">
                {activity.map((a, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 text-sm pb-2.5 border-b last:border-0">
                    <div>
                      <span className="text-xs font-semibold text-accent uppercase tracking-wide">{a.type}</span>
                      <p>{a.title}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(a.when).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickAction to="/admin/events" icon={Plus} label="Add Event" />
            <QuickAction to="/admin/portfolio" icon={FileText} label="Add Portfolio Item" />
            <QuickAction to="/admin/documents" icon={FolderOpen} label="Upload Document" />
            <QuickAction to="/admin/applications" icon={ClipboardList} label="Review Applications" />
            <QuickAction to="/admin/members" icon={Users} label="Manage Members" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
  accent: string;
  to: "/admin/members" | "/admin/applications" | "/admin/events" | "/admin/messages" | "/admin/portfolio" | "/admin/documents";
}) {
  return (
    <Link to={to} className="block transition-transform hover:-translate-y-0.5">
      <Card className="hover:border-primary/40 transition-colors h-full">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold mt-1">{value ?? "—"}</p>
            </div>
            <Icon className={`size-7 ${accent} opacity-70`} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
}: {
  to: "/admin/events" | "/admin/portfolio" | "/admin/documents" | "/admin/applications" | "/admin/members";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Button asChild className="w-full justify-between" variant="outline">
      <Link to={to}>
        <span className="flex items-center gap-2">
          <Icon className="size-4" /> {label}
        </span>
        <ArrowRight className="size-4" />
      </Link>
    </Button>
  );
}
