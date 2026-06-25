import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";

import wcw1 from "@/assets/wcw/wcw-1.jpeg.asset.json";
import wcw2 from "@/assets/wcw/wcw-2.jpeg.asset.json";
import wcw3 from "@/assets/wcw/wcw-3.jpeg.asset.json";
import wcw4 from "@/assets/wcw/wcw-4.jpeg.asset.json";
import wcw5 from "@/assets/wcw/wcw-5.jpeg.asset.json";
import wcw6 from "@/assets/wcw/wcw-6.jpeg.asset.json";
import vid1 from "@/assets/wcw/wcw-31.mp4.asset.json";
import vid2 from "@/assets/wcw/wcw-32.mp4.asset.json";
import vid3 from "@/assets/wcw/wcw-32-1.mp4.asset.json";
import vid4 from "@/assets/wcw/wcw-32-2.mp4.asset.json";

const images = [
  { src: wcw1.url, caption: "Member moments — From Debt to Riches book signing" },
  { src: wcw2.url, caption: "Sisterhood at the WCW Summit" },
  { src: wcw3.url, caption: "Panel: Women Creating Wealth" },
  { src: wcw4.url, caption: "Celebrating member milestones" },
  { src: wcw5.url, caption: "Mentorship in action" },
  { src: wcw6.url, caption: "Graduation embrace — November 2024" },
];

const videos = [
  { src: vid1.url, caption: "WCW Summit highlight reel" },
  { src: vid2.url, caption: "Member testimonial" },
  { src: vid3.url, caption: "On-stage moments" },
  { src: vid4.url, caption: "Behind the scenes" },
];

type Selected =
  | { kind: "image"; src: string; caption: string }
  | { kind: "video"; src: string; caption: string }
  | null;

export function WCWGallery() {
  const [selected, setSelected] = useState<Selected>(null);

  return (
    <section id="wcw" className="bg-secondary/40 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <Badge className="bg-accent text-accent-foreground">November 2024</Badge>
          <h2 className="mt-3 font-serif text-foreground">
            Graça Machel Trust · Women Creating Wealth Graduation
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Moments from the WCW Summit — celebrating A-WIN members, mentors and the
            sisterhood building generational wealth across Africa.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3">
          {images.map((img) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setSelected({ kind: "image", ...img })}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 shadow-[var(--shadow-elegant)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Open photo: ${img.caption}`}
            >
              <img
                src={img.src}
                alt={img.caption}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {img.caption}
              </span>
            </button>
          ))}
        </div>

        <h3 className="mt-12 font-serif text-xl text-foreground">Video highlights</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {videos.map((v) => (
            <button
              key={v.src}
              type="button"
              onClick={() => setSelected({ kind: "video", ...v })}
              className="group relative aspect-video overflow-hidden rounded-xl border border-border/60 bg-primary-deep shadow-[var(--shadow-elegant)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Play video: ${v.caption}`}
            >
              <video
                src={v.src}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
              />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-transform group-hover:scale-110">
                  <Play className="h-5 w-5" />
                </span>
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-left text-[11px] font-medium text-white">
                {v.caption}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl border-0 bg-background p-0">
          <DialogTitle className="sr-only">
            {selected?.caption ?? "WCW Summit media"}
          </DialogTitle>
          {selected?.kind === "image" && (
            <img
              src={selected.src}
              alt={selected.caption}
              className="h-auto w-full rounded-lg"
            />
          )}
          {selected?.kind === "video" && (
            <video
              src={selected.src}
              controls
              autoPlay
              playsInline
              className="h-auto w-full rounded-lg bg-black"
            />
          )}
          {selected && (
            <p className="px-4 pb-4 pt-2 text-sm text-muted-foreground">
              {selected.caption}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
