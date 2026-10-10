import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
// `vite build --mode gas` inlines all JS/CSS into one index.html for Apps Script's HtmlService
// (see scripts/build-gas.mjs); the normal build/dev server are unchanged.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'gas' ? [viteSingleFile()] : [])],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
}))
