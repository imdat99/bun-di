import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact()],
  base: '/__hono_di/',
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
  }
})
