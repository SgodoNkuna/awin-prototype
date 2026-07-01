// Built by Wisani Nkuna · Lusandla Marketing (Pty) Ltd
// lusandlamarketing@gmail.com · www.lusandlamarketing.co.za
// Developed with Claude Code (Anthropic) — 2026

import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

const isVercel = process.env.NITRO_PRESET === "vercel";

export default defineConfig({
  plugins: [
    tanstackStart(),
    // ponytail: only load nitro plugin when building for Vercel (NITRO_PRESET=vercel)
    isVercel &&
      nitro({
        preset: "vercel",
        serveStatic: false,
        output: { dir: ".vercel/output" },
      }),
    tailwindcss(),
    tsConfigPaths(),
  ],
  server: {
    port: 8080,
  },
});
