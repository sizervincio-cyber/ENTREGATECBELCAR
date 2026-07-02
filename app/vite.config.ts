import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
// base: em produção o app é servido do GitHub Pages em /ENTREGATECBELCAR/
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/ENTREGATECBELCAR/" : "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
