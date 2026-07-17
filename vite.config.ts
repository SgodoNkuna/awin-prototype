import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

// Security headers on every response (clickjacking / sniffing / HTTPS).
const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  "Content-Security-Policy": "frame-ancestors 'none'",
};

export default defineConfig(({ command }) => {
  const preset = process.env.NITRO_PRESET;
  const nitroOptions = {
    ...(preset ? { preset } : {}),
    ...(preset === "vercel" ? { output: { dir: ".vercel/output" } } : {}),
    routeRules: { "/**": { headers: SECURITY_HEADERS } },
  };

  return {
    server: { port: 8080 },
    resolve: {
      // Dedupe so a single React/Query instance is used across SSR + client.
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      // src/server.ts is our SSR error-wrapped server entry.
      tanstackStart({ server: { entry: "server" } }),
      viteReact(),
      // Nitro only runs on `build`; `vite dev` serves without it.
      ...(command === "build" ? [nitro(nitroOptions)] : []),
    ],
  };
});
