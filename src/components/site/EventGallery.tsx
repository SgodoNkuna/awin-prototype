import { useState } from "react";
import { asset } from "@/lib/cdn";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const h1 = asset("hike-2026/hike-00.44.593.jpeg");
const h2 = asset("hike-2026/hike-00.44.5844.jpeg");
const h3 = asset("hike-2026/hike-00.44.5922.jpeg");
const h4 = asset("hike-2026/hike-00.44.5966.jpeg");
const h5 = asset("hike-2026/hike-00.45.001.jpeg");
const h7 = asset("hike-2026/hike-00.45.00-2.jpeg");
const h8 = asset("hike-2026/hike-00.44.5911.jpeg");
const h9 = asset("hike-2026/hike-00.44.5932.jpeg");
const w1 = asset("wcw/wcw-1.jpeg");
const w2 = asset("wcw/wcw-2.jpeg");
const w3 = asset("wcw/wcw-3.jpeg");
const w4 = asset("wcw/wcw-4.jpeg");
const w5 = asset("wcw/wcw-5.jpeg");
const w6 = asset("wcw/wcw-6.jpeg");
const c1 = asset("wcw-coaching/coaching-1.jpeg");
const c2 = asset("wcw-coaching/coaching-2.jpeg");
const c3 = asset("wcw-coaching/coaching-3.jpeg");
const c4 = asset("wcw-coaching/coaching-4.jpeg");

type Cat = "all" | "hike" | "wcw" | "coaching";

const PHOTOS: { src: string; caption: string; event: string; cat: Cat }[] = [
  { src: h1, caption: "Sisterhood on the trail", event: "A-WIN Hike · April 2026", cat: "hike" },
  { src: h2, caption: "By the bridge", event: "A-WIN Hike · April 2026", cat: "hike" },
  { src: h3, caption: "Team moment", event: "A-WIN Hike · April 2026", cat: "hike" },
  { src: h4, caption: "Riverside", event: "A-WIN Hike · April 2026", cat: "hike" },
  { src: h5, caption: "Crossing together", event: "A-WIN Hike · April 2026", cat: "hike" },
  { src: h7, caption: "Lakeside pause", event: "A-WIN Hike · April 2026", cat: "hike" },
  { src: h8, caption: "Onward", event: "A-WIN Hike · April 2026", cat: "hike" },
  { src: h9, caption: "Quiet waters", event: "A-WIN Hike · April 2026", cat: "hike" },
  { src: w1, caption: "WCW gathering", event: "Woman Crush Wednesday", cat: "wcw" },
  { src: w2, caption: "Panel in session", event: "Woman Crush Wednesday", cat: "wcw" },
  { src: w3, caption: "Community", event: "Woman Crush Wednesday", cat: "wcw" },
  { src: w4, caption: "Networking", event: "Woman Crush Wednesday", cat: "wcw" },
  { src: w5, caption: "Speakers", event: "Woman Crush Wednesday", cat: "wcw" },
  { src: w6, caption: "Full house", event: "Woman Crush Wednesday", cat: "wcw" },
  { src: c1, caption: "Group coaching", event: "Coaching with Nompumelelo", cat: "coaching" },
  { src: c2, caption: "Workshop notes", event: "Coaching with Nompumelelo", cat: "coaching" },
  { src: c3, caption: "Small circle", event: "Coaching with Nompumelelo", cat: "coaching" },
  { src: c4, caption: "Reflection", event: "Coaching with Nompumelelo", cat: "coaching" },
];

const TABS: { id: Cat; label: string }[] = [
  { id: "all", label: "All" },
  { id: "hike", label: "Hike 2026" },
  { id: "wcw", label: "WCW" },
  { id: "coaching", label: "Coaching" },
];

export function EventGallery({ heading = true }: { heading?: boolean }) {
  const [cat, setCat] = useState<Cat>("all");
  const [open, setOpen] = useState<(typeof PHOTOS)[number] | null>(null);
  const items = cat === "all" ? PHOTOS : PHOTOS.filter((p) => p.cat === cat);

  return (
    <section className="bg-secondary/30 py-16">
      <div className="mx-auto max-w-6xl px-4">
        {heading && (
          <div className="text-center">
            <Badge className="bg-accent text-accent-foreground">Event gallery</Badge>
            <h2 className="mt-3 font-serif text-foreground">Moments from our community</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Hikes, coaching circles, panels and Woman Crush Wednesdays — the sisterhood in real life.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {TABS.map((t) => (
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
              key={p.src}
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
