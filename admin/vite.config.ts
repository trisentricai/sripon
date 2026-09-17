import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// SriPon admin dashboard - Vite configuration.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    host: true,
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});