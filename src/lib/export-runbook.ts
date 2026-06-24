export type ExportGroup = "Public" | "Member Portal" | "Admin Console";

export type ExportPageDef = {
  path: string;
  label: string;
  group: ExportGroup;
};

export type ExportThemeDef = {
  id: string;
  label: string;
  swatch: string;
};

export type CapturedExport = {
  page: string;
  pageLabel: string;
  theme: string;
  themeLabel: string;
  group: ExportGroup;
  dataUrl: string;
};

export const EXPORT_GROUP_ORDER: ExportGroup[] = ["Admin Console", "Member Portal", "Public"];

export function sortCapturesForRunbook(captures: CapturedExport[], pages: readonly ExportPageDef[]) {
  const pageOrder = new Map(pages.map((page, index) => [page.path, index]));
  return [...captures].sort((a, b) => {
    const groupDiff = EXPORT_GROUP_ORDER.indexOf(a.group) - EXPORT_GROUP_ORDER.indexOf(b.group);
    if (groupDiff !== 0) return groupDiff;
    const pageDiff = (pageOrder.get(a.page) ?? 999) - (pageOrder.get(b.page) ?? 999);
    if (pageDiff !== 0) return pageDiff;
    return a.themeLabel.localeCompare(b.themeLabel);
  });
}

export function getRunbookSectionTitle(group: ExportGroup) {
  if (group === "Admin Console") return "Admin Console Runbook";
  if (group === "Member Portal") return "Member Portal Runbook";
  return "Public Site Reference";
}

export function buildScreenshotCaption(item: CapturedExport, index: number) {
  return `Screenshot ${index}: ${item.group} · ${item.pageLabel} · ${item.themeLabel} · ${item.page}`;
}

export function sanitizeExportFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "capture";
}

const sharedExportTokens = {
  "--destructive": "#c8372d",
  "--destructive-foreground": "#fffaf0",
  "--success": "#2f9a56",
  "--success-foreground": "#fffaf0",
  "--chart-1": "#2f8f57",
  "--chart-2": "#d9912f",
  "--chart-3": "#3974a8",
  "--chart-4": "#329a57",
  "--chart-5": "#c8372d",
};

