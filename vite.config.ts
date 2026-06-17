import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const toPositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const webPort = toPositiveInteger(process.env.GOLD_INSIGHTS_WEB_PORT, 5193);
const runtimePort = toPositiveInteger(process.env.GOLD_INSIGHTS_PORT, 3193);

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
    port: webPort,
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${runtimePort}`,
        changeOrigin: true
      }
    }
  }
});
