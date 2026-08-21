import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Database, HardDrive, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStorageOverview, deleteStorageFile, FREE_TIER_STORAGE_BYTES } from "@/lib/admin-storage.functions";

export const Route = createFileRoute("/admin/storage")({
  head: () => ({ meta: [{ title: "Storage | A-Win Admin" }] }),
  component: StoragePage,
});

type Overview = Awaited<ReturnType<typeof getStorageOverview>>;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const BUCKET_LABELS: Record<string, string> = {
  gallery: "Photo Gallery, headshots, videos, event posters",
  "member-portfolios": "Private member profile images (signed URLs)",
  "onboarding-uploads": "Membership onboarding documents",
  "loa-rpa-documents": "LOA & RPA signed PDFs (private)",
  "event-gallery": "Legacy bucket — superseded by Photo Gallery, likely safe to clear",
  documents: "Admin → Documents uploads",
};

function StoragePage() {
  const [data, setData] = useState<Overview | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const callOverview = useServerFn(getStorageOverview);
  const callDelete = useServerFn(deleteStorageFile);

  const load = async () => {
    try {
      const res = await callOverview();
      setData(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load storage overview");
    }
  };
  useEffect(() => { load(); }, []);

  const remove = async (bucket: string, path: string) => {
    if (!confirm(`Delete ${path} from ${bucket}? This cannot be undone.`)) return;
    const key = `${bucket}/${path}`;
    setBusyKey(key);
    try {
      await callDelete({ data: { bucket: bucket as any, path } });
      toast.success("Deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyKey(null);
    }
  };

  if (!data) {
    return <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  const pctUsed = (data.totalBytes / FREE_TIER_STORAGE_BYTES) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">Storage</h1>
        <p className="text-sm text-muted-foreground">
          What's using space across every bucket, and a hand to clean up what isn't needed anymore.
        </p>
      </div>

      <Card className={pctUsed > 80 ? "border-destructive/50" : pctUsed > 50 ? "border-amber-500/50" : undefined}>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <HardDrive className="size-4" /> Total usage
            </div>
            <span className="text-sm font-medium">
              {formatBytes(data.totalBytes)} <span className="text-muted-foreground">/ 1 GB free-tier limit</span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full ${pctUsed > 80 ? "bg-destructive" : pctUsed > 50 ? "bg-amber-500" : "bg-primary"}`}
              style={{ width: `${Math.min(100, pctUsed).toFixed(1)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {pctUsed.toFixed(1)}% of the Supabase free-tier storage cap used.
            {pctUsed > 80 && " Getting close — worth clearing unused files or upgrading the plan soon."}
            {pctUsed <= 80 && pctUsed > 50 && " Comfortable for now, but video uploads add up fast — keep an eye on it."}
            {pctUsed <= 50 && " Comfortable headroom for now."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><Database className="size-4" /> By bucket</div>
          <div className="space-y-2">
            {data.buckets.map((b) => (
              <div key={b.bucket_id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium">{b.bucket_id}</p>
                  <p className="text-xs text-muted-foreground">{BUCKET_LABELS[b.bucket_id] ?? ""} · {b.file_count} file{b.file_count === 1 ? "" : "s"}</p>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums">{formatBytes(b.total_bytes)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {data.unreferencedGallery.length > 0 && (
        <Card className="border-amber-500/40">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-4" /> Possibly unused in Photo Gallery
            </div>
            <p className="text-xs text-muted-foreground">
              These files in the gallery bucket aren't referenced by any event photo/video, team member photo,
              card, or video that this page knows about. Review before deleting — a file used somewhere this
              check doesn't cover would also show up here.
            </p>
            <div className="space-y-1.5">
              {data.unreferencedGallery.map((f) => {
                const key = `gallery/${f.name}`;
                return (
                  <div key={f.name} className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5">
                    <span className="truncate font-mono text-xs">{f.name}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs tabular-nums text-muted-foreground">{formatBytes(f.bytes)}</span>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busyKey === key} onClick={() => remove("gallery", f.name)}>
                        {busyKey === key ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="text-sm font-semibold">Largest files, all buckets</div>
          <div className="space-y-1.5">
            {data.largestFiles.map((f) => {
              const key = `${f.bucket_id}/${f.name}`;
              return (
                <div key={key} className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5">
                  <div className="min-w-0 flex items-center gap-2">
                    <Badge variant="outline" className="shrink-0 font-mono text-[10px]">{f.bucket_id}</Badge>
                    <span className="truncate font-mono text-xs">{f.name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">{formatBytes(f.bytes)}</span>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busyKey === key} onClick={() => remove(f.bucket_id, f.name)}>
                      {busyKey === key ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
