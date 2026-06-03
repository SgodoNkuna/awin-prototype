import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Upload, Download, Trash2, Loader2, FolderOpen, Lock, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/documents")({
  component: DocumentsPage,
});

type Doc = {
  id: string;
  name: string;
  file_path: string;
  folder: string;
  visibility: string;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

const FOLDERS = ["Meeting Minutes", "Newsletters", "Resources"];

function DocumentsPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [folder, setFolder] = useState<string>(FOLDERS[0]);
  const [uploadFolder, setUploadFolder] = useState<string>(FOLDERS[0]);
  const [uploadVisibility, setUploadVisibility] = useState<string>("members");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    setDocs((data as Doc[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const onUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const path = `${uploadFolder}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { error: insErr } = await supabase.from("documents").insert({
      name: file.name,
      file_path: path,
      folder: uploadFolder,
      visibility: uploadVisibility,
      size_bytes: file.size,
      mime_type: file.type || null,
      uploaded_by: user.id,
    });
    setUploading(false);
    if (insErr) return toast.error(insErr.message);
    toast.success("Uploaded");
    load();
    if (fileRef.current) fileRef.current.value = "";
  };

  const download = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.file_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const del = async (d: Doc) => {
    if (!confirm(`Delete ${d.name}?`)) return;
    await supabase.storage.from("documents").remove([d.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const filtered = (docs ?? []).filter((d) => d.folder === folder);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">Documents</h1>
        <p className="text-sm text-muted-foreground">Manage files shared with members.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1">
              <label className="text-xs font-medium">Folder</label>
              <Select value={uploadFolder} onValueChange={setUploadFolder}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FOLDERS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium">Visibility</label>
              <Select value={uploadVisibility} onValueChange={setUploadVisibility}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="members">Members only</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            />
            <Button disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}
              Upload File
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={folder} onValueChange={setFolder}>
        <TabsList>
          {FOLDERS.map((f) => <TabsTrigger key={f} value={f}>{f}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {docs === null ? (
        <div className="py-8 flex justify-center"><Loader2 className="size-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderOpen className="size-8 mx-auto mb-2 opacity-50" />
            No files in this folder yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => (
            <Card key={d.id}>
              <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{d.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {d.visibility === "public" ? <><Globe className="size-3 mr-1" /> Public</> : <><Lock className="size-3 mr-1" /> Members</>}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {d.size_bytes ? `${(d.size_bytes / 1024).toFixed(1)} KB · ` : ""}
                    {new Date(d.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => download(d)}>
                    <Download className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => del(d)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
