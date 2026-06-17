import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, ClipboardList, Calendar, Mail, Plus, FileText, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/")({
  component: OverviewPage,
});

type Stats = {
  members: number;
  pending: number;
  upcoming: number;
  unread: number;
};

type Activity = { type: string; title: string; when: string };

function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    (async () => {
      const [members, pending, upcoming, unread, recentApps, recentMsgs] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .gte("event_date", new Date().toISOString().slice(0, 10)),
        supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("is_read", false),
        supabase.from("applications").select("full_name, created_at").order("created_at", { ascending: false }).limit(3),
        supabase.from("contact_messages").select("name, subject, created_at").order("created_at", { ascending: false }).limit(3),
      ]);
      setStats({
        members: members.count ?? 0,
        pending: pending.count ?? 0,
        upcoming: upcoming.count ?? 0,
        unread: unread.count ?? 0,
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
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back to your admin console.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Users} label="Total Members" value={stats?.members} accent="text-blue-600" />
        <Stat icon={ClipboardList} label="Pending Applications" value={stats?.pending} accent="text-amber-600" />
        <Stat icon={Calendar} label="Upcoming Events" value={stats?.upcoming} accent="text-green-600" />
        <Stat icon={Mail} label="Unread Messages" value={stats?.unread} accent="text-rose-600" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
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
          <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-between" variant="outline">
              <Link to="/admin/events"><span className="flex items-center gap-2"><Plus className="size-4" /> Add Event</span><ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild className="w-full justify-between" variant="outline">
              <Link to="/admin/portfolio"><span className="flex items-center gap-2"><FileText className="size-4" /> Add Portfolio Item</span><ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild className="w-full justify-between" variant="outline">
              <Link to="/admin/applications"><span className="flex items-center gap-2"><ClipboardList className="size-4" /> View Applications</span><ArrowRight className="size-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, accent,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | undefined; accent: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value ?? "—"}</p>
          </div>
          <Icon className={`size-8 ${accent} opacity-70`} />
        </div>
      </CardContent>
    </Card>
  );
}
