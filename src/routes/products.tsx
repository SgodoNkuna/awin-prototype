import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products | A-WIN" },
      { name: "description", content: "Browse books and products from A-WIN members." },
    ],
  }),
  component: ProductsPage,
});

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  images: string[];
};

function ProductsPage() {
  const [items, setItems] = useState<Product[] | null>(null);
  const [active, setActive] = useState<Product | null>(null);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, description, price, category, images")
      .eq("active", true)
      .order("order_index")
      .then(({ data }) => setItems(((data ?? []) as unknown) as Product[]));
  }, []);

  return (
    <>
      <section
        className="relative px-4 py-16 text-hero-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative mx-auto max-w-5xl">
          <h1 className="font-serif text-3xl md:text-5xl text-white">Products & Books</h1>
          <p className="mt-3 max-w-2xl text-white/90">
            Books, resources and products by A-WIN members.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          {items === null ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState title="No products yet" description="Member products will appear here." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActive(p)}
                  className="text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="h-full overflow-hidden border-border/60 transition hover:-translate-y-1 hover:shadow-[var(--shadow-gold-glow)]">
                    {p.images?.[0] ? (
                      <div
                        className="aspect-[3/4] bg-secondary bg-cover bg-center"
                        style={{ backgroundImage: `url(${p.images[0]})` }}
                      />
                    ) : (
                      <div className="aspect-[3/4] bg-accent/15" />
                    )}
                    <CardContent className="p-4">
                      {p.category && <Badge className="mb-2 bg-accent text-accent-foreground">{p.category}</Badge>}
                      <h3 className="font-serif text-lg text-foreground">{p.name}</h3>
                      {p.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">{active.name}</DialogTitle>
              </DialogHeader>
              {active.description && (
                <p className="text-sm text-foreground/90 whitespace-pre-line">{active.description}</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {active.images.map((src, i) => (
                  <img key={`${src}-${i}`} src={src} alt={`${active.name} ${i + 1}`} className="w-full rounded-lg border border-border" />
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
