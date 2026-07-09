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
  },
});
