import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Check, X, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin Dashboard | A-WIN" }] }),
});

type Application = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  tier: string;
  status: string;
  occupation: string;
  motivation: string;
  experience: string;
  created_at: string;
};

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
};

function AdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState<Application[] | null>(null);
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth", replace: true });
    else if (!isAdmin) navigate({ to: "/portal", replace: true });
  }, [user, loading, isAdmin, navigate]);

  const fetchData = useCallback(async () => {
    const [a, m] = await Promise.all([
      supabase.from("applications").select("*").order("created_at", { ascending: false }),
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
    ]);
    setApps((a.data as Application[]) ?? []);
    setMessages((m.data as ContactMessage[]) ?? []);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("applications").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Application ${status}`);
    fetchData();
  };

  if (loading || !isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pending = apps?.filter((a) => a.status === "pending") ?? [];

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Review applications and messages</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/portal">Back to Portal</Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Applications" value={apps?.length ?? 0} />
        <StatCard label="Pending Review" value={pending.length} />
        <StatCard label="Contact Messages" value={messages?.length ?? 0} />
      </div>

      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">Applications ({apps?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="messages">Messages ({messages?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="mt-4 space-y-4">
          {apps === null && <Loader2 className="size-5 animate-spin" />}
          {apps?.length === 0 && <p className="text-muted-foreground">No applications yet.</p>}
          {apps?.map((app) => (
            <Card key={app.id}>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{app.full_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {app.email} · {app.phone}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {app.occupation} · {app.experience} · {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{app.tier}</Badge>
                    <StatusBadge status={app.status} />
                  </div>
                </div>
                <p className="text-sm bg-muted/40 rounded p-3 mb-3">{app.motivation}</p>
                {app.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateStatus(app.id, "approved")}>
                      <Check className="size-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(app.id, "rejected")}>
                      <X className="size-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="messages" className="mt-4 space-y-4">
          {messages === null && <Loader2 className="size-5 animate-spin" />}
          {messages?.length === 0 && <p className="text-muted-foreground">No messages yet.</p>}
          {messages?.map((m) => (
            <Card key={m.id}>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold">{m.subject}</h3>
                    <p className="text-sm text-muted-foreground">
                      {m.name} · {m.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleString()}
                    </span>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}>
                        <Mail className="size-4 mr-1" /> Reply
                      </a>
                    </Button>
                  </div>
                </div>
                <p className="text-sm bg-muted/40 rounded p-3 whitespace-pre-wrap">{m.message}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground font-normal">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    approved: "bg-green-500/15 text-green-700 dark:text-green-400",
    rejected: "bg-destructive/15 text-destructive",
  };
  return <Badge variant="outline" className={cls[status] ?? ""}>{status}</Badge>;
}
