import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// SriPon admin dashboard - Vite configuration.
// The production build is served by Django from /admin-portal/, so assets are
// emitted with that base and written straight into the backend tree.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/admin-portal/",
  server: {
    port: 5174,
    host: true,
    proxy: {
      "/api/v1": "http://localhost:8000",
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    outDir: "../backend/admin_portal",
    emptyOutDir: true,
  },
});