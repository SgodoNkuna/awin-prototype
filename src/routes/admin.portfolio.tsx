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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/portfolio")({
  component: PortfolioAdminPage,
});

type SocialLinks = {
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
};

type Item = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  cover_image: string | null;
  social_links: SocialLinks;
  status: "draft" | "published";
  sort_order: number;
  created_at: string;
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const empty = (): Partial<Item> => ({
  title: "",
  slug: "",
  summary: "",
  body: "",
  cover_image: "",
  social_links: {},
  status: "draft",
  sort_order: 0,
});

function PortfolioAdminPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [editing, setEditing] = useState<Partial<Item> | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("portfolio_items")
      .select("*")
      .order("sort_order", { ascending: true });
    setItems((data as Item[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing?.title) return toast.error("Title is required.");
    const slug = editing.slug || slugify(editing.title);
    const payload = {
      title: editing.title,
      slug,
      summary: editing.summary || null,
      body: editing.body || null,
      cover_image: editing.cover_image || null,
      social_links: editing.social_links ?? {},
      status: editing.status ?? "draft",
      sort_order: editing.sort_order ?? 0,
    };
    const { error } = editing.id
      ? await supabase.from("portfolio_items").update(payload).eq("id", editing.id)
      : await supabase.from("portfolio_items").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const togglePublish = async (item: Item) => {
    const next = item.status === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("portfolio_items")
      .update({ status: next })
      .eq("id", item.id);
    if (error) return toast.error(error.message);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this portfolio item?")) return;
    const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const setSocial = (key: keyof SocialLinks, value: string) => {
    if (!editing) return;
    const social = { ...(editing.social_links ?? {}), [key]: value || undefined };
    setEditing({ ...editing, social_links: social });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl">Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            {items?.length ?? 0} items
          </p>
        </div>
        <Button onClick={() => setEditing(empty())}>
          <Plus className="size-4 mr-2" /> Add Member
        </Button>
      </div>

      {items === null ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No portfolio items yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-6 flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <Badge variant={item.status === "published" ? "default" : "outline"}>
                      {item.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      order {item.sort_order}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">/{item.slug}</p>
                  {item.summary && (
                    <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">
                      {item.summary}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => togglePublish(item)}>
                    {item.status === "published" ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => del(item.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit Portfolio Item" : "New Portfolio Item"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Field label="Title">
                <Input
                  value={editing.title ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      title: e.target.value,
                      slug: editing.slug || slugify(e.target.value),
                    })
                  }
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Slug">
                  <Input
                    value={editing.slug ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, slug: slugify(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Sort order">
                  <Input
                    type="number"
                    value={editing.sort_order ?? 0}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        sort_order: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
              </div>
              <Field label="Cover image URL">
                <Input
                  value={editing.cover_image ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, cover_image: e.target.value })
                  }
                  placeholder="https://..."
                />
              </Field>
              <Field label="Summary">
                <Textarea
                  rows={2}
                  value={editing.summary ?? ""}
                  onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                />
              </Field>
              <Field label="Body">
                <Textarea
                  rows={4}
                  value={editing.body ?? ""}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Website">
                  <Input
                    value={editing.social_links?.website ?? ""}
                    onChange={(e) => setSocial("website", e.target.value)}
                  />
                </Field>
                <Field label="Instagram">
                  <Input
                    value={editing.social_links?.instagram ?? ""}
                    onChange={(e) => setSocial("instagram", e.target.value)}
                  />
                </Field>
                <Field label="LinkedIn">
                  <Input
                    value={editing.social_links?.linkedin ?? ""}
                    onChange={(e) => setSocial("linkedin", e.target.value)}
                  />
                </Field>
                <Field label="Twitter">
                  <Input
                    value={editing.social_links?.twitter ?? ""}
                    onChange={(e) => setSocial("twitter", e.target.value)}
                  />
                </Field>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  id="publish"
                  type="checkbox"
                  checked={editing.status === "published"}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      status: e.target.checked ? "published" : "draft",
                    })
                  }
                />
                <Label htmlFor="publish">Published</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
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
