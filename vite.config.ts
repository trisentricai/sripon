import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
  },
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    sourcemap: false,
  },
  resolve: {
    alias: {
      '@': '/src',
      '@ecommerce/types': '../../packages/types/src',
      '@ecommerce/validation': '../../packages/validation/src',
      '@ecommerce/ui': '../../packages/ui/src',
      '@ecommerce/config': '../../packages/config/src',
      '@ecommerce/database': '../../packages/database/src',
    },
  },
})