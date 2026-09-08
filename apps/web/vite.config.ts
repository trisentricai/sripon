import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ecommerce/types': path.resolve(__dirname, '../../packages/types/src'),
      '@ecommerce/validation': path.resolve(__dirname, '../../packages/validation/src'),
      '@ecommerce/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@ecommerce/config': path.resolve(__dirname, '../../packages/config/src'),
    },
  },
  build: { outDir: 'dist', sourcemap: false },
})