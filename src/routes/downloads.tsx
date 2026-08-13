import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Download, FileText, Loader2, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Downloads | A-Win" },
      {
        name: "description",
        content: "Public documents and resources from A-Win — meeting minutes, newsletters, and other downloads.",
      },
    ],
  }),
  component: DownloadsPage,
});

type Doc = {
  id: string;
  name: string;
  file_path: string;
  folder: string;
  size_bytes: number | null;
  created_at: string;
};

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DownloadsPage() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // RLS scopes this to visibility='public' rows automatically for
      // anonymous visitors — see "Public documents visible to all" policy.
      const { data, error } = await supabase
        .from("documents")
        .select("id, name, file_path, folder, size_bytes, created_at")
        .order("folder")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setDocs((data as Doc[]) ?? []);
    })();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Doc[]>();
    for (const d of docs ?? []) {
      if (!map.has(d.folder)) map.set(d.folder, []);
      map.get(d.folder)!.push(d);
    }
    return Array.from(map.entries());
  }, [docs]);

  const download = async (d: Doc) => {
    setBusyId(d.id);
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.file_path, 60);
    setBusyId(null);
    if (error || !data) return toast.error(error?.message ?? "Could not open file");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col">
      <section className="page-header px-4 py-24">
        <div className="relative mx-auto max-w-5xl animate-fade-in">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-foreground/65">
            <Link to="/" className="hover:text-accent transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-accent">Downloads</span>
          </nav>
          <h1 className="mt-5 font-serif text-foreground">Downloads</h1>
          <p className="mt-5 max-w-2xl text-foreground/80 md:text-lg">
            Meeting minutes, newsletters, and other resources A-Win makes publicly available.
          </p>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl space-y-8">
          {docs === null ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : grouped.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FolderOpen className="mx-auto mb-2 size-8 opacity-50" />
                No public downloads available right now.
              </CardContent>
            </Card>
          ) : (
            grouped.map(([folder, items]) => (
              <div key={folder}>
                <h2 className="font-serif text-xl text-foreground">{folder}</h2>
                <div className="mt-3 space-y-2">
                  {items.map((d) => (
                    <Card key={d.id}>
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <FileText className="size-5 shrink-0 text-accent" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{d.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatSize(d.size_bytes)}{d.size_bytes ? " · " : ""}
                              {new Date(d.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" disabled={busyId === d.id} onClick={() => download(d)}>
                          {busyId === d.id ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Download className="mr-1.5 size-4" />}
                          Download
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
