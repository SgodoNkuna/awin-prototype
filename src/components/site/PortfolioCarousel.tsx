import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { signPortfolioUrls } from "@/lib/portfolio-storage.functions";

type Item = {
  id: string;
  name: string;
  title: string | null;
  category: string | null;
  profile_card_url: string | null;
  photo_url: string | null;
};

export function PortfolioCarousel() {
  const [items, setItems] = useState<Item[]>([]);
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);
  const sign = useServerFn(signPortfolioUrls);

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
    (async () => {
      const { data } = await supabase
        .from("team_members")
        .select("id, name, title, category, profile_card_url, photo_url" as any)
        .eq("published", true)
        .order("order_index", { ascending: true })
        .limit(30);
      const rows = ((data ?? []) as unknown) as Item[];
      const withImg = rows.filter((r) => r.profile_card_url || r.photo_url);

      const keys = new Set<string>();
      for (const m of withImg) {
        if (m.profile_card_url) keys.add(m.profile_card_url);
        if (m.photo_url) keys.add(m.photo_url);
      }
      let urlMap: Record<string, string> = {};
      if (keys.size > 0) {
        try {
          const res = await sign({ data: { keys: [...keys] } });
          urlMap = res.urls;
        } catch (e) {
          console.error("signPortfolioUrls (portfolio) failed", e);
        }
      }
      const swap = (v: string | null) => (v && urlMap[v]) || v;
      const resolved = withImg.map((m) => ({
        ...m,
        profile_card_url: swap(m.profile_card_url),
        photo_url: swap(m.photo_url),
      }));
      if (!cancelled) setItems(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [sign]);

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
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              A rotating look at the women shaping A-Win — click through to their full profile.
            </p>
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
          aria-label="Featured A-Win members, auto-rotating. Pauses on hover or keyboard focus."
        >
          <CarouselContent>
            {items.map((item, i) => {
              const img = item.profile_card_url || item.photo_url;
              return (
                <CarouselItem
                  key={item.id}
                  className="sm:basis-1/2 lg:basis-1/3"
                  aria-roledescription="slide"
                  aria-label={`${item.name}, slide ${i + 1} of ${items.length}`}
                >
                  <Link
                    to="/members"
                    aria-label={`View ${item.name} in member directory`}
                    className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Card className="overflow-hidden border-border/60 shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-1 hover:shadow-[var(--shadow-gold-glow)] h-full">
                      <div
                        className="aspect-[3/4] w-full bg-cover bg-center bg-secondary"
                        style={{ backgroundImage: img ? `url(${img})` : undefined }}
                        aria-hidden="true"
                      />
                      <CardContent className="p-5">
                        <h3 className="font-serif text-lg text-foreground">
                          {item.name}
                        </h3>
                        {item.category && (
                          <Badge className="mt-2 bg-accent text-accent-foreground text-[11px]">
                            {item.category}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious
            className="hidden sm:flex"
            aria-label="Previous member"
          />
          <CarouselNext className="hidden sm:flex" aria-label="Next member" />
        </Carousel>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {items[current]
            ? `Showing ${items[current].name}, ${current + 1} of ${items.length}`
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
