import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Upload, Eye, EyeOff, ArrowUp, ArrowDown, Trash2, ImagePlus, Plus, FolderX, Video as VideoIcon } from "lucide-react";
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
  head: () => ({ meta: [{ title: "Event Gallery | A-Win Admin" }] }),
  component: GalleryAdminPage,
});

// The `category` column is plain text (no fixed list in the database) — these
// are just seed labels shown even when a category has no photos yet. Admins
// can add any further category from the "+ New category" button; it appears
// as a real tab as soon as it has a photo tagged with it.
const SEED_CATEGORIES: { id: string; label: string }[] = [
  { id: "hike", label: "Hike 2026" },
  { id: "wcw", label: "WCW" },
  { id: "coaching", label: "Coaching" },
  { id: "other", label: "Other" },
];

const labelize = (id: string) =>
  id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

const slugifyCategory = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

type Row = {
  id: string;
  category: string;
  storage_path: string;
  caption: string | null;
  event_label: string | null;
  sort_order: number;
  is_visible: boolean;
  media_type: string;
};

// Public "gallery" bucket, under the same assets/ prefix the site's own
// asset() helper resolves — so admin uploads and the hand-placed photos
// they were backfilled alongside live in the same place. (Was the private
// "event-gallery" bucket with signed URLs — pointless for content that's
// meant to be public, and the public site never actually read from it.)
const BUCKET = "gallery";
const pathFor = (category: string, filename: string) => `assets/${category}/${filename}`;

function GalleryAdminPage() {
  const { isAdmin } = useAuth();
  const [cat, setCat] = useState<string>("hike");
  const [categories, setCategories] = useState<{ id: string; label: string }[]>(SEED_CATEGORIES);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [caption, setCaption] = useState("");
  const [eventLabel, setEventLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  // Discover any categories already in use (from earlier uploads) so custom
  // ones added on another visit still show up as tabs here. Seed categories
  // an admin has deleted are hidden via the `gallery_hidden_categories` site
  // setting — they're hardcoded defaults, not real rows, so "deleting" one
  // just needs to survive a reload rather than removing anything from the DB.
  const loadCategories = useCallback(async () => {
    const [{ data }, { data: hiddenSetting }] = await Promise.all([
      supabase.from("event_gallery").select("category"),
      supabase.from("site_settings").select("value").eq("key", "gallery_hidden_categories").maybeSingle(),
    ]);
    const hidden = new Set((hiddenSetting?.value as { ids?: string[] } | null)?.ids ?? []);
    const existing = Array.from(new Set(((data as { category: string }[]) ?? []).map((r) => r.category)));
    setCategories(() => {
      const base = SEED_CATEGORIES.filter((c) => !hidden.has(c.id));
      const known = new Set(base.map((c) => c.id));
      const extra = existing.filter((id) => !known.has(id) && !hidden.has(id)).map((id) => ({ id, label: labelize(id) }));
      return [...base, ...extra];
    });
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("event_gallery")
      .select("*")
      .eq("category", cat)
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    const list = (data as Row[]) ?? [];
    setRows(list);
    const map: Record<string, string> = {};
    for (const r of list) {
      map[r.id] = supabase.storage.from(BUCKET).getPublicUrl(r.storage_path).data.publicUrl;
    }
    setUrls(map);
  }, [cat]);

  useEffect(() => { load(); }, [load]);

  const addCategory = () => {
    const id = slugifyCategory(newCategoryName);
    if (!id) return toast.error("Enter a category name");
    if (categories.some((c) => c.id === id)) return toast.error("That category already exists");
    setCategories((c) => [...c, { id, label: labelize(id) }]);
    setCat(id);
    setNewCategoryName("");
    setAddingCategory(false);
  };

  const [deletingCategory, setDeletingCategory] = useState(false);

  const removeCategory = async () => {
    const target = categories.find((c) => c.id === cat);
    if (!target) return;
    const photoCount = rows?.length ?? 0;
    if (!confirm(`Delete "${target.label}"? This permanently deletes ${photoCount} photo${photoCount === 1 ? "" : "s"} in it. This cannot be undone.`)) return;
    setDeletingCategory(true);
    try {
      if (rows?.length) {
        await supabase.storage.from(BUCKET).remove(rows.map((r) => r.storage_path));
        await supabase.from("event_gallery").delete().eq("category", cat);
      }
      // Seed categories are hardcoded, not DB rows — persist the hide so it
      // survives a reload; custom categories just stop existing once their
      // last photo is gone, so no setting write is needed for those.
      if (SEED_CATEGORIES.some((c) => c.id === cat)) {
        const { data: current } = await supabase.from("site_settings").select("value").eq("key", "gallery_hidden_categories").maybeSingle();
        const hidden = Array.from(new Set([...(((current?.value as { ids?: string[] } | null)?.ids) ?? []), cat]));
        await supabase.from("site_settings").upsert({ key: "gallery_hidden_categories", value: { ids: hidden } });
      }
      const remaining = categories.filter((c) => c.id !== cat);
      setCategories(remaining);
      setCat(remaining[0]?.id ?? "");
      toast.success(`"${target.label}" deleted`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete category");
    } finally {
      setDeletingCategory(false);
    }
  };

  const upload = async () => {
    if (!file) return toast.error("Choose a photo or video");
    const isVideo = file.type.startsWith("video/");
    if (isVideo && file.size > 50 * 1024 * 1024) return toast.error("Video must be under 50 MB");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? (isVideo ? "mp4" : "jpg");
      const path = pathFor(cat, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const nextOrder = ((rows ?? []).at(-1)?.sort_order ?? 0) + 10;
      const { error: insErr } = await supabase.from("event_gallery").insert({
        category: cat, storage_path: path, caption: caption || null,
        event_label: eventLabel || null, sort_order: nextOrder, is_visible: true,
        media_type: isVideo ? "video" : "photo",
      });
      if (insErr) throw insErr;
      toast.success(isVideo ? "Video added" : "Image added");
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

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={cat} onValueChange={setCat}>
          <TabsList>{categories.map((c) => <TabsTrigger key={c.id} value={c.id}>{c.label}</TabsTrigger>)}</TabsList>
        </Tabs>
        {addingCategory ? (
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") setAddingCategory(false); }}
              placeholder="New category name"
              className="h-9 w-44"
            />
            <Button size="sm" onClick={addCategory}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingCategory(false); setNewCategoryName(""); }}>Cancel</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setAddingCategory(true)}>
            <Plus className="size-3.5 mr-1" /> New category
          </Button>
        )}
        {cat && (
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={deletingCategory} onClick={removeCategory}>
            {deletingCategory ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <FolderX className="size-3.5 mr-1" />} Delete category
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold"><ImagePlus className="size-4" /> Add photo or video</div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label>Photo or video file</Label>
              <Input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <p className="mt-1 text-xs text-muted-foreground">Videos up to 50 MB.</p>
            </div>
            <div>
              <Label>Event label</Label>
              <Input value={eventLabel} onChange={(e) => setEventLabel(e.target.value)} placeholder="A-Win Hike · April 2026" />
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
                      r.media_type === "video" ? (
                        <video src={urls[r.id]} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                      ) : (
                        <img src={urls[r.id]} alt={r.caption ?? ""} className="h-full w-full object-cover" />
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
                    )}
                    {r.media_type === "video" && (
                      <div className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5">
                        <VideoIcon className="size-3.5" />
                      </div>
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
