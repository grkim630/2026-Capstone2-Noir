import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { dataAssetsPlugin, resolveProjectDataDir } from "../vite/dataAssetsPlugin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dataDir = resolveProjectDataDir(__dirname);

export default defineConfig({
  plugins: [react(), tailwindcss(), dataAssetsPlugin(dataDir)],
  resolve: {
    alias: {
      "@data": dataDir,
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5175,
    fs: {
      allow: [projectRoot],
    },
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/outputs": "http://127.0.0.1:8000",
      "/socket.io": {
        target: "http://127.0.0.1:8000",
        ws: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 5175,
  },
});
