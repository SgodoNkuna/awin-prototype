import { useEffect, useState, useCallback } from "react";
import { asset } from "@/lib/cdn";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, MapPin, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { EventGallery } from "@/components/site/EventGallery";
import { WCWGallery } from "@/components/site/WCWGallery";
import { LinkifiedText } from "@/components/site/LinkifiedText";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
const hike1 = asset("hike-2026/hike-00.44.593.jpeg");
const hike2 = asset("hike-2026/hike-00.44.5922.jpeg");
const hike3 = asset("hike-2026/hike-00.44.5966.jpeg");
const hike4 = asset("hike-2026/hike-00.45.001.jpeg");

const EVENT_FALLBACK_IMAGES = [hike1, hike2, hike3, hike4];

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events & Gallery | A-Win" },
      { name: "description", content: "Browse upcoming and past A-Win events, photography and member stories." },
      { property: "og:title", content: "A-Win Events & Gallery" },
      { property: "og:description", content: "Masterclasses, summits, meetups and event photography for women investors across Africa." },
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
  is_awin_hosted: boolean;
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
  const [viewingImage, setViewingImage] = useState<EventRow | null>(null);

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, description, event_date, event_time, location, image_url, event_type, max_attendees, registration_deadline, is_awin_hosted")
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
    // Notify the committee (gated by the event-registration notification toggle).
    void import("@/lib/email.functions").then(({ sendEventRegistrationNotification }) =>
      sendEventRegistrationNotification({
        data: { fullName: cleanName, email: cleanEmail, eventTitle: registering.title },
      }).catch(() => {}),
    );
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
            <span className="text-accent">Events &amp; Gallery</span>
          </nav>
          <h1 className="mt-5 font-serif">Events &amp; Gallery</h1>
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
                A-Win hosts regular investment workshops, networking events, and
                annual summits. Events are announced to members first. Join us
                to be the first to know.
              </p>
            </>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((e, i) => {
                const db = dateBadge(e.event_date);
                const isPast = new Date(e.event_date).getTime() < now;
                const cover = e.image_url || EVENT_FALLBACK_IMAGES[i % EVENT_FALLBACK_IMAGES.length];
                return (
                  <Card key={e.id} className="overflow-hidden border-border/60 shadow-[var(--shadow-elegant)] hover-scale">
                    <button
                      type="button"
                      onClick={() => setViewingImage(e)}
                      className="group relative block h-44 w-full cursor-zoom-in bg-cover bg-center bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{ backgroundImage: `url(${cover})` }}
                      aria-label={`View full poster for ${e.title}`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent transition-opacity group-hover:from-black/60" aria-hidden="true" />
                      <div className="absolute left-4 top-4 rounded-lg bg-accent px-3 py-1.5 text-center text-accent-foreground shadow-md">
                        <div className="font-serif text-xl leading-none">{db.d}</div>
                        <div className="text-[10px] font-semibold tracking-widest">{db.m}</div>
                      </div>
                      {isPast && <Badge className="absolute right-4 top-4 bg-background/80 text-foreground">Past</Badge>}
                      {!e.is_awin_hosted && !isPast && (
                        <Badge className="absolute bottom-3 right-4 bg-background/90 text-foreground shadow">
                          Meet A-Win here
                        </Badge>
                      )}
                    </button>
                    <CardContent className="p-6">
                      <h3 className="font-serif text-lg text-foreground">{e.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(e.event_date)}{e.event_time && ` · ${e.event_time}`}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.location}</span>
                      </div>
                      {!e.is_awin_hosted && (
                        <p className="mt-2 text-xs font-medium text-accent-deep">
                          Not an A-Win event — a community event where A-Win members will be present. Tickets, stall bookings and enquiries go directly to the host (see poster).
                        </p>
                      )}
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">{e.description}</p>
                      {(() => {
                        const my = myRsvps[e.id];
                        const isConfirmed = my?.status === "confirmed";
                        if (!e.is_awin_hosted) {
                          return (
                            <Button className="mt-5 w-full" variant="outline" onClick={() => setViewingImage(e)}>
                              View poster &amp; details
                            </Button>
                          );
                        }
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

      <EventGallery />

      {/* WCW Summit gallery + news, folded in from the old /news page */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          <WCWGallery />
        </div>
      </section>

      <NewsSection />

      {/* Full-size poster viewer — same expand-to-view treatment as member profile cards. */}
      <Dialog open={!!viewingImage} onOpenChange={(o) => !o && setViewingImage(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          {viewingImage && (
            <>
              <DialogHeader className="p-5 pb-0">
                <DialogTitle className="font-serif text-xl">{viewingImage.title}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(viewingImage.event_date)}{viewingImage.event_time && ` · ${viewingImage.event_time}`}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {viewingImage.location}</span>
                </DialogDescription>
              </DialogHeader>
              <img
                src={viewingImage.image_url || EVENT_FALLBACK_IMAGES[0]}
                alt={`${viewingImage.title} poster`}
                className="mt-4 max-h-[55vh] w-full object-contain"
              />
              <div className="p-5 pt-4 space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap"><LinkifiedText text={viewingImage.description} /></p>
                {!viewingImage.is_awin_hosted && (
                  <p className="text-xs font-medium text-accent-deep">
                    This is not an A-Win event. Ticket, stall and payment enquiries go directly to the host organiser — see the poster above.
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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

type Article = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content: string | null;
  cover_image: string | null;
  category: string | null;
  published_at: string | null;
  author_name: string | null;
};

/** News & Insights strip, folded in from the retired /news page. */
function NewsSection() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [reading, setReading] = useState<Article | null>(null);

  useEffect(() => {
    supabase
      .from("news_articles")
      .select("id, title, slug, excerpt, content, cover_image, category, published_at, author_name")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        const rows = (data as Article[]) ?? [];
        setArticles(rows);
        // Deep-link support: /events?article=<slug> opens the reader directly
        // (used by the About page link, avoids needing a dedicated route/page).
        const wanted = new URLSearchParams(window.location.search).get("article");
        if (wanted) {
          const match = rows.find((a) => a.slug === wanted);
          if (match) setReading(match);
        }
      });
  }, []);

  return (
    <section className="py-12">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="font-serif text-2xl text-foreground">News &amp; Insights</h2>
        <p className="mt-2 text-sm text-muted-foreground">Member stories and investment insights from the network.</p>
        <div className="mt-8">
          {articles === null ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
            </div>
          ) : articles.length === 0 ? (
            <EmptyState
              title="First stories coming soon"
              description="Our editorial team is preparing the first articles. Check back shortly."
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => a.content && setReading(a)}
                  disabled={!a.content}
                  className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl disabled:cursor-default"
                >
                  <Card className="h-full overflow-hidden border-border/60 transition-transform hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]">
                    <div
                      className="aspect-video w-full bg-cover bg-center"
                      style={{ background: a.cover_image ? `url(${a.cover_image}) center/cover` : "var(--gradient-hero)" }}
                      aria-hidden="true"
                    />
                    <CardContent className="p-6">
                      {a.category && <Badge variant="outline" className="mb-3">{a.category}</Badge>}
                      <h3 className="font-serif text-xl text-foreground">{a.title}</h3>
                      {a.excerpt && <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{a.excerpt}</p>}
                      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {a.published_at ? new Date(a.published_at).toLocaleDateString() : "-"}
                        </div>
                        {a.author_name && <span>{a.author_name}</span>}
                      </div>
                      {a.content && (
                        <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                          Read more <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full article reader — a "paper to read" view, no dedicated route needed. */}
      <Dialog open={!!reading} onOpenChange={(o) => !o && setReading(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          {reading && (
            <>
              {reading.cover_image && (
                <div
                  className="aspect-[21/9] w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${reading.cover_image})` }}
                  aria-hidden="true"
                />
              )}
              <div className="p-6 sm:p-10">
                <DialogHeader className="text-left">
                  {reading.category && <Badge variant="outline" className="mb-3 self-start">{reading.category}</Badge>}
                  <DialogTitle className="font-serif text-2xl sm:text-3xl leading-tight text-foreground">
                    {reading.title}
                  </DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs pt-1">
                    {reading.author_name && <span>{reading.author_name}</span>}
                    {reading.published_at && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(reading.published_at).toLocaleDateString()}
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="prose-reader mt-6 max-w-none font-serif text-[1.05rem] leading-[1.85] text-foreground/90 whitespace-pre-wrap">
                  <LinkifiedText text={reading.content ?? ""} />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
