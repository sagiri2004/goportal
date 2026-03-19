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
        onstart(options) { options.startup() },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: { output: { format: 'cjs' } },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) { options.reload() },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: { output: { format: 'cjs' } },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
    alias: {
      '@goportal/ui/styles': path.resolve(__dirname, '../../packages/ui/src/styles/globals.css'),
      '@goportal/ui':        path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@goportal/app-core':  path.resolve(__dirname, '../../packages/app-core/src/index.ts'),
      '@goportal/types':     path.resolve(__dirname, '../../packages/types/index.ts'),
      '@goportal/config':    path.resolve(__dirname, '../../packages/config/src/index.ts'),
      '@goportal/services':  path.resolve(__dirname, '../../packages/services/src/index.ts'),
    },
  },
})
