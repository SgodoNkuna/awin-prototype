import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type Item = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  cover_image: string | null;
};

export function PortfolioCarousel() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("portfolio_items")
      .select("id,title,slug,summary,cover_image")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (cancelled) return;
        setItems((data as Item[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="bg-secondary/50 py-20" aria-labelledby="portfolio-heading">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              Featured Members
            </span>
            <h2 id="portfolio-heading" className="mt-3 font-serif">
              Member Portfolio
            </h2>
          </div>
          <Link
            to="/portfolio"
            className="hidden text-sm font-medium text-primary story-link sm:inline-flex items-center gap-1"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <Carousel
          opts={{ align: "start", loop: false }}
          className="mt-10"
          aria-roledescription="carousel"
          aria-label="Featured A-WIN member businesses"
        >
          <CarouselContent>
            {items.map((item) => (
              <CarouselItem
                key={item.id}
                className="sm:basis-1/2 lg:basis-1/3"
                aria-roledescription="slide"
              >
                <Link
                  to="/portfolio"
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
                >
                  <Card className="overflow-hidden border-border/60 shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-1 hover:shadow-[var(--shadow-gold-glow)] h-full">
                    <div
                      className="aspect-[4/3] w-full"
                      style={{
                        background: item.cover_image
                          ? `center/cover no-repeat url(${item.cover_image})`
                          : "var(--gradient-hero)",
                      }}
                      aria-hidden="true"
                    />
                    <CardContent className="p-5">
                      <h3 className="font-serif text-lg text-foreground">
                        {item.title}
                      </h3>
                      {item.summary && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {item.summary}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </Carousel>

        <div className="mt-8 text-center sm:hidden">
          <Link
            to="/portfolio"
            className="text-sm font-medium text-primary story-link inline-flex items-center gap-1"
          >
            View all members <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
