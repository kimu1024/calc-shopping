import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    {
      name: "copy-game-styles",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "styles.css",
          source: readFileSync(new URL("./app/globals.css", import.meta.url), "utf8"),
        });
      },
    },
  ],
  build: {
    outDir: "gh-pages",
    emptyOutDir: true,
  },
});
