import { defineConfig } from 'vite'
import honoDiVite from '../../packages/vite/src/index'
// import honoDi from '../../packages/vite/src/index'

// https://vite.dev/config/
export default defineConfig({
  plugins: [honoDiVite()],
})
