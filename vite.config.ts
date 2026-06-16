import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": new URL("./apps/web-shell/src", import.meta.url).pathname,
      "@gold-insights/ui": new URL("./packages/ui/src/index.ts", import.meta.url).pathname
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5193,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3193",
        changeOrigin: true
      }
    }
  }
});
