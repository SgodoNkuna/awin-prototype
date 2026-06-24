import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileDown, Loader2, ImageDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/exports")({
  component: ExportsPage,
});

const PAGES = [
  { path: "/", label: "Home" },
  { path: "/about", label: "About" },
  { path: "/membership", label: "Membership" },
  { path: "/events", label: "Events" },
  { path: "/portfolio", label: "Portfolio" },
  { path: "/news", label: "News & Insights" },
  { path: "/team", label: "Team & Leadership" },
  { path: "/info", label: "FAQ & Privacy" },
  { path: "/contact", label: "Contact" },
] as const;

const THEMES = [
  { id: "color", label: "Green (Default)", swatch: "#1f6b46" },
  { id: "orange", label: "Orange", swatch: "#e07a3c" },
  { id: "black", label: "Black", swatch: "#111827" },
  { id: "white", label: "White / Ivory", swatch: "#f6f1e8" },
] as const;

const THEME_STORAGE_KEY = "awin-logo-variant";

// Wait helper
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function captureRoute(
  iframe: HTMLIFrameElement,
  path: string,
  theme: string,
  setStatus: (s: string) => void,
): Promise<string> {
  // Pre-set theme in localStorage so the iframe reads correct value
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  // Navigate iframe
  await new Promise<void>((resolve) => {
    const onLoad = () => {
      iframe.removeEventListener("load", onLoad);
      resolve();
    };
    iframe.addEventListener("load", onLoad);
    iframe.src = `${path}?_export=1&_t=${Date.now()}`;
  });

  // Ensure theme is applied on the iframe document (in case provider hasn't run yet)
  const doc = iframe.contentDocument;
  if (doc) {
    doc.documentElement.setAttribute("data-theme", theme);
  }

  // Wait for fonts and images
  setStatus(`Rendering ${path} (${theme})…`);
  await wait(1200);
  try {
    const fonts = (iframe.contentDocument as any)?.fonts;
    if (fonts?.ready) await fonts.ready;
    const imgs = Array.from(iframe.contentDocument?.images ?? []);
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.addEventListener("load", () => res(), { once: true });
              img.addEventListener("error", () => res(), { once: true });
            }),
      ),
    );
  } catch {
    /* ignore */
  }
  await wait(400);

  // Capture
  const html2canvas = (await import("html2canvas")).default;
  const target = iframe.contentDocument?.documentElement;
  if (!target) throw new Error("iframe document missing");
  const canvas = await html2canvas(target as unknown as HTMLElement, {
    width: iframe.clientWidth,
    height: target.scrollHeight,
    windowWidth: iframe.clientWidth,
    windowHeight: target.scrollHeight,
    useCORS: true,
    backgroundColor: null,
    scale: 1,
    logging: false,
  });
  return canvas.toDataURL("image/jpeg", 0.82);
}

