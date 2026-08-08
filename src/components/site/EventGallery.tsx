import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { asset } from "@/lib/cdn";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Photo = { id: string; src: string; caption: string; event: string; category: string };

// Seed labels for the categories admin.gallery.tsx ships with — any further
// category an admin types in there just shows up automatically, titled from
// its slug (see labelize below).
const CATEGORY_LABELS: Record<string, string> = {
  "womens-day": "Women's Day 2026",
  hike: "Hike 2026",
  wcw: "WCW",
  coaching: "Coaching",
  other: "Other",
};

const labelize = (id: string) =>
  CATEGORY_LABELS[id] ??
  id.split(/[-_\s]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

export function EventGallery({ heading = true }: { heading?: boolean }) {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [cat, setCat] = useState<string>("all");
  const [open, setOpen] = useState<Photo | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("event_gallery")
        .select("id, category, storage_path, caption, event_label")
        .eq("is_visible", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      const rows = (data ?? []) as { id: string; category: string; storage_path: string; caption: string | null; event_label: string | null }[];
      setPhotos(
        rows.map((r) => ({
          id: r.id,
          src: asset(r.storage_path.replace(/^assets\//, "")),
          caption: r.caption ?? "",
          event: r.event_label ?? labelize(r.category),
          category: r.category,
        })),
      );
    })();
    return () => { cancelled = true; };
  }, []);

  if (photos === null) {
    return (
      <section className="bg-secondary/30 py-16">
        <div className="flex justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      </section>
    );
  }
  if (photos.length === 0) return null;

  const categories = Array.from(new Set(photos.map((p) => p.category)));
  const tabs = [{ id: "all", label: "All" }, ...categories.map((id) => ({ id, label: labelize(id) }))];
  const items = cat === "all" ? photos : photos.filter((p) => p.category === cat);

  return (
    <section className="bg-secondary/30 py-16">
      <div className="mx-auto max-w-6xl px-4">
        {heading && (
          <div className="text-center">
            <Badge className="bg-accent text-accent-foreground">Event gallery</Badge>
            <h2 className="mt-3 font-serif text-foreground">Moments from our community</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Hikes, coaching circles, panels and Woman Crush Wednesdays: the sisterhood in real life.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setCat(t.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors",
                cat === t.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(p)}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 shadow-[var(--shadow-elegant)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Open photo: ${p.caption}`}
            >
              <img
                src={p.src}
                alt={p.caption}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-3 text-left text-[11px] font-semibold uppercase tracking-widest text-white">
                <span className="block truncate">{p.event}</span>
                <span className="block truncate text-[10px] font-normal normal-case tracking-normal text-white/80">
                  {p.caption}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-4xl border-0 bg-background p-0">
          <DialogTitle className="sr-only">{open?.caption ?? "Event photo"}</DialogTitle>
          {open && <img src={open.src} alt={open.caption} className="h-auto w-full rounded-lg" />}
          {open && (
            <div className="px-4 pb-4 pt-2">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{open.event}</div>
              <p className="text-sm text-foreground">{open.caption}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
