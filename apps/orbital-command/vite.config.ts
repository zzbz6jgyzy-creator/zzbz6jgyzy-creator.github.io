import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "/lab/oc-1e1ef40d/",
  publicDir: "public",
  build: {
    outDir: resolve(__dirname, "../../lab/oc-1e1ef40d"),
    emptyOutDir: true,
    sourcemap: false,
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          sgp4: ["satellite.js"],
        },
      },
    },
  },
  worker: { format: "es" },
});
