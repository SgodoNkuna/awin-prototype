import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileDown,
  ImageDown,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  buildExportSafeCss,
  buildScreenshotCaption,
  EXPORT_GROUP_ORDER,
  getRunbookSectionTitle,
  sanitizeExportFilename,
  sortCapturesForRunbook,
  type CapturedExport,
  type ExportGroup,
  type ExportPageDef,
} from "@/lib/export-runbook";
import {
  clearExportJob,
  clearJobCaptures,
  createExportJob,
  getJobCaptures,
  loadExportJob,
  saveExportJob,
  saveJobCapture,
  type ExportJobMode,
  type ExportJobState,
} from "@/lib/export-persistence";

export const Route = createFileRoute("/admin/exports")({
  component: ExportsPage,
});

const PAGES: readonly ExportPageDef[] = [
  { path: "/", label: "Home", group: "Public" },
  { path: "/about", label: "About", group: "Public" },
  { path: "/membership", label: "Membership", group: "Public" },
  { path: "/events", label: "Events", group: "Public" },
  { path: "/portfolio", label: "Portfolio", group: "Public" },
  { path: "/news", label: "News & Insights", group: "Public" },
  { path: "/team", label: "Team & Leadership", group: "Public" },
  { path: "/info", label: "FAQ & Privacy", group: "Public" },
  { path: "/contact", label: "Contact", group: "Public" },
  { path: "/portal", label: "Member Portal Dashboard", group: "Member Portal" },
  { path: "/admin", label: "Dashboard", group: "Admin Console" },
  { path: "/admin/members", label: "Members", group: "Admin Console" },
  { path: "/admin/applications", label: "Applications", group: "Admin Console" },
  { path: "/admin/events", label: "Events", group: "Admin Console" },
  { path: "/admin/portfolio", label: "Portfolio", group: "Admin Console" },
  { path: "/admin/documents", label: "Documents", group: "Admin Console" },
  { path: "/admin/messages", label: "Messages", group: "Admin Console" },
  { path: "/admin/billing", label: "Billing", group: "Admin Console" },
  { path: "/admin/settings", label: "Settings", group: "Admin Console" },
] as const;

const PAGE_GROUPS: ExportGroup[] = ["Public", "Member Portal", "Admin Console"];

const THEMES = [
  { id: "color", label: "Green (Default)", swatch: "#1f6b46" },
  { id: "orange", label: "Orange", swatch: "#e07a3c" },
  { id: "black", label: "Black", swatch: "#111827" },
  { id: "white", label: "White / Ivory", swatch: "#f6f1e8" },
] as const;

const THEME_STORAGE_KEY = "awin-logo-variant";
const LAST_EXPORT_KEY = "awin-last-export";
const SCREENSHOT_PREVIEW_LIMIT = 6;

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function getPage(path: string) {
  return PAGES.find((page) => page.path === path) ?? PAGES[0];
}

function getTheme(theme: string) {
  return THEMES.find((item) => item.id === theme) ?? THEMES[0];
}

function bytesFromDataUrl(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function waitForIframeLoad(iframe: HTMLIFrameElement, path: string) {
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      iframe.removeEventListener("load", onLoad);
      reject(new Error("Timed out while loading capture page"));
    }, 15_000);
    const onLoad = () => {
      window.clearTimeout(timeout);
      iframe.removeEventListener("load", onLoad);
      resolve();
    };
    iframe.addEventListener("load", onLoad);
    iframe.src = `${path}?_export=1&_t=${Date.now()}`;
  });
}

function installExportCss(doc: Document, theme: string) {
  doc.documentElement.setAttribute("data-theme", theme);
  doc.documentElement.setAttribute("data-export-capture", "true");
  doc.body?.setAttribute("data-export-capture", "true");

  const old = doc.getElementById("awin-export-safe-colors");
  if (old) old.remove();

  const style = doc.createElement("style");
  style.id = "awin-export-safe-colors";
  style.textContent = buildExportSafeCss(theme);
  doc.head.appendChild(style);
}

