import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Copy, Check, Pencil, Users, Loader2, Download, Sparkles, CloudUpload } from "lucide-react";
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

  const exportRegsCsv = () => {
    if (!viewingRegs) return;
    const headers = ["Name", "Email", "Phone", "Status", "Registered"];
    const rows = regs.map((r) => [r.full_name, r.email, r.phone ?? "", r.status, new Date(r.created_at).toLocaleString()]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${viewingRegs.title.replace(/[^a-z0-9]+/gi, "-")}-attendees.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportRegsPdf = async () => {
    if (!viewingRegs) return;
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const margin = 40;
    pdf.setFillColor(61, 139, 47);
    pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 60, "F");
    const { AWIN_LOGO_WHITE_PNG_BASE64 } = await import("@/lib/awin-logo-base64");
    pdf.addImage(AWIN_LOGO_WHITE_PNG_BASE64, "PNG", margin, 12, 36, 36);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("African Women Investment Network", margin + 44, 34);
    pdf.setTextColor(20, 20, 20);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(`Attendees: ${viewingRegs.title}`, margin, 90);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(90, 90, 90);
    pdf.text(`${regs.filter((r) => r.status === "confirmed").length} confirmed of ${regs.length} total`, margin, 108);

    let y = 140;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(90, 90, 90);
    pdf.text("NAME", margin, y);
    pdf.text("EMAIL", margin + 150, y);
    pdf.text("STATUS", margin + 340, y);
    pdf.text("REGISTERED", margin + 410, y);
    y += 6;
    pdf.setDrawColor(220, 220, 220);
    pdf.line(margin, y, pdf.internal.pageSize.getWidth() - margin, y);
    y += 16;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(20, 20, 20);
    for (const r of regs) {
      if (y > 780) { pdf.addPage(); y = 60; }
      pdf.text(r.full_name.slice(0, 28), margin, y);
      pdf.text(r.email.slice(0, 32), margin + 150, y);
      pdf.text(r.status, margin + 340, y);
      pdf.text(new Date(r.created_at).toLocaleDateString(), margin + 410, y);
      y += 18;
    }
    pdf.save(`${viewingRegs.title.replace(/[^a-z0-9]+/gi, "-")}-attendees.pdf`);
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

    // Detect date/time/location changes on an existing event so registered
    // members can be alerted — compare against what was loaded before editing.
    const before = editing.id ? events?.find((e) => e.id === editing.id) : null;
    const changeNotes: string[] = [];
    if (before) {
      if (before.event_date !== payload.event_date) {
        changeNotes.push(`Date changed from ${new Date(before.event_date).toLocaleDateString()} to ${new Date(payload.event_date).toLocaleDateString()}`);
      }
      if ((before.event_time ?? "") !== (payload.event_time ?? "")) {
        changeNotes.push(`Time changed from ${before.event_time || "TBC"} to ${payload.event_time || "TBC"}`);
      }
      if (before.location !== payload.location) {
        changeNotes.push(`Location changed from "${before.location}" to "${payload.location}"`);
      }
    }

    const { error } = editing.id
      ? await supabase.from("events").update(payload).eq("id", editing.id)
      : await supabase.from("events").insert(payload);
    if (error) return toast.error(error.message);

    if (editing.id && changeNotes.length > 0) {
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("event_changes").insert({
        event_id: editing.id,
        summary: changeNotes.join(". "),
        changed_by: userData.user?.id ?? null,
      });
      toast.success(`Event saved — registered members will see: ${changeNotes.join(". ")}`);
    } else {
      toast.success("Event saved");
    }
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
              {!editing.id && (
                <PosterUploadExtract
                  onUploaded={(imageUrl) => setEditing((cur) => ({ ...cur, image_url: imageUrl }))}
                />
              )}
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
                <Label>A-Win hosts this event (off = a community/partner event; A-Win members are invited to attend, ticket &amp; payment handled by the host)</Label>
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
              <div className="flex flex-wrap items-center justify-between gap-2 -mt-1">
                <div className="flex flex-wrap gap-2">
                  <Badge>{confirmed} confirmed</Badge>
                  {cancelled > 0 && <Badge variant="outline">{cancelled} cancelled</Badge>}
                </div>
                {regs.length > 0 && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={exportRegsCsv}>
                      <Download className="size-3.5 mr-1" /> CSV
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportRegsPdf}>
                      <Download className="size-3.5 mr-1" /> PDF
                    </Button>
                  </div>
                )}
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

const POSTER_EXTRACTION_PROMPT = `Read this event poster image and extract: Event title, Date, Time, Location/venue, Short description (1-2 sentences suitable for a public listing), and whether A-Win is hosting it or just attending (look for wording like "hosted by" or a different organization's branding). Output as a labeled list matching: Title | Date | Time | Location | Description | Is A-Win hosting (yes/no).`;

/** Upload a poster image as the event cover, plus a copy-paste prompt to run
 * through any AI chat (Claude.ai, ChatGPT, etc.) to get the fields to
 * type in below — no API key wired into this project for it. */
function PosterUploadExtract({ onUploaded }: { onUploaded: (imageUrl: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(POSTER_EXTRACTION_PROMPT);
    setCopied(true);
    toast.success("Prompt copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8 MB");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `events/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("gallery")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
      onUploaded(pub.publicUrl);
      toast.success("Poster uploaded as the event image");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-md border border-accent/30 bg-accent/5 p-3 space-y-2.5">
      <label
        className={`flex items-center justify-center gap-2 rounded-md border border-dashed border-accent/50 py-4 text-sm text-accent-deep cursor-pointer hover:bg-accent/10 ${busy ? "opacity-60 pointer-events-none" : ""}`}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <CloudUpload className="size-4" />}
        {busy ? "Uploading…" : "Upload a poster as the event image"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </label>
      <div className="rounded-md border border-border bg-background/60 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium">
            <Sparkles className="size-3.5" /> Prompt to fill in the fields below
          </span>
          <Button size="sm" variant="outline" onClick={copyPrompt}>
            {copied ? <Check className="size-3.5 mr-1.5 text-primary" /> : <Copy className="size-3.5 mr-1.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Copy this, paste it into any AI chat along with the poster image, then type the results into the
          fields below.
        </p>
      </div>
    </div>
  );
}
