import { useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Crown,
  Calendar,
  FileText,
  Newspaper,
  User as UserIcon,
  MapPin,
  Download,
  ExternalLink,
  Eye,
  Send,
  CreditCard} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillingTab } from "@/components/portal/BillingTab";
import { OnboardingTab } from "@/components/portal/OnboardingTab";



type Application = {
  id: string;
  full_name: string;
  email: string;
  tier: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  decided_at: string | null;
  status_updated_at: string | null;
  admin_notes: string | null;
};

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  membership_tier: string | null;
  membership_status: string | null;
  joined_at: string | null;
};

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  event_type: string | null;
};

type DocRow = {
  id: string;
  name: string;
  folder: string | null;
  file_path: string;
  visibility: string;
};

type NewsRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  published_at: string | null;
};

function PortalPage() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [apps, setApps] = useState<Application[] | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [news, setNews] = useState<NewsRow[]>([]);
  const [savingName, setSavingName] = useState(false);
  const [fullName, setFullName] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: prof }, { data: appsData }, { data: ev }, { data: regs }, { data: dc }, { data: nw }] =
        await Promise.all([
          supabase.from("profiles").select("id,email,full_name,membership_tier,membership_status,joined_at").eq("id", user.id).maybeSingle(),
          supabase.from("applications").select("id,full_name,email,tier,status,created_at,submitted_at,reviewed_at,decided_at,status_updated_at,admin_notes").or(`user_id.eq.${user.id},email.eq.${user.email}`).order("created_at", { ascending: false }),
          supabase.from("events").select("id,title,description,event_date,event_time,location,event_type").eq("published", true).gte("event_date", new Date().toISOString().slice(0, 10)).order("event_date").limit(5),
          supabase.from("event_registrations").select("event_id").eq("user_id", user.id),
          supabase.from("documents").select("id,name,folder,file_path,visibility").order("created_at", { ascending: false }).limit(10),
          supabase.from("news_articles").select("id,title,slug,excerpt,category,published_at").eq("published", true).order("published_at", { ascending: false }).limit(4),
        ]);

      setProfile(prof as Profile | null);
      setFullName((prof as Profile | null)?.full_name ?? "");
      setApps((appsData as Application[]) ?? []);
      setEvents((ev as EventRow[]) ?? []);
      setRegisteredIds(new Set((regs ?? []).map((r: { event_id: string }) => r.event_id)));
      setDocs((dc as DocRow[]) ?? []);
      setNews((nw as NewsRow[]) ?? []);
    })();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const latest = apps?.[0];
  const greetingName = (profile?.full_name || user.email || "").split(" ")[0] || "there";

  const saveName = async () => {
    const trimmed = fullName.trim();
    if (!trimmed) {
      setProfileError("Name can't be empty");
      return toast.error("Name can't be empty");
    }
    setProfileError(null);
    setSavingName(true);
    const tId = toast.loading("Saving your profile…");
    const { error } = await supabase.from("profiles").update({ full_name: trimmed }).eq("id", user.id);
    setSavingName(false);
    if (error) {
      setProfileError(error.message);
      toast.error(error.message, { id: tId, action: { label: "Retry", onClick: () => saveName() } });
      return;
    }
    toast.success("Profile updated", { id: tId });
    setProfile((p) => (p ? { ...p, full_name: trimmed } : p));
  };

  const registerForEvent = async (eventId: string) => {
    setRegisteringId(eventId);
    setRegisterErrors((e) => { const n = { ...e }; delete n[eventId]; return n; });
    const tId = toast.loading("Registering you for the event…");
    const { sanitizeText, isDuplicateError } = await import("@/lib/sanitize");
    const { error } = await supabase.from("event_registrations").insert({
      event_id: eventId,
      user_id: user.id,
      full_name: sanitizeText(profile?.full_name || user.email || ""),
      email: (user.email || "").trim().toLowerCase()});
    setRegisteringId(null);
    if (error) {
      if (isDuplicateError(error)) {
        setRegisteredIds((s) => new Set(s).add(eventId));
        toast.success("You're already registered for this event.", { id: tId });
        return;
      }
      setRegisterErrors((e) => ({ ...e, [eventId]: error.message }));
      toast.error(error.message, { id: tId, action: { label: "Retry", onClick: () => registerForEvent(eventId) } });
      return;
    }
    setRegisteredIds((s) => new Set(s).add(eventId));
    toast.success("You're registered. See you there!", { id: tId });
  };


  const downloadDoc = async (doc: DocRow) => {
    setDownloadingId(doc.id);
    setDownloadErrors((e) => { const n = { ...e }; delete n[doc.id]; return n; });
    const tId = toast.loading(`Preparing ${doc.name}…`);
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 60);
    setDownloadingId(null);
    if (error || !data) {
      const msg = error?.message ?? "File not available yet";
      setDownloadErrors((e) => ({ ...e, [doc.id]: msg }));
      toast.error(msg, { id: tId, action: { label: "Retry", onClick: () => downloadDoc(doc) } });
      return;
    }
    toast.success("Opening document", { id: tId });
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-foreground">Welcome back, {greetingName}</h1>
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

      {/* Status overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Membership Status</CardTitle>
        </CardHeader>
        <CardContent>
          {apps === null ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : latest ? (
            <StatusCard app={latest} profile={profile} />
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

      <Tabs defaultValue="onboarding" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="onboarding"><Send className="size-4 mr-1.5" />Onboarding</TabsTrigger>
          <TabsTrigger value="events"><Calendar className="size-4 mr-1.5" />Events</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="size-4 mr-1.5" />Documents</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="size-4 mr-1.5" />Billing</TabsTrigger>
          <TabsTrigger value="news"><Newspaper className="size-4 mr-1.5" />News</TabsTrigger>
          <TabsTrigger value="profile"><UserIcon className="size-4 mr-1.5" />Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="onboarding" className="mt-4">
          {user?.id && <OnboardingTab userId={user.id} />}
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <BillingTab preferredTier={latest?.tier ?? profile?.membership_tier ?? null} />
        </TabsContent>



        {/* EVENTS */}
        <TabsContent value="events" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Register for events open to members.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.length === 0 ? (
                <p className="text-muted-foreground text-sm">No upcoming events scheduled yet.</p>
              ) : (
                events.map((ev) => {
                  const registered = registeredIds.has(ev.id);
                  return (
                    <div key={ev.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{ev.title}</p>
                          {ev.event_type && <Badge variant="secondary">{ev.event_type}</Badge>}
                        </div>
                        {ev.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ev.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Calendar className="size-3" />{new Date(ev.event_date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}{ev.event_time ? ` · ${ev.event_time}` : ""}</span>
                          {ev.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{ev.location}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Button
                          size="sm"
                          variant={registered ? "outline" : "default"}
                          disabled={registered || registeringId === ev.id}
                          onClick={() => registerForEvent(ev.id)}
                        >
                          {registered ? (<><CheckCircle2 className="size-4 mr-1" />Registered</>) :
                            registeringId === ev.id ? (<><Loader2 className="size-4 mr-1 animate-spin" />Registering…</>) :
                            registerErrors[ev.id] ? "Retry" : "Register"}
                        </Button>
                        {registerErrors[ev.id] && (
                          <p className="text-xs text-destructive max-w-[200px] text-right">{registerErrors[ev.id]}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Member Documents</CardTitle>
              <CardDescription>Resources, guides and governance documents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {docs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No documents available yet.</p>
              ) : (
                docs.map((d) => (
                  <div key={d.id} className="rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="size-5 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{d.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.folder ?? "General"} · <span className="capitalize">{d.visibility}</span>
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" disabled={downloadingId === d.id} onClick={() => downloadDoc(d)}>
                        {downloadingId === d.id ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Download className="size-4 mr-1" />}
                        {downloadErrors[d.id] ? "Retry" : "Open"}
                      </Button>
                    </div>
                    {downloadErrors[d.id] && (
                      <p className="text-xs text-destructive mt-2">{downloadErrors[d.id]}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NEWS */}
        <TabsContent value="news" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Latest News</CardTitle>
              <CardDescription>Updates from the A-WIN community.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {news.length === 0 ? (
                <p className="text-muted-foreground text-sm">No news posts yet.</p>
              ) : (
                news.map((n) => (
                  <div
                    key={n.id}
                    className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/40"
                  >
                    {n.category && <Badge variant="secondary" className="mb-2">{n.category}</Badge>}
                    <p className="font-semibold text-foreground">{n.title}</p>
                    {n.excerpt && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{n.excerpt}</p>}
                    {n.published_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(n.published_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROFILE */}
        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Keep your details up to date.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user.email ?? ""} disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-md bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Tier</p>
                  <p className="font-medium capitalize">{profile?.membership_tier ?? "—"}</p>
                </div>
                <div className="rounded-md bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{profile?.membership_status ?? "—"}</p>
                </div>
              </div>
              {profileError && (
                <p className="text-xs text-destructive">{profileError}</p>
              )}
              <Button onClick={saveName} disabled={savingName}>
                {savingName && <Loader2 className="size-4 animate-spin mr-2" />}
                {profileError ? "Retry Save" : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          {apps && apps.length > 1 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Application History</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {apps.slice(1).map((a) => (
                    <li key={a.id} className="flex justify-between text-sm">
                      <span className="capitalize">{a.tier} — {new Date(a.created_at).toLocaleDateString()}</span>
                      <StatusBadge status={a.status} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick links */}
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <QuickLink to="/members" label="Portfolio" desc="Showcase your business" />
        <QuickLink to="/events" label="Events" desc="Upcoming meetups & masterclasses" />
        <QuickLink to="/contact" label="Contact A-WIN" desc="Reach the committee" />
      </div>
    </div>
  );
}

function QuickLink({ to, label, desc }: { to: string; label: string; desc: string }) {
  return (
    <Link to={to} className="group rounded-lg border bg-card p-4 hover:border-primary/40 transition-colors">
      <div className="flex items-center justify-between">
        <p className="font-medium text-foreground group-hover:text-primary">{label}</p>
        <ExternalLink className="size-4 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
    pending: { label: "Submitted", cls: "bg-muted text-muted-foreground", Icon: Send },
    under_review: { label: "Under Review", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400", Icon: Eye },
    approved: { label: "Approved", cls: "bg-green-500/15 text-green-700 dark:text-green-400", Icon: CheckCircle2 },
    rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive", Icon: XCircle },
    active: { label: "Active", cls: "bg-green-500/15 text-green-700 dark:text-green-400", Icon: CheckCircle2 }};
  const { label, cls, Icon } = map[status] ?? map.pending;
  return (
    <Badge variant="outline" className={cls}>
      <Icon className="size-3 mr-1" /> {label}
    </Badge>
  );
}

function StatusTimeline({ app }: { app: Application }) {
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : null);
  const steps = [
    { key: "submitted", label: "Submitted", at: fmt(app.submitted_at ?? app.created_at), Icon: Send, done: true },
    { key: "under_review", label: "Under Review", at: fmt(app.reviewed_at), Icon: Eye, done: !!app.reviewed_at || ["under_review", "approved", "rejected"].includes(app.status) },
    {
      key: "decision",
      label: app.status === "rejected" ? "Rejected" : "Accepted",
      at: fmt(app.decided_at),
      Icon: app.status === "rejected" ? XCircle : CheckCircle2,
      done: ["approved", "rejected"].includes(app.status)},
  ];
  return (
    <ol className="relative space-y-4 border-l pl-5">
      {steps.map((s) => (
        <li key={s.key} className="relative">
          <span
            className={`absolute -left-[26px] flex size-5 items-center justify-center rounded-full ring-2 ring-background ${
              s.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <s.Icon className="size-3" />
          </span>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <p className={`text-sm font-medium ${s.done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.at ?? "Pending"}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function StatusCard({ app, profile }: { app: Application; profile: Profile | null }) {
  const tierLabel = (profile?.membership_tier || app.tier || "general");
  const display = tierLabel.charAt(0).toUpperCase() + tierLabel.slice(1) + " Member";
  const status = profile?.membership_status === "active" ? "active" : app.status;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-accent/20 text-accent flex items-center justify-center">
            <Crown className="size-6" />
          </div>
          <div>
            <p className="font-semibold text-lg">{display}</p>
            <p className="text-sm text-muted-foreground">
              {profile?.joined_at
                ? `Joined ${new Date(profile.joined_at).toLocaleDateString()}`
                : `Applied ${new Date(app.submitted_at ?? app.created_at).toLocaleDateString()}`}
            </p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <StatusTimeline app={app} />

      {app.admin_notes && (
        <div className="rounded-md border bg-muted/40 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Note from the committee</p>
          <p className="whitespace-pre-wrap">{app.admin_notes}</p>
        </div>
      )}

      {status === "pending" && (
        <div className="rounded-md bg-muted/50 p-4 text-sm">
          Your application has been submitted. The committee will begin reviewing it shortly.
        </div>
      )}
      {status === "under_review" && (
        <div className="rounded-md bg-amber-500/10 p-4 text-sm">
          Your application is currently being reviewed. We aim to respond within 5 business days.
        </div>
      )}
      {status === "approved" && (
        <div className="rounded-md bg-green-500/10 p-4 text-sm">
          🎉 Welcome to A-WIN! Your membership has been approved.
        </div>
      )}
      {status === "active" && (
        <div className="rounded-md bg-green-500/10 p-4 text-sm">
          You're an active A-WIN member. Explore your events, documents and resources below.
        </div>
      )}
      {status === "rejected" && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm">
          Unfortunately we couldn't approve this application. Please contact us for more info.
        </div>
      )}
    </div>
  );
}

export default PortalPage;