async function waitForAssets(doc: Document) {
  try {
    const fonts = (doc as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) await fonts.ready;
  } catch {
    /* best-effort */
  }

  const images = Array.from(doc.images ?? []);
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

/**
 * Wait until visible loading spinners disappear (or timeout). Many routes show
 * a Loader2 (`.animate-spin`) while auth + initial data resolve; capturing too
 * early produces blank pages, so we poll for a settled DOM. Admin routes get a
 * longer budget so the role check + first data query can finish.
 */
async function waitForContentReady(doc: Document, isAdminRoute: boolean) {
  const maxMs = isAdminRoute ? 12000 : 6000;
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const spinners = Array.from(doc.querySelectorAll<HTMLElement>(".animate-spin")).filter(
      (el) => el.offsetParent !== null,
    );
    const skeletons = doc.querySelectorAll<HTMLElement>('[data-loading="true"], .animate-pulse').length;
    const bodyText = (doc.body.innerText || "").trim().length;
    if (spinners.length === 0 && skeletons < 4 && bodyText > 120) return;
    await wait(220);
  }
}

async function captureRoute(
  iframe: HTMLIFrameElement,
  path: string,
  theme: string,
  setStatus: (status: string) => void,
  attempt: number,
): Promise<CapturedExport> {
  const page = getPage(path);
  const themeDef = getTheme(theme);
  const isAdminRoute = path.startsWith("/admin");
  const isProtected = isAdminRoute || path.startsWith("/portal");

  localStorage.setItem(THEME_STORAGE_KEY, theme);
  const attemptLabel = attempt > 1 ? ` (retry ${attempt - 1})` : "";
  setStatus(`Loading ${page.label} (${themeDef.label})${attemptLabel}…`);
  await waitForIframeLoad(iframe, path);

  const doc = iframe.contentDocument;
  if (!doc?.documentElement || !doc.body) throw new Error("Capture frame did not load the page");

  installExportCss(doc, theme);
  setStatus(`Rendering ${page.label} (${themeDef.label})${attemptLabel}…`);
  await waitForAssets(doc);
  await waitForContentReady(doc, isAdminRoute);

  // Detect auth redirect: if we asked for /admin/* but the iframe ended up on
  // /portal or /auth, this user can't render the page — surface a clear error
  // instead of saving a misleading screenshot.
  const finalPath = iframe.contentWindow?.location.pathname ?? path;
  if (isProtected && !finalPath.startsWith(path)) {
    throw new Error(
      `Route redirected to ${finalPath}. Sign in as an admin in this browser to capture protected pages.`,
    );
  }

  await wait(350);

  const target = doc.body;
  const width = 1280;
  const height = Math.min(Math.max(target.scrollHeight, doc.documentElement.scrollHeight, 900), 2600);
  const { toJpeg } = await import("html-to-image");

  try {
    const dataUrl = await toJpeg(target, {
      width,
      height,
      cacheBust: true,
      pixelRatio: 0.86,
      quality: 0.78,
      backgroundColor: getComputedStyle(doc.documentElement).getPropertyValue("--background").trim() || "#ffffff",
      style: {
        width: `${width}px`,
        minHeight: `${height}px`,
        transform: "none",
      },
      filter: (node) => {
        if (!(node instanceof doc.defaultView!.HTMLElement)) return true;
        return !node.hasAttribute("data-sonner-toast") && node.tagName !== "SCRIPT";
      },
    });

    return {
      page: path,
      pageLabel: page.label,
      theme,
      themeLabel: themeDef.label,
      group: page.group,
      dataUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/unsupported color function|lab|oklch|color-mix/i.test(message)) {
      throw new Error("Color conversion failed after export-safe CSS was applied");
    }
    throw error;
  }
}

