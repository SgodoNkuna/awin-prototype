import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const BOX = 380; // the crop editor fits the image within this on-screen box (either dimension)
const MAX_OUTPUT_DIM = 1600; // longest exported edge, cap for consistent file size/quality
const MIN_RECT = 24; // smallest allowed crop box, on-screen px
const HANDLE_HIT = 16; // corner handle hit-radius, on-screen px

type Rect = { x: number; y: number; w: number; h: number };
type AspectKey = "free" | "square" | "portrait" | "landscape";
const ASPECTS: Record<AspectKey, { label: string; ratio: number | null }> = {
  free: { label: "Free", ratio: null },
  square: { label: "Square", ratio: 1 },
  portrait: { label: "Portrait", ratio: 4 / 5 },
  landscape: { label: "Landscape", ratio: 16 / 9 },
};
type Corner = "nw" | "ne" | "sw" | "se";

function clampRect(r: Rect, boundsW: number, boundsH: number): Rect {
  const w = Math.min(Math.max(r.w, MIN_RECT), boundsW);
  const h = Math.min(Math.max(r.h, MIN_RECT), boundsH);
  const x = Math.min(Math.max(r.x, 0), boundsW - w);
  const y = Math.min(Math.max(r.y, 0), boundsH - h);
  return { x, y, w, h };
}

/** Largest rect of the given aspect ratio that fits centered within boundsW x boundsH. */
function centeredRectForAspect(ratio: number | null, boundsW: number, boundsH: number): Rect {
  if (!ratio) return { x: 0, y: 0, w: boundsW, h: boundsH };
  let w = boundsW;
  let h = w / ratio;
  if (h > boundsH) { h = boundsH; w = h * ratio; }
  return { x: (boundsW - w) / 2, y: (boundsH - h) / 2, w, h };
}

/**
 * Freeform crop dialog: the full image is shown at its natural aspect ratio
 * (fit to a box), with a draggable + resizable crop rectangle on top — move
 * it, resize from any corner, and optionally lock it to a preset aspect.
 * Works both for a freshly-picked File (crop before upload) and for an
 * already-uploaded image URL (re-crop after the fact).
 */
