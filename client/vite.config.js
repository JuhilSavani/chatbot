import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { // 👈 Uses port 3000 for serving the client 
    port: 3000,
    host: '0.0.0.0',
    https: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      'officeparser': path.resolve(__dirname, 'node_modules/officeparser/dist/officeparser.browser.mjs')
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    include: ['unpdf', 'js-tiktoken', 'officeparser'],
  }
})
