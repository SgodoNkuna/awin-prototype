import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Upload, Eye, EyeOff, ArrowUp, ArrowDown, Trash2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase as sb } from "@/integrations/supabase/client";
const supabase = sb as any;
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/gallery")({
  head: () => ({ meta: [{ title: "Event Gallery | A-WIN Admin" }] }),
  component: GalleryAdminPage,
});

type Category = "hike" | "wcw" | "coaching" | "other";
type Row = {
  id: string;
  category: Category;
  storage_path: string;
  caption: string | null;
  event_label: string | null;
  sort_order: number;
  is_visible: boolean;
};

const CATS: { id: Category; label: string }[] = [
  { id: "hike", label: "Hike 2026" },
  { id: "wcw", label: "WCW" },
  { id: "coaching", label: "Coaching" },
  { id: "other", label: "Other" },
];

const BUCKET = "event-gallery";

function GalleryAdminPage() {
  const { isAdmin } = useAuth();
  const [cat, setCat] = useState<Category>("hike");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [caption, setCaption] = useState("");
  const [eventLabel, setEventLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("event_gallery")
      .select("*")
      .eq("category", cat)
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    const list = (data as Row[]) ?? [];
    setRows(list);
    // Generate signed URLs
    const map: Record<string, string> = {};
    await Promise.all(list.map(async (r) => {
      const { data: s } = await supabase.storage.from(BUCKET).createSignedUrl(r.storage_path, 60 * 60);
      if (s?.signedUrl) map[r.id] = s.signedUrl;
    }));
    setUrls(map);
  }, [cat]);

  useEffect(() => { load(); }, [load]);

  const upload = async () => {
    if (!file) return toast.error("Choose an image");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${cat}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const nextOrder = ((rows ?? []).at(-1)?.sort_order ?? 0) + 10;
      const { error: insErr } = await supabase.from("event_gallery").insert({
        category: cat, storage_path: path, caption: caption || null,
        event_label: eventLabel || null, sort_order: nextOrder, is_visible: true,
      });
      if (insErr) throw insErr;
      toast.success("Image added");
      setFile(null); setCaption(""); setEventLabel("");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  const toggleVisible = async (r: Row) => {
    await supabase.from("event_gallery").update({ is_visible: !r.is_visible }).eq("id", r.id);
    await load();
  };

  const move = async (r: Row, dir: -1 | 1) => {
    if (!rows) return;
    const idx = rows.findIndex((x) => x.id === r.id);
    const swap = rows[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("event_gallery").update({ sort_order: swap.sort_order }).eq("id", r.id),
      supabase.from("event_gallery").update({ sort_order: r.sort_order }).eq("id", swap.id),
    ]);
    await load();
  };

  const remove = async (r: Row) => {
    if (!confirm("Delete this image? This cannot be undone.")) return;
    await supabase.storage.from(BUCKET).remove([r.storage_path]);
    await supabase.from("event_gallery").delete().eq("id", r.id);
    toast.success("Deleted");
    await load();
  };

  if (!isAdmin) return <p className="text-sm text-muted-foreground">Admins only.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">Event gallery</h1>
        <p className="text-sm text-muted-foreground">Upload, reorder and toggle visibility of gallery images per category.</p>
      </div>

      <Tabs value={cat} onValueChange={(v) => setCat(v as Category)}>
        <TabsList>{CATS.map((c) => <TabsTrigger key={c.id} value={c.id}>{c.label}</TabsTrigger>)}</TabsList>
      </Tabs>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold"><ImagePlus className="size-4" /> Add photo</div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label>Image file</Label>
              <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <Label>Event label</Label>
              <Input value={eventLabel} onChange={(e) => setEventLabel(e.target.value)} placeholder="A-WIN Hike · April 2026" />
            </div>
            <div>
              <Label>Caption</Label>
              <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Sisterhood on the trail" />
            </div>
          </div>
          <Button onClick={upload} disabled={!file || busy}>
            {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Upload className="mr-1 size-4" />} Upload
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {rows === null ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No images in this category yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {rows.map((r, i) => (
                <div key={r.id} className="group overflow-hidden rounded-xl border bg-card">
                  <div className="relative aspect-square bg-muted">
                    {urls[r.id] ? (
                      <img src={urls[r.id]} alt={r.caption ?? ""} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
                    )}
                    {!r.is_visible && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                        <Badge variant="outline">Hidden</Badge>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-2">
                    <div className="truncate text-xs font-semibold">{r.event_label ?? "—"}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{r.caption ?? ""}</div>
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => move(r, -1)} disabled={i === 0} title="Move up">
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => move(r, 1)} disabled={i === rows.length - 1} title="Move down">
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => toggleVisible(r)} title={r.is_visible ? "Hide" : "Show"}>
                        {r.is_visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="ml-auto size-7 text-destructive" onClick={() => remove(r)} title="Delete">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
