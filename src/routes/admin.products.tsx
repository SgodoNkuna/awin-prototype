import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/products")({
  component: AdminProductsPage,
});

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  images: string[];
  active: boolean;
  order_index: number;
};

const BUCKET = "documents";

async function uploadImage(file: File): Promise<string | null> {
  const path = `products/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) {
    toast.error(error.message);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function AdminProductsPage() {
  const [items, setItems] = useState<Product[] | null>(null);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("order_index");
    if (error) toast.error(error.message);
    setItems((data as Product[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name?.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const payload = {
        name: editing.name,
        description: editing.description ?? null,
        price: editing.price ?? null,
        category: editing.category ?? null,
        images: editing.images ?? [],
        active: editing.active ?? true,
        order_index: editing.order_index ?? 0,
      };
      const { error } = editing.id
        ? await supabase.from("products").update(payload).eq("id", editing.id)
        : await supabase.from("products").insert(payload);
      if (error) throw error;
      toast.success(editing.id ? "Product updated" : "Product added");
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Product deleted");
    await load();
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || !editing) return;
    const urls: string[] = [];
    for (const f of Array.from(files)) {
      const url = await uploadImage(f);
      if (url) urls.push(url);
    }
    setEditing({ ...editing, images: [...(editing.images ?? []), ...urls] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">Books and products by A-WIN members.</p>
        </div>
        <Button
          onClick={() => setEditing({ name: "", images: [], active: true, order_index: items?.length ?? 0 })}
          className="bg-accent text-accent-foreground hover:bg-accent-deep"
        >
          <Plus className="mr-1.5 size-4" /> Add Product
        </Button>
      </div>

      {items === null ? (
        <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No products yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              {p.images?.[0] && (
                <div className="aspect-[3/4] bg-cover bg-center bg-secondary" style={{ backgroundImage: `url(${p.images[0]})` }} />
              )}
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-base">{p.name}</h3>
                  {!p.active && <Badge variant="outline">Hidden</Badge>}
                </div>
                {p.category && <Badge className="bg-accent text-accent-foreground">{p.category}</Badge>}
                {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                    <Pencil className="size-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(p.id)} className="text-destructive">
                    <Trash2 className="size-3.5 mr-1" /> Delete
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
            <DialogTitle>{editing?.id ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="Books, Courses, etc." />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={4} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <Label>Price (optional)</Label>
                <Input type="number" step="0.01" value={editing.price ?? ""} onChange={(e) => setEditing({ ...editing, price: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Images</Label>
                <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-secondary/40 p-4 text-sm text-muted-foreground hover:bg-secondary">
                  <Upload className="size-4" /> Click to upload (one or more)
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                </label>
                {(editing.images ?? []).length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {editing.images!.map((src, i) => (
                      <div key={`${src}-${i}`} className="relative">
                        <img src={src} alt="" className="aspect-square w-full rounded border border-border object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditing({ ...editing, images: editing.images!.filter((_, j) => j !== i) })}
                          className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-destructive text-white shadow"
                          aria-label="Remove image"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.active ?? true} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
                <Label>Active (visible on public Products page)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground">
              {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