const MAX_CAPTURE_ATTEMPTS = 3;

async function captureWithRetry(
  iframe: HTMLIFrameElement,
  path: string,
  theme: string,
  setStatus: (status: string) => void,
): Promise<CapturedExport> {
  let lastError: unknown = new Error("Unknown capture failure");
  for (let attempt = 1; attempt <= MAX_CAPTURE_ATTEMPTS; attempt += 1) {
    try {
      return await captureRoute(iframe, path, theme, setStatus, attempt);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_CAPTURE_ATTEMPTS) await wait(400 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function downloadScreenshots(captures: CapturedExport[]) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const item of sortCapturesForRunbook(captures, PAGES)) {
    const folder = zip.folder(sanitizeExportFilename(item.group));
    const filename = `${sanitizeExportFilename(item.pageLabel)}-${sanitizeExportFilename(item.themeLabel)}.jpg`;
    folder?.file(filename, bytesFromDataUrl(item.dataUrl));
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 4 } });
  downloadBlob(blob, `awin-runbook-screenshots-${new Date().toISOString().slice(0, 10)}.zip`);
}

function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 3_000);
}

function addCoverPage(pdf: import("jspdf").jsPDF, title: string, subtitle: string, lines: string[], addNewPage: boolean) {
  if (addNewPage) pdf.addPage();
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.setFillColor(32, 75, 48);
  pdf.rect(0, 0, pageW, pageH, "F");
  pdf.setTextColor(255, 250, 240);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.text(title, 54, 122, { maxWidth: pageW - 108 });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.text(subtitle, 54, 158, { maxWidth: pageW - 108 });
  pdf.setDrawColor(217, 150, 56);
  pdf.setLineWidth(3);
  pdf.line(54, 184, pageW - 54, 184);
  pdf.setFontSize(10);
  let y = 220;
  for (const line of lines) {
    pdf.text(line, 54, y, { maxWidth: pageW - 108 });
    y += 18;
  }
}

function addScreenshotPage(pdf: import("jspdf").jsPDF, item: CapturedExport, caption: string) {
  pdf.addPage();
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 30;
  const captionH = 42;
  const availW = pageW - margin * 2;
  const availH = pageH - margin * 2 - captionH;

  pdf.setFillColor(250, 248, 240);
  pdf.rect(0, 0, pageW, pageH, "F");
  pdf.setTextColor(36, 39, 54);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(caption, margin, margin, { maxWidth: availW });

  const props = pdf.getImageProperties(item.dataUrl);
  const ratio = props.width / props.height;
  let w = availW;
  let h = w / ratio;
  if (h > availH) {
    h = availH;
    w = h * ratio;
  }
  const x = margin + (availW - w) / 2;
  const y = margin + captionH;
  pdf.setDrawColor(220, 212, 196);
  pdf.rect(x - 1, y - 1, w + 2, h + 2, "S");
  pdf.addImage(item.dataUrl, "JPEG", x, y, w, h, undefined, "FAST");
}

async function buildRunbookPdf(captures: CapturedExport[]) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4", compress: true });
  const sorted = sortCapturesForRunbook(captures, PAGES);
  const generatedAt = new Date().toLocaleString();

  addCoverPage(
    pdf,
    "A-WIN Website Runbook",
    `Generated ${generatedAt}`,
    [
      `${sorted.length} labeled screenshot capture${sorted.length === 1 ? "" : "s"}`,
      "Sections: Admin Console, Member Portal, and Public Site Reference.",
      "Each screenshot is captioned with section, page, theme, and route.",
    ],
    false,
  );

  let screenshotIndex = 1;
  for (const group of EXPORT_GROUP_ORDER) {
    const groupCaptures = sorted.filter((item) => item.group === group);
    if (groupCaptures.length === 0) continue;
    addCoverPage(
      pdf,
      getRunbookSectionTitle(group),
      group === "Admin Console"
        ? "Protected administrative workflows, dashboards, content tools, and export controls."
        : group === "Member Portal"
          ? "Signed-in member view covering profile, documents, status, and billing context."
          : "Public-facing route reference for presentation and client review.",
      [
        `${groupCaptures.length} capture${groupCaptures.length === 1 ? "" : "s"} in this section`,
        `Themes included: ${Array.from(new Set(groupCaptures.map((item) => item.themeLabel))).join(", ")}`,
      ],
      true,
    );
    for (const item of groupCaptures) {
      addScreenshotPage(pdf, item, buildScreenshotCaption(item, screenshotIndex));
      screenshotIndex += 1;
    }
  }

  return pdf.output("blob");
}

