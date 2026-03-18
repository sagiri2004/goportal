import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
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
