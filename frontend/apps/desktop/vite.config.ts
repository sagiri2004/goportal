import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup()
        },
        vite: {
          build: { outDir: 'dist-electron' },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: { outDir: 'dist-electron' },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@sagiri/ui/styles': path.resolve(__dirname, '../../packages/ui/src/styles/globals.css'),
      '@sagiri/ui':        path.resolve(__dirname, '../../packages/ui/src'),
      '@sagiri/app-core':  path.resolve(__dirname, '../../packages/app-core/src'),
      '@sagiri/types':     path.resolve(__dirname, '../../packages/types'),
      '@sagiri/config':    path.resolve(__dirname, '../../packages/config/src'),
      '@sagiri/services':  path.resolve(__dirname, '../../packages/services/src'),
    },
  },
})