function ExportsPage() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [selectedPages, setSelectedPages] = useState<string[]>(PAGES.map((p) => p.path));
  const [selectedThemes, setSelectedThemes] = useState<string[]>(THEMES.map((t) => t.id));
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [previews, setPreviews] = useState<{ label: string; url: string }[]>([]);

  const togglePage = (p: string) =>
    setSelectedPages((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  const toggleTheme = (t: string) =>
    setSelectedThemes((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  const totalJobs = selectedPages.length * selectedThemes.length;

  async function runCapture(mode: "pdf" | "zip") {
    if (totalJobs === 0) {
      toast.error("Select at least one page and theme");
      return;
    }
    setRunning(true);
    setProgress(0);
    setErrors([]);
    setPreviews([]);
    setStatus("Preparing…");
    const originalTheme = localStorage.getItem(THEME_STORAGE_KEY);

    const captured: { page: string; theme: string; label: string; dataUrl: string }[] = [];
    const errs: string[] = [];

    try {
      const iframe = iframeRef.current!;
      let done = 0;
      for (const themeId of selectedThemes) {
        const themeLabel = THEMES.find((t) => t.id === themeId)?.label ?? themeId;
        for (const path of selectedPages) {
          const pageLabel = PAGES.find((p) => p.path === path)?.label ?? path;
          try {
            const dataUrl = await captureRoute(iframe, path, themeId, setStatus);
            captured.push({
              page: path,
              theme: themeId,
              label: `${pageLabel} — ${themeLabel}`,
              dataUrl,
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            errs.push(`${pageLabel} (${themeLabel}): ${msg}`);
          }
          done++;
          setProgress(Math.round((done / totalJobs) * 100));
        }
      }

      setErrors(errs);
      setPreviews(captured.slice(0, 6).map((c) => ({ label: c.label, url: c.dataUrl })));

      if (captured.length === 0) {
        toast.error("Nothing captured");
        return;
      }

      if (mode === "pdf") {
        setStatus("Assembling PDF…");
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();

        // Cover page
        pdf.setFontSize(24);
        pdf.text("A-WIN Site Export", pageW / 2, 120, { align: "center" });
        pdf.setFontSize(12);
        pdf.text(`Generated ${new Date().toLocaleString()}`, pageW / 2, 150, { align: "center" });
        pdf.setFontSize(10);
        pdf.text(
          `${selectedPages.length} pages × ${selectedThemes.length} themes = ${captured.length} screenshots`,
          pageW / 2,
          170,
          { align: "center" },
        );
        pdf.setFontSize(9);
        let y = 220;
        pdf.text("Contents:", 60, y);
        y += 16;
        captured.forEach((c, i) => {
          if (y > pageH - 60) {
            pdf.addPage();
            y = 60;
          }
          pdf.text(`${i + 2}. ${c.label}`, 60, y);
          y += 14;
        });

        for (const item of captured) {
          pdf.addPage();
          const img = new Image();
          img.src = item.dataUrl;
          await new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          });
          const margin = 24;
          const availW = pageW - margin * 2;
          const availH = pageH - margin * 2 - 30;
          const ratio = img.width / img.height;
          let w = availW;
          let h = w / ratio;
          if (h > availH) {
            h = availH;
            w = h * ratio;
          }
          pdf.setFontSize(10);
          pdf.text(item.label, margin, margin);
          pdf.addImage(item.dataUrl, "JPEG", margin + (availW - w) / 2, margin + 16, w, h);
        }

        const ts = new Date().toISOString().slice(0, 10);
        pdf.save(`awin-site-export-${ts}.pdf`);
        toast.success(`PDF downloaded (${captured.length} pages)`);
      } else {
        // Download individual images
        for (const c of captured) {
          const a = document.createElement("a");
          a.href = c.dataUrl;
          a.download = `awin-${c.page.replace(/[\/]/g, "_") || "home"}-${c.theme}.jpg`;
          a.click();
          await wait(150);
        }
        toast.success(`Downloaded ${captured.length} screenshots`);
      }

      // Persist last-export marker so the admin dashboard freshness banner reflects this run
      try {
        localStorage.setItem(
          "awin-last-export",
          JSON.stringify({
            at: new Date().toISOString(),
            count: captured.length,
            pages: selectedPages.length,
            themes: selectedThemes.length,
          }),
        );
      } catch {
        /* ignore quota errors */
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Export failed: ${msg}`);
      setErrors((prev) => [...prev, msg]);
    } finally {
      // Restore original theme
      if (originalTheme) localStorage.setItem(THEME_STORAGE_KEY, originalTheme);
      document.documentElement.setAttribute("data-theme", originalTheme ?? "color");
      setRunning(false);
      setStatus("");
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-serif">PDF Export</h1>
        <p className="text-muted-foreground mt-2">
          Generate a print-ready PDF (or individual screenshots) of every public page in every
          theme — ideal for sharing the site with stakeholders without needing internet access.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Pages</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSelectedPages(PAGES.map((p) => p.path))}>All</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedPages([])}>None</Button>
              </div>
            </div>
            <div className="space-y-2">
              {PAGES.map((p) => (
                <label key={p.path} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedPages.includes(p.path)}
                    onCheckedChange={() => togglePage(p.path)}
                    disabled={running}
                  />
                  <span className="flex-1">{p.label}</span>
                  <code className="text-xs text-muted-foreground">{p.path}</code>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Themes</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSelectedThemes(THEMES.map((t) => t.id))}>All</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedThemes([])}>None</Button>
              </div>
            </div>
            <div className="space-y-2">
              {THEMES.map((t) => (
                <label key={t.id} className="flex items-center gap-3 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedThemes.includes(t.id)}
                    onCheckedChange={() => toggleTheme(t.id)}
                    disabled={running}
                  />
                  <span
                    className="h-5 w-5 rounded border"
                    style={{ background: t.swatch }}
                    aria-hidden="true"
                  />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total screenshots:</span>
              <Badge variant="secondary">{totalJobs}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => runCapture("pdf")} disabled={running || totalJobs === 0}>
              {running ? <Loader2 className="size-4 mr-2 animate-spin" /> : <FileDown className="size-4 mr-2" />}
              Generate PDF
            </Button>
            <Button variant="outline" onClick={() => runCapture("zip")} disabled={running || totalJobs === 0}>
              <ImageDown className="size-4 mr-2" />
              Download Screenshots
            </Button>
          </div>

          {running && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground">{status} ({progress}%)</p>
            </div>
          )}

          {!running && errors.length > 0 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <div className="flex items-center gap-2 text-destructive font-medium mb-1">
                <AlertCircle className="size-4" /> {errors.length} capture(s) had issues
              </div>
              <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
                {errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {!running && previews.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm text-foreground mb-3">
                <CheckCircle2 className="size-4 text-accent" /> Preview (first {previews.length} captures)
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {previews.map((p, i) => (
                  <div key={i} className="border rounded overflow-hidden">
                    <img src={p.url} alt={p.label} className="w-full h-32 object-cover object-top" />
                    <div className="px-2 py-1 text-[10px] truncate">{p.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden capture iframe — full desktop width so layouts render as designed */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: "1280px",
          height: "2000px",
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        <iframe
          ref={iframeRef}
          title="Capture frame"
          src="about:blank"
          style={{ width: "1280px", height: "2000px", border: 0 }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Captures run inside your browser, fully client-side. No data leaves this page. Generation
        takes ~1–2 seconds per screenshot.
      </p>
    </div>
  );
}
