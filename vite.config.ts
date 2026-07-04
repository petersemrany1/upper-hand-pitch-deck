// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const eventsShim = fileURLToPath(new URL("./src/shims/events.ts", import.meta.url));
// Public Supabase config. These are PUBLISHABLE / ANON values (safe in the
// browser bundle). Hardcoded fallbacks guarantee the client can initialise
// even when the build environment doesn't inject VITE_* vars (e.g. Lovable
// publish where the sandbox .env isn't shipped to the build worker).
const SUPABASE_URL_FALLBACK = "https://sfwokpeeffgrkxaptqji.supabase.co";
const SUPABASE_PUBLISHABLE_KEY_FALLBACK =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmd29rcGVlZmZncmt4YXB0cWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTI0MTYsImV4cCI6MjA5MTcyODQxNn0.-I-IuBjfut2VVHLUYtGKO6sl4UnqpFbU1nWm4zQRD4E";
const supabaseUrl =
  process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? SUPABASE_URL_FALLBACK;
const supabasePublishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  SUPABASE_PUBLISHABLE_KEY_FALLBACK;
const eventsShimPlugin = (): Plugin => ({
  name: "events-browser-shim",
  enforce: "pre",
  resolveId(source) {
    if (source === "events" || source === "node:events") return eventsShim;
    return null;
  },
});

export default defineConfig({
  vite: {
    plugins: [eventsShimPlugin()],
    resolve: {
      alias: [
        { find: /^events$/, replacement: eventsShim },
        { find: /^node:events$/, replacement: eventsShim },
      ],
    },
    define: {
      "process.env.SUPABASE_URL": JSON.stringify(supabaseUrl),
      "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
      "process.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "process.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
    },
  },
});