export function ImageCropper({
  source,
  open,
  onCancel,
  onCropped,
  defaultAspect = "free",
}: {
  source: File | string | null;
  open: boolean;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
  defaultAspect?: AspectKey;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [dispW, setDispW] = useState(0);
  const [dispH, setDispH] = useState(0);
  const [aspectKey, setAspectKey] = useState<AspectKey>(defaultAspect);
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const dragRef = useRef<
    | { mode: "move"; startX: number; startY: number; startRect: Rect }
    | { mode: "resize"; corner: Corner; startX: number; startY: number; startRect: Rect }
    | null
  >(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open || !source) {
      setImg(null);
      return;
    }
    setAspectKey(defaultAspect);
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => {
      const fitScale = Math.min(BOX / el.naturalWidth, BOX / el.naturalHeight, 1);
      const w = el.naturalWidth * fitScale;
      const h = el.naturalHeight * fitScale;
      setImg(el);
      setDispW(w);
      setDispH(h);
      setRect(centeredRectForAspect(ASPECTS[defaultAspect].ratio, w, h));
    };
    el.onerror = () => {
      toast.error("Couldn't load that image for cropping");
      onCancel();
    };
    el.src = typeof source === "string" ? source : URL.createObjectURL(source);
    return () => {
      if (typeof source !== "string") URL.revokeObjectURL(el.src);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source]);

  const setAspect = (key: AspectKey) => {
    setAspectKey(key);
    if (dispW && dispH) setRect(centeredRectForAspect(ASPECTS[key].ratio, dispW, dispH));
  };

  const onRectPointerDown = (e: React.PointerEvent) => {
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    dragRef.current = { mode: "move", startX: e.clientX, startY: e.clientY, startRect: rect };
  };

  const onHandlePointerDown = (corner: Corner) => (e: React.PointerEvent) => {
    e.stopPropagation();
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    dragRef.current = { mode: "resize", corner, startX: e.clientX, startY: e.clientY, startRect: rect };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !dispW || !dispH) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (drag.mode === "move") {
      setRect(clampRect({ ...drag.startRect, x: drag.startRect.x + dx, y: drag.startRect.y + dy }, dispW, dispH));
      return;
    }

    const ratio = ASPECTS[aspectKey].ratio;
    const { corner, startRect: sr } = drag;
    // Fixed corner is the one opposite the handle being dragged.
    const fixedX = corner === "nw" || corner === "sw" ? sr.x + sr.w : sr.x;
    const fixedY = corner === "nw" || corner === "ne" ? sr.y + sr.h : sr.y;
    let newW = corner === "nw" || corner === "sw" ? sr.w - dx : sr.w + dx;
    let newH = corner === "nw" || corner === "ne" ? sr.h - dy : sr.h + dy;
    newW = Math.max(newW, MIN_RECT);
    newH = Math.max(newH, MIN_RECT);
    if (ratio) {
      // Whichever dimension moved more (relatively) drives the other, so the
      // handle tracks the cursor's dominant axis instead of fighting it.
      if (Math.abs(dx) > Math.abs(dy)) newH = newW / ratio; else newW = newH * ratio;
    }
    const newX = corner === "nw" || corner === "sw" ? fixedX - newW : fixedX;
    const newY = corner === "nw" || corner === "ne" ? fixedY - newH : fixedY;
    setRect(clampRect({ x: newX, y: newY, w: newW, h: newH }, dispW, dispH));
  };
  const onPointerUp = () => { dragRef.current = null; };

  const confirm = () => {
    if (!img || !dispW || !dispH) return;
    const fitScale = dispW / img.naturalWidth;
    const sx = rect.x / fitScale;
    const sy = rect.y / fitScale;
    const sw = rect.w / fitScale;
    const sh = rect.h / fitScale;

    let outW = sw;
    let outH = sh;
    if (outW > MAX_OUTPUT_DIM || outH > MAX_OUTPUT_DIM) {
      if (outW >= outH) { outH = (outH / outW) * MAX_OUTPUT_DIM; outW = MAX_OUTPUT_DIM; }
      else { outW = (outW / outH) * MAX_OUTPUT_DIM; outH = MAX_OUTPUT_DIM; }
    }

    const canvas = canvasRef.current!;
    canvas.width = Math.round(outW);
    canvas.height = Math.round(outH);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => { if (blob) onCropped(blob); }, "image/jpeg", 0.92);
  };

  const handles: { corner: Corner; style: React.CSSProperties }[] = [
    { corner: "nw", style: { left: rect.x, top: rect.y } },
    { corner: "ne", style: { left: rect.x + rect.w, top: rect.y } },
    { corner: "sw", style: { left: rect.x, top: rect.y + rect.h } },
    { corner: "se", style: { left: rect.x + rect.w, top: rect.y + rect.h } },
  ];
  const cursorFor: Record<Corner, string> = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize" };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Adjust crop</DialogTitle></DialogHeader>
        {img ? (
          <div className="space-y-4">
            <div className="flex justify-center gap-1.5">
              {(Object.keys(ASPECTS) as AspectKey[]).map((key) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={aspectKey === key ? "default" : "outline"}
                  onClick={() => setAspect(key)}
                >
                  {ASPECTS[key].label}
                </Button>
              ))}
            </div>
            <div
              className="relative mx-auto touch-none select-none"
              style={{ width: dispW, height: dispH }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={img.src}
                  alt="Crop preview"
                  draggable={false}
                  className="absolute left-0 top-0 select-none"
                  style={{ width: dispW, height: dispH }}
                />
                {/* Dim everything outside the crop rect via a giant box-shadow */}
                <div
                  className="pointer-events-none absolute"
                  style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)" }}
                />
              </div>
              <div
                className="absolute cursor-move border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
                style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
                onPointerDown={onRectPointerDown}
              />
              {handles.map(({ corner, style }) => (
                <div
                  key={corner}
                  onPointerDown={onHandlePointerDown(corner)}
                  className="absolute rounded-full border-2 border-accent bg-white shadow"
                  style={{
                    ...style,
                    width: HANDLE_HIT,
                    height: HANDLE_HIT,
                    marginLeft: -HANDLE_HIT / 2,
                    marginTop: -HANDLE_HIT / 2,
                    cursor: cursorFor[corner],
                  }}
                />
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Drag inside the box to move it, drag a corner to resize. Pick an aspect ratio above, or leave it Free.
            </p>
          </div>
        ) : (
          <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">Loading…</div>
        )}
        <canvas ref={canvasRef} className="hidden" />
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={confirm} disabled={!img}>Use this crop</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
