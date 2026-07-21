import { useState } from "react";
import { asset } from "@/lib/cdn";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const h1 = asset("hike-2026/hike-00.44.593.jpeg");
const h2 = asset("hike-2026/hike-00.44.5844.jpeg");
const h3 = asset("hike-2026/hike-00.44.5922.jpeg");
const h4 = asset("hike-2026/hike-00.44.5966.jpeg");
const h5 = asset("hike-2026/hike-00.45.001.jpeg");
// h6 (hike-00.45.00.jpeg) intentionally omitted — asset is a book cover, not a hike photo.
const h7 = asset("hike-2026/hike-00.45.00-2.jpeg");
const h8 = asset("hike-2026/hike-00.44.5911.jpeg");
const h9 = asset("hike-2026/hike-00.44.5932.jpeg");

const photos = [
  { src: h1, caption: "Sisterhood on the trail" },
  { src: h2, caption: "By the bridge" },
  { src: h3, caption: "Team moment" },
  { src: h4, caption: "Riverside" },
  { src: h5, caption: "Crossing together" },
  { src: h7, caption: "Lakeside pause" },
  { src: h8, caption: "Onward" },
  { src: h9, caption: "Quiet waters" },
];


export function HikeGallery() {
  const [open, setOpen] = useState<{ src: string; caption: string } | null>(null);
  return (
    <section id="hike-2026" className="bg-secondary/40 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <Badge className="bg-accent text-accent-foreground">April 2026</Badge>
          <h2 className="mt-3 font-serif text-foreground">A-Win Hike · April 2026</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Fresh air, full hearts. Members walking together — the sisterhood beyond the boardroom.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
          {photos.map((p) => (
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
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/55 to-transparent p-3 text-left text-xs font-semibold text-white">
                {p.caption}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-4xl border-0 bg-background p-0">
          <DialogTitle className="sr-only">{open?.caption ?? "Hike photo"}</DialogTitle>
          {open && <img src={open.src} alt={open.caption} className="h-auto w-full rounded-lg" />}
          {open && <p className="px-4 pb-4 pt-2 text-sm text-muted-foreground">{open.caption}</p>}
        </DialogContent>
      </Dialog>
    </section>
  );
}
