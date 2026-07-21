import { useState } from "react";
import { asset } from "@/lib/cdn";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";

const wcw1 = asset("wcw/wcw-1.jpeg");
const wcw2 = asset("wcw/wcw-2.jpeg");
const wcw3 = asset("wcw/wcw-3.jpeg");
const wcw4 = asset("wcw/wcw-4.jpeg");
const wcw5 = asset("wcw/wcw-5.jpeg");
const wcw6 = asset("wcw/wcw-6.jpeg");
const vid1 = asset("wcw/wcw-31.mp4");
const vid2 = asset("wcw/wcw-32.mp4");
const vid3 = asset("wcw/wcw-32-1.mp4");
const vid4 = asset("wcw/wcw-32-2.mp4");

// Paired sequence: each photo aligns with the matching video segment from the
// Graça Machel Trust · Women Creating Wealth Program Graduation (November 2024).
const pairs = [
  {
    image: { src: wcw1, caption: "1 · Opening — From Debt to Riches book signing" },
    video: { src: vid1, caption: "1 · Opening — WCW Summit highlight reel" },
  },
  {
    image: { src: wcw2, caption: "2 · Sisterhood on the floor" },
    video: { src: vid2, caption: "2 · Member testimonial" },
  },
  {
    image: { src: wcw3, caption: "3 · Panel: Women Creating Wealth" },
    video: { src: vid3, caption: "3 · On-stage moments" },
  },
  {
    image: { src: wcw4, caption: "4 · Celebrating member milestones" },
    video: { src: vid4, caption: "4 · Behind the scenes" },
  },
];

// Additional photos (no paired video) shown after the main sequence.
const extraImages = [
  { src: wcw5, caption: "5 · Mentorship in action" },
  { src: wcw6, caption: "6 · Graduation embrace" },
];

const images = [...pairs.map((p) => p.image), ...extraImages];
const videos = pairs.map((p) => p.video);

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
            Graça Machel Trust · Women Creating Wealth Program Graduation
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Moments from the WCW Summit — celebrating A-Win members, mentors and the
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
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/55 to-transparent p-3 text-left text-xs font-semibold text-white">
                {img.caption}
              </span>
            </button>
          ))}
        </div>

        <h3 className="mt-12 font-serif text-xl text-foreground">Video highlights (paired with photos above)</h3>
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
