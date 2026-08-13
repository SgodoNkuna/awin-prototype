import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn } from "lucide-react";

const FRAME = 320; // on-screen crop frame, px (square)
const OUTPUT = 640; // exported image size, px (square)

type Pos = { x: number; y: number };

function clampPos(pos: Pos, scale: number, imgW: number, imgH: number): Pos {
  const dispW = imgW * scale;
  const dispH = imgH * scale;
  const minX = Math.min(0, FRAME - dispW);
  const minY = Math.min(0, FRAME - dispH);
  return { x: Math.min(0, Math.max(minX, pos.x)), y: Math.min(0, Math.max(minY, pos.y)) };
}

/**
 * Square-crop dialog: drag to pan, slider to zoom, exports a single square
 * image. Works both for a freshly-picked File (crop before upload) and for
 * an already-uploaded public image URL (re-crop after the fact) — same
 * canvas math either way, only the image source differs.
 */
export function ImageCropper({
  source,
  open,
  onCancel,
  onCropped,
}: {
  source: File | string | null;
  open: boolean;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [scale0, setScale0] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; startPos: Pos } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open || !source) {
      setImg(null);
      return;
    }
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => {
      const cover = FRAME / Math.min(el.naturalWidth, el.naturalHeight);
      setImg(el);
      setScale0(cover);
      setZoom(1);
      setPos(clampPos(
        { x: (FRAME - el.naturalWidth * cover) / 2, y: (FRAME - el.naturalHeight * cover) / 2 },
        cover,
        el.naturalWidth,
        el.naturalHeight,
      ));
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

  const scale = scale0 * zoom;

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPos: pos };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !img) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos(clampPos(
      { x: dragRef.current.startPos.x + dx, y: dragRef.current.startPos.y + dy },
      scale,
      img.naturalWidth,
      img.naturalHeight,
    ));
  };
  const onPointerUp = () => { dragRef.current = null; };

  const onZoomChange = ([z]: number[]) => {
    if (!img) return;
    setZoom(z);
    setPos((p) => clampPos(p, scale0 * z, img.naturalWidth, img.naturalHeight));
  };

  const confirm = () => {
    if (!img) return;
    const srcX = -pos.x / scale;
    const srcY = -pos.y / scale;
    const srcSize = FRAME / scale;
    const canvas = canvasRef.current!;
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT, OUTPUT);
    canvas.toBlob((blob) => { if (blob) onCropped(blob); }, "image/jpeg", 0.9);
  };

  const bg = useMemo(
    () => (img ? { backgroundImage: `url(${img.src})` } : {}),
    [img],
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Adjust crop</DialogTitle></DialogHeader>
        {img ? (
          <div className="space-y-4">
            <div
              className="relative mx-auto overflow-hidden rounded-lg border border-border bg-secondary touch-none"
              style={{ width: FRAME, height: FRAME }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              <img
                src={img.src}
                alt="Crop preview"
                draggable={false}
                className="absolute select-none"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: img.naturalWidth * scale,
                  height: img.naturalHeight * scale,
                  cursor: "grab",
                }}
              />
            </div>
            <div className="flex items-center gap-3">
              <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
              <Slider min={1} max={3} step={0.01} value={[zoom]} onValueChange={onZoomChange} />
            </div>
            <p className="text-center text-xs text-muted-foreground">Drag to reposition, use the slider to zoom.</p>
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
