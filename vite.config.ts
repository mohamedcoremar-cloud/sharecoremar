// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Cloudflare made `nodejs_compat` the default on 2026-08-04 and now rejects
  // deployments that still declare the flag ("became the default ... so does not
  // need to be specified anymore" → 502 Internal Server Error on every request).
  // Nitro resolves its compatibility date to "latest", so the generated
  // wrangler.json crossed that cutoff. Stop emitting the flag.
  nitro: {
    cloudflare: { nodeCompat: false },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

