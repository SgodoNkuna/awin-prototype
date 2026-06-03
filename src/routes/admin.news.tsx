import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RichEditor } from "@/components/admin/RichEditor";

export const Route = createFileRoute("/admin/news")({
  component: NewsAdminPage,
});

type Article = {
  id: string;
  title: string;
  slug: string;
  category: string;
  cover_image: string | null;
  excerpt: string | null;
  content: string;
  author_name: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
};

const CATEGORIES = ["Announcements", "Investment", "Community"];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const empty = (): Partial<Article> => ({
  title: "", slug: "", category: "Announcements", cover_image: "", excerpt: "",
  content: "", author_name: "A-WIN Editorial", published: false,
});

function NewsAdminPage() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [editing, setEditing] = useState<Partial<Article> | null>(null);

  const load = async () => {
    const { data } = await supabase.from("news_articles").select("*").order("created_at", { ascending: false });
    setArticles((data as Article[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.title) return toast.error("Title is required.");
    const slug = editing.slug || slugify(editing.title);
    const payload = {
      title: editing.title,
      slug,
      category: editing.category ?? "Announcements",
      cover_image: editing.cover_image || null,
      excerpt: editing.excerpt || null,
      content: editing.content ?? "",
      author_name: editing.author_name || null,
      published: editing.published ?? false,
      published_at: editing.published && !editing.published_at ? new Date().toISOString() : editing.published_at ?? null,
    };
    const { error } = editing.id
      ? await supabase.from("news_articles").update(payload).eq("id", editing.id)
      : await supabase.from("news_articles").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Article saved");
    setEditing(null);
    load();
  };

  const togglePublish = async (a: Article) => {
    const { error } = await supabase
      .from("news_articles")
      .update({
        published: !a.published,
        published_at: !a.published && !a.published_at ? new Date().toISOString() : a.published_at,
      })
      .eq("id", a.id);
    if (error) return toast.error(error.message);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    const { error } = await supabase.from("news_articles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl">News</h1>
          <p className="text-sm text-muted-foreground">{articles?.length ?? 0} articles</p>
        </div>
        <Button onClick={() => setEditing(empty())}>
          <Plus className="size-4 mr-2" /> Write Article
        </Button>
      </div>

      {articles === null ? (
        <div className="py-8 flex justify-center"><Loader2 className="size-5 animate-spin" /></div>
      ) : articles.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No articles yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {articles.map((a) => (
            <Card key={a.id}>
              <CardContent className="pt-6 flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold">{a.title}</h3>
                    <Badge variant={a.published ? "default" : "outline"}>{a.published ? "Published" : "Draft"}</Badge>
                    <Badge variant="outline">{a.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">/news/{a.slug} · {new Date(a.created_at).toLocaleDateString()}</p>
                  {a.excerpt && <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">{a.excerpt}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => togglePublish(a)}>
                    {a.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(a)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => del(a.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Article" : "New Article"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Field label="Title">
                <Input
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.slug || slugify(e.target.value) })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Slug">
                  <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
                </Field>
                <Field label="Category">
                  <Select value={editing.category ?? "Announcements"} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Cover image URL">
                <Input value={editing.cover_image ?? ""} onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })} placeholder="https://..." />
              </Field>
              <Field label="Excerpt">
                <Textarea rows={2} value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
              </Field>
              <Field label="Author">
                <Input value={editing.author_name ?? ""} onChange={(e) => setEditing({ ...editing, author_name: e.target.value })} />
              </Field>
              <Field label="Content">
                <RichEditor value={editing.content ?? ""} onChange={(html) => setEditing({ ...editing, content: html })} />
              </Field>
              <div className="flex items-center gap-2 pt-2">
                <input
                  id="publish"
                  type="checkbox"
                  checked={editing.published ?? false}
                  onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                />
                <Label htmlFor="publish">Published</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
