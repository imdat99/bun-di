import { defineConfig } from 'vite'
import honoDiVite from '../../packages/vite/dist'
// import honoDi from '../../packages/vite/src/index'

// https://vite.dev/config/
export default defineConfig({
  plugins: [honoDiVite()],
  server: {
    port: 3001,
  },
})
