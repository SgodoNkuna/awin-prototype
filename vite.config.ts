// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Outside Lovable's preview, honour NITRO_PRESET so CI (e.g. Vercel)
  // can build for its own target. Inside Lovable the preset is forced
  // to cloudflare-module by @lovable.dev/vite-tanstack-config and this
  // option is ignored, so the preview keeps working unchanged.
  nitro: process.env.NITRO_PRESET
    ? {
        preset: process.env.NITRO_PRESET,
        ...(process.env.NITRO_PRESET === "vercel"
          ? { output: { dir: ".vercel/output" } }
          : {}),
      }
    : undefined,

});