export const EXPORT_SAFE_THEME_TOKENS: Record<string, Record<string, string>> = {
  color: {
    ...sharedExportTokens,
    "--background": "#fbfaf5",
    "--foreground": "#242736",
    "--card": "#ffffff",
    "--card-foreground": "#242736",
    "--popover": "#ffffff",
    "--popover-foreground": "#242736",
    "--primary": "#2f8f57",
    "--primary-foreground": "#fffaf0",
    "--primary-deep": "#196f40",
    "--hero-foreground": "#fffaf0",
    "--hero-muted": "#f1ead6",
    "--hero-surface": "rgba(255, 250, 240, 0.14)",
    "--hero-border": "rgba(255, 250, 240, 0.34)",
    "--secondary": "#f3eedf",
    "--secondary-foreground": "#252735",
    "--muted": "#f3efe4",
    "--muted-foreground": "#676b76",
    "--accent": "#d99638",
    "--accent-foreground": "#252735",
    "--accent-soft": "#f4deac",
    "--border": "#e5decb",
    "--input": "#e5decb",
    "--ring": "#d99638",
    "--sidebar": "#224b30",
    "--sidebar-foreground": "#fffaf0",
    "--sidebar-primary": "#d99638",
    "--sidebar-primary-foreground": "#252735",
    "--sidebar-accent": "#315c3e",
    "--sidebar-accent-foreground": "#fffaf0",
    "--sidebar-border": "#315c3e",
    "--sidebar-ring": "#d99638",
    "--gradient-hero": "linear-gradient(135deg, #226f40 0%, #143d27 100%)",
    "--gradient-gold": "linear-gradient(135deg, #dfa246 0%, #c98228 100%)",
    "--shadow-elegant": "0 10px 30px -10px rgba(47, 143, 87, 0.22)",
    "--shadow-gold-glow": "0 0 0 1px rgba(217, 150, 56, 0.35), 0 10px 30px -10px rgba(217, 150, 56, 0.4)",
  },
  orange: {
    ...sharedExportTokens,
    "--background": "#fff8ef",
    "--foreground": "#282432",
    "--card": "#ffffff",
    "--card-foreground": "#282432",
    "--popover": "#ffffff",
    "--popover-foreground": "#282432",
    "--primary": "#d77b26",
    "--primary-foreground": "#fffaf0",
    "--primary-deep": "#a6501c",
    "--hero-foreground": "#fffaf0",
    "--hero-muted": "#f1e5cf",
    "--hero-surface": "rgba(255, 250, 240, 0.16)",
    "--hero-border": "rgba(255, 250, 240, 0.36)",
    "--secondary": "#f7ead7",
    "--secondary-foreground": "#282432",
    "--muted": "#f5eadc",
    "--muted-foreground": "#6a6258",
    "--accent": "#c95d22",
    "--accent-foreground": "#fffaf0",
    "--accent-soft": "#f3d4aa",
    "--border": "#ead8bf",
    "--input": "#ead8bf",
    "--ring": "#c95d22",
    "--sidebar": "#6f351c",
    "--sidebar-foreground": "#fffaf0",
    "--sidebar-primary": "#d99638",
    "--sidebar-primary-foreground": "#282432",
    "--sidebar-accent": "#824222",
    "--sidebar-accent-foreground": "#fffaf0",
    "--sidebar-border": "#824222",
    "--sidebar-ring": "#c95d22",
    "--gradient-hero": "linear-gradient(135deg, #a8501c 0%, #5d2716 100%)",
    "--gradient-gold": "linear-gradient(135deg, #dfa246 0%, #be5a22 100%)",
    "--shadow-elegant": "0 10px 30px -10px rgba(166, 80, 28, 0.3)",
    "--shadow-gold-glow": "0 0 0 1px rgba(201, 93, 34, 0.4), 0 10px 30px -10px rgba(201, 93, 34, 0.45)",
  },
  black: {
    ...sharedExportTokens,
    "--background": "#15161c",
    "--foreground": "#f7f4ed",
    "--card": "#23242b",
    "--card-foreground": "#f7f4ed",
    "--popover": "#23242b",
    "--popover-foreground": "#f7f4ed",
    "--primary": "#34353d",
    "--primary-foreground": "#f7f4ed",
    "--primary-deep": "#121318",
    "--hero-foreground": "#f7f4ed",
    "--hero-muted": "#ddd8ce",
    "--hero-surface": "rgba(247, 244, 237, 0.18)",
    "--hero-border": "rgba(247, 244, 237, 0.42)",
    "--secondary": "#2f3038",
    "--secondary-foreground": "#f7f4ed",
    "--muted": "#2f3038",
    "--muted-foreground": "#c2beb5",
    "--accent": "#50525b",
    "--accent-foreground": "#f7f4ed",
    "--accent-soft": "#e9e5dc",
    "--border": "rgba(255, 255, 255, 0.14)",
    "--input": "rgba(255, 255, 255, 0.18)",
    "--ring": "#686a74",
    "--sidebar": "#121318",
    "--sidebar-foreground": "#f7f4ed",
    "--sidebar-primary": "#f7f4ed",
    "--sidebar-primary-foreground": "#15161c",
    "--sidebar-accent": "#2f3038",
    "--sidebar-accent-foreground": "#f7f4ed",
    "--sidebar-border": "rgba(255, 255, 255, 0.12)",
    "--sidebar-ring": "#686a74",
    "--gradient-hero": "linear-gradient(135deg, #34353d 0%, #0e0f13 100%)",
    "--gradient-gold": "linear-gradient(135deg, #686a74 0%, #282a31 100%)",
    "--shadow-elegant": "0 10px 30px -10px rgba(0, 0, 0, 0.45)",
    "--shadow-gold-glow": "0 0 0 1px rgba(80, 82, 91, 0.5), 0 10px 30px -10px rgba(0, 0, 0, 0.4)",
  },
  white: {
    ...sharedExportTokens,
    "--background": "#fbf8f0",
    "--foreground": "#22232a",
    "--card": "#ffffff",
    "--card-foreground": "#22232a",
    "--popover": "#ffffff",
    "--popover-foreground": "#22232a",
    "--primary": "#f5efe4",
    "--primary-foreground": "#22232a",
    "--primary-deep": "#ded6c8",
    "--hero-foreground": "#f9f6ed",
    "--hero-muted": "#e7e0d2",
    "--hero-surface": "rgba(249, 246, 237, 0.18)",
    "--hero-border": "rgba(249, 246, 237, 0.42)",
    "--secondary": "#f1eadc",
    "--secondary-foreground": "#22232a",
    "--muted": "#f1eadc",
    "--muted-foreground": "#635f57",
    "--accent": "#d1c7b8",
    "--accent-foreground": "#22232a",
    "--accent-soft": "#ede5d8",
    "--border": "#ddd4c4",
    "--input": "#ddd4c4",
    "--ring": "#b8ab98",
    "--sidebar": "#e9e0d2",
    "--sidebar-foreground": "#22232a",
    "--sidebar-primary": "#22232a",
    "--sidebar-primary-foreground": "#fbf8f0",
    "--sidebar-accent": "#ddd4c4",
    "--sidebar-accent-foreground": "#22232a",
    "--sidebar-border": "#d3c9ba",
    "--sidebar-ring": "#b8ab98",
    "--gradient-hero": "linear-gradient(135deg, #d8cfbf 0%, #afa390 100%)",
    "--gradient-gold": "linear-gradient(135deg, #f1eadc 0%, #cdbfab 100%)",
    "--shadow-elegant": "0 10px 30px -10px rgba(120, 112, 100, 0.25)",
    "--shadow-gold-glow": "0 0 0 1px rgba(184, 171, 152, 0.45), 0 10px 30px -10px rgba(120, 112, 100, 0.3)",
  },
};

export function buildExportSafeCss(theme: string) {
  const tokens = EXPORT_SAFE_THEME_TOKENS[theme] ?? EXPORT_SAFE_THEME_TOKENS.color;
  const variables = Object.entries(tokens)
    .map(([key, value]) => `${key}: ${value} !important;`)
    .join("\n");

  return `
    :root, :root[data-theme], html, body {
      ${variables}
    }
    *, *::before, *::after {
      transition: none !important;
      animation-duration: 0.001s !important;
      animation-iteration-count: 1 !important;
      caret-color: auto !important;
    }
    html, body {
      background: var(--background) !important;
      color: var(--foreground) !important;
    }
  `;
}