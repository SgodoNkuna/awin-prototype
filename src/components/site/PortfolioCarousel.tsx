import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
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
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);

  // Respect prefers-reduced-motion: disable autoplay when set.
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const autoplayRef = useRef(
    Autoplay({
      delay: 5000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      stopOnFocusIn: true,
      playOnInit: !prefersReducedMotion,
    }),
  );

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

  useEffect(() => {
    if (!api) return;
    const update = () => setCurrent(api.selectedScrollSnap());
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

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
            to="/members"
            className="hidden text-sm font-medium text-primary story-link sm:inline-flex items-center gap-1"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: true }}
          plugins={[autoplayRef.current]}
          className="mt-10"
          aria-roledescription="carousel"
          aria-label="Featured A-WIN member businesses, auto-rotating. Pauses on hover or keyboard focus."
        >
          <CarouselContent>
            {items.map((item, i) => (
              <CarouselItem
                key={item.id}
                className="sm:basis-1/2 lg:basis-1/3"
                aria-roledescription="slide"
                aria-label={`${item.title}, slide ${i + 1} of ${items.length}`}
              >
                <Link
                  to="/members"
                  aria-label={`View ${item.title} in member portfolio`}
                  className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
          <CarouselPrevious
            className="hidden sm:flex"
            aria-label="Previous member"
          />
          <CarouselNext className="hidden sm:flex" aria-label="Next member" />
        </Carousel>

        {/* Live region: announces current slide to screen readers without
            interrupting focus. Polite so it doesn't fight autoplay updates. */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {items[current]
            ? `Showing ${items[current].title}, ${current + 1} of ${items.length}`
            : ""}
        </p>

        <div className="mt-8 text-center sm:hidden">
          <Link
            to="/members"
            className="text-sm font-medium text-primary story-link inline-flex items-center gap-1"
          >
            View all members <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
