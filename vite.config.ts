import { defineConfig } from "vite";

// base: "./" keeps every asset reference relative so the built site works
// when served from a subpath (e.g. apps.charliekrug.com/substitution-stepper).
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**"],
      // main.ts is the DOM bootstrap (mounts the app); it has no logic to
      // unit-test and is exercised by the jsdom smoke tests instead.
      exclude: ["src/main.ts"],
    },
  },
});
