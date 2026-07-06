import { useEffect, useState, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, MapPin, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events | A-WIN" },
      { name: "description", content: "Browse upcoming and past A-WIN events." },
      { property: "og:title", content: "A-WIN Events" },
      { property: "og:description", content: "Masterclasses, summits and meetups for women investors across Africa." },
    ],
  }),
  component: EventsPage,
});

type EventRow = {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string | null;
  location: string;
  image_url: string | null;
  event_type: string;
  max_attendees: number | null;
  registration_deadline: string | null;
};

type Filter = "all" | "upcoming" | "past";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}
function dateBadge(iso: string) {
  const d = new Date(iso);
  return {
    d: d.toLocaleDateString("en-ZA", { day: "2-digit" }),
    m: d.toLocaleDateString("en-ZA", { month: "short" }).toUpperCase(),
  };
}

function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [registering, setRegistering] = useState<EventRow | null>(null);
  const [reg, setReg] = useState({ full_name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  // event_id -> registration row for the current user
  const [myRsvps, setMyRsvps] = useState<Record<string, { id: string; status: string }>>({});
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, description, event_date, event_time, location, image_url, event_type, max_attendees, registration_deadline")
      .eq("published", true)
      .order("event_date", { ascending: true })
      .then(({ data }) => setEvents((data as EventRow[]) ?? []));
  }, []);

  const loadMyRsvps = useCallback(async () => {
    if (!user?.id) {
      setMyRsvps({});
      return;
    }
    const { data } = await supabase
      .from("event_registrations")
      .select("id, event_id, status")
      .eq("user_id", user.id);
    const map: Record<string, { id: string; status: string }> = {};
    for (const r of (data ?? []) as { id: string; event_id: string; status: string }[]) {
      map[r.event_id] = { id: r.id, status: r.status };
    }
    setMyRsvps(map);
  }, [user?.id]);

  useEffect(() => { loadMyRsvps(); }, [loadMyRsvps]);

  useEffect(() => {
    if (registering && user) {
      setReg((r) => ({ ...r, email: user.email ?? r.email }));
    }
  }, [registering, user]);

  const now = Date.now();
  const filtered = (events ?? []).filter((e) => {
    const ts = new Date(e.event_date).getTime();
    if (filter === "upcoming") return ts >= now;
    if (filter === "past") return ts < now;
    return true;
  });

  const submitRegistration = async () => {
    if (!registering) return;
    const { sanitizeText, sanitizeEmail, sanitizePhone, isDuplicateError } = await import("@/lib/sanitize");
    const cleanName = sanitizeText(reg.full_name);
    let cleanEmail = "";
    try {
      cleanEmail = sanitizeEmail(reg.email);
    } catch {
      return toast.error("Please enter a valid email address.");
    }
    if (!cleanName) return toast.error("Name and email are required.");
    setSubmitting(true);

    // For authenticated users, upsert on (event_id, user_id) so cancelled → confirmed re-uses the row.
    const payload = {
      event_id: registering.id,
      user_id: user?.id ?? null,
      full_name: cleanName,
      email: cleanEmail,
      phone: sanitizePhone(reg.phone) || null,
      status: "confirmed" as const,
    };

    const { error } = user?.id
      ? await supabase
          .from("event_registrations")
          .upsert(payload, { onConflict: "event_id,user_id" })
      : await supabase.from("event_registrations").insert(payload);

    setSubmitting(false);
    if (error) {
      if (isDuplicateError(error)) {
        toast.success("You're already registered for this event.");
        setRegistering(null);
        await loadMyRsvps();
        return;
      }
      return toast.error(error.message);
    }
    toast.success("You're registered! We'll email confirmation soon.");
    setRegistering(null);
    setReg({ full_name: "", email: "", phone: "" });
    await loadMyRsvps();
  };

  const cancelRsvp = async (eventId: string) => {
    const row = myRsvps[eventId];
    if (!row) return;
    if (!confirm("Cancel your registration for this event?")) return;
    setCancelling(eventId);
    const { error } = await supabase
      .from("event_registrations")
      .update({ status: "cancelled" })
      .eq("id", row.id);
    setCancelling(null);
    if (error) return toast.error(error.message);
    toast.success("Your registration has been cancelled.");
    await loadMyRsvps();
  };


  return (
    <>
      <section className="relative overflow-hidden px-4 py-24 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,var(--accent),transparent_55%)] opacity-25" />
        <div className="absolute inset-0 bg-primary-deep/10" />
        <div className="relative mx-auto max-w-5xl animate-fade-in">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary-foreground/70">
            <Link to="/" className="hover:text-accent transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-accent">Events</span>
          </nav>
          <h1 className="mt-5 font-serif">Events</h1>
          <p className="mt-5 max-w-2xl text-primary-foreground/85 md:text-lg">
            Masterclasses, summits and member meetups designed to move you forward as an investor.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-medium transition-colors",
                  filter === f.id ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <h2 className="mt-10 font-serif text-2xl text-foreground">Upcoming Events</h2>

          {events === null ? (
            <div className="mt-10 flex justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <>
              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Card key={i} className="overflow-hidden border-border/60 shadow-[var(--shadow-elegant)]">
                    <div className="relative h-44 w-full bg-muted">
                      <div className="absolute left-4 top-4 rounded-lg bg-accent/90 px-3 py-1.5 text-center text-accent-foreground shadow-md">
                        <div className="font-serif text-xl leading-none">TBC</div>
                        <div className="text-[10px] font-semibold tracking-widest">DATE</div>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <h3 className="font-serif text-lg text-foreground">Event details coming soon</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> [Date TBC]</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> [Location TBC]</span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        Full event details will be announced soon.
                      </p>
                      <Button asChild className="mt-5 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                        <Link to="/contact">Register Interest</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
                A-WIN hosts regular investment workshops, networking events, and
                annual summits. Events are announced to members first. Join us
                to be the first to know.
              </p>
            </>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((e) => {
                const db = dateBadge(e.event_date);
                const isPast = new Date(e.event_date).getTime() < now;
                return (
                  <Card key={e.id} className="overflow-hidden border-border/60 shadow-[var(--shadow-elegant)] hover-scale">
                    <div className="relative h-44 w-full bg-cover bg-center" style={{ background: e.image_url ? `url(${e.image_url}) center/cover` : "var(--gradient-placeholder)" }}>
                      <div className="absolute left-4 top-4 rounded-lg bg-accent px-3 py-1.5 text-center text-accent-foreground shadow-md">
                        <div className="font-serif text-xl leading-none">{db.d}</div>
                        <div className="text-[10px] font-semibold tracking-widest">{db.m}</div>
                      </div>
                      {isPast && <Badge className="absolute right-4 top-4 bg-background/80 text-foreground">Past</Badge>}
                    </div>
                    <CardContent className="p-6">
                      <h3 className="font-serif text-lg text-foreground">{e.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(e.event_date)}{e.event_time && ` · ${e.event_time}`}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.location}</span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">{e.description}</p>
                      {(() => {
                        const my = myRsvps[e.id];
                        const isConfirmed = my?.status === "confirmed";
                        if (isPast) {
                          return (
                            <Button className="mt-5 w-full" variant="outline" disabled>
                              Event Ended
                            </Button>
                          );
                        }
                        if (isConfirmed) {
                          return (
                            <div className="mt-5 space-y-2">
                              <div className="flex items-center justify-center gap-2 rounded-md bg-green-100 px-3 py-2 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-200">
                                <CheckCircle2 className="size-4" />
                                You are registered
                              </div>
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => cancelRsvp(e.id)}
                                disabled={cancelling === e.id}
                              >
                                {cancelling === e.id && <Loader2 className="size-4 mr-2 animate-spin" />}
                                Cancel registration
                              </Button>
                            </div>
                          );
                        }
                        return (
                          <Button
                            className="mt-5 w-full bg-accent text-accent-foreground hover:bg-accent/90"
                            onClick={() => setRegistering(e)}
                          >
                            {my?.status === "cancelled" ? "Re-register" : "Register"}
                          </Button>
                        );
                      })()}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>


      <Dialog open={!!registering} onOpenChange={(o) => !o && setRegistering(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Register for {registering?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Full name</Label>
              <Input value={reg.full_name} onChange={(e) => setReg({ ...reg, full_name: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Phone (optional)</Label>
              <Input value={reg.phone} onChange={(e) => setReg({ ...reg, phone: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRegistering(null)}>Cancel</Button>
            <Button onClick={submitRegistration} disabled={submitting}>
              {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}Confirm Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
