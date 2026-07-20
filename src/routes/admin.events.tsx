import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Copy, Pencil, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/events")({
  component: EventsAdminPage,
});

type EventRow = {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string | null;
  location: string;
  image_url: string | null;
  max_attendees: number | null;
  registration_deadline: string | null;
  event_type: string;
  published: boolean;
  is_awin_hosted: boolean;
};

type Registration = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  status: string;
};

const empty = (): Partial<EventRow> => ({
  title: "", description: "", event_date: "", event_time: "", location: "",
  image_url: "", max_attendees: null, registration_deadline: "", event_type: "in-person", published: false,
  is_awin_hosted: true,
});

function EventsAdminPage() {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [editing, setEditing] = useState<Partial<EventRow> | null>(null);
  const [viewingRegs, setViewingRegs] = useState<EventRow | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);

  const load = async () => {
    const { data } = await supabase.from("events").select("*").order("event_date", { ascending: false });
    setEvents((data as EventRow[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const loadRegs = async (eventId: string) => {
    const { data } = await supabase
      .from("event_registrations")
      .select("id, full_name, email, phone, created_at, status")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    setRegs((data as Registration[]) ?? []);
  };

  useEffect(() => {
    if (!viewingRegs) return;
    loadRegs(viewingRegs.id);
  }, [viewingRegs]);

  const cancelReg = async (id: string) => {
    if (!confirm("Cancel this attendee's registration?")) return;
    const { error } = await supabase
      .from("event_registrations")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Registration cancelled");
    if (viewingRegs) loadRegs(viewingRegs.id);
  };

  const reinstateReg = async (id: string) => {
    const { error } = await supabase
      .from("event_registrations")
      .update({ status: "confirmed" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Registration reinstated");
    if (viewingRegs) loadRegs(viewingRegs.id);
  };

  const save = async () => {
    if (!editing?.title || !editing.event_date || !editing.location) {
      return toast.error("Title, date and location are required.");
    }
    const payload = {
      title: editing.title,
      description: editing.description ?? "",
      event_date: editing.event_date,
      event_time: editing.event_time || null,
      location: editing.location,
      image_url: editing.image_url || null,
      max_attendees: editing.max_attendees ? Number(editing.max_attendees) : null,
      registration_deadline: editing.registration_deadline || null,
      event_type: editing.event_type ?? "in-person",
      published: editing.published ?? false,
      is_awin_hosted: editing.is_awin_hosted ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("events").update(payload).eq("id", editing.id)
      : await supabase.from("events").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Event saved");
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const duplicate = async (e: EventRow) => {
    const { id, ...rest } = e;
    void id;
    const { error } = await supabase.from("events").insert({ ...rest, title: `${e.title} (copy)`, published: false });
    if (error) return toast.error(error.message);
    toast.success("Duplicated");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl">Events</h1>
          <p className="text-sm text-muted-foreground">{events?.length ?? 0} total</p>
        </div>
        <Button onClick={() => setEditing(empty())}>
          <Plus className="size-4 mr-2" /> Add New Event
        </Button>
      </div>

      {events === null ? (
        <div className="py-8 flex justify-center"><Loader2 className="size-5 animate-spin" /></div>
      ) : events.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No events yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {events.map((e) => (
            <Card key={e.id}>
              <CardContent className="pt-6 flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold">{e.title}</h3>
                    <Badge variant={e.published ? "default" : "outline"}>
                      {e.published ? "Published" : "Draft"}
                    </Badge>
                    <Badge variant="outline">{e.event_type}</Badge>
                    {!e.is_awin_hosted && <Badge variant="outline">Community event</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.event_date).toLocaleDateString()} {e.event_time && `· ${e.event_time}`} · {e.location}
                  </p>
                  <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">{e.description}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setViewingRegs(e)}>
                    <Users className="size-4 mr-1" /> Attendees
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(e)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicate(e)}>
                    <Copy className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => del(e.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Event" : "New Event"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Field label="Title">
                <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </Field>
              <Field label="Description">
                <Textarea rows={3} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date">
                  <Input type="date" value={editing.event_date ?? ""} onChange={(e) => setEditing({ ...editing, event_date: e.target.value })} />
                </Field>
                <Field label="Time">
                  <Input type="time" value={editing.event_time ?? ""} onChange={(e) => setEditing({ ...editing, event_time: e.target.value })} />
                </Field>
              </div>
              <Field label="Location">
                <Input value={editing.location ?? ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
              </Field>
              <Field label="Image URL (paste a hosted image link)">
                <Input value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://..." />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Max attendees">
                  <Input type="number" value={editing.max_attendees ?? ""} onChange={(e) => setEditing({ ...editing, max_attendees: e.target.value ? Number(e.target.value) : null })} />
                </Field>
                <Field label="Registration deadline">
                  <Input type="date" value={editing.registration_deadline ?? ""} onChange={(e) => setEditing({ ...editing, registration_deadline: e.target.value })} />
                </Field>
              </div>
              <Field label="Event type">
                <Select value={editing.event_type ?? "in-person"} onValueChange={(v) => setEditing({ ...editing, event_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in-person">In-person</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center gap-2 pt-2">
                <Switch checked={editing.published ?? false} onCheckedChange={(v) => setEditing({ ...editing, published: v })} />
                <Label>Published (visible on public events page)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.is_awin_hosted ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_awin_hosted: v })} />
                <Label>A-WIN hosts this event (off = a community/partner event — A-WIN members are invited to attend, ticket &amp; payment handled by the host)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registrations dialog */}
      <Dialog open={!!viewingRegs} onOpenChange={(o) => !o && setViewingRegs(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Attendees: {viewingRegs?.title}</DialogTitle>
          </DialogHeader>
          {(() => {
            const confirmed = regs.filter((r) => r.status === "confirmed").length;
            const cancelled = regs.filter((r) => r.status === "cancelled").length;
            return (
              <div className="flex flex-wrap gap-2 -mt-1">
                <Badge>{confirmed} confirmed</Badge>
                {cancelled > 0 && <Badge variant="outline">{cancelled} cancelled</Badge>}
              </div>
            );
          })()}
          {regs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No registrations yet.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {regs.map((r) => (
                <div key={r.id} className="flex justify-between items-center gap-3 text-sm border-b pb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{r.full_name}</p>
                      {r.status === "cancelled" && (
                        <Badge variant="outline" className="text-xs">Cancelled</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.email}{r.phone && ` · ${r.phone}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                    {r.status === "confirmed" ? (
                      <Button size="sm" variant="ghost" onClick={() => cancelReg(r.id)}>
                        Cancel
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => reinstateReg(r.id)}>
                        Reinstate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
