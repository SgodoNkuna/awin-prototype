import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/theme-lab")({
  head: () => ({
    meta: [
      { title: "Theme Lab | A-WIN" },
      { name: "description", content: "Preview how A-WIN headers and buttons look with different theme colors." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ThemeLab,
});

const VARS = [
  "--primary",
  "--primary-foreground",
  "--primary-deep",
  "--accent",
  "--accent-foreground",
  "--ring",
] as const;

type VarName = (typeof VARS)[number];

const PRESETS: { name: string; primary: string; accent: string }[] = [
  { name: "A-WIN Default", primary: "#4CAF25", accent: "#E89B3F" },
  { name: "Forest + Gold", primary: "#2F7A2F", accent: "#C9A227" },
  { name: "Emerald + Coral", primary: "#10B981", accent: "#FB7185" },
  { name: "Olive + Amber", primary: "#6B8E23", accent: "#F59E0B" },
  { name: "Teal + Magenta", primary: "#0D9488", accent: "#DB2777" },
];

function hexToOklchString(hex: string): string {
  // simple sRGB → OKLCH approximation
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.sqrt(a * a + bb * bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
}

function ThemeLab() {
  const [primary, setPrimary] = useState("#4CAF25");
  const [accent, setAccent] = useState("#E89B3F");
  const [originals, setOriginals] = useState<Partial<Record<VarName, string>>>({});

  // Capture originals once
  useEffect(() => {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const snap: Partial<Record<VarName, string>> = {};
    for (const v of VARS) snap[v] = cs.getPropertyValue(v).trim();
    setOriginals(snap);
    return () => {
      // restore on unmount
      for (const v of VARS) root.style.removeProperty(v);
    };
  }, []);

  // Apply colors live
  useEffect(() => {
    const root = document.documentElement;
    const p = hexToOklchString(primary);
    const a = hexToOklchString(accent);
    root.style.setProperty("--primary", p);
    root.style.setProperty("--primary-deep", p);
    root.style.setProperty("--accent", a);
    root.style.setProperty("--ring", a);
  }, [primary, accent]);

  const reset = () => {
    setPrimary("#4CAF25");
    setAccent("#E89B3F");
    const root = document.documentElement;
    for (const v of VARS) root.style.removeProperty(v);
  };

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            Internal
          </span>
          <h1 className="mt-3 font-serif">Theme Color Lab</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Live-test how headings, buttons and links respond to different A-WIN
            green and accent colors. Changes are preview-only — reload to revert.
          </p>
        </div>

        {/* CONTROLS */}
        <Card className="border-border/60 shadow-[var(--shadow-elegant)]">
          <CardContent className="grid gap-6 p-6 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Primary (A-WIN green)
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent"
                />
                <input
                  type="text"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  className="h-10 flex-1 rounded-md border border-input bg-background px-3 font-mono text-sm"
                />
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium">
              Accent
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent"
                />
                <input
                  type="text"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-10 flex-1 rounded-md border border-input bg-background px-3 font-mono text-sm"
                />
              </div>
            </label>

            <div className="flex flex-col gap-2 text-sm font-medium">
              Actions
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="mr-1 h-4 w-4" /> Reset to defaults
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* PRESETS */}
        <div className="mt-6 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setPrimary(p.primary);
                setAccent(p.accent);
              }}
              className="group flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent"
            >
              <span className="h-4 w-4 rounded-full" style={{ background: p.primary }} />
              <span className="h-4 w-4 rounded-full" style={{ background: p.accent }} />
              {p.name}
            </button>
          ))}
        </div>

        {/* PREVIEW: TYPOGRAPHY */}
        <div className="mt-12 space-y-10">
          <Card className="border-border/60 shadow-[var(--shadow-elegant)]">
            <CardContent className="p-8">
              <span className="text-xs font-semibold uppercase tracking-widest text-accent">
                Typography sample
              </span>
              <h1 className="mt-3 font-serif text-foreground">Headline H1 — Playfair</h1>
              <h2 className="mt-4 font-serif text-foreground">Headline H2 — Playfair</h2>
              <h3 className="mt-4 font-serif text-foreground">Headline H3 — Playfair</h3>
              <p className="mt-5 max-w-2xl text-base text-muted-foreground">
                Body copy uses Inter at the muted-foreground token. This paragraph
                should remain readable on the warm background even as you swap the
                primary and accent tokens. <Link to="/how-to-join" className="text-primary story-link">Inline links</Link> use the
                primary token, while <span className="text-accent font-medium">accent text</span> uses the accent.
              </p>
              <p className="mt-3 text-sm font-medium uppercase tracking-widest text-accent">
                Eyebrow / label — Inter semibold uppercase
              </p>
            </CardContent>
          </Card>

          {/* PREVIEW: BUTTONS */}
          <Card className="border-border/60 shadow-[var(--shadow-elegant)]">
            <CardContent className="space-y-6 p-8">
              <h3 className="font-serif text-foreground">Buttons</h3>
              <div className="flex flex-wrap gap-3">
                <Button>Default (primary)</Button>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Accent
                </Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link to="/how-to-join">CTA — How to Join <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* PREVIEW: HERO STRIP */}
          <Card className="overflow-hidden border-border/60 shadow-[var(--shadow-elegant)]">
            <CardContent className="p-0">
              <div
                className="relative px-6 py-14 text-primary-foreground"
                style={{ background: "var(--gradient-hero)" }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--accent),transparent_55%)] opacity-25" />
                <div className="relative text-center">
                  <h2 className="font-serif text-primary-foreground">How to Become an A-Winner</h2>
                  <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
                    Hero preview — heading uses primary-foreground over the
                    --gradient-hero token.
                  </p>
                  <Button
                    asChild
                    size="lg"
                    className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    <Link to="/how-to-join">Open How to Join</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TOKEN INSPECTOR */}
          <Card className="border-border/60 shadow-[var(--shadow-elegant)]">
            <CardContent className="p-6">
              <h3 className="font-serif text-foreground">Resolved tokens</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Snapshot of the original computed values when this page loaded.
              </p>
              <dl className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                {VARS.map((v) => (
                  <div key={v} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
                    <code className="text-foreground">{v}</code>
                    <code className="truncate text-muted-foreground">{originals[v] ?? "—"}</code>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
