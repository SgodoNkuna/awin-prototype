import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildExportSafeCss,
  buildScreenshotCaption,
  getRunbookSectionTitle,
  sanitizeExportFilename,
  sortCapturesForRunbook,
  type CapturedExport,
  type ExportPageDef,
} from "@/lib/export-runbook";

const pages: ExportPageDef[] = [
  { path: "/", label: "Home", group: "Public" },
  { path: "/portal", label: "Member Portal Dashboard", group: "Member Portal" },
  { path: "/admin", label: "Dashboard", group: "Admin Console" },
];

const captures: CapturedExport[] = [
  { page: "/", pageLabel: "Home", theme: "color", themeLabel: "Green", group: "Public", dataUrl: "data:image/jpeg;base64,AA==" },
  { page: "/portal", pageLabel: "Member Portal Dashboard", theme: "color", themeLabel: "Green", group: "Member Portal", dataUrl: "data:image/jpeg;base64,AA==" },
  { page: "/admin", pageLabel: "Dashboard", theme: "color", themeLabel: "Green", group: "Admin Console", dataUrl: "data:image/jpeg;base64,AA==" },
];

describe("runbook export helpers", () => {
  it("orders the PDF as admin, member portal, then public reference", () => {
    expect(sortCapturesForRunbook(captures, pages).map((item) => item.group)).toEqual([
      "Admin Console",
      "Member Portal",
      "Public",
    ]);
  });

  it("labels section cover pages and screenshot captions clearly", () => {
    expect(getRunbookSectionTitle("Admin Console")).toBe("Admin Console Runbook");
    expect(getRunbookSectionTitle("Member Portal")).toBe("Member Portal Runbook");
    expect(buildScreenshotCaption(captures[1], 2)).toBe(
      "Screenshot 2: Member Portal · Member Portal Dashboard · Green · /portal",
    );
  });

  it("uses export-safe CSS without lab/oklch/color-mix functions", () => {
    for (const theme of ["color", "orange", "black", "white"]) {
      const css = buildExportSafeCss(theme);
      expect(css).not.toMatch(/\b(lab|oklch|color-mix)\(/i);
      expect(css).toContain("--background");
      expect(css).toContain("!important");
    }
  });

  it("creates stable download filenames", () => {
    expect(sanitizeExportFilename("Admin · Billing / White Ivory")).toBe("admin-billing-white-ivory");
  });
});