import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { // 👈 Uses port 3000 for serving the client 
    port: 3000,
    host: '0.0.0.0',
    https: false,
  },
})