function ExportsPage() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const runLock = useRef(false);
  const [selectedPages, setSelectedPages] = useState<string[]>(PAGES.map((page) => page.path));
  const [selectedThemes, setSelectedThemes] = useState<string[]>(["color"]);
  const [job, setJob] = useState<ExportJobState | null>(null);
  const [previews, setPreviews] = useState<{ label: string; url: string }[]>([]);

  useEffect(() => {
    const saved = loadExportJob();
    if (!saved) return;
    const shouldAutoResume = saved.status === "running" || saved.status === "assembling";
    const restored: ExportJobState =
      shouldAutoResume
        ? {
            ...saved,
            status: "paused",
            statusText: "Export was interrupted by refresh. Saved captures are loading and the run will resume automatically…",
            updatedAt: new Date().toISOString(),
          }
        : saved;
    if (restored !== saved) saveExportJob(restored);
    setJob(restored);
    setSelectedPages(restored.selectedPages);
    setSelectedThemes(restored.selectedThemes);
    getJobCaptures(restored.id)
      .then((captures) => {
        setPreviews(
          captures.slice(0, SCREENSHOT_PREVIEW_LIMIT).map((capture, index) => ({
            label: buildScreenshotCaption(capture, index + 1),
            url: capture.dataUrl,
          })),
        );
      })
      .catch(() => undefined);

    if (shouldAutoResume) {
      window.setTimeout(() => {
        toast.info("Resuming the saved export run…");
        void runCapture(restored.mode, restored);
      }, 500);
    }
  }, []);

  const running = job?.status === "running" || job?.status === "assembling";
  const totalJobs = selectedPages.length * selectedThemes.length;
  const capturedCount = job?.done ?? 0;

  const groupedSelections = useMemo(
    () =>
      PAGE_GROUPS.map((groupName) => {
        const groupPages = PAGES.filter((page) => page.group === groupName);
        return {
          groupName,
          groupPages,
          allSelected: groupPages.every((page) => selectedPages.includes(page.path)),
        };
      }),
    [selectedPages],
  );

  const togglePage = (path: string) =>
    setSelectedPages((current) => (current.includes(path) ? current.filter((item) => item !== path) : [...current, path]));
  const toggleTheme = (theme: string) =>
    setSelectedThemes((current) =>
      current.includes(theme) ? current.filter((item) => item !== theme) : [...current, theme],
    );

  const updateJob = (next: ExportJobState | ((current: ExportJobState) => ExportJobState)) => {
    setJob((current) => {
      const base = current ?? loadExportJob();
      if (typeof next === "function" && !base) return current;
      const resolved = typeof next === "function" ? (next as (value: ExportJobState) => ExportJobState)(base!) : next;
      saveExportJob(resolved);
      return resolved;
    });
  };

  async function finishPdfDownload(currentJob: ExportJobState) {
    updateJob({ ...currentJob, status: "assembling", statusText: "Assembling runbook PDF…", progress: 98 });
    const captures = await getJobCaptures(currentJob.id);
    if (captures.length === 0) throw new Error("No screenshots were captured for the PDF");
    const blob = await buildRunbookPdf(captures);
    downloadBlob(blob, `awin-runbook-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(`Runbook PDF downloaded (${captures.length} screenshots)`);
    markExportComplete(currentJob, captures.length);
  }

  async function finishScreenshotDownload(currentJob: ExportJobState) {
    updateJob({ ...currentJob, status: "assembling", statusText: "Preparing screenshot ZIP…", progress: 98 });
    const captures = await getJobCaptures(currentJob.id);
    if (captures.length === 0) throw new Error("No screenshots were captured for download");
    await downloadScreenshots(captures);
    toast.success(`Screenshot ZIP downloaded (${captures.length} screenshots)`);
    markExportComplete(currentJob, captures.length);
  }

  function markExportComplete(currentJob: ExportJobState, count: number) {
    const completeJob: ExportJobState = {
      ...currentJob,
      status: "complete",
      progress: 100,
      statusText: "Download complete",
      done: count,
      updatedAt: new Date().toISOString(),
    };
    saveExportJob(completeJob);
    setJob(completeJob);
    try {
      localStorage.setItem(
        LAST_EXPORT_KEY,
        JSON.stringify({
          at: new Date().toISOString(),
          count,
          pages: currentJob.selectedPages.length,
          themes: currentJob.selectedThemes.length,
          mode: currentJob.mode,
        }),
      );
    } catch {
      /* ignore quota errors */
    }
  }

  async function runCapture(mode: ExportJobMode, resumeJob?: ExportJobState) {
    if (runLock.current) return;
    const activePages = resumeJob?.selectedPages ?? selectedPages;
    const activeThemes = resumeJob?.selectedThemes ?? selectedThemes;
    const activeTotal = activePages.length * activeThemes.length;
    if (activeTotal === 0) {
      toast.error("Select at least one page and theme");
      return;
    }
    const iframe = iframeRef.current;
    if (!iframe) {
      toast.error("Capture frame is not ready yet");
      return;
    }

    const newJob: ExportJobState = resumeJob
      ? {
          ...resumeJob,
          mode,
          selectedPages: activePages,
          selectedThemes: activeThemes,
          total: activeTotal,
          status: "running",
          statusText: "Resuming export…",
          updatedAt: new Date().toISOString(),
        }
      : createExportJob({ mode, selectedPages: activePages, selectedThemes: activeThemes, total: activeTotal });
    runLock.current = true;
    setJob(newJob);
    saveExportJob(newJob);
    if (!resumeJob) setPreviews([]);
    const originalTheme = localStorage.getItem(THEME_STORAGE_KEY);

    try {
      if (!resumeJob) await clearJobCaptures(newJob.id).catch(() => undefined);
      const existingCaptures = resumeJob ? await getJobCaptures(newJob.id).catch(() => [] as CapturedExport[]) : [];
      const capturedKeys = new Set(existingCaptures.map((capture) => `${capture.page}::${capture.theme}`));
      const errors: string[] = resumeJob?.errors ?? [];
      let done = Math.min(existingCaptures.length, activeTotal);

      for (const themeId of activeThemes) {
        for (const path of activePages) {
          if (capturedKeys.has(`${path}::${themeId}`)) continue;
          const page = getPage(path);
          const theme = getTheme(themeId);
          try {
            const capture = await captureWithRetry(iframe, path, themeId, (statusText) => {
              updateJob((current) => ({
                ...current,
                statusText: `${statusText} · ${done}/${activeTotal} captured, ${activeTotal - done - 1} remaining`,
              }));
            });
            await saveJobCapture(newJob.id, capture);
            setPreviews((current) =>
              current.length >= SCREENSHOT_PREVIEW_LIMIT
                ? current
                : [...current, { label: buildScreenshotCaption(capture, done + 1), url: capture.dataUrl }],
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(`${page.label} (${theme.label}): ${message}`);
          }

          done += 1;
          const remaining = Math.max(activeTotal - done, 0);
          const failed = errors.length;
          const progress = Math.max(1, Math.min(96, Math.round((done / activeTotal) * 96)));
          updateJob((current) => ({
            ...current,
            done,
            errors,
            progress,
            statusText: `Captured ${done - failed} · ${failed} failed · ${remaining} remaining (of ${activeTotal})`,
          }));
        }
      }

      const readyJob: ExportJobState = {
        ...newJob,
        done,
        errors,
        progress: errors.length === activeTotal ? 100 : 97,
        status: errors.length === activeTotal ? "failed" : "ready",
        statusText:
          errors.length === activeTotal
            ? "Every capture failed. Adjust selections and try again."
            : "Captures saved. Preparing download…",
        updatedAt: new Date().toISOString(),
      };
      setJob(readyJob);
      saveExportJob(readyJob);

      if (errors.length === activeTotal) {
        toast.error("Every capture failed");
        return;
      }

      if (errors.length > 0) toast.warning(`${errors.length} capture(s) had issues; exporting the successful captures.`);
      if (mode === "pdf") await finishPdfDownload(readyJob);
      else await finishScreenshotDownload(readyJob);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Export failed: ${message}`);
      updateJob((current) => ({
        ...current,
        status: "failed",
        progress: 100,
        statusText: message,
        errors: [...current.errors, message],
      }));
    } finally {
      runLock.current = false;
      if (originalTheme) localStorage.setItem(THEME_STORAGE_KEY, originalTheme);
      document.documentElement.setAttribute("data-theme", originalTheme ?? "color");
    }
  }

  async function downloadExisting(mode: ExportJobMode) {
    if (!job) return;
    try {
      if (mode === "pdf") await finishPdfDownload({ ...job, mode: "pdf" });
      else await finishScreenshotDownload({ ...job, mode: "screenshots" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  async function resetExport() {
    if (job) await clearJobCaptures(job.id).catch(() => undefined);
    clearExportJob();
    setJob(null);
    setPreviews([]);
    toast.success("Export state cleared");
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-serif">Runbook Export</h1>
        <p className="text-muted-foreground mt-2">
          Generate one presentation PDF with admin and member-portal cover pages, labeled captions, and grouped screenshots.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Captures persist locally during and after refreshes. Sign in as an admin before exporting protected pages.
        </p>
      </div>

      {job && (
        <Card className={job.status === "failed" ? "border-destructive/40" : "border-accent/40"}>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {running ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : job.status === "failed" ? (
                    <XCircle className="size-4 text-destructive" />
                  ) : (
                    <CheckCircle2 className="size-4 text-accent" />
                  )}
                  Export status: {job.status} · {job.done - job.errors.length}/{job.total} captured · {Math.max(job.total - job.done, 0)} remaining · {job.errors.length} failed
                </div>
                <p className="text-xs text-muted-foreground mt-1 break-words">
                  {job.statusText}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Last updated {new Date(job.updatedAt).toLocaleString()} · Auto-resumes after refresh
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!running && (job.done - job.errors.length) > 0 && (
                  <>
                    <Button size="sm" onClick={() => downloadExisting("pdf")}>
                      <Download className="size-4 mr-2" /> Download PDF ({job.done - job.errors.length})
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadExisting("screenshots")}>
                      <ImageDown className="size-4 mr-2" /> Download ZIP
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={resetExport} disabled={running}>
                  <XCircle className="size-4 mr-2" /> Clear
                </Button>
              </div>
            </div>
            <Progress value={job.status === "complete" ? 100 : job.progress} />
            {(running || job.status === "assembling") && (
              <p className="text-xs text-muted-foreground">Keep this tab open for the active capture. If refreshed, completed captures stay saved and the run will continue automatically.</p>
            )}
          </CardContent>
        </Card>

      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Pages</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSelectedPages(PAGES.map((page) => page.path))} disabled={running}>
                  All
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedPages([])} disabled={running}>
                  None
                </Button>
              </div>
            </div>
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {groupedSelections.map(({ groupName, groupPages, allSelected }) => (
                <div key={groupName}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {groupName} · {groupPages.length}
                    </div>
                    <button
                      type="button"
                      className="text-xs text-accent hover:underline disabled:opacity-50"
                      disabled={running}
                      onClick={() => {
                        const paths = groupPages.map((page) => page.path);
                        setSelectedPages((current) =>
                          allSelected ? current.filter((item) => !paths.includes(item)) : Array.from(new Set([...current, ...paths])),
                        );
                      }}
                    >
                      {allSelected ? "Clear" : "Select all"}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {groupPages.map((page) => (
                      <label key={page.path} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={selectedPages.includes(page.path)} onCheckedChange={() => togglePage(page.path)} disabled={running} />
                        <span className="flex-1">{page.label}</span>
                        <code className="text-xs text-muted-foreground">{page.path}</code>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Themes</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSelectedThemes(THEMES.map((theme) => theme.id))} disabled={running}>
                  All
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedThemes(["color"])} disabled={running}>
                  Fast
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedThemes([])} disabled={running}>
                  None
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {THEMES.map((theme) => (
                <label key={theme.id} className="flex items-center gap-3 text-sm cursor-pointer">
                  <Checkbox checked={selectedThemes.includes(theme.id)} onCheckedChange={() => toggleTheme(theme.id)} disabled={running} />
                  <span className="h-5 w-5 rounded border" style={{ background: theme.swatch }} aria-hidden="true" />
                  <span>{theme.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total screenshots:</span>
              <Badge variant="secondary">{totalJobs}</Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Fast mode captures the default theme only; choose All for the full 76-screenshot theme audit.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => runCapture("pdf")} disabled={running || totalJobs === 0}>
              {running ? <Loader2 className="size-4 mr-2 animate-spin" /> : <FileDown className="size-4 mr-2" />}
              Generate Runbook PDF
            </Button>
            <Button variant="outline" onClick={() => runCapture("screenshots")} disabled={running || totalJobs === 0}>
              <ImageDown className="size-4 mr-2" />
              Capture Screenshots ZIP
            </Button>
            {job?.status === "failed" && (
              <Button variant="secondary" onClick={() => runCapture(job.mode)} disabled={running || totalJobs === 0}>
                <RotateCcw className="size-4 mr-2" /> Retry
              </Button>
            )}
            {job?.status === "paused" && (
              <Button variant="secondary" onClick={() => runCapture(job.mode, job)} disabled={running || job.total === 0}>
                <RotateCcw className="size-4 mr-2" /> Resume Export
              </Button>
            )}
          </div>

          {job?.errors && job.errors.length > 0 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <div className="flex items-center gap-2 text-destructive font-medium mb-1">
                <AlertCircle className="size-4" /> {job.errors.length} capture(s) had issues
              </div>
              <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
                {job.errors.slice(0, 8).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {previews.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm text-foreground mb-3">
                <CheckCircle2 className="size-4 text-accent" /> Preview (first {previews.length} captures)
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {previews.map((preview, index) => (
                  <div key={`${preview.label}-${index}`} className="border rounded overflow-hidden">
                    <img src={preview.url} alt={preview.label} className="w-full h-32 object-cover object-top" />
                    <div className="px-2 py-1 text-[10px] truncate">{preview.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div
        aria-hidden="true"
        style={{ position: "fixed", left: "-10000px", top: 0, width: "1280px", height: "2600px", pointerEvents: "none", opacity: 0 }}
      >
        <iframe ref={iframeRef} title="Capture frame" src="about:blank" style={{ width: "1280px", height: "2600px", border: 0 }} />
      </div>

      <p className="text-xs text-muted-foreground">
        The exporter now captures compressed images into local browser storage first, then builds the PDF/ZIP from saved captures for quicker repeat downloads.
      </p>
    </div>
  );
}