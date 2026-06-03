// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";

const eventsShim = fileURLToPath(new URL("./src/shims/events.ts", import.meta.url));

export default defineConfig({
  vite: {
    resolve: {
      alias: [
        { find: /^events$/, replacement: eventsShim },
        { find: /^node:events$/, replacement: eventsShim },
      ],
    },
  },
});
