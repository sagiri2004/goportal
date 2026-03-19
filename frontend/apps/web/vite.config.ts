import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
    alias: {
      '@goportal/ui/styles': path.resolve(__dirname, '../../packages/ui/src/styles/globals.css'),
      '@goportal/ui/components/button': path.resolve(__dirname, '../../packages/ui/src/components/button.tsx'),
      '@goportal/ui/components/input': path.resolve(__dirname, '../../packages/ui/src/components/input.tsx'),
      '@goportal/ui/components/scroll-area': path.resolve(__dirname, '../../packages/ui/src/components/scroll-area.tsx'),
      '@goportal/ui/components/avatar': path.resolve(__dirname, '../../packages/ui/src/components/avatar.tsx'),
      '@goportal/ui/components/dialog': path.resolve(__dirname, '../../packages/ui/src/components/dialog.tsx'),
      '@goportal/ui/components/popover': path.resolve(__dirname, '../../packages/ui/src/components/popover.tsx'),
      '@goportal/ui/components/tooltip': path.resolve(__dirname, '../../packages/ui/src/components/tooltip.tsx'),
      '@goportal/ui/components/badge': path.resolve(__dirname, '../../packages/ui/src/components/badge.tsx'),
      '@goportal/ui/components/separator': path.resolve(__dirname, '../../packages/ui/src/components/separator.tsx'),
      '@goportal/ui/components/dropdown-menu': path.resolve(__dirname, '../../packages/ui/src/components/dropdown-menu.tsx'),
      '@goportal/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@goportal/app-core': path.resolve(__dirname, '../../packages/app-core/src/index.ts'),
      '@goportal/types': path.resolve(__dirname, '../../packages/types/index.ts'),
      '@goportal/config': path.resolve(__dirname, '../../packages/config/src/index.ts'),
      '@goportal/services': path.resolve(__dirname, '../../packages/services/src/index.ts'),
      '@goportal/store': path.resolve(__dirname, '../../packages/store/src/index.ts'),
      '@goportal/feature-auth': path.resolve(__dirname, '../../packages/features/auth/src/index.ts'),
      '@goportal/feature-dashboard': path.resolve(__dirname, '../../packages/features/dashboard/src/index.ts'),
      '@goportal/feature-dashboard/mockData': path.resolve(__dirname, '../../packages/features/dashboard/mockData.ts'),
      '@goportal/feature-servers': path.resolve(__dirname, '../../packages/features/servers/src/index.ts'),
      '@goportal/feature-server-list': path.resolve(__dirname, '../../packages/features/server-list/src'),
      '@goportal/feature-channels': path.resolve(__dirname, '../../packages/features/channels/src/index.ts'),
      '@goportal/feature-chat': path.resolve(__dirname, '../../packages/features/chat/src'),
      '@goportal/feature-user-profile': path.resolve(__dirname, '../../packages/features/user-profile/src'),
      '@goportal/feature-file-upload': path.resolve(__dirname, '../../packages/features/file-upload/src'),
    },
  },
})
