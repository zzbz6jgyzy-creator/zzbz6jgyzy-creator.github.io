import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "/orbital-command/",
  publicDir: "public",
  build: {
    outDir: resolve(__dirname, "../../orbital-command"),
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
