import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact()],
  base: '/__hono_di/',
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      react: 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
      'react-dom': 'preact/compat',
      'react-dom/*': 'preact/compat/*',
      '@douyinfe/semi-ui/dist/css/semi.min.css': path.resolve(__dirname, './node_modules/@douyinfe/semi-ui/dist/css/semi.min.css')
    }
  }
})
