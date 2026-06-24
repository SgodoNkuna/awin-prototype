// A shared Vite config package wires TanStack Start, React, Tailwind, and other plugins.
// Do not add these plugins manually or the app will break with duplicate plugins.
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Honor NITRO_PRESET so CI (e.g. Vercel) can build for its own target.
  // The preset is forced to cloudflare-module by the config package in preview,
  // so the preview keeps working unchanged.
  nitro: process.env.NITRO_PRESET
    ? {
        preset: process.env.NITRO_PRESET,
        ...(process.env.NITRO_PRESET === "vercel"
          ? { output: { dir: ".vercel/output" } }
          : {}),
      }
    : undefined,

});
